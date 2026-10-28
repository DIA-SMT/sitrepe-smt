import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { supabasePublicKey, supabaseUrl } from "./env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Actúa con la sesión del usuario: la RLS de la base decide qué puede ver y hacer.
 * Crear uno nuevo por request (no reutilizar entre requests).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabasePublicKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: las cookies se refrescan en proxy.ts.
        }
      },
    },
  });
}

export type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
