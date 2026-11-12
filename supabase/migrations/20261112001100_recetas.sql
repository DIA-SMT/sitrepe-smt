-- =============================================================================
-- Migración 11: receta domisanitaria de compra y aplicación (Anexo I).
-- La receta no se carga aparte: es el servicio declarado (certificado de
-- fumigación) con la plaga objetivo y el método de aplicación. Queda emitida
-- cuando la firma el asesor técnico, con número correlativo por empresa y un
-- código QR que el comercio que vende el producto verifica sin usuario. El lote
-- y el vencimiento del producto se registran al comprarlo, sin anular la firma.
-- =============================================================================

alter table public.certificados
  add column plaga_objetivo text check (plaga_objetivo is null or length(trim(plaga_objetivo)) between 1 and 160),
  add column metodo_aplicacion text check (metodo_aplicacion is null or length(trim(metodo_aplicacion)) between 1 and 160),
  add column receta_numero integer check (receta_numero is null or receta_numero > 0),
  add column receta_codigo text not null default public.generar_codigo_verificacion();

alter table public.certificados
  add constraint certificados_receta_codigo_key unique (receta_codigo),
  add constraint certificados_receta_numero_key unique (empresa_id, receta_numero);

comment on column public.certificados.plaga_objetivo is 'Prescripción técnica de la receta: plaga a controlar.';
comment on column public.certificados.metodo_aplicacion is 'Prescripción técnica de la receta: método de aplicación.';
comment on column public.certificados.receta_numero is 'Correlativo por empresa; se asigna al firmar el asesor (receta emitida). Formato: registro-número.';
comment on column public.certificados.receta_codigo is 'Código del QR de la receta para que el comercio la verifique.';

alter table public.certificado_productos
  add column lote text check (lote is null or length(trim(lote)) between 1 and 60),
  add column lote_vence date;

comment on column public.certificado_productos.lote is 'Lote del producto comprado con la receta (se registra al comprar).';

grant insert (plaga_objetivo, metodo_aplicacion) on public.certificados to authenticated;
grant update (plaga_objetivo, metodo_aplicacion) on public.certificados to authenticated;

-- La plaga y el método forman parte de lo que firma el asesor.
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
          new.fecha_servicio, new.tecnico_id, new.plaga_objetivo, new.metodo_aplicacion)
         is distinct from
         (old.numero, old.cliente, old.domicilio, old.rubro_id, old.superficie_m2, old.capacidad_litros,
          old.fecha_servicio, old.tecnico_id, old.plaga_objetivo, old.metodo_aplicacion) then
    new.firmado_at := null;
    new.firmado_por := null;
    new.firma_hash := null;
  end if;
  return new;
end;
$$;

-- Registrar el lote no cambia el producto: no se revalida la memoria técnica ni se anula la firma.
create or replace function public.tg_certificado_productos_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  if tg_op = 'UPDATE' and new.producto_id = old.producto_id then
    return new;
  end if;
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

create or replace function public.tg_certificado_productos_invalidar_firma()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and (new.producto_id, new.cantidad, new.unidad) is not distinct from (old.producto_id, old.cantidad, old.unidad) then
    return null;
  end if;
  update public.certificados c
  set firmado_at = null, firmado_por = null, firma_hash = null
  where c.id = coalesce(new.certificado_id, old.certificado_id)
    and c.estado in ('borrador', 'observado')
    and c.firma_hash is not null;
  return null;
end;
$$;

-- v_certificados expone c.*: se recrea para sumar las columnas nuevas y el lote de cada producto.
drop view public.v_certificados;
create view public.v_certificados with (security_invoker = on) as
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
      'unidad', cp.unidad,
      'lote', cp.lote,
      'lote_vence', cp.lote_vence
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


revoke all on public.v_certificados from anon, authenticated;
grant select on public.v_certificados to authenticated;

