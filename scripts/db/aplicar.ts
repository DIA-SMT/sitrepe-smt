/**
 * Aplica las migraciones de supabase/migrations a la base indicada en
 * SUPABASE_DB_URL (registrándolas en supabase_migrations.schema_migrations, igual
 * que la CLI de Supabase) y, opcionalmente, los datos iniciales.
 *
 * Uso:
 *   npm run db:aplicar            → migraciones pendientes
 *   npm run db:aplicar -- --seed  → + catálogos y padrón oficial (seed.sql)
 *   npm run db:aplicar -- --demo  → + datos de demostración (seed-demo.sql). NO usar en producción.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

config({ path: join(__dirname, "..", "..", ".env.local") });

const RAIZ = join(__dirname, "..", "..");
const args = new Set(process.argv.slice(2));

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("Falta SUPABASE_DB_URL en .env.local");
  const sql = postgres(url, { ssl: "require", max: 1, onnotice: () => {} });

  try {
    await sql.unsafe(`
      create schema if not exists supabase_migrations;
      create table if not exists supabase_migrations.schema_migrations (
        version text primary key, statements text[], name text
      );`);
    const aplicadas = new Set(
      (await sql<{ version: string }[]>`select version from supabase_migrations.schema_migrations`).map((r) => r.version),
    );

    const archivos = readdirSync(join(RAIZ, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
    for (const archivo of archivos) {
      const [version, ...resto] = archivo.replace(/\.sql$/, "").split("_");
      if (aplicadas.has(version)) {
        console.log(`  · ${archivo} (ya aplicada)`);
        continue;
      }
      const contenido = readFileSync(join(RAIZ, "supabase", "migrations", archivo), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(contenido);
        await tx.unsafe(`insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)`, [
          version,
          resto.join("_"),
          [contenido],
        ]);
      });
      console.log(`  ✓ ${archivo}`);
    }

    const seeds = [...(args.has("--seed") || args.has("--demo") ? ["seed.sql"] : []), ...(args.has("--demo") ? ["seed-demo.sql"] : [])];
    for (const seed of seeds) {
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(join(RAIZ, "supabase", seed), "utf8"));
      });
      console.log(`  ✓ ${seed}`);
    }
    // Recarga el esquema de la API (PostgREST).
    await sql.unsafe(`notify pgrst, 'reload schema'`);
    console.log("Listo.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
