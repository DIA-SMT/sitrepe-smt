-- =============================================================================
-- Migración 4: vistas de consulta y funciones RPC (procesos del circuito).
-- Las vistas usan security_invoker: respetan la RLS de quien consulta.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Vistas
-- -----------------------------------------------------------------------------
create or replace view public.v_empresas with (security_invoker = on) as
select
  e.*,
  case
    when e.estado = 'habilitada' and e.vencimiento_habilitacion is not null
         and e.vencimiento_habilitacion < public.hoy() then 'vencida'::public.estado_empresa
    else e.estado
  end as estado_efectivo,
  (e.vencimiento_habilitacion - public.hoy()) as dias_para_vencer,
  (select count(*) from public.tecnicos t where t.empresa_id = e.id and t.estado = 'aprobado')::integer as tecnicos_aprobados,
  (select count(*) from public.empresa_productos ep where ep.empresa_id = e.id and ep.estado = 'aprobado')::integer as productos_aprobados,
  (select count(*) from public.certificados c
    where c.empresa_id = e.id and c.estado <> 'anulado'
      and c.fecha_servicio >= date_trunc('month', now() at time zone 'America/Argentina/Tucuman') at time zone 'America/Argentina/Tucuman'
  )::integer as certificados_mes,
  (select count(*) from public.pagos p where p.empresa_id = e.id and p.estado in ('pendiente', 'informado'))::integer as pagos_pendientes
from public.empresas e;

create or replace view public.v_certificados with (security_invoker = on) as
select
  c.*,
  e.nombre_comercial as empresa_nombre,
  e.cuit as empresa_cuit,
  e.numero_registro as empresa_numero_registro,
  r.nombre as rubro_nombre,
  r.grupo as rubro_grupo,
  r.periodicidad as rubro_periodicidad,
  t.nombre || ' ' || t.apellido as tecnico_nombre,
  t.titulo as tecnico_titulo,
  t.matricula as tecnico_matricula,
  d.codigo as declaracion_codigo,
  d.estado as declaracion_estado,
  p.codigo as pago_codigo,
  p.estado as pago_estado,
  es.barrio as establecimiento_barrio,
  es.zona as establecimiento_zona,
  es.lat as establecimiento_lat,
  es.lng as establecimiento_lng,
  case
    when c.estado = 'anulado' then 'anulado'
    when c.estado <> 'timbrado' then 'sin_timbrar'
    when c.fecha_vencimiento is null then 'vigente'
    when c.fecha_vencimiento < public.hoy() then 'vencido'
    when c.fecha_vencimiento <= public.hoy() + 15 then 'por_vencer'
    else 'vigente'
  end as vigencia,
  (
    select coalesce(jsonb_agg(jsonb_build_object(
      'producto_id', pr.id,
      'nombre', pr.nombre_comercial,
      'principio_activo', pr.principio_activo,
      'organismo', pr.organismo,
      'registro', pr.registro_numero,
      'cantidad', cp.cantidad,
      'unidad', cp.unidad
    ) order by pr.nombre_comercial), '[]'::jsonb)
    from public.certificado_productos cp
    join public.productos pr on pr.id = cp.producto_id
    where cp.certificado_id = c.id
  ) as productos
from public.certificados c
join public.empresas e on e.id = c.empresa_id
join public.rubros r on r.id = c.rubro_id
join public.tecnicos t on t.id = c.tecnico_id
left join public.declaraciones d on d.id = c.declaracion_id
left join public.pagos p on p.id = c.pago_id
left join public.establecimientos es on es.id = c.establecimiento_id;

create or replace view public.v_declaraciones with (security_invoker = on) as
select
  d.*,
  e.nombre_comercial as empresa_nombre,
  e.cuit as empresa_cuit,
  (select count(*) from public.certificados c where c.declaracion_id = d.id)::integer as cantidad_certificados,
  (select count(*) from public.certificados c where c.declaracion_id = d.id and c.firma_hash is null and c.estado in ('borrador', 'observado'))::integer as pendientes_firma,
  (select count(*) from public.certificados c where c.declaracion_id = d.id and c.estado = 'observado')::integer as observados,
  (select min(c.fecha_servicio) from public.certificados c where c.declaracion_id = d.id) as primer_servicio,
  (select max(c.fecha_servicio) from public.certificados c where c.declaracion_id = d.id) as ultimo_servicio
from public.declaraciones d
join public.empresas e on e.id = d.empresa_id;

create or replace view public.v_pagos with (security_invoker = on) as
select
  p.*,
  e.nombre_comercial as empresa_nombre,
  e.cuit as empresa_cuit,
  a.codigo as arancel_codigo,
  a.concepto as arancel_concepto,
  a.ordenanza as arancel_ordenanza,
  a.articulo as arancel_articulo,
  cr.codigo as cuenta_codigo,
  cr.nombre as cuenta_nombre,
  cr.cbu as cuenta_cbu,
  cr.banco as cuenta_banco,
  (select count(*) from public.certificados c where c.pago_id = p.id)::integer as cantidad_certificados
from public.pagos p
left join public.empresas e on e.id = p.empresa_id
join public.aranceles a on a.id = p.arancel_id
join public.cuentas_recaudadoras cr on cr.id = p.cuenta_id;

-- Estado de cada establecimiento frente a sus obligaciones (base de la hoja de ruta).
create or replace view public.v_establecimientos_estado with (security_invoker = on) as
select
  es.*,
  r.nombre as rubro_nombre,
  r.grupo as rubro_grupo,
  r.periodicidad as rubro_periodicidad,
  uf.id as fumigacion_certificado_id,
  uf.numero as fumigacion_numero,
  uf.fecha_servicio as fumigacion_fecha,
  uf.fecha_vencimiento as fumigacion_vencimiento,
  uf.empresa_nombre as fumigacion_empresa,
  case
    when uf.id is null then 'sin_certificado'
    when uf.fecha_vencimiento is null then 'vigente'
    when uf.fecha_vencimiento < public.hoy() then 'vencido'
    when uf.fecha_vencimiento <= public.hoy() + 15 then 'por_vencer'
    else 'vigente'
  end as estado_fumigacion,
  ut.id as tanque_certificado_id,
  ut.numero as tanque_numero,
  ut.fecha_servicio as tanque_fecha,
  ut.fecha_vencimiento as tanque_vencimiento,
  ut.empresa_nombre as tanque_empresa,
  case
    when not es.tiene_tanque then 'no_aplica'
    when ut.id is null then 'sin_certificado'
    when ut.fecha_vencimiento < public.hoy() then 'vencido'
    when ut.fecha_vencimiento <= public.hoy() + 15 then 'por_vencer'
    else 'vigente'
  end as estado_tanque
from public.establecimientos es
left join public.rubros r on r.id = es.rubro_id
left join lateral (
  select c.id, c.numero, c.fecha_servicio, c.fecha_vencimiento, e.nombre_comercial as empresa_nombre
  from public.certificados c
  join public.empresas e on e.id = c.empresa_id
  where c.establecimiento_id = es.id and c.tipo = 'fumigacion' and c.estado = 'timbrado'
  order by c.fecha_servicio desc
  limit 1
) uf on true
left join lateral (
  select c.id, c.numero, c.fecha_servicio, c.fecha_vencimiento, e.nombre_comercial as empresa_nombre
  from public.certificados c
  join public.empresas e on e.id = c.empresa_id
  where c.establecimiento_id = es.id and c.tipo = 'tanque' and c.estado = 'timbrado'
  order by c.fecha_servicio desc
  limit 1
) ut on true
where es.activo;

