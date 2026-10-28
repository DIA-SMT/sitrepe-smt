/**
 * Postgres embebido (PGlite) con los mínimos de Supabase (roles, auth, storage)
 * para validar migraciones y seeds sin Docker.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(__dirname, "..", "..");
export const MIGRACIONES = join(RAIZ, "supabase", "migrations");

const STUB_SUPABASE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}',
  raw_app_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
  name text not null, owner uuid, created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant execute on function storage.foldername(text) to anon, authenticated;
`;

export async function crearBase(opciones: { seedDemo?: boolean } = {}) {
  const db = new PGlite();
  await db.exec(STUB_SUPABASE);
  const archivos = readdirSync(MIGRACIONES).filter((f) => f.endsWith(".sql")).sort();
  for (const archivo of archivos) {
    try {
      await db.exec(readFileSync(join(MIGRACIONES, archivo), "utf8"));
    } catch (error) {
      throw new Error(`Error en la migración ${archivo}: ${(error as Error).message}`);
    }
  }
  const seeds = ["seed.sql", ...(opciones.seedDemo ? ["seed-demo.sql"] : [])];
  for (const seed of seeds) {
    try {
      await db.exec(readFileSync(join(RAIZ, "supabase", seed), "utf8"));
    } catch (error) {
      throw new Error(`Error en ${seed}: ${(error as Error).message}`);
    }
  }
  return db;
}

/** Ejecuta una función con el rol del servidor de la app (service_role, clave secreta). */
export async function comoServidor<T>(db: PGlite, fn: (tx: Pick<PGlite, "query" | "exec">) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role service_role`);
    return fn(tx as unknown as Pick<PGlite, "query" | "exec">);
  });
}

/** Ejecuta una función como un usuario autenticado (o anónimo) aplicando la RLS. */
export async function comoUsuario<T>(
  db: PGlite,
  usuario: string | null,
  fn: (tx: Pick<PGlite, "query" | "exec">) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [usuario ?? ""]);
    await tx.exec(`set local role ${usuario ? "authenticated" : "anon"}`);
    return fn(tx as unknown as Pick<PGlite, "query" | "exec">);
  });
}
