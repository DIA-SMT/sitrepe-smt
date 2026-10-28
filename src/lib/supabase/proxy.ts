import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const RUTAS_PROTEGIDAS = ["/gestion", "/prestador", "/perfil", "/imprimir", "/actualizar-clave"];

/**
 * Refresca la sesión de Supabase en cada request y redirige a /ingresar si se
 * intenta entrar a un área privada sin sesión. Es un control optimista: la
 * autorización real se hace en el servidor (lib/auth.ts) y en la base (RLS).
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // No ejecutar código entre createServerClient y getClaims().
  const { data } = await supabase.auth.getClaims();
  const autenticado = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;
  if (!autenticado && RUTAS_PROTEGIDAS.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/ingresar";
    destino.search = `?siguiente=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    const redireccion = NextResponse.redirect(destino);
    response.cookies.getAll().forEach((c) => redireccion.cookies.set(c));
    return redireccion;
  }

  return response;
}