-- Hoja de ruta: establecimientos con certificados vencidos, por vencer o no presentados.
create or replace view public.v_hoja_ruta with (security_invoker = on) as
select
  v.*,
  case
    when v.estado_fumigacion = 'vencido' or v.estado_tanque = 'vencido' then 1
    when v.estado_fumigacion = 'sin_certificado' or v.estado_tanque = 'sin_certificado' then 2
    else 3
  end as prioridad,
  least(v.fumigacion_vencimiento, v.tanque_vencimiento) as proximo_vencimiento
from public.v_establecimientos_estado v
where v.estado_fumigacion in ('vencido', 'por_vencer', 'sin_certificado')
   or v.estado_tanque in ('vencido', 'por_vencer', 'sin_certificado');

-- Agenda de servicios declarados para inspecciones por muestreo (Art. 10.º b).
create or replace view public.v_agenda_servicios with (security_invoker = on) as
select
  c.id, c.empresa_id, c.tipo, c.numero, c.cliente, c.domicilio, c.fecha_servicio, c.estado,
  c.establecimiento_id, c.superficie_m2,
  e.nombre_comercial as empresa_nombre,
  r.nombre as rubro_nombre,
  t.nombre || ' ' || t.apellido as tecnico_nombre,
  es.lat, es.lng, es.barrio, es.zona,
  exists (select 1 from public.inspecciones i where i.certificado_id = c.id) as inspeccionado
from public.certificados c
join public.empresas e on e.id = c.empresa_id
join public.rubros r on r.id = c.rubro_id
join public.tecnicos t on t.id = c.tecnico_id
left join public.establecimientos es on es.id = c.establecimiento_id
where c.estado in ('declarado', 'controlado', 'timbrado')
  and c.fecha_servicio >= (public.hoy() - 1)::timestamp at time zone 'America/Argentina/Tucuman'
  and c.fecha_servicio < (public.hoy() + 3)::timestamp at time zone 'America/Argentina/Tucuman';

create or replace view public.v_notificaciones with (security_invoker = on) as
select
  n.*,
  case
    when n.estado = 'notificada' and n.vence_at is not null and n.vence_at < now() then 'vencida'
    else n.estado::text
  end as estado_efectivo,
  ip.nombre || ' ' || ip.apellido as inspector_nombre
from public.notificaciones n
left join public.perfiles ip on ip.id = n.inspector_id;

create or replace view public.v_inspecciones with (security_invoker = on) as
select
  i.*,
  e.nombre_comercial as empresa_nombre,
  es.nombre as establecimiento_nombre,
  es.domicilio as establecimiento_domicilio,
  c.numero as certificado_numero,
  d.codigo as denuncia_codigo,
  ip.nombre || ' ' || ip.apellido as inspector_nombre
from public.inspecciones i
left join public.empresas e on e.id = i.empresa_id
left join public.establecimientos es on es.id = i.establecimiento_id
left join public.certificados c on c.id = i.certificado_id
left join public.denuncias d on d.id = i.denuncia_id
left join public.perfiles ip on ip.id = i.inspector_id;

create or replace view public.v_actas with (security_invoker = on) as
select
  a.*,
  e.nombre_comercial as empresa_nombre,
  es.nombre as establecimiento_nombre,
  es.domicilio as establecimiento_domicilio,
  n.numero as notificacion_numero,
  i.codigo as inspeccion_codigo,
  ip.nombre || ' ' || ip.apellido as inspector_nombre
from public.actas a
left join public.empresas e on e.id = a.empresa_id
left join public.establecimientos es on es.id = a.establecimiento_id
left join public.notificaciones n on n.id = a.notificacion_id
left join public.inspecciones i on i.id = a.inspeccion_id
left join public.perfiles ip on ip.id = a.inspector_id;

create or replace view public.v_tramites with (security_invoker = on) as
select
  t.*,
  e.nombre_comercial as empresa_nombre,
  e.cuit as empresa_cuit,
  e.estado as empresa_estado,
  (select count(*) from public.documentos d where d.tramite_id = t.id)::integer as cantidad_documentos
from public.tramites t
join public.empresas e on e.id = t.empresa_id;

create or replace view public.v_documentos with (security_invoker = on) as
select
  d.*,
  e.nombre_comercial as empresa_nombre,
  t.nombre || ' ' || t.apellido as tecnico_nombre
from public.documentos d
join public.empresas e on e.id = d.empresa_id
left join public.tecnicos t on t.id = d.tecnico_id;

create or replace view public.v_memorias_tecnicas with (security_invoker = on) as
select
  ep.*,
  e.nombre_comercial as empresa_nombre,
  p.nombre_comercial as producto_nombre,
  p.principio_activo,
  p.clase,
  p.organismo,
  p.registro_numero,
  p.categoria_toxicologica,
  p.plazo_reingreso_horas
from public.empresa_productos ep
join public.empresas e on e.id = ep.empresa_id
join public.productos p on p.id = ep.producto_id;

create or replace view public.v_envases_saldo with (security_invoker = on) as
select
  m.empresa_id,
  e.nombre_comercial as empresa_nombre,
  m.producto_id,
  p.nombre_comercial as producto_nombre,
  p.organismo,
  p.registro_numero,
  sum(case when m.tipo = 'generado' then m.cantidad else 0 end)::integer as generados,
  sum(case when m.tipo = 'entregado' then m.cantidad else 0 end)::integer as entregados,
  sum(case when m.tipo = 'generado' then m.cantidad else -m.cantidad end)::integer as saldo,
  max(m.fecha) as ultimo_movimiento
from public.envases_movimientos m
join public.empresas e on e.id = m.empresa_id
join public.productos p on p.id = m.producto_id
group by m.empresa_id, e.nombre_comercial, m.producto_id, p.nombre_comercial, p.organismo, p.registro_numero;

-- Recaudación verificada por mes, cuenta y concepto.
create or replace view public.v_recaudacion_mensual with (security_invoker = on) as
select
  date_trunc('month', p.fecha_pago)::date as mes,
  cr.codigo as cuenta_codigo,
  cr.nombre as cuenta_nombre,
  a.codigo as arancel_codigo,
  a.concepto,
  count(*)::integer as cantidad_pagos,
  sum(p.cantidad)::integer as cantidad_unidades,
  sum(p.importe_total) as total
from public.pagos p
join public.aranceles a on a.id = p.arancel_id
join public.cuentas_recaudadoras cr on cr.id = p.cuenta_id
where p.estado = 'verificado' and p.fecha_pago is not null
group by 1, 2, 3, 4, 5;

-- Planilla mensual por empresa (Art. 10.º c).
create or replace view public.v_planilla_mensual with (security_invoker = on) as
select
  c.empresa_id,
  e.nombre_comercial as empresa_nombre,
  e.cuit as empresa_cuit,
  date_trunc('month', c.fecha_servicio at time zone 'America/Argentina/Tucuman')::date as mes,
  c.tipo,
  count(*)::integer as certificados,
  count(*) filter (where c.estado = 'timbrado')::integer as timbrados,
  count(*) filter (where c.estado in ('declarado', 'controlado', 'observado'))::integer as en_proceso,
  count(*) filter (where c.estado = 'anulado')::integer as anulados,
  coalesce(sum(c.superficie_m2), 0) as superficie_total_m2
from public.certificados c
join public.empresas e on e.id = c.empresa_id
where c.estado <> 'borrador'
group by c.empresa_id, e.nombre_comercial, e.cuit, 4, c.tipo;

