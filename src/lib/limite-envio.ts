import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Límites de los formularios públicos. Se cuentan por origen (hash de la IP, nunca
 * la IP en claro) y además un tope global por acción para frenar envíos masivos
 * desde muchas direcciones.
 */
const LIMITES = {
  denuncia: { porOrigen: 5, global: 120, minutos: 60 },
  inscripcion_capacitacion: { porOrigen: 10, global: 300, minutos: 60 },
} as const;

export type AccionLimitada = keyof typeof LIMITES;

/** Hash del origen de la solicitud (IP del cliente detrás del proxy). */
async function claveOrigen(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || h.get("cf-connecting-ip") || "desconocido";
  const sal = process.env.LIMITE_ENVIO_SAL ?? process.env.SUPABASE_SECRET_KEY ?? "sitrepe";
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Registra el intento y devuelve false si se superó el límite. Ante un error del
 * registro no bloquea al vecino (la base igual valida cada envío), pero lo informa.
 */
export async function permitirEnvio(accion: AccionLimitada): Promise<boolean> {
  const limite = LIMITES[accion];
  const supabase = createAdminClient();
  const origen = await claveOrigen();
  const { data: okOrigen, error } = await supabase.rpc("verificar_limite_envio", {
    p_accion: accion,
    p_clave: origen,
    p_max: limite.porOrigen,
    p_minutos: limite.minutos,
  });
  if (error) {
    console.error(`[limite-envio] No se pudo registrar el envío (${accion}):`, error.message);
    return true;
  }
  if (!okOrigen) return false;
  const { data: okGlobal } = await supabase.rpc("verificar_limite_envio", {
    p_accion: `${accion}:global`,
    p_clave: "global",
    p_max: limite.global,
    p_minutos: limite.minutos,
  });
  return okGlobal !== false;
}

export const MENSAJE_LIMITE =
  "Recibimos muchos envíos desde tu conexión en poco tiempo. Esperá unos minutos e intentá de nuevo.";
