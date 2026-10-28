import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rutaInternaSegura } from "@/lib/acciones";

/** Destino de los enlaces de confirmación de correo y de recuperación de contraseña. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const siguienteParam = searchParams.get("siguiente") ?? "/prestador";
  const siguiente = rutaInternaSegura(siguienteParam) ?? "/prestador";

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && tipo) {
    ok = !(await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })).error;
  }

  return NextResponse.redirect(new URL(ok ? siguiente : "/ingresar?error=enlace", origin));
}
