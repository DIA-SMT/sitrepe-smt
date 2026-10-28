-- =============================================================================
-- Migración 3: permisos y políticas de seguridad a nivel de fila (RLS).
--
-- Principios:
--  * Todo con RLS. Los permisos se otorgan explícitamente (se revocan los
--    privilegios por defecto de Supabase sobre las tablas).
--  * Las empresas ven y editan solo lo propio; el staff (admin, control,
--    inspector) ve todo. La configuración solo la edita administración.
--  * Las transiciones de estado sensibles (presentar, controlar, firmar,
--    liquidar, verificar pagos, resolver trámites) se hacen por funciones
--    RPC con SECURITY DEFINER: las columnas de estado no se pueden escribir
--    directamente (permisos por columna).
-- =============================================================================

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Funciones auxiliares usadas por las políticas (deben poder ejecutarse).
grant execute on function
  public.hoy(),
  public.rol_actual(),
  public.tiene_rol(public.rol_usuario[]),
  public.es_staff(),
  public.es_admin(),
  public.puede_controlar(),
  public.empresa_actual(),
  public.tecnico_actual(),
  public.calcular_vencimiento(public.tipo_servicio, integer, timestamptz),
  public.empresa_habilitada(uuid, public.tipo_servicio),
  public.arancel_vigente(text, date),
  public.generar_codigo_verificacion()
to anon, authenticated;

-- Las funciones de triggers corren con los privilegios del dueño; no se exponen.

do $$
declare
  t text;
begin
  foreach t in array array[
    'parametros', 'feriados', 'contadores', 'cuentas_recaudadoras', 'aranceles', 'rubros', 'productos',
    'empresas', 'perfiles', 'tecnicos', 'empresa_productos', 'documentos', 'tramites', 'establecimientos',
    'declaraciones', 'pagos', 'certificados', 'certificado_productos', 'envases_movimientos', 'denuncias',
    'inspecciones', 'notificaciones', 'actas', 'avisos', 'avisos_lecturas', 'noticias', 'capacitaciones',
    'capacitacion_inscripciones', 'auditoria'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Catálogos públicos: lectura para todos, escritura de administración.
-- -----------------------------------------------------------------------------
grant select on public.parametros, public.feriados, public.cuentas_recaudadoras, public.aranceles,
  public.rubros, public.productos to anon, authenticated;
grant insert, update, delete on public.parametros, public.feriados, public.cuentas_recaudadoras,
  public.aranceles, public.rubros to authenticated;
grant insert, update on public.productos to authenticated;

create policy parametros_lectura on public.parametros for select to anon, authenticated using (true);
create policy parametros_admin on public.parametros for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy feriados_lectura on public.feriados for select to anon, authenticated using (true);
create policy feriados_admin on public.feriados for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy cuentas_lectura on public.cuentas_recaudadoras for select to anon, authenticated using (true);
create policy cuentas_admin on public.cuentas_recaudadoras for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy aranceles_lectura on public.aranceles for select to anon, authenticated using (true);
create policy aranceles_admin on public.aranceles for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy rubros_lectura on public.rubros for select to anon, authenticated using (true);
create policy rubros_admin on public.rubros for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy productos_lectura on public.productos for select to anon, authenticated using (true);
create policy productos_alta on public.productos for insert to authenticated
  with check ((select public.puede_controlar()));
create policy productos_edicion on public.productos for update to authenticated
  using ((select public.puede_controlar())) with check ((select public.puede_controlar()));

-- -----------------------------------------------------------------------------
-- Perfiles
-- -----------------------------------------------------------------------------
grant select on public.perfiles to authenticated;
grant update (nombre, apellido, dni, telefono) on public.perfiles to authenticated;

create policy perfiles_lectura on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select public.es_staff()));
create policy perfiles_edicion_propia on public.perfiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Empresas (las altas de prestadores entran por solicitar_inscripcion)
-- -----------------------------------------------------------------------------
grant select on public.empresas to authenticated;
grant insert (
  numero_registro, nombre_comercial, titular, tipo_persona, cuit, email, telefono, domicilio_oficina,
  domicilio_deposito, habilitacion_comercial, resolucion_dsa, habilita_fumigacion, habilita_tanques, estado,
  fecha_habilitacion, vencimiento_habilitacion, ultima_inspeccion_deposito, observaciones
) on public.empresas to authenticated;
grant update (
  numero_registro, nombre_comercial, titular, tipo_persona, cuit, email, telefono, domicilio_oficina,
  domicilio_deposito, habilitacion_comercial, resolucion_dsa, habilita_fumigacion, habilita_tanques, estado,
  fecha_habilitacion, vencimiento_habilitacion, ultima_inspeccion_deposito, observaciones
) on public.empresas to authenticated;

