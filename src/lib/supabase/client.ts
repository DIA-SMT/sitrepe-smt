"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** Cliente de Supabase para Client Components (p. ej. subir archivos a Storage). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
  );
}