create or replace view public.v_estadisticas_rubro with (security_invoker = on) as
select
  date_trunc('month', c.fecha_servicio at time zone 'America/Argentina/Tucuman')::date as mes,
  r.grupo,
  r.nombre as rubro,
  c.tipo,
  count(*)::integer as certificados
from public.certificados c
join public.rubros r on r.id = c.rubro_id
where c.estado = 'timbrado'
group by 1, 2, 3, 4;

create or replace view public.v_estadisticas_zona with (security_invoker = on) as
select
  date_trunc('month', c.fecha_servicio at time zone 'America/Argentina/Tucuman')::date as mes,
  coalesce(es.zona, 'Sin zona') as zona,
  coalesce(es.barrio, 'Sin barrio') as barrio,
  c.tipo,
  count(*)::integer as certificados
from public.certificados c
left join public.establecimientos es on es.id = c.establecimiento_id
where c.estado = 'timbrado'
group by 1, 2, 3, 4;

create or replace view public.v_estadisticas_producto with (security_invoker = on) as
select
  date_trunc('month', c.fecha_servicio at time zone 'America/Argentina/Tucuman')::date as mes,
  p.id as producto_id,
  p.nombre_comercial as producto,
  p.principio_activo,
  p.clase,
  cp.unidad,
  count(distinct c.id)::integer as servicios,
  sum(cp.cantidad) as cantidad_total
from public.certificado_productos cp
join public.certificados c on c.id = cp.certificado_id
join public.productos p on p.id = cp.producto_id
where c.estado = 'timbrado'
group by 1, 2, 3, 4, 5, 6;

-- Alertas: vencimientos y pendientes para el staff (y lo propio para cada empresa).
create or replace view public.v_alertas with (security_invoker = on) as
select 'habilitacion_por_vencer'::text as tipo,
  case when e.vencimiento_habilitacion < public.hoy() then 'urgente' else 'alerta' end as nivel,
  'Habilitación ' || case when e.vencimiento_habilitacion < public.hoy() then 'vencida' else 'por vencer' end as titulo,
  e.nombre_comercial || ' · vence el ' || to_char(e.vencimiento_habilitacion, 'DD/MM/YYYY') as detalle,
  e.id as empresa_id,
  e.id as referencia_id,
  e.vencimiento_habilitacion::timestamptz as fecha
from public.empresas e
where e.estado = 'habilitada' and e.vencimiento_habilitacion <= public.hoy() + 30
union all
select 'documento_por_vencer', case when d.vence < public.hoy() then 'urgente' else 'alerta' end,
  'Documento ' || case when d.vence < public.hoy() then 'vencido' else 'por vencer' end,
  e.nombre_comercial || ' · ' || replace(d.tipo::text, '_', ' ') || ' · ' || to_char(d.vence, 'DD/MM/YYYY'),
  d.empresa_id, d.id, d.vence::timestamptz
from public.documentos d
join public.empresas e on e.id = d.empresa_id
where d.vence is not null and d.vence <= public.hoy() + 30 and d.estado <> 'rechazado'
union all
select 'pago_a_verificar', 'info', 'Pago informado a verificar',
  coalesce(e.nombre_comercial, p.contribuyente) || ' · ' || p.codigo, p.empresa_id, p.id, p.informado_at
from public.pagos p
left join public.empresas e on e.id = p.empresa_id
where p.estado = 'informado'
union all
select 'declaracion_a_controlar', 'info', 'Declaración presentada para controlar',
  e.nombre_comercial || ' · ' || d.codigo, d.empresa_id, d.id, d.presentada_at
from public.declaraciones d
join public.empresas e on e.id = d.empresa_id
where d.estado = 'presentada'
union all
select 'declaracion_observada', 'alerta', 'Declaración observada',
  e.nombre_comercial || ' · ' || d.codigo, d.empresa_id, d.id, d.controlada_at
from public.declaraciones d
join public.empresas e on e.id = d.empresa_id
where d.estado = 'observada'
union all
select 'notificacion_vencida', 'urgente', 'Notificación con plazo vencido',
  n.razon_social || ' · N.º ' || n.numero, n.empresa_id, n.id, n.vence_at
from public.notificaciones n
where n.estado = 'notificada' and n.vence_at < now()
union all
select 'tramite_pendiente', 'info', 'Trámite pendiente de resolución',
  e.nombre_comercial || ' · ' || t.codigo || ' · ' || replace(t.tipo::text, '_', ' '), t.empresa_id, t.id, t.presentado_at
from public.tramites t
join public.empresas e on e.id = t.empresa_id
where t.estado = 'presentado';

-- Permisos de las vistas: solo usuarios autenticados (la RLS hace el resto).
do $$
declare
  v text;
begin
  foreach v in array array[
    'v_empresas', 'v_certificados', 'v_declaraciones', 'v_pagos', 'v_establecimientos_estado', 'v_hoja_ruta',
    'v_agenda_servicios', 'v_notificaciones', 'v_inspecciones', 'v_actas', 'v_tramites', 'v_documentos',
    'v_memorias_tecnicas', 'v_envases_saldo', 'v_recaudacion_mensual', 'v_planilla_mensual',
    'v_estadisticas_rubro', 'v_estadisticas_zona', 'v_estadisticas_producto', 'v_alertas'
  ] loop
    execute format('revoke all on public.%I from anon, authenticated', v);
    execute format('grant select on public.%I to authenticated', v);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC del circuito de prestadores
-- -----------------------------------------------------------------------------

-- Solicitud de inscripción en el registro (SITREPE Art. 6.º; Ord. 2681/98 Art. 4.º).
create or replace function public.solicitar_inscripcion(p_datos jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles;
  v_empresa uuid;
begin
  select * into v_perfil from public.perfiles where id = (select auth.uid());
  if v_perfil.id is null or v_perfil.rol not in ('empresa', 'tecnico') then
    raise exception 'Solo una cuenta de prestador puede solicitar la inscripción' using errcode = 'P0001';
  end if;
  if v_perfil.empresa_id is not null then
    raise exception 'Su cuenta ya está vinculada a una empresa' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_datos ->> 'nombre_comercial'), '') = '' or coalesce(trim(p_datos ->> 'cuit'), '') = '' then
    raise exception 'Nombre comercial y CUIT son obligatorios' using errcode = 'P0001';
  end if;
  if (p_datos ->> 'cuit') !~ '^\d{2}-\d{8}-\d$' then
    raise exception 'CUIT inválido: use el formato 20-12345678-9' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.empresas e where e.cuit = p_datos ->> 'cuit') then
    raise exception 'Ya existe una empresa registrada con el CUIT %', p_datos ->> 'cuit' using errcode = 'P0001';
  end if;

  insert into public.empresas (
    nombre_comercial, titular, tipo_persona, cuit, email, telefono, domicilio_oficina, domicilio_deposito,
    habilitacion_comercial, habilita_fumigacion, habilita_tanques, estado
  ) values (
    trim(p_datos ->> 'nombre_comercial'),
    nullif(trim(p_datos ->> 'titular'), ''),
    coalesce(nullif(p_datos ->> 'tipo_persona', ''), 'humana'),
    p_datos ->> 'cuit',
    coalesce(nullif(p_datos ->> 'email', ''), v_perfil.email),
    nullif(p_datos ->> 'telefono', ''),
    nullif(p_datos ->> 'domicilio_oficina', ''),
    nullif(p_datos ->> 'domicilio_deposito', ''),
    nullif(p_datos ->> 'habilitacion_comercial', ''),
    true,
    coalesce((p_datos ->> 'habilita_tanques')::boolean, false),
    'en_tramite'
  ) returning id into v_empresa;

  update public.perfiles set empresa_id = v_empresa where id = v_perfil.id;

  insert into public.tramites (empresa_id, tipo, estado, datos)
  values (v_empresa, 'inscripcion', 'presentado', p_datos);

  return v_empresa;
