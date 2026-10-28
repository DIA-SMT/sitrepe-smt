import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

/**
 * Cliente con la clave secreta: ignora la RLS. Usarlo SOLO en el servidor y solo
 * para operaciones de administración que no puede hacer el usuario (p. ej. crear
 * cuentas de Auth desde la gestión de usuarios), siempre después de verificar el rol.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Falta SUPABASE_SECRET_KEY en .env.local.");
  }
  return createClient<Database>(supabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