-- Firma: el asesor necesita la matrícula al día y, en fumigaciones, la prescripción completa.
-- Al firmar queda emitida la receta (número correlativo por empresa, se conserva si se vuelve a firmar).
create or replace function public.firmar_certificados(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tecnico uuid := public.tecnico_actual();
  v_empresa uuid;
  v_vence date;
  v_incompletos text;
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

  select string_agg('N.º ' || c.numero, ', ' order by c.numero) into v_incompletos
  from public.certificados c
  where c.id = any (p_ids) and c.tecnico_id = v_tecnico and c.estado in ('borrador', 'observado')
    and c.tipo = 'fumigacion' and (c.plaga_objetivo is null or c.metodo_aplicacion is null);
  if v_incompletos is not null then
    raise exception E'Falta la plaga objetivo o el método de aplicación en: %.\nLa empresa tiene que completarlos en el servicio para emitir la receta.',
      v_incompletos using errcode = 'P0001';
  end if;

  update public.certificados c
  set firmado_at = now(),
      firmado_por = (select auth.uid()),
      firma_hash = encode(sha256(convert_to(concat_ws('|',
        c.id, c.empresa_id, c.tipo, c.numero, c.cliente, c.domicilio, c.rubro_id, c.superficie_m2,
        c.capacidad_litros, c.fecha_servicio, c.tecnico_id, c.plaga_objetivo, c.metodo_aplicacion,
        (select string_agg(cp.producto_id || ':' || cp.cantidad || cp.unidad, ',' order by cp.producto_id)
         from public.certificado_productos cp where cp.certificado_id = c.id),
        now()), 'UTF8')), 'hex')
  where c.id = any (p_ids) and c.tecnico_id = v_tecnico and c.estado in ('borrador', 'observado');
  get diagnostics v_n = row_count;

  -- Numeración de las recetas nuevas (una transacción por empresa a la vez).
  select t.empresa_id into v_empresa from public.tecnicos t where t.id = v_tecnico;
  perform pg_advisory_xact_lock(hashtext('receta:' || v_empresa));
  with base as (
    select coalesce(max(x.receta_numero), 0) as ultimo from public.certificados x where x.empresa_id = v_empresa
  ), nuevas as (
    select c.id, row_number() over (order by c.fecha_servicio, c.numero) as orden
    from public.certificados c
    where c.id = any (p_ids) and c.tecnico_id = v_tecnico and c.tipo = 'fumigacion'
      and c.firma_hash is not null and c.receta_numero is null
  )
  update public.certificados c
  set receta_numero = base.ultimo + nuevas.orden
  from base, nuevas
  where c.id = nuevas.id;

  return v_n;
end;
$$;

-- Lote y vencimiento del producto comprado con la receta (la empresa lo registra al comprar).
create or replace function public.registrar_lote(p_certificado uuid, p_producto uuid, p_lote text, p_vence date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cert public.certificados;
begin
  select * into v_cert from public.certificados c where c.id = p_certificado;
  if v_cert.id is null or v_cert.empresa_id is distinct from public.empresa_actual() then
    raise exception 'Certificado inexistente o sin permisos' using errcode = 'P0001';
  end if;
  if v_cert.estado = 'anulado' then
    raise exception 'El certificado % está anulado', v_cert.numero using errcode = 'P0001';
  end if;
  if coalesce(trim(p_lote), '') = '' or length(trim(p_lote)) > 60 then
    raise exception 'Indicá el número de lote (hasta 60 caracteres)' using errcode = 'P0001';
  end if;
  if p_vence is not null and p_vence < (v_cert.fecha_servicio at time zone 'America/Argentina/Tucuman')::date then
    raise exception 'El lote vence antes de la fecha del servicio: no puede aplicarse' using errcode = 'P0001';
  end if;
  update public.certificado_productos cp
  set lote = trim(p_lote), lote_vence = p_vence
  where cp.certificado_id = p_certificado and cp.producto_id = p_producto;
  if not found then
    raise exception 'El producto no figura en la receta' using errcode = 'P0001';
  end if;
end;
$$;

-- Verificación pública de la receta (el comercio escanea el QR antes de vender).
create or replace function public.verificar_receta(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'numero', lpad(coalesce(e.numero_registro, 0)::text, 4, '0') || '-' || lpad(c.receta_numero::text, 8, '0'),
    'codigo', c.receta_codigo,
    'estado', case
      when c.estado = 'anulado' then 'anulada'
      when c.firma_hash is null then 'sin_firma'
      else 'valida' end,
    'emitida_at', c.firmado_at,
    'fecha_servicio', c.fecha_servicio,
    'plaga_objetivo', c.plaga_objetivo,
    'metodo_aplicacion', c.metodo_aplicacion,
    'plazo_reingreso_horas', c.plazo_reingreso_horas,
    'cliente', c.cliente,
    'domicilio', c.domicilio,
    'rubro', r.nombre,
    'empresa', jsonb_build_object(
      'id', e.id, 'nombre', e.nombre_comercial, 'cuit', e.cuit, 'numero_registro', e.numero_registro,
      'resolucion_dsa', e.resolucion_dsa, 'habilitada', public.empresa_habilitada(e.id, c.tipo)),
    'tecnico', jsonb_build_object(
      'nombre', t.nombre || ' ' || t.apellido, 'titulo', t.titulo, 'matricula', t.matricula,
      'matricula_vigente', coalesce(public.matricula_vigente_hasta(t.id) >= public.hoy(), false)),
    'productos', (select coalesce(jsonb_agg(jsonb_build_object(
        'nombre', p.nombre_comercial, 'principio_activo', p.principio_activo, 'concentracion', p.concentracion,
        'formulacion', p.formulacion, 'organismo', p.organismo, 'registro', p.registro_numero,
        'cantidad', cp.cantidad, 'unidad', cp.unidad, 'lote', cp.lote, 'lote_vence', cp.lote_vence)
        order by p.nombre_comercial), '[]'::jsonb)
      from public.certificado_productos cp join public.productos p on p.id = cp.producto_id
      where cp.certificado_id = c.id)
  )
  from public.certificados c
  join public.empresas e on e.id = c.empresa_id
  join public.rubros r on r.id = c.rubro_id
  join public.tecnicos t on t.id = c.tecnico_id
  where c.receta_numero is not null and upper(c.receta_codigo) = upper(trim(p_codigo))
  limit 1
$$;

revoke execute on function public.registrar_lote(uuid, uuid, text, date) from public, anon;
grant execute on function public.registrar_lote(uuid, uuid, text, date) to authenticated;
grant execute on function public.verificar_receta(text) to anon, authenticated;