create policy empresas_lectura on public.empresas for select to authenticated
  using ((select public.es_staff()) or id = (select public.empresa_actual()));
create policy empresas_alta on public.empresas for insert to authenticated
  with check ((select public.puede_controlar()));
create policy empresas_edicion on public.empresas for update to authenticated
  using ((select public.puede_controlar())) with check ((select public.puede_controlar()));

-- -----------------------------------------------------------------------------
-- Técnicos: la empresa los propone (pendiente) y la Dirección los aprueba.
-- -----------------------------------------------------------------------------
grant select, delete on public.tecnicos to authenticated;
grant insert (
  empresa_id, nombre, apellido, dni, titulo, institucion, matricula, email, telefono, es_representante,
  estado, fecha_alta, fecha_baja, observaciones
) on public.tecnicos to authenticated;
grant update (
  nombre, apellido, dni, titulo, institucion, matricula, email, telefono, es_representante,
  estado, fecha_alta, fecha_baja, observaciones
) on public.tecnicos to authenticated;

create policy tecnicos_lectura on public.tecnicos for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy tecnicos_alta on public.tecnicos for insert to authenticated
  with check (
    (select public.puede_controlar())
    or (empresa_id = (select public.empresa_actual()) and estado = 'pendiente')
  );
create policy tecnicos_edicion on public.tecnicos for update to authenticated
  using (
    (select public.puede_controlar())
    or (empresa_id = (select public.empresa_actual()) and estado = 'pendiente')
  )
  with check (
    (select public.puede_controlar())
    or (empresa_id = (select public.empresa_actual()) and estado = 'pendiente')
  );
create policy tecnicos_baja on public.tecnicos for delete to authenticated
  using (empresa_id = (select public.empresa_actual()) and estado = 'pendiente');

-- -----------------------------------------------------------------------------
-- Memoria técnica (productos por empresa)
-- -----------------------------------------------------------------------------
grant select, delete on public.empresa_productos to authenticated;
grant insert (empresa_id, producto_id, dosis, concentracion_uso, precauciones, estado, observaciones)
  on public.empresa_productos to authenticated;
grant update (dosis, concentracion_uso, precauciones, estado, observaciones, revisado_por, revisado_at)
  on public.empresa_productos to authenticated;

create policy memoria_lectura on public.empresa_productos for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy memoria_alta on public.empresa_productos for insert to authenticated
  with check (
    (select public.puede_controlar())
    or (empresa_id = (select public.empresa_actual()) and estado = 'propuesto')
  );
create policy memoria_edicion on public.empresa_productos for update to authenticated
  using (
    (select public.puede_controlar())
    or (empresa_id = (select public.empresa_actual()) and estado = 'propuesto')
  )
  with check (
    (select public.puede_controlar())
    or (empresa_id = (select public.empresa_actual()) and estado = 'propuesto')
  );
create policy memoria_baja on public.empresa_productos for delete to authenticated
  using (empresa_id = (select public.empresa_actual()) and estado = 'propuesto');

-- -----------------------------------------------------------------------------
-- Documentos del legajo
-- -----------------------------------------------------------------------------
grant select, delete on public.documentos to authenticated;
grant insert (empresa_id, tecnico_id, tramite_id, tipo, nombre_archivo, path, vence, estado, observaciones)
  on public.documentos to authenticated;
grant update (tecnico_id, tramite_id, tipo, vence, estado, observaciones, revisado_por, revisado_at)
  on public.documentos to authenticated;

