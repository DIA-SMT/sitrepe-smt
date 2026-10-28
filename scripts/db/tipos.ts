/**
 * Genera src/lib/supabase/database.types.ts (formato de `supabase gen types`)
 * introspectando el esquema aplicado en el Postgres embebido.
 *
 * Uso: npm run db:tipos
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { crearBase } from "./entorno";

type Columna = {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  is_identity: "YES" | "NO";
  identity_generation: string | null;
  is_generated: string;
  ordinal_position: number;
};

const SALIDA = join(__dirname, "..", "..", "src", "lib", "supabase", "database.types.ts");

function tipoTs(udt: string, enums: Set<string>): string {
  const esArray = udt.startsWith("_");
  const base = esArray ? udt.slice(1) : udt;
  let t: string;
  if (enums.has(base)) t = `Database["public"]["Enums"]["${base}"]`;
  else if (["int2", "int4", "int8", "float4", "float8", "numeric"].includes(base)) t = "number";
  else if (base === "bool") t = "boolean";
  else if (["json", "jsonb"].includes(base)) t = "Json";
  else if (["text", "varchar", "bpchar", "uuid", "date", "timestamptz", "timestamp", "time", "timetz", "interval", "citext"].includes(base))
    t = "string";
  else if (base === "void") t = "undefined";
  else t = "unknown";
  return esArray ? `${t}[]` : t;
}

async function main() {
  const db = await crearBase();

  const enumsRes = await db.query<{ nombre: string; valores: string[] }>(`
    select t.typname as nombre, array_agg(e.enumlabel order by e.enumsortorder) as valores
    from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' group by t.typname order by t.typname`);
  const enums = new Set(enumsRes.rows.map((r) => r.nombre));

  const relaciones = await db.query<{ tabla: string; nombre: string; tipo: string }>(`
    select c.relname as tabla, c.relname as nombre, c.relkind as tipo
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v') order by c.relname`);

  const columnas = await db.query<Columna>(`
    select table_name, column_name, data_type, udt_name, is_nullable, column_default, is_identity,
           identity_generation, is_generated, ordinal_position
    from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`);

  const fks = await db.query<{
    nombre: string;
    tabla: string;
    columnas: string[];
    referenciada: string;
    columnas_ref: string[];
    uno_a_uno: boolean;
  }>(`
    select con.conname as nombre, rel.relname as tabla,
      array(select a.attname from unnest(con.conkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum order by k.ord) as columnas,
      ref.relname as referenciada,
      array(select a.attname from unnest(con.confkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum order by k.ord) as columnas_ref,
      exists (
        select 1 from pg_index i where i.indrelid = con.conrelid and (i.indisunique or i.indisprimary)
          and i.indnkeyatts = cardinality(con.conkey) and (i.indkey::int2[])[0:cardinality(con.conkey) - 1] @> con.conkey
          and (i.indkey::int2[])[0:cardinality(con.conkey) - 1] <@ con.conkey
      ) as uno_a_uno
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_class ref on ref.oid = con.confrelid
    join pg_namespace n on n.oid = rel.relnamespace
    join pg_namespace nr on nr.oid = ref.relnamespace
    where con.contype = 'f' and n.nspname = 'public' and nr.nspname = 'public'
    order by rel.relname, con.conname`);

  const funciones = await db.query<{
    nombre: string;
    args: string[] | null;
    tipos_args: string[] | null;
    modos: string[] | null;
    con_default: number;
    retorno: string;
    retorna_set: boolean;
  }>(`
    select p.proname as nombre, p.proargnames as args,
      array(select format_type(t, null) from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) t) as tipos_args,
      p.proargmodes::text[] as modos, p.pronargdefaults as con_default,
      (select typname from pg_type where oid = p.prorettype) as retorno, p.proretset as retorna_set
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and (select typname from pg_type where oid = p.prorettype) <> 'trigger'
    order by p.proname`);

  const udtDeFormato = async (formato: string) => {
    const r = await db.query<{ typname: string }>(`select t.typname from pg_type t where t.oid = $1::regtype`, [formato]);
    return r.rows[0]?.typname ?? "unknown";
  };

  const porTabla = new Map<string, Columna[]>();
  for (const c of columnas.rows) {
    const lista = porTabla.get(c.table_name) ?? [];
    lista.push(c);
    porTabla.set(c.table_name, lista);
  }

  const relacionesDe = (tabla: string) => {
    const lista = fks.rows.filter((f) => f.tabla === tabla);
    if (lista.length === 0) return "[]";
    return `[\n${lista
      .map(
        (f) => `          {
            foreignKeyName: "${f.nombre}"
            columns: [${f.columnas.map((c) => `"${c}"`).join(", ")}]
            isOneToOne: ${f.uno_a_uno}
            referencedRelation: "${f.referenciada}"
            referencedColumns: [${f.columnas_ref.map((c) => `"${c}"`).join(", ")}]
          },`,
      )
      .join("\n")}\n        ]`;
  };

  const tablas: string[] = [];
  const vistas: string[] = [];
  for (const rel of relaciones.rows) {
    const cols = porTabla.get(rel.nombre) ?? [];
    if (rel.tipo === "r") {
      const row = cols.map((c) => `          ${c.column_name}: ${tipoTs(c.udt_name, enums)}${c.is_nullable === "YES" ? " | null" : ""}`);
      const insert = cols
        .filter((c) => c.identity_generation !== "ALWAYS" && c.is_generated !== "ALWAYS")
        .map((c) => {
          const opcional = c.is_nullable === "YES" || c.column_default !== null || c.is_identity === "YES";
          return `          ${c.column_name}${opcional ? "?" : ""}: ${tipoTs(c.udt_name, enums)}${c.is_nullable === "YES" ? " | null" : ""}`;
        });
      const update = cols
        .filter((c) => c.identity_generation !== "ALWAYS" && c.is_generated !== "ALWAYS")
        .map((c) => `          ${c.column_name}?: ${tipoTs(c.udt_name, enums)}${c.is_nullable === "YES" ? " | null" : ""}`);
      tablas.push(`      ${rel.nombre}: {
        Row: {
${row.join("\n")}
        }
        Insert: {
${insert.join("\n")}
        }
        Update: {
${update.join("\n")}
        }
        Relationships: ${relacionesDe(rel.nombre)}
      }`);
    } else {
      const row = cols.map((c) => `          ${c.column_name}: ${tipoTs(c.udt_name, enums)} | null`);
      vistas.push(`      ${rel.nombre}: {
        Row: {
${row.join("\n")}
        }
        Relationships: []
      }`);
    }
  }

  const fnsTs: string[] = [];
  const nombresInternos = new Set(["handle_new_user", "set_updated_at"]);
  for (const f of funciones.rows) {
    if (nombresInternos.has(f.nombre) || f.nombre.startsWith("tg_")) continue;
    const modos = f.modos ?? (f.tipos_args ?? []).map(() => "i");
    const nombres = f.args ?? [];
    const tipos = f.tipos_args ?? [];
    const entradas: string[] = [];
    const salidas: string[] = [];
    const cantidadEntradas = modos.filter((m) => m === "i" || m === "b").length;
    let indiceEntrada = 0;
    for (let i = 0; i < tipos.length; i++) {
      const udt = await udtDeFormato(tipos[i]);
      const ts = tipoTs(udt, enums);
      if (modos[i] === "t" || modos[i] === "o") {
        salidas.push(`            ${nombres[i]}: ${ts} | null`);
      } else {
        const opcional = indiceEntrada >= cantidadEntradas - f.con_default;
        entradas.push(`          ${nombres[i]}${opcional ? "?" : ""}: ${ts}`);
        indiceEntrada++;
      }
    }
    let retorno: string;
    if (salidas.length > 0) {
      retorno = `{\n${salidas.join("\n")}\n          }[]`;
    } else if (f.retorno === "aranceles") {
      retorno = `Database["public"]["Tables"]["aranceles"]["Row"]`;
    } else {
      retorno = tipoTs(f.retorno, enums);
      if (f.retorna_set) retorno = `${retorno}[]`;
    }
    fnsTs.push(`      ${f.nombre}: {
        Args: ${entradas.length ? `{\n${entradas.join("\n")}\n        }` : "never"}
        Returns: ${retorno}
      }`);
  }

  const enumsTs = enumsRes.rows.map((e) => `      ${e.nombre}: ${e.valores.map((v) => `"${v}"`).join(" | ")}`);
  const constantes = enumsRes.rows.map((e) => `      ${e.nombre}: [${e.valores.map((v) => `"${v}"`).join(", ")}],`);

  const salida = `// Archivo generado por scripts/db/tipos.ts a partir de supabase/migrations. No editar a mano.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
${tablas.join("\n")}
    }
    Views: {
${vistas.join("\n")}
    }
    Functions: {
${fnsTs.join("\n")}
    }
    Enums: {
${enumsTs.join("\n")}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
export type Functions<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]

export const Constants = {
  public: {
    Enums: {
${constantes.join("\n")}
    },
  },
} as const
`;
  writeFileSync(SALIDA, salida);
  console.log(`Tipos generados en ${SALIDA}: ${tablas.length} tablas, ${vistas.length} vistas, ${fnsTs.length} funciones, ${enumsRes.rows.length} enums`);
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