end;
$$;

-- Firma digital de certificados por el asesor técnico registrado (evita "firma incorrecta").
create or replace function public.firmar_certificados(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tecnico uuid := public.tecnico_actual();
  v_n integer;
begin
  if v_tecnico is null then
    raise exception 'Solo el asesor técnico registrado en el padrón puede firmar certificados' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.tecnicos t where t.id = v_tecnico and t.estado <> 'aprobado') then
    raise exception 'Su registro como asesor técnico no está aprobado' using errcode = 'P0001';
  end if;
  update public.certificados c
  set firmado_at = now(),
      firmado_por = (select auth.uid()),
      firma_hash = encode(sha256(convert_to(concat_ws('|',
        c.id, c.empresa_id, c.tipo, c.numero, c.cliente, c.domicilio, c.rubro_id, c.superficie_m2,
        c.capacidad_litros, c.fecha_servicio, c.tecnico_id, now()), 'UTF8')), 'hex')
  where c.id = any (p_ids) and c.tecnico_id = v_tecnico and c.estado in ('borrador', 'observado');
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Presentación de la planilla: 24 a 48 h antes del servicio (Art. 9.º a), empresa habilitada.
create or replace function public.presentar_declaracion(p_declaracion uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dec public.declaraciones;
  v_min integer := public.parametro_int('antelacion_min_horas', 24);
  v_max integer := public.parametro_int('antelacion_max_horas', 48);
  v_cert record;
  v_count integer := 0;
  v_errores text[] := '{}';
begin
  select * into v_dec from public.declaraciones where id = p_declaracion for update;
  if v_dec.id is null or v_dec.empresa_id is distinct from public.empresa_actual() then
    raise exception 'Declaración inexistente o sin permisos' using errcode = 'P0001';
  end if;
  if v_dec.estado not in ('borrador', 'observada') then
    raise exception 'La declaración % ya fue presentada', v_dec.codigo using errcode = 'P0001';
  end if;
  if not public.empresa_habilitada(v_dec.empresa_id, v_dec.tipo) then
    raise exception 'La empresa no está habilitada para %',
      case v_dec.tipo when 'fumigacion' then 'servicios de fumigación' else 'limpieza de tanques' end
      using errcode = 'P0001';
  end if;

  for v_cert in
    select * from public.certificados where declaracion_id = p_declaracion and estado in ('borrador', 'observado')
  loop
    v_count := v_count + 1;
    if v_cert.firma_hash is null then
      v_errores := v_errores || format('Certificado %s: falta la firma del asesor técnico.', v_cert.numero);
    end if;
    if v_cert.tipo = 'fumigacion' then
      if v_cert.fecha_servicio < now() + make_interval(hours => v_min)
         or v_cert.fecha_servicio > now() + make_interval(hours => v_max) then
        v_errores := v_errores || format('Certificado %s: el servicio debe declararse entre %s y %s horas antes de realizarse.',
          v_cert.numero, v_min, v_max);
      end if;
      if not exists (select 1 from public.certificado_productos cp where cp.certificado_id = v_cert.id) then
        v_errores := v_errores || format('Certificado %s: indique al menos un producto aplicado.', v_cert.numero);
      end if;
    else
      if v_cert.fecha_servicio > now() then
        v_errores := v_errores || format('Certificado %s: la limpieza de tanque se declara una vez realizada.', v_cert.numero);
      end if;
      if v_cert.analisis_bacteriologico_path is null or v_cert.analisis_fisicoquimico_path is null then
        v_errores := v_errores || format('Certificado %s: adjunte los análisis bacteriológico y físico-químico del agua.', v_cert.numero);
      end if;
    end if;
  end loop;

  if v_count = 0 then
    raise exception 'La declaración no tiene certificados para presentar' using errcode = 'P0001';
  end if;
  if coalesce(array_length(v_errores, 1), 0) > 0 then
    raise exception '%', array_to_string(v_errores, E'\n') using errcode = 'P0001';
  end if;

  update public.certificados set estado = 'declarado', observaciones = null
  where declaracion_id = p_declaracion and estado in ('borrador', 'observado');
  update public.declaraciones
  set estado = 'presentada', presentada_at = now(), presentada_por = (select auth.uid())
  where id = p_declaracion;
end;
$$;

-- Control de la planilla por el área (Art. 10.º a). p_observados: [{"certificado_id": "...", "motivo": "..."}]
create or replace function public.controlar_declaracion(
  p_declaracion uuid,
  p_observados jsonb default '[]'::jsonb,
  p_observaciones text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dec public.declaraciones;
  v_n_obs integer;
begin
  if not public.puede_controlar() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;
  select * into v_dec from public.declaraciones where id = p_declaracion for update;
  if v_dec.id is null or v_dec.estado <> 'presentada' then
    raise exception 'Solo pueden controlarse declaraciones presentadas' using errcode = 'P0001';
  end if;

  update public.certificados c
  set estado = 'observado', observaciones = o.motivo
  from jsonb_to_recordset(coalesce(p_observados, '[]'::jsonb)) as o (certificado_id uuid, motivo text)
  where c.id = o.certificado_id and c.declaracion_id = p_declaracion and c.estado = 'declarado';
  get diagnostics v_n_obs = row_count;

  update public.certificados set estado = 'controlado'
  where declaracion_id = p_declaracion and estado = 'declarado';

  update public.declaraciones
  set estado = case when v_n_obs > 0 then 'observada'::public.estado_declaracion else 'controlada'::public.estado_declaracion end,
      controlada_at = now(),
      controlada_por = (select auth.uid()),
      observaciones = p_observaciones
  where id = p_declaracion;
end;
$$;

create or replace function public.rechazar_declaracion(p_declaracion uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.puede_controlar() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Indique el motivo del rechazo' using errcode = 'P0001';
  end if;
  update public.certificados set estado = 'anulado', anulado_motivo = p_motivo
  where declaracion_id = p_declaracion and estado in ('declarado', 'observado', 'controlado') and pago_id is null;
  update public.declaraciones
  set estado = 'rechazada', controlada_at = now(), controlada_por = (select auth.uid()), observaciones = p_motivo
  where id = p_declaracion and estado in ('presentada', 'observada');
  if not found then
    raise exception 'La declaración no puede rechazarse en su estado actual' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.anular_certificado(p_certificado uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.puede_controlar() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Indique el motivo de la anulación' using errcode = 'P0001';
  end if;
  update public.certificados set estado = 'anulado', anulado_motivo = p_motivo
  where id = p_certificado and estado <> 'anulado';
  if not found then
    raise exception 'Certificado inexistente o ya anulado' using errcode = 'P0001';
  end if;
end;
$$;

-- Liquidación del timbrado: un arancel por certificado (no por ejemplar).
create or replace function public.generar_liquidacion(p_certificados uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_actual();
  v_tipos integer;
  v_tipo text;
  v_n integer;
  v_arancel public.aranceles;
  v_pago uuid;
begin
  if v_empresa is null then
    raise exception 'Solo las empresas pueden generar liquidaciones de timbrado' using errcode = 'P0001';
  end if;
  if coalesce(cardinality(p_certificados), 0) = 0 then
    raise exception 'Seleccione al menos un certificado' using errcode = 'P0001';
  end if;

  select count(distinct c.tipo), min(c.tipo::text), count(*)
  into v_tipos, v_tipo, v_n
  from public.certificados c
  where c.id = any (p_certificados) and c.empresa_id = v_empresa and c.estado = 'controlado'
    and (c.pago_id is null or exists (select 1 from public.pagos p where p.id = c.pago_id and p.estado = 'anulado'));

  if v_n <> cardinality(p_certificados) then
    raise exception 'Solo pueden liquidarse certificados controlados por el área y sin pago asociado' using errcode = 'P0001';
  end if;
  if v_tipos > 1 then
    raise exception 'Liquide por separado los certificados de fumigación y los de limpieza de tanques' using errcode = 'P0001';
  end if;

  v_arancel := public.arancel_vigente(case v_tipo when 'fumigacion' then 'TIMBRADO_CERTIFICADO' else 'LIMPIEZA_TANQUE' end);
  if v_arancel.id is null then
    raise exception 'No hay un arancel vigente configurado para este concepto' using errcode = 'P0001';
  end if;

  insert into public.pagos (empresa_id, arancel_id, cuenta_id, cantidad, importe_unitario, importe_total, medio, estado)
  values (v_empresa, v_arancel.id, v_arancel.cuenta_id, v_n, v_arancel.importe, round(v_arancel.importe * v_n, 2),
          'transferencia', 'pendiente')
  returning id into v_pago;

  update public.certificados set pago_id = v_pago where id = any (p_certificados);
  return v_pago;
end;
$$;

-- La empresa informa la transferencia con su comprobante.
create or replace function public.informar_pago(
  p_pago uuid,
  p_medio public.medio_pago,
  p_numero_operacion text,
  p_fecha_pago date,
  p_comprobante_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pagos;
begin
  select * into v_pago from public.pagos where id = p_pago for update;
  if v_pago.id is null or v_pago.empresa_id is distinct from public.empresa_actual() then
    raise exception 'Liquidación inexistente o sin permisos' using errcode = 'P0001';
  end if;
  if v_pago.estado not in ('pendiente', 'rechazado') then
    raise exception 'La liquidación % no admite informar un pago en su estado actual', v_pago.codigo using errcode = 'P0001';
  end if;
  if coalesce(trim(p_comprobante_path), '') = '' and coalesce(trim(p_numero_operacion), '') = '' then
    raise exception 'Adjunte el comprobante o indique el número de operación' using errcode = 'P0001';
  end if;
  if p_fecha_pago is null or p_fecha_pago > public.hoy() then
    raise exception 'Indique una fecha de pago válida' using errcode = 'P0001';
  end if;
  update public.pagos
  set medio = p_medio, numero_operacion = nullif(trim(p_numero_operacion), ''), fecha_pago = p_fecha_pago,
      comprobante_path = nullif(trim(p_comprobante_path), ''), estado = 'informado', informado_at = now()
  where id = p_pago;
end;
$$;

create or replace function public.anular_liquidacion(p_pago uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pagos;
begin
  select * into v_pago from public.pagos where id = p_pago for update;
  if v_pago.id is null
     or not (v_pago.empresa_id = public.empresa_actual() or public.puede_controlar()) then
    raise exception 'Liquidación inexistente o sin permisos' using errcode = 'P0001';
  end if;
  if v_pago.estado not in ('pendiente', 'rechazado') then
    raise exception 'Solo pueden anularse liquidaciones pendientes o rechazadas' using errcode = 'P0001';
  end if;
  update public.certificados set pago_id = null where pago_id = p_pago and estado = 'controlado';
  update public.pagos set estado = 'anulado' where id = p_pago;
end;
$$;

-- Conciliación: al verificar el pago se timbran sus certificados (trigger pagos_timbrar).
create or replace function public.verificar_pago(p_pago uuid, p_aprobar boolean, p_observaciones text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pagos;
begin
  if not public.puede_controlar() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;
  select * into v_pago from public.pagos where id = p_pago for update;
  if v_pago.id is null or v_pago.estado not in ('informado', 'pendiente') then
    raise exception 'Solo pueden verificarse pagos informados o pendientes' using errcode = 'P0001';
  end if;
  if p_aprobar then
    if v_pago.fecha_pago is null then
      raise exception 'El pago no tiene fecha de acreditación informada' using errcode = 'P0001';
    end if;
    update public.pagos
    set estado = 'verificado', verificado_por = (select auth.uid()), verificado_at = now(),
        observaciones = coalesce(p_observaciones, observaciones)
    where id = p_pago;
  else
    if coalesce(trim(p_observaciones), '') = '' then
      raise exception 'Indique el motivo del rechazo' using errcode = 'P0001';
    end if;
    update public.pagos set estado = 'rechazado', observaciones = p_observaciones where id = p_pago;
  end if;
end;
$$;

-- Resolución de trámites del registro.
create or replace function public.resolver_tramite(
  p_tramite uuid,
  p_decision text,
  p_observaciones text default null,
  p_resolucion text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tramite public.tramites;
  v_anio integer;
begin
  if not public.puede_controlar() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;
  if p_decision not in ('aprobar', 'observar', 'rechazar') then
    raise exception 'Decisión inválida' using errcode = 'P0001';
  end if;
  select * into v_tramite from public.tramites where id = p_tramite for update;
  if v_tramite.id is null or v_tramite.estado not in ('presentado', 'observado') then
    raise exception 'El trámite no está pendiente de resolución' using errcode = 'P0001';
  end if;
  if p_decision <> 'aprobar' and coalesce(trim(p_observaciones), '') = '' then
    raise exception 'Indique las observaciones o el motivo' using errcode = 'P0001';
  end if;

  if p_decision = 'aprobar' then
    case v_tramite.tipo
      when 'inscripcion' then
        if coalesce(trim(p_resolucion), '') = '' then
          raise exception 'Indique el número de resolución DSA de autorización' using errcode = 'P0001';
        end if;
        update public.empresas e
        set estado = 'habilitada',
            resolucion_dsa = p_resolucion,
            fecha_habilitacion = public.hoy(),
            vencimiento_habilitacion = make_date(extract(year from public.hoy())::integer + 1, 3, 31),
            numero_registro = coalesce(e.numero_registro, (select coalesce(max(x.numero_registro), 0) + 1 from public.empresas x)),
            habilita_tanques = coalesce((v_tramite.datos ->> 'habilita_tanques')::boolean, e.habilita_tanques)
        where e.id = v_tramite.empresa_id;
      when 'renovacion' then
        v_anio := coalesce((v_tramite.datos ->> 'anio')::integer, extract(year from public.hoy())::integer - 1);
        update public.empresas e
        set estado = 'habilitada',
            vencimiento_habilitacion = greatest(coalesce(e.vencimiento_habilitacion, public.hoy()), make_date(v_anio + 2, 3, 31))
        where e.id = v_tramite.empresa_id;
      when 'cambio_tecnico' then
        update public.tecnicos t
        set estado = 'aprobado', fecha_alta = coalesce(t.fecha_alta, public.hoy())
        where t.id = (v_tramite.datos ->> 'tecnico_id')::uuid and t.empresa_id = v_tramite.empresa_id;
        if (v_tramite.datos ->> 'tecnico_baja_id') is not null then
          update public.tecnicos t set estado = 'baja', fecha_baja = public.hoy()
          where t.id = (v_tramite.datos ->> 'tecnico_baja_id')::uuid and t.empresa_id = v_tramite.empresa_id;
        end if;
      when 'cambio_domicilio' then
        update public.empresas e
        set domicilio_oficina = coalesce(nullif(v_tramite.datos ->> 'domicilio_oficina', ''), e.domicilio_oficina),
            domicilio_deposito = coalesce(nullif(v_tramite.datos ->> 'domicilio_deposito', ''), e.domicilio_deposito)
        where e.id = v_tramite.empresa_id;
      when 'alta_producto' then
        update public.empresa_productos ep
        set estado = 'aprobado', revisado_por = (select auth.uid()), revisado_at = now()
        where ep.id = (v_tramite.datos ->> 'empresa_producto_id')::uuid and ep.empresa_id = v_tramite.empresa_id;
      when 'baja' then
        update public.empresas e set estado = 'baja' where e.id = v_tramite.empresa_id;
    end case;
  end if;

  update public.tramites
  set estado = case p_decision
        when 'aprobar' then 'aprobado'::public.estado_tramite
        when 'observar' then 'observado'::public.estado_tramite
        else 'rechazado'::public.estado_tramite end,
      resuelto_at = case when p_decision = 'observar' then null else now() end,
      resuelto_por = (select auth.uid()),
      resolucion = coalesce(p_resolucion, resolucion),
      observaciones = p_observaciones
  where id = p_tramite;
end;
$$;

-- Administración de usuarios (rol, empresa y técnico vinculados).
create or replace function public.admin_actualizar_perfil(
  p_perfil uuid,
  p_rol public.rol_usuario,
  p_empresa uuid,
  p_tecnico uuid,
  p_activo boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;
  if p_perfil = (select auth.uid()) and (p_rol <> 'admin' or not p_activo) then
    raise exception 'No puede quitarse a sí mismo el rol de administración' using errcode = 'P0001';
  end if;
  if p_rol in ('empresa', 'tecnico') and p_empresa is null then
    raise exception 'Los usuarios de empresa deben estar vinculados a una empresa' using errcode = 'P0001';
  end if;
  if p_rol = 'tecnico' and (p_tecnico is null or not exists (
    select 1 from public.tecnicos t where t.id = p_tecnico and t.empresa_id = p_empresa)) then
    raise exception 'El usuario técnico debe vincularse a un asesor técnico de la empresa' using errcode = 'P0001';
  end if;
  update public.perfiles
  set rol = p_rol,
      empresa_id = case when p_rol in ('empresa', 'tecnico') then p_empresa else null end,
      tecnico_id = case when p_rol = 'tecnico' then p_tecnico else null end,
      activo = p_activo
  where id = p_perfil;
end;
$$;

-- Indicadores del panel de gestión.
create or replace function public.dashboard_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_mes_inicio timestamptz := date_trunc('month', now() at time zone 'America/Argentina/Tucuman') at time zone 'America/Argentina/Tucuman';
  v jsonb;
begin
  if not public.es_staff() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;
  select jsonb_build_object(
    'empresas', jsonb_build_object(
      'habilitadas', (select count(*) from public.empresas where estado = 'habilitada' and (vencimiento_habilitacion is null or vencimiento_habilitacion >= public.hoy())),
      'con_tanques', (select count(*) from public.empresas where estado = 'habilitada' and habilita_tanques),
      'en_tramite', (select count(*) from public.empresas where estado = 'en_tramite'),
      'vencidas', (select count(*) from public.empresas where estado = 'vencida' or (estado = 'habilitada' and vencimiento_habilitacion < public.hoy())),
      'suspendidas', (select count(*) from public.empresas where estado = 'suspendida'),
      'por_vencer_30', (select count(*) from public.empresas where estado = 'habilitada' and vencimiento_habilitacion between public.hoy() and public.hoy() + 30)
    ),
    'certificados', jsonb_build_object(
      'mes', (select count(*) from public.certificados where fecha_servicio >= v_mes_inicio and estado <> 'anulado' and estado <> 'borrador'),
      'timbrados_mes', (select count(*) from public.certificados where timbrado_at >= v_mes_inicio),
      'a_controlar', (select count(*) from public.certificados where estado = 'declarado'),
      'pendientes_pago', (select count(*) from public.certificados where estado = 'controlado'),
      'vigentes', (select count(*) from public.certificados where estado = 'timbrado' and (fecha_vencimiento is null or fecha_vencimiento >= public.hoy()))
    ),
    'pagos', jsonb_build_object(
      'a_verificar', (select count(*) from public.pagos where estado = 'informado'),
      'recaudado_mes', (select coalesce(sum(importe_total), 0) from public.pagos where estado = 'verificado' and fecha_pago >= v_mes_inicio::date),
      'recaudado_mes_505', (select coalesce(sum(p.importe_total), 0) from public.pagos p join public.cuentas_recaudadoras c on c.id = p.cuenta_id where p.estado = 'verificado' and p.fecha_pago >= v_mes_inicio::date and c.codigo = '505'),
      'recaudado_mes_091', (select coalesce(sum(p.importe_total), 0) from public.pagos p join public.cuentas_recaudadoras c on c.id = p.cuenta_id where p.estado = 'verificado' and p.fecha_pago >= v_mes_inicio::date and c.codigo = '091')
    ),
    'fiscalizacion', jsonb_build_object(
      'establecimientos_vencidos', (select count(*) from public.v_establecimientos_estado where estado_fumigacion = 'vencido' or estado_tanque = 'vencido'),
      'establecimientos_sin_certificado', (select count(*) from public.v_establecimientos_estado where estado_fumigacion = 'sin_certificado' or estado_tanque = 'sin_certificado'),
      'notificaciones_vencidas', (select count(*) from public.notificaciones where estado = 'notificada' and vence_at < now()),
      'inspecciones_programadas_hoy', (select count(*) from public.inspecciones where estado = 'programada' and fecha_programada = public.hoy()),
      'actas_mes', (select count(*) from public.actas where fecha >= v_mes_inicio),
      'denuncias_abiertas', (select count(*) from public.denuncias where estado in ('recibida', 'en_curso', 'inspeccion_programada'))
    ),
    'tramites_pendientes', (select count(*) from public.tramites where estado = 'presentado'),
    'serie_certificados', (
      select coalesce(jsonb_agg(jsonb_build_object('mes', to_char(m.mes, 'YYYY-MM'), 'fumigacion', m.fum, 'tanque', m.tan) order by m.mes), '[]'::jsonb)
      from (
        select gs.mes,
          (select count(*) from public.certificados c where c.estado = 'timbrado' and c.tipo = 'fumigacion'
             and date_trunc('month', c.fecha_servicio at time zone 'America/Argentina/Tucuman') = gs.mes) as fum,
          (select count(*) from public.certificados c where c.estado = 'timbrado' and c.tipo = 'tanque'
             and date_trunc('month', c.fecha_servicio at time zone 'America/Argentina/Tucuman') = gs.mes) as tan
        from generate_series(
          date_trunc('month', now() at time zone 'America/Argentina/Tucuman') - interval '11 months',
          date_trunc('month', now() at time zone 'America/Argentina/Tucuman'),
          interval '1 month') as gs (mes)
      ) m
    ),
    'serie_recaudacion', (
      select coalesce(jsonb_agg(jsonb_build_object('mes', to_char(m.mes, 'YYYY-MM'), 'c505', m.c505, 'c091', m.c091) order by m.mes), '[]'::jsonb)
      from (
        select gs.mes,
          (select coalesce(sum(p.importe_total), 0) from public.pagos p join public.cuentas_recaudadoras c on c.id = p.cuenta_id
             where p.estado = 'verificado' and c.codigo = '505' and date_trunc('month', p.fecha_pago) = gs.mes) as c505,
          (select coalesce(sum(p.importe_total), 0) from public.pagos p join public.cuentas_recaudadoras c on c.id = p.cuenta_id
             where p.estado = 'verificado' and c.codigo = '091' and date_trunc('month', p.fecha_pago) = gs.mes) as c091
        from generate_series(
          date_trunc('month', now() at time zone 'America/Argentina/Tucuman') - interval '11 months',
          date_trunc('month', now() at time zone 'America/Argentina/Tucuman'),
          interval '1 month') as gs (mes)
      ) m
    )
  ) into v;
  return v;
end;
$$;

-- Informe mensual de recaudación para la Secretaría de Ingresos Municipales (Expte. 500004/26).
create or replace function public.informe_recaudacion(p_anio integer, p_mes integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_desde date := make_date(p_anio, p_mes, 1);
  v_hasta date := (make_date(p_anio, p_mes, 1) + interval '1 month')::date;
begin
  if not public.es_staff() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'anio', p_anio,
    'mes', p_mes,
    'total', (select coalesce(sum(p.importe_total), 0) from public.pagos p
              where p.estado = 'verificado' and p.fecha_pago >= v_desde and p.fecha_pago < v_hasta),
    'cuentas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', cr.codigo, 'nombre', cr.nombre, 'banco', cr.banco, 'cbu', cr.cbu, 'numero_cuenta', cr.numero_cuenta,
        'medios_pago', cr.medios_pago,
        'total', (select coalesce(sum(p.importe_total), 0) from public.pagos p
                  where p.cuenta_id = cr.id and p.estado = 'verificado' and p.fecha_pago >= v_desde and p.fecha_pago < v_hasta),
        'conceptos', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'concepto', a.concepto, 'ordenanza', a.ordenanza, 'articulo', a.articulo, 'importe_unitario', a.importe,
            'cantidad', x.cantidad, 'pagos', x.pagos, 'total', x.total) order by a.concepto), '[]'::jsonb)
          from (
            select p.arancel_id, sum(p.cantidad)::integer as cantidad, count(*)::integer as pagos, sum(p.importe_total) as total
            from public.pagos p
            where p.cuenta_id = cr.id and p.estado = 'verificado' and p.fecha_pago >= v_desde and p.fecha_pago < v_hasta
            group by p.arancel_id
          ) x
          join public.aranceles a on a.id = x.arancel_id
        )
      ) order by cr.codigo desc), '[]'::jsonb)
      from public.cuentas_recaudadoras cr
    ),
    'movimientos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fecha_pago', p.fecha_pago, 'codigo', p.codigo, 'contribuyente', coalesce(e.nombre_comercial, p.contribuyente),
        'cuit', coalesce(e.cuit, p.contribuyente_cuit), 'concepto', a.concepto, 'cuenta', cr.codigo, 'medio', p.medio,
        'numero_operacion', p.numero_operacion, 'cantidad', p.cantidad, 'importe', p.importe_total
      ) order by p.fecha_pago, p.codigo), '[]'::jsonb)
      from public.pagos p
      left join public.empresas e on e.id = p.empresa_id
      join public.aranceles a on a.id = p.arancel_id
      join public.cuentas_recaudadoras cr on cr.id = p.cuenta_id
      where p.estado = 'verificado' and p.fecha_pago >= v_desde and p.fecha_pago < v_hasta
    )
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC públicas (portal): datos acotados, sin exponer tablas.
-- -----------------------------------------------------------------------------
create or replace function public.portal_empresas()
returns table (
  id uuid,
  numero_registro integer,
  nombre_comercial text,
  titular text,
  cuit text,
  telefono text,
  email text,
  domicilio_oficina text,
  habilitacion_comercial text,
  resolucion_dsa text,
  habilita_fumigacion boolean,
  habilita_tanques boolean,
  vencimiento_habilitacion date
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.numero_registro, e.nombre_comercial, e.titular, e.cuit, e.telefono, e.email, e.domicilio_oficina,
         e.habilitacion_comercial, e.resolucion_dsa, e.habilita_fumigacion, e.habilita_tanques, e.vencimiento_habilitacion
  from public.empresas e
  where e.estado = 'habilitada' and (e.vencimiento_habilitacion is null or e.vencimiento_habilitacion >= public.hoy())
  order by e.numero_registro nulls last, e.nombre_comercial
$$;

create or replace function public.portal_empresa(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'numero_registro', e.numero_registro, 'nombre_comercial', e.nombre_comercial, 'titular', e.titular,
    'cuit', e.cuit, 'telefono', e.telefono, 'email', e.email, 'domicilio_oficina', e.domicilio_oficina,
    'habilitacion_comercial', e.habilitacion_comercial, 'resolucion_dsa', e.resolucion_dsa,
    'habilita_fumigacion', e.habilita_fumigacion, 'habilita_tanques', e.habilita_tanques,
    'vencimiento_habilitacion', e.vencimiento_habilitacion,
    'tecnicos', (select coalesce(jsonb_agg(jsonb_build_object('nombre', t.nombre || ' ' || t.apellido, 'titulo', t.titulo,
                   'representante', t.es_representante) order by t.es_representante desc, t.apellido), '[]'::jsonb)
                 from public.tecnicos t where t.empresa_id = e.id and t.estado = 'aprobado'),
    'productos', (select coalesce(jsonb_agg(jsonb_build_object('nombre', p.nombre_comercial, 'principio_activo', p.principio_activo,
                   'clase', p.clase, 'organismo', p.organismo, 'registro', p.registro_numero,
                   'plazo_reingreso_horas', p.plazo_reingreso_horas) order by p.nombre_comercial), '[]'::jsonb)
                  from public.empresa_productos ep join public.productos p on p.id = ep.producto_id
                  where ep.empresa_id = e.id and ep.estado = 'aprobado')
  )
  from public.empresas e
  where e.id = p_id and e.estado = 'habilitada'
    and (e.vencimiento_habilitacion is null or e.vencimiento_habilitacion >= public.hoy())
$$;

create or replace function public.portal_estadisticas()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'empresas_habilitadas', (select count(*) from public.empresas e where e.estado = 'habilitada'
                             and (e.vencimiento_habilitacion is null or e.vencimiento_habilitacion >= public.hoy())),
    'empresas_tanques', (select count(*) from public.empresas e where e.estado = 'habilitada' and e.habilita_tanques
                         and (e.vencimiento_habilitacion is null or e.vencimiento_habilitacion >= public.hoy())),
    'certificados_vigentes', (select count(*) from public.certificados c where c.estado = 'timbrado'
                              and (c.fecha_vencimiento is null or c.fecha_vencimiento >= public.hoy())),
    'certificados_mes', (select count(*) from public.certificados c where c.estado = 'timbrado'
                         and c.timbrado_at >= date_trunc('month', now() at time zone 'America/Argentina/Tucuman') at time zone 'America/Argentina/Tucuman'),
    'establecimientos_al_dia', (select count(*) from public.v_establecimientos_estado v where v.estado_fumigacion in ('vigente', 'por_vencer'))
  )