create policy documentos_lectura on public.documentos for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy documentos_alta on public.documentos for insert to authenticated
  with check (
    (select public.puede_controlar())
    or (empresa_id = (select public.empresa_actual()) and estado = 'pendiente')
  );
create policy documentos_revision on public.documentos for update to authenticated
  using ((select public.puede_controlar())) with check ((select public.puede_controlar()));
create policy documentos_baja on public.documentos for delete to authenticated
  using (empresa_id = (select public.empresa_actual()) and estado = 'pendiente');

-- -----------------------------------------------------------------------------
-- Trámites (la resolución se hace con resolver_tramite)
-- -----------------------------------------------------------------------------
grant select on public.tramites to authenticated;
grant insert (empresa_id, tipo, estado, datos, observaciones) on public.tramites to authenticated;
grant update (datos, estado, observaciones) on public.tramites to authenticated;

create policy tramites_lectura on public.tramites for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy tramites_alta on public.tramites for insert to authenticated
  with check (
    empresa_id = (select public.empresa_actual()) and estado in ('borrador', 'presentado')
  );
create policy tramites_edicion on public.tramites for update to authenticated
  using (empresa_id = (select public.empresa_actual()) and estado in ('borrador', 'observado'))
  with check (empresa_id = (select public.empresa_actual()) and estado in ('borrador', 'presentado'));

-- -----------------------------------------------------------------------------
-- Establecimientos: las empresas pueden consultarlos y darlos de alta al declarar.
-- -----------------------------------------------------------------------------
grant select on public.establecimientos to authenticated;
grant insert (nombre, nombre_fantasia, cuit, domicilio, barrio, zona, lat, lng, rubro_id, tiene_tanque,
  afluencia_publico, telefono, email) on public.establecimientos to authenticated;
grant update (nombre, nombre_fantasia, cuit, domicilio, barrio, zona, lat, lng, rubro_id, tiene_tanque,
  afluencia_publico, telefono, email, activo) on public.establecimientos to authenticated;

create policy establecimientos_lectura on public.establecimientos for select to authenticated
  using ((select public.es_staff()) or (select public.empresa_actual()) is not null);
create policy establecimientos_alta on public.establecimientos for insert to authenticated
  with check ((select public.es_staff()) or (select public.empresa_actual()) is not null);
create policy establecimientos_edicion on public.establecimientos for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));

-- -----------------------------------------------------------------------------
-- Declaraciones y certificados
-- -----------------------------------------------------------------------------
grant select, delete on public.declaraciones to authenticated;
grant insert (empresa_id, tipo, observaciones) on public.declaraciones to authenticated;
grant update (observaciones) on public.declaraciones to authenticated;

create policy declaraciones_lectura on public.declaraciones for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy declaraciones_alta on public.declaraciones for insert to authenticated
  with check (empresa_id = (select public.empresa_actual()));
create policy declaraciones_edicion on public.declaraciones for update to authenticated
  using (empresa_id = (select public.empresa_actual()) and estado in ('borrador', 'observada'))
  with check (empresa_id = (select public.empresa_actual()));
create policy declaraciones_baja on public.declaraciones for delete to authenticated
  using (empresa_id = (select public.empresa_actual()) and estado = 'borrador');

grant select, delete on public.certificados to authenticated;
grant insert (
  empresa_id, declaracion_id, tipo, numero, establecimiento_id, cliente, cliente_cuit, domicilio, rubro_id,
  superficie_m2, capacidad_litros, fecha_servicio, tecnico_id, laboratorio, analisis_bacteriologico_path,
  analisis_fisicoquimico_path
) on public.certificados to authenticated;
grant update (
  numero, establecimiento_id, cliente, cliente_cuit, domicilio, rubro_id, superficie_m2, capacidad_litros,
  fecha_servicio, tecnico_id, laboratorio, analisis_bacteriologico_path, analisis_fisicoquimico_path
) on public.certificados to authenticated;

create policy certificados_lectura on public.certificados for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy certificados_alta on public.certificados for insert to authenticated
  with check (
    empresa_id = (select public.empresa_actual())
    and (
      declaracion_id is null
      or exists (
        select 1 from public.declaraciones d
        where d.id = declaracion_id and d.empresa_id = (select public.empresa_actual())
          and d.estado in ('borrador', 'observada')
      )
    )
  );
