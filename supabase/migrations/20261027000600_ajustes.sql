-- =============================================================================
-- Migración 6: ajustes surgidos de la revisión de los módulos.
-- =============================================================================

-- La firma del asesor técnico cubre también los productos aplicados: si cambian
-- después de firmar, la firma deja de ser válida.
create or replace function public.tg_certificado_productos_invalidar_firma()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.certificados c
  set firmado_at = null, firmado_por = null, firma_hash = null
  where c.id = coalesce(new.certificado_id, old.certificado_id)
    and c.estado in ('borrador', 'observado')
    and c.firma_hash is not null;
  return null;
end;
$$;

create trigger certificado_productos_invalidar_firma
  after insert or update or delete on public.certificado_productos
  for each row execute function public.tg_certificado_productos_invalidar_firma();

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
        c.capacidad_litros, c.fecha_servicio, c.tecnico_id,
        (select string_agg(cp.producto_id || ':' || cp.cantidad || cp.unidad, ',' order by cp.producto_id)
         from public.certificado_productos cp where cp.certificado_id = c.id),
        now()), 'UTF8')), 'hex')
  where c.id = any (p_ids) and c.tecnico_id = v_tecnico and c.estado in ('borrador', 'observado');
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- El control también rechaza planillas de empresas no habilitadas.
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
  if not public.empresa_habilitada(v_dec.empresa_id, v_dec.tipo) then
    raise exception 'La empresa no está habilitada: rechace la declaración' using errcode = 'P0001';
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

-- El ciclo de las notificaciones usa el año de Tucumán (igual que su talonario).
alter table public.notificaciones alter column ciclo set default extract(year from public.hoy())::integer;

-- Fecha de presentación al (re)presentar un trámite.
create or replace function public.tg_tramites_presentado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'presentado' and (tg_op = 'INSERT' or old.estado is distinct from 'presentado') then
    new.presentado_at := now();
  end if;
  return new;
end;
$$;

create trigger tramites_presentado
  before insert or update of estado on public.tramites
  for each row execute function public.tg_tramites_presentado();

-- Envases: no se puede entregar más de lo generado.
create or replace function public.tg_envases_saldo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo integer;
begin
  if new.tipo = 'entregado' then
    perform pg_advisory_xact_lock(hashtext(new.empresa_id::text || new.producto_id::text));
    select coalesce(sum(case when m.tipo = 'generado' then m.cantidad else -m.cantidad end), 0)
    into v_saldo
    from public.envases_movimientos m
    where m.empresa_id = new.empresa_id and m.producto_id = new.producto_id;
    if new.cantidad > v_saldo then
      raise exception 'No puede entregar % envases: el saldo registrado es %', new.cantidad, v_saldo using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger envases_saldo
  before insert on public.envases_movimientos
  for each row execute function public.tg_envases_saldo();

-- Memoria técnica: un producto rechazado puede volver a proponerse.
drop policy memoria_edicion on public.empresa_productos;
create policy memoria_edicion on public.empresa_productos for update to authenticated
  using (
    (select public.puede_controlar())
    or (empresa_id = (select public.empresa_actual()) and estado in ('propuesto', 'rechazado'))
  )
  with check (
    (select public.puede_controlar())
    or (empresa_id = (select public.empresa_actual()) and estado = 'propuesto')
  );

revoke execute on function public.tg_certificado_productos_invalidar_firma(), public.tg_tramites_presentado(),
  public.tg_envases_saldo() from public, anon, authenticated;