$$;

-- Verificación pública de un certificado por su código QR o su sello.
create or replace function public.verificar_certificado(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'numero', c.numero,
    'tipo', c.tipo,
    'codigo_verificacion', c.codigo_verificacion,
    'sello_codigo', c.sello_codigo,
    'estado', c.estado,
    'vigencia', case
      when c.estado = 'anulado' then 'anulado'
      when c.estado <> 'timbrado' then 'sin_timbrar'
      when c.fecha_vencimiento is not null and c.fecha_vencimiento < public.hoy() then 'vencido'
      else 'vigente' end,
    'cliente', c.cliente,
    'domicilio', c.domicilio,
    'rubro', r.nombre,
    'rubro_grupo', r.grupo,
    'superficie_m2', c.superficie_m2,
    'capacidad_litros', c.capacidad_litros,
    'fecha_servicio', c.fecha_servicio,
    'fecha_vencimiento', c.fecha_vencimiento,
    'timbrado_at', c.timbrado_at,
    'plazo_reingreso_horas', c.plazo_reingreso_horas,
    'firmado', c.firma_hash is not null,
    'empresa', jsonb_build_object(
      'id', e.id, 'nombre', e.nombre_comercial, 'cuit', e.cuit, 'numero_registro', e.numero_registro,
      'resolucion_dsa', e.resolucion_dsa, 'habilitada', public.empresa_habilitada(e.id, c.tipo)),
    'tecnico', jsonb_build_object('nombre', t.nombre || ' ' || t.apellido, 'titulo', t.titulo, 'matricula', t.matricula),
    'productos', (select coalesce(jsonb_agg(jsonb_build_object('nombre', p.nombre_comercial, 'principio_activo', p.principio_activo,
                    'organismo', p.organismo, 'registro', p.registro_numero, 'cantidad', cp.cantidad, 'unidad', cp.unidad,
                    'plazo_reingreso_horas', p.plazo_reingreso_horas) order by p.nombre_comercial), '[]'::jsonb)
                  from public.certificado_productos cp join public.productos p on p.id = cp.producto_id
                  where cp.certificado_id = c.id)
  )
  from public.certificados c
  join public.empresas e on e.id = c.empresa_id
  join public.rubros r on r.id = c.rubro_id
  join public.tecnicos t on t.id = c.tecnico_id
  where c.estado <> 'borrador'
    and (upper(c.codigo_verificacion) = upper(trim(p_codigo)) or upper(c.sello_codigo) = upper(trim(p_codigo)))
  limit 1
