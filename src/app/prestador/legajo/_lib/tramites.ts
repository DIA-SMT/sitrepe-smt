import "server-only";
import type { SupabaseServer } from "@/lib/supabase/server";
import type { Enums, Json } from "@/lib/supabase/database.types";

type ErrorBD = { message: string; code?: string; details?: string | null; hint?: string | null };

/** Documento a adjuntar a un trámite (se guarda en `documentos` con estado "pendiente"). */
export type AdjuntoTramite = {
  tipo: Enums<"tipo_documento">;
  path: string;
  nombre_archivo: string;
  vence?: string | null;
  tecnico_id?: string | null;
};

export type DatosTramite = { [clave: string]: Json | undefined };

export type ResultadoTramite = { ok: true; id: string; codigo: string | null } | { ok: false; error: ErrorBD };

/**
 * Presenta un trámite de la empresa ante la Dirección.
 *
 * Sin adjuntos se inserta directamente como "presentado". Con adjuntos, para que los documentos
 * queden vinculados (`documentos.tramite_id`) sin dejar trámites a medias, se usa un borrador:
 *   1. se reutiliza el borrador del mismo tipo que dejó un intento fallido anterior (sin documentos y
 *      que no sea un trámite desistido, ver `eliminarTecnico`) o se crea uno;
 *   2. se insertan los documentos con su `tramite_id` (un único INSERT: atómico);
 *   3. recién entonces el trámite pasa a "presentado" (la política lo permite desde borrador).
 * Si falla el paso 3 se eliminan los documentos insertados (siguen en estado pendiente).
 */
export async function presentarTramite(
  supabase: SupabaseServer,
  {
    empresaId,
    tipo,
    datos,
    adjuntos = [],
  }: { empresaId: string; tipo: Enums<"tipo_tramite">; datos: DatosTramite; adjuntos?: AdjuntoTramite[] },
): Promise<ResultadoTramite> {
  if (adjuntos.length === 0) {
    const { data, error } = await supabase
      .from("tramites")
      .insert({ empresa_id: empresaId, tipo, estado: "presentado", datos })
      .select("id, codigo")
      .single();
    if (error) return { ok: false, error };
    return { ok: true, id: data.id, codigo: data.codigo };
  }

  // 1. Borrador (reutilizado si quedó uno limpio de un intento anterior).
  const { data: borradores, error: errorPrevio } = await supabase
    .from("v_tramites")
    .select("id, datos, cantidad_documentos")
    .eq("empresa_id", empresaId)
    .eq("tipo", tipo)
    .eq("estado", "borrador")
    .order("created_at", { ascending: false })
    .limit(5);
  if (errorPrevio) return { ok: false, error: errorPrevio };
  const previo = borradores.find((b) => {
    const d = b.datos;
    const desistido = d !== null && typeof d === "object" && !Array.isArray(d) && d.desistido === true;
    return b.id !== null && !desistido && (b.cantidad_documentos ?? 0) === 0;
  });

  let tramiteId: string;
  if (previo?.id) {
    const { error } = await supabase.from("tramites").update({ datos }).eq("id", previo.id);
    if (error) return { ok: false, error };
    tramiteId = previo.id;
  } else {
    const { data, error } = await supabase
      .from("tramites")
      .insert({ empresa_id: empresaId, tipo, estado: "borrador", datos })
      .select("id")
      .single();
    if (error) return { ok: false, error };
    tramiteId = data.id;
  }

  // 2. Documentos (todas las filas con las mismas columnas, solo las permitidas a la empresa).
  const { data: documentos, error: errorDocs } = await supabase
    .from("documentos")
    .insert(
      adjuntos.map((a) => ({
        empresa_id: empresaId,
        tramite_id: tramiteId,
        tecnico_id: a.tecnico_id ?? null,
        tipo: a.tipo,
        nombre_archivo: a.nombre_archivo,
        path: a.path,
        vence: a.vence ?? null,
        estado: "pendiente" as const,
      })),
    )
    .select("id");
  if (errorDocs) return { ok: false, error: errorDocs };

  // 3. Presentación.
  const { data: presentado, error: errorPresentar } = await supabase
    .from("tramites")
    .update({ estado: "presentado" })
    .eq("id", tramiteId)
    .select("id, codigo")
    .single();
  if (errorPresentar) {
    await supabase
      .from("documentos")
      .delete()
      .in(
        "id",
        documentos.map((d) => d.id),
      );
    return { ok: false, error: errorPresentar };
  }
  return { ok: true, id: presentado.id, codigo: presentado.codigo };
}

/** Bloquea las escrituras de empresas dadas de baja del registro. */
export function motivoBloqueo(estado: Enums<"estado_empresa">): string | null {
  if (estado === "baja") return "La empresa está dada de baja del registro: no puede iniciar trámites.";
  return null;
}
