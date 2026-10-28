"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { calcularRequisitos, getContextoTramite } from "@/lib/data/empresas";
import { TIPO_TRAMITE } from "@/lib/domain/etiquetas";
import { createClient } from "@/lib/supabase/server";

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Usá como máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

const esquemaResolucion = z
  .object({
    id: z.uuid({ message: "Trámite inválido." }),
    decision: z.enum(["aprobar", "observar", "rechazar"], { message: "Elegí una decisión." }),
    observaciones: textoOpcional(2000),
    resolucion: textoOpcional(40),
    forzar: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "true"),
  })
  .superRefine((d, ctx) => {
    if (d.decision === "observar" && !d.observaciones) {
      ctx.addIssue({ code: "custom", path: ["observaciones"], message: "Indicá qué debe corregir o completar la empresa." });
    }
    if (d.decision === "rechazar" && !d.observaciones) {
      ctx.addIssue({ code: "custom", path: ["observaciones"], message: "Indicá el motivo del rechazo." });
    }
  });

/** 70/dsa/2026 → 070/DSA/2026 (formato de la resolución de autorización de la Dirección). */
function normalizarResolucionDsa(valor: string): string | null {
  const limpio = valor
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^RES(OLUCI[OÓ]N)?\.?(N[º°O]?\.?)?/, "");
  const m = limpio.match(/^(\d{1,4})\/DSA\/(\d{4})$/);
  if (!m || Number(m[1]) === 0 || Number(m[2]) < 1990 || Number(m[2]) > 2100) return null;
  return `${m[1].padStart(3, "0")}/DSA/${m[2]}`;
}

/** Aprobar, observar o rechazar un trámite del registro (rpc resolver_tramite). */
export async function resolverTramite(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(["admin", "control"]);
  const parsed = esquemaResolucion.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, decision, observaciones, forzar } = parsed.data;

  const contexto = await getContextoTramite(id);
  if (!contexto) return fallo("No se encontró el trámite.");
  const { tramite } = contexto;
  if (tramite.estado !== "presentado" && tramite.estado !== "observado") {
    return fallo("El trámite ya fue resuelto: actualizá la página para ver su estado.");
  }

  const supabase = await createClient();
  let resolucion: string | null = parsed.data.resolucion;

  if (decision === "aprobar") {
    if (tramite.tipo === "inscripcion") {
      if (!resolucion) {
        return fallo("Falta el número de resolución.", {
          resolucion: ["Indicá el N.º de resolución DSA de autorización (000/DSA/AAAA)."],
        });
      }
      const normalizada = normalizarResolucionDsa(resolucion);
      if (!normalizada) {
        return fallo("Revisá el número de resolución.", { resolucion: ["Usá el formato 000/DSA/AAAA (p. ej. 075/DSA/2026)."] });
      }
      resolucion = normalizada;
      const { data: otra } = await supabase
        .from("empresas")
        .select("nombre_comercial, numero_registro")
        .eq("resolucion_dsa", resolucion)
        .neq("id", tramite.empresa_id)
        .limit(1)
        .maybeSingle();
      if (otra) {
        return fallo("La resolución ya está asignada.", {
          resolucion: [
            `La Res. ${resolucion} ya corresponde a ${otra.nombre_comercial}${otra.numero_registro ? ` (N.º ${otra.numero_registro})` : ""}: es única por empresa.`,
          ],
        });
      }
    }

    const incompletos = calcularRequisitos(contexto).filter((r) => r.estado !== "cumplido");
    if (incompletos.length > 0 && !forzar) {
      return fallo("Hay requisitos sin cumplir.", {
        forzar: [
          `Falta${incompletos.length === 1 ? "" : "n"}: ${incompletos.map((r) => r.titulo.toLowerCase()).join("; ")}. Confirmá que lo verificaste para aprobar igualmente.`,
        ],
      });
    }
  }

  const { error } = await supabase.rpc("resolver_tramite", {
    p_tramite: id,
    p_decision: decision,
    p_observaciones: observaciones ?? undefined,
    p_resolucion: resolucion ?? undefined,
  });
  if (error) {
    if (error.code === "23505") {
      return fallo("La resolución ya está asignada a otra empresa.", {
        resolucion: ["Esta resolución DSA ya está asignada a otra empresa: debe ser única."],
      });
    }
    return fallo(mensajeError(error, "No se pudo resolver el trámite."));
  }

  revalidatePath("/gestion/tramites");
  revalidatePath(`/gestion/tramites/${id}`);
  revalidatePath(`/gestion/empresas/${tramite.empresa_id}`);
  revalidatePath("/gestion/empresas");
  revalidatePath("/gestion");
  revalidatePath("/empresas");
  revalidatePath("/prestador", "layout");

  const tipo = tramite.tipo ? TIPO_TRAMITE[tramite.tipo].label.toLowerCase() : "trámite";
  const empresa = contexto.empresa?.nombre_comercial ?? "la empresa";
  switch (decision) {
    case "aprobar":
      return exito(
        tramite.tipo === "inscripcion"
          ? `Inscripción aprobada: ${empresa} quedó habilitada con la Res. ${resolucion}.`
          : `Se aprobó el trámite de ${tipo} de ${empresa}.`,
      );
    case "observar":
      return exito(`Trámite observado: ${empresa} verá las observaciones para corregirlo.`);
    case "rechazar":
      return exito(`Se rechazó el trámite de ${tipo} de ${empresa}.`);
  }
}