$$;

-- Denuncias vecinales.
create or replace function public.crear_denuncia(
  p_tipo public.tipo_denuncia,
  p_descripcion text,
  p_domicilio text default null,
  p_empresa_mencionada text default null,
  p_nombre text default null,
  p_contacto text default null,
  p_anonima boolean default false
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_codigo text;
begin
  if length(coalesce(trim(p_descripcion), '')) < 10 then
    raise exception 'Describa la situación con al menos 10 caracteres' using errcode = 'P0001';
  end if;
  if not p_anonima and coalesce(trim(p_contacto), '') = '' then
    raise exception 'Indique un medio de contacto o marque la denuncia como anónima' using errcode = 'P0001';
  end if;
  insert into public.denuncias (tipo, descripcion, domicilio, empresa_mencionada, denunciante_nombre, denunciante_contacto, anonima)
  values (
    p_tipo, left(trim(p_descripcion), 4000), left(nullif(trim(p_domicilio), ''), 300),
    left(nullif(trim(p_empresa_mencionada), ''), 200),
    case when p_anonima then null else left(nullif(trim(p_nombre), ''), 200) end,
    case when p_anonima then null else left(nullif(trim(p_contacto), ''), 200) end,
    coalesce(p_anonima, false)
  )
  returning codigo into v_codigo;
  return v_codigo;
end;
$$;

create or replace function public.consultar_denuncia(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('codigo', d.codigo, 'tipo', d.tipo, 'estado', d.estado, 'creada', d.created_at,
                            'actualizada', d.updated_at, 'respuesta', d.respuesta)
  from public.denuncias d
  where upper(d.codigo) = upper(trim(p_codigo))
$$;

create or replace function public.inscribir_capacitacion(
  p_capacitacion uuid,
  p_nombre text,
  p_dni text,
  p_email text,
  p_empresa text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_cap public.capacitaciones;
  v_inscriptos integer;
  v_empresa uuid;
begin
  select * into v_cap from public.capacitaciones where id = p_capacitacion for update;
  if v_cap.id is null or v_cap.estado <> 'abierta' then
    raise exception 'La capacitación no admite inscripciones' using errcode = 'P0001';
  end if;
  select count(*) into v_inscriptos from public.capacitacion_inscripciones where capacitacion_id = p_capacitacion;
  if v_cap.cupo is not null and v_inscriptos >= v_cap.cupo then
    raise exception 'No quedan vacantes disponibles' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_email), '') = '' then
    raise exception 'Nombre y correo electrónico son obligatorios' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.capacitacion_inscripciones where capacitacion_id = p_capacitacion and dni = trim(p_dni)) then
    raise exception 'Ya existe una inscripción con ese DNI' using errcode = 'P0001';
  end if;
  v_empresa := public.empresa_actual();
  insert into public.capacitacion_inscripciones (capacitacion_id, nombre, dni, email, empresa_id, empresa_texto)
  values (p_capacitacion, trim(p_nombre), trim(p_dni), lower(trim(p_email)), v_empresa, nullif(trim(p_empresa), ''));
  return jsonb_build_object('ok', true, 'vacantes', case when v_cap.cupo is null then null else v_cap.cupo - v_inscriptos - 1 end);
