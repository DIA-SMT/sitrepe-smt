-- =============================================================================
-- Migración 2: funciones auxiliares, reglas de negocio y triggers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Identidad y roles del usuario actual
-- -----------------------------------------------------------------------------
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol from public.perfiles p where p.id = (select auth.uid()) and p.activo
$$;

create or replace function public.tiene_rol(p_roles public.rol_usuario[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.rol = any (p_roles) from public.perfiles p where p.id = (select auth.uid()) and p.activo), false)
$$;

create or replace function public.es_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.tiene_rol(array['admin', 'control', 'inspector']::public.rol_usuario[])
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.tiene_rol(array['admin']::public.rol_usuario[])
$$;

-- Administración y control documental: admin y agentes de Control de Empresas / Timbrado.
create or replace function public.puede_controlar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.tiene_rol(array['admin', 'control']::public.rol_usuario[])
$$;

create or replace function public.empresa_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.empresa_id from public.perfiles p
  where p.id = (select auth.uid()) and p.activo and p.rol in ('empresa', 'tecnico')
$$;

create or replace function public.tecnico_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.tecnico_id from public.perfiles p
  where p.id = (select auth.uid()) and p.activo and p.rol = 'tecnico'
$$;

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.parametro_int(p_clave text, p_defecto integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (p.valor #>> '{}')::integer from public.parametros p where p.clave = p_clave), p_defecto)
$$;

-- Numerador anual atómico: PREFIJO-AAAA-000001
create or replace function public.siguiente_numero(p_prefijo text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anio integer := extract(year from public.hoy())::integer;
  v_n integer;
begin
  insert into public.contadores as c (prefijo, anio, ultimo)
  values (p_prefijo, v_anio, 1)
  on conflict (prefijo, anio) do update set ultimo = c.ultimo + 1
  returning c.ultimo into v_n;
  return v_n;
end;
$$;

create or replace function public.siguiente_codigo(p_prefijo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  return p_prefijo || '-' || extract(year from public.hoy())::integer || '-'
    || lpad(public.siguiente_numero(p_prefijo)::text, 6, '0');
end;
$$;

-- Trigger genérico: asigna "codigo" con el prefijo recibido como argumento.
create or replace function public.tg_asignar_codigo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.codigo is null then
    new.codigo := public.siguiente_codigo(tg_argv[0]);
  end if;
  return new;
end;
$$;

-- Suma días hábiles (sin sábados, domingos ni feriados) en hora de Tucumán.
create or replace function public.sumar_dias_habiles(p_desde timestamptz, p_dias integer)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  v timestamptz := p_desde;
  n integer := 0;
  v_local date;
begin
  while n < p_dias loop
    v := v + interval '1 day';
    v_local := (v at time zone 'America/Argentina/Tucuman')::date;
    if extract(isodow from v_local) < 6
       and not exists (select 1 from public.feriados f where f.fecha = v_local) then
      n := n + 1;
    end if;
  end loop;
  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reglas de negocio
-- -----------------------------------------------------------------------------

-- Vencimiento del certificado: periodicidad del rubro según el Anexo (Art. 1.º),
-- o vencimiento fijo para limpieza de tanques (Ord. 2004/92: cada 180 días).
create or replace function public.calcular_vencimiento(
  p_tipo public.tipo_servicio,
  p_rubro_id integer,
  p_fecha_servicio timestamptz
)
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fecha date := (p_fecha_servicio at time zone 'America/Argentina/Tucuman')::date;
  v_periodicidad public.periodicidad;
begin
  if p_fecha_servicio is null then
    return null;
  end if;
  if p_tipo = 'tanque' then
    return v_fecha + public.parametro_int('vencimiento_tanque_dias', 180);
  end if;
  select r.periodicidad into v_periodicidad from public.rubros r where r.id = p_rubro_id;
  if v_periodicidad is null then
    raise exception 'El rubro indicado no existe en el Anexo' using errcode = 'P0001';
  end if;
  return case v_periodicidad
    when 'mensual' then (v_fecha + interval '1 month')::date
    when 'bimestral' then (v_fecha + interval '2 months')::date
    when 'trimestral' then (v_fecha + interval '3 months')::date
    when 'cuatrimestral' then (v_fecha + interval '4 months')::date
    when 'semestral' then (v_fecha + interval '6 months')::date
    when 'anual' then (v_fecha + interval '1 year')::date
    else null -- única vez (p. ej. inicio de obra): sin vencimiento
  end;
end;
$$;

create or replace function public.empresa_habilitada(
  p_empresa uuid,
  p_tipo public.tipo_servicio default 'fumigacion'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.empresas e
    where e.id = p_empresa
      and e.estado = 'habilitada'
      and (e.vencimiento_habilitacion is null or e.vencimiento_habilitacion >= public.hoy())
      and case p_tipo when 'fumigacion' then e.habilita_fumigacion else e.habilita_tanques end
  )
$$;

create or replace function public.arancel_vigente(p_codigo text, p_fecha date default null)
returns public.aranceles
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.aranceles a
  where a.codigo = p_codigo
    and a.activo
    and a.vigente_desde <= coalesce(p_fecha, public.hoy())
    and (a.vigente_hasta is null or a.vigente_hasta >= coalesce(p_fecha, public.hoy()))
  order by a.vigente_desde desc
  limit 1
$$;

-- -----------------------------------------------------------------------------
-- Alta de usuarios: crea el perfil. El rol solo puede venir de app_metadata,
-- que únicamente se escribe con la clave de servicio (administración).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := 'empresa';
begin
  if coalesce(new.raw_app_meta_data ->> 'rol', '') <> '' then
    v_rol := (new.raw_app_meta_data ->> 'rol')::public.rol_usuario;
  end if;
  insert into public.perfiles (id, email, nombre, apellido, rol, empresa_id, tecnico_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellido', ''),
    v_rol,
    nullif(new.raw_app_meta_data ->> 'empresa_id', '')::uuid,
    nullif(new.raw_app_meta_data ->> 'tecnico_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Certificados: validaciones que evitan los errores frecuentes en papel
-- (sin rubro, sin fecha, firma incorrecta) y cálculo del vencimiento.
-- -----------------------------------------------------------------------------
create or replace function public.tg_certificados_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tecnico public.tecnicos;
  v_declaracion public.declaraciones;
begin
  if tg_op = 'UPDATE' and old.estado in ('timbrado', 'anulado')
     and (new.estado = old.estado)
     and (new.numero, new.cliente, new.domicilio, new.rubro_id, new.superficie_m2, new.capacidad_litros,
          new.fecha_servicio, new.tecnico_id, new.tipo, new.empresa_id)
         is distinct from
         (old.numero, old.cliente, old.domicilio, old.rubro_id, old.superficie_m2, old.capacidad_litros,
          old.fecha_servicio, old.tecnico_id, old.tipo, old.empresa_id) then
    raise exception 'El certificado % ya fue % y no puede modificarse', old.numero,
      case old.estado when 'timbrado' then 'timbrado' else 'anulado' end using errcode = 'P0001';
  end if;

  select * into v_tecnico from public.tecnicos t where t.id = new.tecnico_id;
  if v_tecnico.id is null or v_tecnico.empresa_id <> new.empresa_id then
    raise exception 'El asesor técnico indicado no pertenece a la empresa' using errcode = 'P0001';
  end if;
  if (tg_op = 'INSERT' or new.tecnico_id is distinct from old.tecnico_id) and v_tecnico.estado <> 'aprobado' then
    raise exception 'El asesor técnico % % no está aprobado por la Dirección', v_tecnico.nombre, v_tecnico.apellido
      using errcode = 'P0001';
  end if;

  if (tg_op = 'INSERT' or new.rubro_id is distinct from old.rubro_id)
     and not exists (select 1 from public.rubros r where r.id = new.rubro_id and r.activo) then
    raise exception 'Debe indicar un rubro válido del Anexo' using errcode = 'P0001';
  end if;

  if new.declaracion_id is not null then
    select * into v_declaracion from public.declaraciones d where d.id = new.declaracion_id;
    if v_declaracion.empresa_id <> new.empresa_id or v_declaracion.tipo <> new.tipo then
      raise exception 'El certificado no corresponde a la declaración indicada' using errcode = 'P0001';
    end if;
  end if;

  if new.tipo = 'tanque' and new.capacidad_litros is null then
    raise exception 'Indique la capacidad del tanque en litros' using errcode = 'P0001';
  end if;

  new.numero := trim(new.numero);
  if tg_op = 'INSERT' or (new.tipo, new.rubro_id, new.fecha_servicio) is distinct from (old.tipo, old.rubro_id, old.fecha_servicio) then
    new.fecha_vencimiento := public.calcular_vencimiento(new.tipo, new.rubro_id, new.fecha_servicio);
  end if;

  -- Si cambian datos sustantivos después de firmar, la firma deja de ser válida.
  if tg_op = 'UPDATE' and old.firma_hash is not null and new.firma_hash is not distinct from old.firma_hash
     and (new.numero, new.cliente, new.domicilio, new.rubro_id, new.superficie_m2, new.capacidad_litros,
          new.fecha_servicio, new.tecnico_id)
         is distinct from
         (old.numero, old.cliente, old.domicilio, old.rubro_id, old.superficie_m2, old.capacidad_litros,
          old.fecha_servicio, old.tecnico_id) then
    new.firmado_at := null;
    new.firmado_por := null;
    new.firma_hash := null;
  end if;
  return new;
end;
$$;

create trigger certificados_validar
  before insert or update on public.certificados
  for each row execute function public.tg_certificados_validar();

-- Solo pueden aplicarse productos aprobados en la memoria técnica de la empresa.
-- Recalcula el plazo de reingreso del certificado (el mayor de sus productos).
create or replace function public.tg_certificado_productos_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  select c.empresa_id into v_empresa from public.certificados c where c.id = new.certificado_id;
  if not exists (
    select 1 from public.empresa_productos ep
    where ep.empresa_id = v_empresa and ep.producto_id = new.producto_id and ep.estado = 'aprobado'
  ) then
    raise exception 'El producto no está aprobado en la memoria técnica de la empresa' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger certificado_productos_validar
  before insert or update on public.certificado_productos
  for each row execute function public.tg_certificado_productos_validar();

create or replace function public.tg_certificado_productos_reingreso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cert uuid := coalesce(new.certificado_id, old.certificado_id);
begin
  update public.certificados c
  set plazo_reingreso_horas = (
    select max(p.plazo_reingreso_horas)
    from public.certificado_productos cp
    join public.productos p on p.id = cp.producto_id
    where cp.certificado_id = v_cert
  )
  where c.id = v_cert;
  return null;
end;
$$;

create trigger certificado_productos_reingreso
  after insert or update or delete on public.certificado_productos
  for each row execute function public.tg_certificado_productos_reingreso();

-- -----------------------------------------------------------------------------
-- Pagos: al verificarse el pago se timbran (sellado digital) sus certificados.
-- -----------------------------------------------------------------------------
create or replace function public.tg_pagos_timbrar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado = 'verificado' and old.estado is distinct from 'verificado' then
    update public.certificados c
    set estado = 'timbrado',
        timbrado_at = now(),
        timbrado_por = coalesce(new.verificado_por, (select auth.uid())),
        sello_codigo = public.siguiente_codigo('SA')
    where c.pago_id = new.id and c.estado = 'controlado';
  end if;
  return new;
end;
$$;

create trigger pagos_timbrar
  after update of estado on public.pagos
  for each row execute function public.tg_pagos_timbrar();

-- -----------------------------------------------------------------------------
-- Notificaciones: numeración {{CICLO}}-{{TALONARIO}}, datos del establecimiento
-- y vencimiento en días hábiles al notificarse.
-- -----------------------------------------------------------------------------
create or replace function public.tg_notificaciones_preparar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_est record;
begin
  if tg_op = 'INSERT' then
    if new.talonario is null then
      new.talonario := public.siguiente_numero('NOT');
    end if;
    new.numero := new.ciclo || '-' || lpad(new.talonario::text, 5, '0');
  end if;

  if new.establecimiento_id is not null and (tg_op = 'INSERT') then
    select e.nombre, e.cuit, e.domicilio, r.nombre as rubro
    into v_est
    from public.establecimientos e
    left join public.rubros r on r.id = e.rubro_id
    where e.id = new.establecimiento_id;
    new.razon_social := coalesce(nullif(new.razon_social, ''), v_est.nombre);
    new.cuit := coalesce(new.cuit, v_est.cuit);
    new.domicilio := coalesce(nullif(new.domicilio, ''), v_est.domicilio);
    new.rubro := coalesce(new.rubro, v_est.rubro);
  end if;

  if new.notificada_at is not null
     and (tg_op = 'INSERT' or new.notificada_at is distinct from old.notificada_at or new.plazo is distinct from old.plazo) then
    new.vence_at := public.sumar_dias_habiles(
      new.notificada_at,
      case new.plazo when 'cinco_dias_habiles' then 5 else 2 end
    );
    if new.estado = 'emitida' then
      new.estado := 'notificada';
    end if;
  end if;

  if new.estado = 'cumplida' and new.cumplida_at is null then
    new.cumplida_at := now();
  end if;
  return new;
end;
$$;

create trigger notificaciones_preparar
  before insert or update on public.notificaciones
  for each row execute function public.tg_notificaciones_preparar();

-- Actas: numeración y cierre de la notificación incumplida.
create or replace function public.tg_actas_preparar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.numero is null then
    new.numero := public.siguiente_codigo('ACTA');
  end if;
  return new;
end;
$$;

create trigger actas_preparar
  before insert on public.actas
  for each row execute function public.tg_actas_preparar();

create or replace function public.tg_actas_cerrar_notificacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.notificacion_id is not null then
    update public.notificaciones n set estado = 'acta_labrada'
    where n.id = new.notificacion_id and n.estado in ('emitida', 'notificada');
  end if;
  return null;
end;
$$;

create trigger actas_cerrar_notificacion
  after insert on public.actas
  for each row execute function public.tg_actas_cerrar_notificacion();

-- Inspecciones: la inspección anual de depósito conforme actualiza la empresa (Art. 10.º d).
create or replace function public.tg_inspecciones_realizada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado = 'realizada' and new.realizada_at is null then
    new.realizada_at := now();
  end if;
  if new.estado = 'realizada' and new.tipo = 'deposito_anual' and new.resultado = 'conforme' and new.empresa_id is not null then
    update public.empresas e
    set ultima_inspeccion_deposito = (new.realizada_at at time zone 'America/Argentina/Tucuman')::date
    where e.id = new.empresa_id;
  end if;
  return new;
end;
$$;

create trigger inspecciones_realizada
  before insert or update on public.inspecciones
  for each row execute function public.tg_inspecciones_realizada();

-- Capacitaciones: certificado de asistencia.
create or replace function public.tg_capacitacion_asistencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.asistio and new.certificado_codigo is null then
    new.certificado_codigo := public.siguiente_codigo('CAP');
  end if;
  return new;
end;
$$;

create trigger capacitacion_asistencia
  before insert or update on public.capacitacion_inscripciones
  for each row execute function public.tg_capacitacion_asistencia();

-- Noticias: fecha de publicación.
create or replace function public.tg_noticias_publicar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publicada and new.publicada_at is null then
    new.publicada_at := now();
  end if;
  return new;
end;
$$;

create trigger noticias_publicar
  before insert or update on public.noticias
  for each row execute function public.tg_noticias_publicar();

-- -----------------------------------------------------------------------------
-- Auditoría genérica
-- -----------------------------------------------------------------------------
create or replace function public.tg_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registro jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and to_jsonb(old) - 'updated_at' = to_jsonb(new) - 'updated_at' then
    return new;
  end if;
  insert into public.auditoria (tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos)
  values (
    tg_table_name,
    v_registro ->> 'id',
    tg_op,
    (select auth.uid()),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- -----------------------------------------------------------------------------
-- Asignación de triggers comunes
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  -- updated_at
  foreach t in array array[
    'empresas', 'perfiles', 'tecnicos', 'tramites', 'establecimientos', 'declaraciones', 'pagos',
    'certificados', 'denuncias', 'inspecciones', 'notificaciones', 'actas', 'noticias', 'capacitaciones'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
  end loop;

  -- auditoría
  foreach t in array array[
    'empresas', 'perfiles', 'tecnicos', 'empresa_productos', 'documentos', 'tramites', 'establecimientos',
    'declaraciones', 'certificados', 'certificado_productos', 'pagos', 'envases_movimientos', 'denuncias',
    'inspecciones', 'notificaciones', 'actas', 'aranceles', 'rubros', 'productos', 'parametros',
    'cuentas_recaudadoras', 'avisos', 'noticias', 'capacitaciones'
  ] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.tg_auditoria()',
      t || '_auditoria', t);
  end loop;
end;
$$;

-- Códigos correlativos
create trigger declaraciones_codigo before insert on public.declaraciones
  for each row execute function public.tg_asignar_codigo('DJ');
create trigger pagos_codigo before insert on public.pagos
  for each row execute function public.tg_asignar_codigo('LIQ');
create trigger tramites_codigo before insert on public.tramites
  for each row execute function public.tg_asignar_codigo('TRA');
create trigger inspecciones_codigo before insert on public.inspecciones
  for each row execute function public.tg_asignar_codigo('INS');
create trigger denuncias_codigo before insert on public.denuncias
  for each row execute function public.tg_asignar_codigo('DEN');
