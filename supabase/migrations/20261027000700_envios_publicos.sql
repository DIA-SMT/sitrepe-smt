-- =============================================================================
-- Migración 7: protección de los formularios públicos (denuncias e inscripciones).
--
--  * El código de denuncia lleva un sufijo aleatorio (DEN-AAAA-NNNNNN-XXXXXXXX):
--    el correlativo solo no alcanza para consultar el estado de una denuncia ajena.
--  * crear_denuncia e inscribir_capacitacion dejan de estar expuestas a la API
--    pública: las ejecuta solo el servidor de la app (service_role), que antes
--    aplica un límite de envíos por origen con verificar_limite_envio().
-- =============================================================================

-- Sufijo aleatorio de 8 caracteres hexadecimales en mayúsculas (32 bits).
create or replace function public.sufijo_aleatorio()
returns text
language sql
volatile
set search_path = ''
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

-- Denuncias existentes: se les agrega el sufijo.
update public.denuncias
set codigo = codigo || '-' || public.sufijo_aleatorio()
where codigo ~ '^DEN-\d{4}-\d{6}$';

create or replace function public.tg_denuncias_codigo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.codigo is null then
    new.codigo := public.siguiente_codigo('DEN') || '-' || public.sufijo_aleatorio();
  end if;
  return new;
end;
$$;

drop trigger denuncias_codigo on public.denuncias;
create trigger denuncias_codigo before insert on public.denuncias
  for each row execute function public.tg_denuncias_codigo();

-- -----------------------------------------------------------------------------
-- Límite de envíos
-- -----------------------------------------------------------------------------
create table public.limites_envio (
  id bigint generated always as identity primary key,
  accion text not null,
  clave text not null,
  created_at timestamptz not null default now()
);
create index limites_envio_busqueda_idx on public.limites_envio (accion, clave, created_at desc);
alter table public.limites_envio enable row level security;
revoke all on public.limites_envio from anon, authenticated;
comment on table public.limites_envio is 'Registro de envíos de formularios públicos por origen (hash de la IP) para limitar abusos.';
comment on column public.limites_envio.clave is 'Hash del origen (nunca la IP en claro).';

-- Registra un envío y devuelve false si el origen superó p_max envíos en los últimos p_minutos.
create or replace function public.verificar_limite_envio(
  p_accion text,
  p_clave text,
  p_max integer,
  p_minutos integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cantidad integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_accion || ':' || p_clave));
  select count(*) into v_cantidad
  from public.limites_envio
  where accion = p_accion and clave = p_clave and created_at > now() - make_interval(mins => p_minutos);
  if v_cantidad >= p_max then
    return false;
  end if;
  insert into public.limites_envio (accion, clave) values (p_accion, p_clave);
  -- Limpieza oportunista de registros viejos.
  delete from public.limites_envio where created_at < now() - interval '2 days';
  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- Inscripción a capacitaciones: la empresa la informa el servidor (desde la sesión).
-- -----------------------------------------------------------------------------
drop function public.inscribir_capacitacion(uuid, text, text, text, text);

create or replace function public.inscribir_capacitacion(
  p_capacitacion uuid,
  p_nombre text,
  p_dni text,
  p_email text,
  p_empresa text default null,
  p_empresa_id uuid default null
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
  insert into public.capacitacion_inscripciones (capacitacion_id, nombre, dni, email, empresa_id, empresa_texto)
  values (p_capacitacion, trim(p_nombre), trim(p_dni), lower(trim(p_email)), p_empresa_id, nullif(trim(p_empresa), ''));
  return jsonb_build_object('ok', true, 'vacantes', case when v_cap.cupo is null then null else v_cap.cupo - v_inscriptos - 1 end);
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos: solo el servidor de la app (service_role) crea denuncias e inscripciones.
-- La consulta del estado de una denuncia sigue siendo pública (exige el código completo).
-- -----------------------------------------------------------------------------
revoke execute on function public.crear_denuncia(public.tipo_denuncia, text, text, text, text, text, boolean)
  from public, anon, authenticated;
revoke execute on function public.inscribir_capacitacion(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.verificar_limite_envio(text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.sufijo_aleatorio(), public.tg_denuncias_codigo() from public, anon, authenticated;

grant execute on function public.crear_denuncia(public.tipo_denuncia, text, text, text, text, text, boolean) to service_role;
grant execute on function public.inscribir_capacitacion(uuid, text, text, text, text, uuid) to service_role;
grant execute on function public.verificar_limite_envio(text, text, integer, integer) to service_role;
grant all on public.limites_envio to service_role;
