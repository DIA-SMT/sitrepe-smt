-- =============================================================================
-- Migración 10: matrícula profesional vigente del asesor técnico.
-- El asesor (ingeniero agrónomo u otro profesional) debe tener la matrícula al
-- día en su colegio (CIAZT). La empresa carga, con carácter de declaración
-- jurada, la constancia del colegio con su fecha de vigencia como documento del
-- legajo; la Dirección puede rechazarla. Sin constancia vigente, el asesor no
-- puede firmar certificados.
-- =============================================================================

-- Fecha hasta la que el asesor tiene la matrícula al día (constancia no rechazada más reciente).
create or replace function public.matricula_vigente_hasta(p_tecnico uuid)
returns date
language sql
stable
set search_path = ''
as $$
  select max(d.vence) from public.documentos d
  where d.tecnico_id = p_tecnico and d.tipo = 'constancia_matricula' and d.estado <> 'rechazado'
$$;

-- Situación de la matrícula de cada asesor aprobado (por vencer: 7 días antes, por los pagos mensuales).
create or replace view public.v_matriculas with (security_invoker = on) as
select t.id as tecnico_id,
  t.empresa_id,
  e.nombre_comercial as empresa_nombre,
  e.numero_registro,
  e.estado as empresa_estado,
  t.nombre || ' ' || t.apellido as tecnico_nombre,
  t.dni,
  t.titulo,
  t.matricula,
  t.es_representante,
  c.id as constancia_id,
  c.nombre_archivo as constancia_nombre,
  c.estado as constancia_estado,
  c.created_at as constancia_cargada_at,
  c.vence,
  case
    when c.vence is null then 'sin_informar'
    when c.vence < public.hoy() then 'vencida'
    when c.vence <= public.hoy() + 7 then 'por_vencer'
    else 'vigente'
  end as situacion
from public.tecnicos t
join public.empresas e on e.id = t.empresa_id
left join lateral (
  select d.id, d.nombre_archivo, d.estado, d.created_at, d.vence
  from public.documentos d
  where d.tecnico_id = t.id and d.tipo = 'constancia_matricula' and d.estado <> 'rechazado' and d.vence is not null
  order by d.vence desc, d.created_at desc
  limit 1
) c on true
where t.estado = 'aprobado';

revoke all on public.v_matriculas from anon, authenticated;
grant select on public.v_matriculas to authenticated;

-- Alertas: la constancia de matrícula tiene su propio aviso (7 días antes, no 30).
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
  and d.tipo <> 'constancia_matricula'
union all
select 'matricula_asesor',
  case m.situacion when 'vencida' then 'urgente' when 'por_vencer' then 'alerta' else 'info' end,
  case m.situacion
    when 'vencida' then 'Matrícula del asesor vencida'
    when 'por_vencer' then 'Matrícula del asesor por vencer'
    else 'Asesor sin matrícula vigente informada'
  end,
  m.empresa_nombre || ' · ' || m.tecnico_nombre
    || coalesce(' · ' || case when m.vence < public.hoy() then 'venció el ' else 'vence el ' end
       || to_char(m.vence, 'DD/MM/YYYY'), ''),
  m.empresa_id, m.tecnico_id, m.vence::timestamptz
from public.v_matriculas m
where m.empresa_estado = 'habilitada' and m.situacion <> 'vigente'
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

-- Firma: además de estar aprobado, el asesor necesita la matrícula al día.
create or replace function public.firmar_certificados(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tecnico uuid := public.tecnico_actual();
  v_vence date;
  v_n integer;
begin
  if v_tecnico is null then
    raise exception 'Solo el asesor técnico registrado en el padrón puede firmar certificados' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.tecnicos t where t.id = v_tecnico and t.estado <> 'aprobado') then
    raise exception 'Su registro como asesor técnico no está aprobado' using errcode = 'P0001';
  end if;
  v_vence := public.matricula_vigente_hasta(v_tecnico);
  if v_vence is null then
    raise exception E'No tenés cargada una constancia de matrícula profesional vigente.\nSubí la constancia al día de tu colegio profesional (CIAZT) en Legajo → Asesores técnicos para poder firmar.'
      using errcode = 'P0001';
  end if;
  if v_vence < public.hoy() then
    raise exception E'Tu matrícula profesional venció el %.\nSubí la constancia actualizada de tu colegio profesional (CIAZT) en Legajo → Asesores técnicos para poder firmar.',
      to_char(v_vence, 'DD/MM/YYYY') using errcode = 'P0001';
  end if;
  update public.certificados c
  set firmado_at = now(),
      firmado_por = (select auth.uid()),
      firma_hash = encode(sha256(convert_to(concat_ws('|',
        c.id, c.empresa_id, c.tipo, c.numero, c.cliente, c.domicilio, c.rubro_id, c.superficie_m2,
        c.capacidad_litros, c.fecha_servicio, c.tecnico_id,
        (select string_agg(cp.producto_id || ':' || cp.cantidad || cp.unidad, ',' order by cp.producto_id)
         from public.certificado_productos cp where cp.certificado_id = c.id),
        now()), 'UTF8')), 'hex')
  where c.id = any (p_ids) and c.tecnico_id = v_tecnico and c.estado in ('borrador', 'observado');
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