create policy certificados_edicion on public.certificados for update to authenticated
  using (empresa_id = (select public.empresa_actual()) and estado in ('borrador', 'observado'))
  with check (empresa_id = (select public.empresa_actual()));
create policy certificados_baja on public.certificados for delete to authenticated
  using (empresa_id = (select public.empresa_actual()) and estado = 'borrador');

grant select, insert, update, delete on public.certificado_productos to authenticated;

create policy cert_productos_lectura on public.certificado_productos for select to authenticated
  using (exists (
    select 1 from public.certificados c
    where c.id = certificado_id
      and ((select public.es_staff()) or c.empresa_id = (select public.empresa_actual()))
  ));
create policy cert_productos_escritura on public.certificado_productos for all to authenticated
  using (exists (
    select 1 from public.certificados c
    where c.id = certificado_id and c.empresa_id = (select public.empresa_actual())
      and c.estado in ('borrador', 'observado')
  ))
  with check (exists (
    select 1 from public.certificados c
    where c.id = certificado_id and c.empresa_id = (select public.empresa_actual())
      and c.estado in ('borrador', 'observado')
  ));

-- -----------------------------------------------------------------------------
-- Pagos: las empresas liquidan e informan por RPC; el staff registra y concilia.
-- -----------------------------------------------------------------------------
grant select on public.pagos to authenticated;
grant insert (
  empresa_id, contribuyente, contribuyente_cuit, arancel_id, cuenta_id, cantidad, importe_unitario,
  importe_total, medio, estado, numero_operacion, fecha_pago, comprobante_path, observaciones
) on public.pagos to authenticated;
grant update (medio, numero_operacion, fecha_pago, comprobante_path, observaciones) on public.pagos to authenticated;

create policy pagos_lectura on public.pagos for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy pagos_alta_staff on public.pagos for insert to authenticated
  with check ((select public.puede_controlar()));
create policy pagos_edicion_staff on public.pagos for update to authenticated
  using ((select public.puede_controlar())) with check ((select public.puede_controlar()));

-- -----------------------------------------------------------------------------
-- Envases vacíos
-- -----------------------------------------------------------------------------
grant select on public.envases_movimientos to authenticated;
grant insert (empresa_id, producto_id, tipo, cantidad, capacidad, lote, fecha, triple_lavado, destinatario,
  manifiesto, comprobante_path, observaciones) on public.envases_movimientos to authenticated;

create policy envases_lectura on public.envases_movimientos for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy envases_alta on public.envases_movimientos for insert to authenticated
  with check ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));

-- -----------------------------------------------------------------------------
-- Fiscalización: staff. Las empresas ven lo que les concierne.
-- -----------------------------------------------------------------------------
grant select on public.denuncias to authenticated;
grant update (tipo, empresa_id, establecimiento_id, estado, asignada_a, respuesta) on public.denuncias to authenticated;
create policy denuncias_lectura on public.denuncias for select to authenticated
  using ((select public.es_staff()));
create policy denuncias_gestion on public.denuncias for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));

grant select on public.inspecciones to authenticated;
grant insert (tipo, estado, empresa_id, establecimiento_id, certificado_id, denuncia_id, inspector_id,
  fecha_programada, realizada_at, resultado, checklist, observaciones, lat, lng) on public.inspecciones to authenticated;
grant update (tipo, estado, empresa_id, establecimiento_id, certificado_id, denuncia_id, inspector_id,
  fecha_programada, realizada_at, resultado, checklist, observaciones, lat, lng) on public.inspecciones to authenticated;
create policy inspecciones_lectura on public.inspecciones for select to authenticated
  using ((select public.es_staff()) or (empresa_id = (select public.empresa_actual()) and estado = 'realizada'));
create policy inspecciones_alta on public.inspecciones for insert to authenticated
  with check ((select public.es_staff()));
create policy inspecciones_edicion on public.inspecciones for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));

grant select on public.notificaciones to authenticated;
grant insert (ciclo, talonario, tipo, establecimiento_id, empresa_id, razon_social, rubro, cuit, domicilio,
  orden_trabajo, plazo, notificada_at, persona_notificada, dni_notificado, estado, inspector_id, observaciones)
  on public.notificaciones to authenticated;
