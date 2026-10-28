/**
 * Crea (o actualiza) las cuentas de demostración en Supabase Auth.
 * Requiere NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY y USUARIOS_DEMO_CLAVE en .env.local y haber
 * cargado los datos con `npm run db:aplicar -- --demo`.
 *
 * Uso: npm run usuarios:demo
 *
 * Estas credenciales son SOLO para el entorno de demostración/desarrollo.
 */
import { config } from "dotenv";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: join(__dirname, "..", ".env.local") });

// La contraseña no se versiona: el repositorio es público y una de estas cuentas es de administración.
const CLAVE_DEMO = process.env.USUARIOS_DEMO_CLAVE ?? "";
if (CLAVE_DEMO.length < 12) {
  console.error("Definí USUARIOS_DEMO_CLAVE en .env.local (al menos 12 caracteres).");
  process.exit(1);
}

type Usuario = {
  email: string;
  nombre: string;
  apellido: string;
  rol: "admin" | "control" | "inspector" | "empresa" | "tecnico";
  empresaNumero?: number;
  esTecnico?: boolean;
};

const USUARIOS: Usuario[] = [
  { email: "admin@sitrepe.test", nombre: "Dirección", apellido: "Salud Ambiental", rol: "admin" },
  { email: "control@sitrepe.test", nombre: "Agente", apellido: "de Control", rol: "control" },
  { email: "inspector@sitrepe.test", nombre: "Inspector/a", apellido: "Municipal", rol: "inspector" },
  { email: "empresa@sitrepe.test", nombre: "Administración", apellido: "ALEF GROUP", rol: "empresa", empresaNumero: 1 },
  { email: "tecnico@sitrepe.test", nombre: "Asesor/a", apellido: "Técnico/a", rol: "tecnico", empresaNumero: 1, esTecnico: true },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SECRET_KEY en .env.local");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: lista, error: errorLista } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (errorLista) throw errorLista;

  for (const u of USUARIOS) {
    let empresaId: string | null = null;
    let tecnicoId: string | null = null;
    if (u.empresaNumero) {
      const { data: empresa, error } = await supabase.from("empresas").select("id").eq("numero_registro", u.empresaNumero).single();
      if (error) throw new Error(`No se encontró la empresa N.º ${u.empresaNumero}: ¿cargaste los datos?`);
      empresaId = empresa.id;
      if (u.esTecnico) {
        const { data: tecnico } = await supabase
          .from("tecnicos")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("estado", "aprobado")
          .order("es_representante", { ascending: false })
          .limit(1)
          .single();
        tecnicoId = tecnico?.id ?? null;
      }
    }

    const appMetadata = { rol: u.rol, empresa_id: empresaId, tecnico_id: tecnicoId };
    const existente = lista.users.find((x) => x.email === u.email);
    let id: string;
    if (existente) {
      const { error } = await supabase.auth.admin.updateUserById(existente.id, {
        password: CLAVE_DEMO,
        app_metadata: appMetadata,
        user_metadata: { nombre: u.nombre, apellido: u.apellido },
      });
      if (error) throw error;
      id = existente.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: CLAVE_DEMO,
        email_confirm: true,
        app_metadata: appMetadata,
        user_metadata: { nombre: u.nombre, apellido: u.apellido },
      });
      if (error) throw error;
      id = data.user.id;
    }
    const { error: errorPerfil } = await supabase
      .from("perfiles")
      .update({ rol: u.rol, empresa_id: empresaId, tecnico_id: tecnicoId, nombre: u.nombre, apellido: u.apellido, activo: true })
      .eq("id", id);
    if (errorPerfil) throw errorPerfil;
    console.log(`  ✓ ${u.email} (${u.rol})`);
  }
  console.log(`\nContraseña de todas las cuentas de demostración: la de USUARIOS_DEMO_CLAVE en .env.local`);
}

main().catch((error) => {
  console.error("Error:", error.message ?? error);
  process.exit(1);
});