end;
$$;

create or replace function public.portal_capacitaciones()
returns table (
  id uuid,
  titulo text,
  descripcion text,
  modalidad public.modalidad_capacitacion,
  lugar text,
  fecha_inicio timestamptz,
  duracion_horas numeric,
  cupo integer,
  estado public.estado_capacitacion,
  destinatarios text,
  inscriptos integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.titulo, c.descripcion, c.modalidad, c.lugar, c.fecha_inicio, c.duracion_horas, c.cupo, c.estado,
         c.destinatarios, (select count(*) from public.capacitacion_inscripciones i where i.capacitacion_id = c.id)::integer
  from public.capacitaciones c
  where c.estado <> 'cancelada'
  order by c.fecha_inicio desc
$$;

-- -----------------------------------------------------------------------------
-- Permisos de ejecución de las RPC
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

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
  public.generar_codigo_verificacion(),
  public.portal_empresas(),
  public.portal_empresa(uuid),
  public.portal_estadisticas(),
  public.portal_capacitaciones(),
  public.verificar_certificado(text),
  public.crear_denuncia(public.tipo_denuncia, text, text, text, text, text, boolean),
  public.consultar_denuncia(text),
  public.inscribir_capacitacion(uuid, text, text, text, text)
to anon, authenticated;

grant execute on function
  public.solicitar_inscripcion(jsonb),
  public.firmar_certificados(uuid[]),
  public.presentar_declaracion(uuid),
  public.controlar_declaracion(uuid, jsonb, text),
  public.rechazar_declaracion(uuid, text),
  public.anular_certificado(uuid, text),
  public.generar_liquidacion(uuid[]),
  public.informar_pago(uuid, public.medio_pago, text, date, text),
  public.anular_liquidacion(uuid),
  public.verificar_pago(uuid, boolean, text),
  public.resolver_tramite(uuid, text, text, text),
  public.admin_actualizar_perfil(uuid, public.rol_usuario, uuid, uuid, boolean),
  public.dashboard_kpis(),
  public.informe_recaudacion(integer, integer)
to authenticated;