grant update (tipo, razon_social, rubro, cuit, domicilio, orden_trabajo, plazo, notificada_at, persona_notificada,
  dni_notificado, estado, cumplida_at, inspector_id, observaciones) on public.notificaciones to authenticated;
create policy notificaciones_lectura on public.notificaciones for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy notificaciones_alta on public.notificaciones for insert to authenticated
  with check ((select public.es_staff()));
create policy notificaciones_edicion on public.notificaciones for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));

grant select on public.actas to authenticated;
grant insert (inspeccion_id, notificacion_id, establecimiento_id, empresa_id, motivo, descripcion, normativa,
  fecha, inspector_id, estado) on public.actas to authenticated;
grant update (motivo, descripcion, normativa, estado) on public.actas to authenticated;
create policy actas_lectura on public.actas for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy actas_alta on public.actas for insert to authenticated
  with check ((select public.es_staff()));
create policy actas_edicion on public.actas for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));

-- -----------------------------------------------------------------------------
-- Avisos a empresas
-- -----------------------------------------------------------------------------
grant select on public.avisos to authenticated;
grant insert (empresa_id, titulo, cuerpo, nivel) on public.avisos to authenticated;
grant delete on public.avisos to authenticated;
create policy avisos_lectura on public.avisos for select to authenticated
  using (
    (select public.es_staff())
    or ((select public.empresa_actual()) is not null
        and (empresa_id is null or empresa_id = (select public.empresa_actual())))
  );
create policy avisos_alta on public.avisos for insert to authenticated
  with check ((select public.puede_controlar()));
create policy avisos_baja on public.avisos for delete to authenticated
  using ((select public.puede_controlar()));

grant select, insert on public.avisos_lecturas to authenticated;
create policy avisos_lecturas_propias on public.avisos_lecturas for select to authenticated
  using (perfil_id = (select auth.uid()));
create policy avisos_lecturas_alta on public.avisos_lecturas for insert to authenticated
  with check (perfil_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Portal: noticias y capacitaciones
-- -----------------------------------------------------------------------------
grant select on public.noticias to anon, authenticated;
grant insert (slug, titulo, resumen, cuerpo, categoria, imagen_url, publicada, publicada_at) on public.noticias to authenticated;
grant update (slug, titulo, resumen, cuerpo, categoria, imagen_url, publicada, publicada_at) on public.noticias to authenticated;
grant delete on public.noticias to authenticated;
create policy noticias_lectura on public.noticias for select to anon, authenticated
  using (publicada or (select public.puede_controlar()));
create policy noticias_gestion on public.noticias for all to authenticated
  using ((select public.puede_controlar())) with check ((select public.puede_controlar()));

grant select on public.capacitaciones to anon, authenticated;
grant insert (titulo, descripcion, modalidad, lugar, fecha_inicio, duracion_horas, cupo, estado, destinatarios)
  on public.capacitaciones to authenticated;
grant update (titulo, descripcion, modalidad, lugar, fecha_inicio, duracion_horas, cupo, estado, destinatarios)
  on public.capacitaciones to authenticated;
create policy capacitaciones_lectura on public.capacitaciones for select to anon, authenticated using (true);
create policy capacitaciones_gestion on public.capacitaciones for all to authenticated
  using ((select public.puede_controlar())) with check ((select public.puede_controlar()));

grant select on public.capacitacion_inscripciones to authenticated;
grant update (asistio) on public.capacitacion_inscripciones to authenticated;
create policy inscripciones_lectura on public.capacitacion_inscripciones for select to authenticated
  using ((select public.es_staff()) or empresa_id = (select public.empresa_actual()));
create policy inscripciones_asistencia on public.capacitacion_inscripciones for update to authenticated
  using ((select public.puede_controlar())) with check ((select public.puede_controlar()));

-- -----------------------------------------------------------------------------
-- Auditoría: solo lectura para administración.
-- -----------------------------------------------------------------------------
grant select on public.auditoria to authenticated;
create policy auditoria_lectura on public.auditoria for select to authenticated
  using ((select public.es_admin()));
