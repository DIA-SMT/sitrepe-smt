"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { esPersonalDeInspeccion } from "@/lib/data/intimaciones";
import { ESTADO_ACTA } from "@/lib/domain/etiquetas";
import { fechaHoraLocalAISO, formatFechaHora } from "@/lib/domain/formato";
import { Constants, type Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA_HORA_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const TOLERANCIA_MS = 10 * 60 * 1000;

const idOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || UUID.test(v), "El identificador no es válido.");

function revalidarActas(id?: string) {
  // Panel, alertas, notificaciones, establecimientos y empresas muestran actas: se revalida el área.
  revalidatePath("/gestion", "layout");
  if (id) revalidatePath(`/imprimir/acta/${id}`);
}

// -----------------------------------------------------------------------------
// Labrar acta
// -----------------------------------------------------------------------------

const esquemaActa = z
  .object({
    motivo: z.enum(Constants.public.Enums.motivo_acta, { error: "Elegí el motivo del acta." }),
    descripcion: z
      .string({ error: "Describí los hechos constatados." })
      .trim()
      .min(20, "Describí los hechos constatados (al menos 20 caracteres).")
      .max(4000, "Usá como máximo 4000 caracteres.")
      .refine((v) => !/\[[^\]]+\]/.test(v), "Completá los datos entre corchetes de la plantilla."),
    normativa: z
      .string()
      .trim()
      .max(500, "Usá como máximo 500 caracteres.")
      .optional()
      .transform((v) => (v ? v : null)),
    fecha: z
      .string({ error: "Indicá la fecha y la hora." })
      .trim()
      .regex(FECHA_HORA_LOCAL, "Indicá la fecha y la hora.")
      .transform((v) => fechaHoraLocalAISO(v))
      .refine((iso) => new Date(iso).getTime() <= Date.now() + TOLERANCIA_MS, "La fecha no puede ser posterior a este momento."),
    establecimiento_id: idOpcional,
    empresa_id: idOpcional,
    notificacion_id: idOpcional,
    inspeccion_id: idOpcional,
    inspector_id: idOpcional,
  })
  .superRefine((d, ctx) => {
    if (!d.establecimiento_id && !d.empresa_id) {
      ctx.addIssue({
        code: "custom",
        path: ["establecimiento_id"],
        message: "Indicá el establecimiento o la empresa a la que se le labra el acta.",
      });
    }
  });

export async function crearActa(
  _prev: EstadoAccion<{ id: string }>,
  formData: FormData,
): Promise<EstadoAccion<{ id: string }>> {
  const sesion = await requerirStaff();
  const parsed = esquemaActa.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();

  // Referencias elegidas en el navegador: se verifican antes de insertar.
  const [est, emp, notif, insp, inspectorValido] = await Promise.all([
    d.establecimiento_id
      ? supabase.from("establecimientos").select("id").eq("id", d.establecimiento_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    d.empresa_id
      ? supabase.from("empresas").select("id").eq("id", d.empresa_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    d.notificacion_id
      ? supabase
          .from("notificaciones")
          .select("estado, numero, vence_at, establecimiento_id, empresa_id")
          .eq("id", d.notificacion_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    d.inspeccion_id
      ? supabase.from("inspecciones").select("id, establecimiento_id, empresa_id").eq("id", d.inspeccion_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    d.inspector_id ? esPersonalDeInspeccion(d.inspector_id) : Promise.resolve(true),
  ]);
  const errorLectura = est.error ?? emp.error ?? notif.error ?? insp.error;
  if (errorLectura) return fallo(mensajeError(errorLectura));
  if (d.establecimiento_id && !est.data) return fallo("El establecimiento elegido ya no existe. Buscalo de nuevo.");
  if (d.empresa_id && !emp.data) return fallo("La empresa elegida ya no existe. Buscala de nuevo.");
  if (!inspectorValido) {
    return fallo("Revisá el inspector.", { inspector_id: ["No está activo o no pertenece al área de inspección."] });
  }

  // La notificación vinculada debe seguir abierta: al labrar el acta pasa a "acta labrada".
  if (d.notificacion_id) {
    const n = notif.data;
    if (!n) return fallo("La notificación vinculada ya no existe.");
    const numero = `N.º ${n.numero ?? ""}`;
    if (n.estado === "cumplida") {
      return fallo(`La notificación ${numero} ya fue cumplida: no corresponde labrar acta por incumplimiento.`);
    }
    if (n.estado === "anulada") return fallo(`La notificación ${numero} está anulada.`);
    if (n.estado === "acta_labrada") return fallo(`La notificación ${numero} ya tiene un acta labrada.`);
    if (
      (n.establecimiento_id && d.establecimiento_id && n.establecimiento_id !== d.establecimiento_id) ||
      (n.empresa_id && d.empresa_id && n.empresa_id !== d.empresa_id)
    ) {
      return fallo(`La notificación ${numero} corresponde a otro destinatario: revisá el infractor o desvinculala.`);
    }
    // El incumplimiento recién se configura cuando vence el plazo (días hábiles desde la entrega).
    if (d.motivo === "incumplimiento_notificacion") {
      if (n.estado === "emitida" || !n.vence_at) {
        return fallo(`La notificación ${numero} todavía no fue entregada: registrá la notificación antes de labrar el acta.`);
      }
      const vence = new Date(n.vence_at).getTime();
      if (vence > Date.now()) {
        return fallo(`El plazo de la notificación ${numero} todavía no venció (vence el ${formatFechaHora(n.vence_at)}).`);
      }
      if (vence > new Date(d.fecha).getTime()) {
        return fallo("Revisá la fecha del acta.", {
          fecha: [`Debe ser posterior al vencimiento del plazo (${formatFechaHora(n.vence_at)}).`],
        });
      }
    }
  }

  if (d.inspeccion_id) {
    const i = insp.data;
    if (!i) return fallo("La inspección vinculada ya no existe.");
    // La empresa puede diferir (p. ej. el servicio lo hizo otra empresa, no habilitada); el lugar, no.
    if (i.establecimiento_id && d.establecimiento_id && i.establecimiento_id !== d.establecimiento_id) {
      return fallo("La inspección vinculada se hizo en otro establecimiento: revisá el infractor o desvinculala.");
    }
  }

  const { data, error } = await supabase
    .from("actas")
    .insert({
      motivo: d.motivo,
      descripcion: d.descripcion,
      normativa: d.normativa,
      fecha: d.fecha,
      establecimiento_id: d.establecimiento_id,
      empresa_id: d.empresa_id,
      notificacion_id: d.notificacion_id,
      inspeccion_id: d.inspeccion_id,
      inspector_id: d.inspector_id ?? sesion.userId,
    })
    .select("id, numero")
    .single();
  if (error) return fallo(mensajeError(error, "No se pudo labrar el acta."));

  revalidarActas(data.id);
  if (d.notificacion_id) revalidatePath(`/imprimir/notificacion/${d.notificacion_id}`);
  return exito(`Acta N.º ${data.numero ?? ""} labrada.`, { id: data.id });
}

// -----------------------------------------------------------------------------
// Cambio de estado: labrada → elevada → resuelta · labrada/elevada → anulada
// -----------------------------------------------------------------------------

type EstadoActa = Enums<"estado_acta">;

/** Estados desde los que se puede pasar a cada destino. */
const ORIGENES: Record<Exclude<EstadoActa, "labrada">, EstadoActa[]> = {
  elevada: ["labrada"],
  resuelta: ["elevada"],
  anulada: ["labrada", "elevada"],
};

const MENSAJES: Record<Exclude<EstadoActa, "labrada">, string> = {
  elevada: "Acta elevada al Tribunal Municipal de Faltas.",
  resuelta: "Acta marcada como resuelta.",
  anulada: "Acta anulada.",
};

const esquemaEstado = z.object({
  id: z.string().regex(UUID, "El identificador no es válido."),
  estado: z.enum(["elevada", "resuelta", "anulada"], { error: "Elegí el nuevo estado." }),
});

export async function cambiarEstadoActa(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  // Elevar, resolver y anular son decisiones administrativas de la Dirección (no del inspector).
  await requerirStaff(["admin", "control"]);
  const parsed = esquemaEstado.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, estado } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("actas")
    .update({ estado })
    .eq("id", id)
    .in("estado", ORIGENES[estado])
    .select("id, notificacion_id");
  if (error) return fallo(mensajeError(error, "No se pudo cambiar el estado del acta."));
  if (!data || data.length === 0) {
    const { data: actual } = await supabase.from("actas").select("estado").eq("id", id).maybeSingle();
    return fallo(
      actual
        ? `El acta está «${ESTADO_ACTA[actual.estado].label}»: no puede pasar a «${ESTADO_ACTA[estado].label}». Actualizá la página.`
        : "No se encontró el acta.",
    );
  }

  let aviso = "";
  const notificacionId = data[0]?.notificacion_id;
  if (estado === "anulada" && notificacionId) {
    aviso = await reabrirNotificacion(supabase, notificacionId);
    revalidatePath(`/imprimir/notificacion/${notificacionId}`);
  }

  revalidarActas(id);
  return exito(`${MENSAJES[estado]}${aviso}`);
}

/**
 * Al anular el acta, la notificación que había cerrado (estado «acta labrada») vuelve a quedar
 * abierta —notificada o emitida— para poder labrar una nueva acta con los datos correctos.
 * Devuelve un texto para sumar al mensaje de resultado.
 */
async function reabrirNotificacion(supabase: Awaited<ReturnType<typeof createClient>>, notificacionId: string) {
  const [vigentes, notificacion] = await Promise.all([
    supabase
      .from("actas")
      .select("id", { count: "exact", head: true })
      .eq("notificacion_id", notificacionId)
      .neq("estado", "anulada"),
    supabase.from("notificaciones").select("estado, notificada_at, numero").eq("id", notificacionId).maybeSingle(),
  ]);
  const n = notificacion.data;
  if (vigentes.error || notificacion.error || !n || n.estado !== "acta_labrada" || (vigentes.count ?? 0) > 0) return "";

  const { error } = await supabase
    .from("notificaciones")
    .update({ estado: n.notificada_at ? "notificada" : "emitida" })
    .eq("id", notificacionId)
    .eq("estado", "acta_labrada");
  if (error) return ` No se pudo reabrir la notificación N.º ${n.numero ?? ""}: ${mensajeError(error)}`;
  return ` La notificación N.º ${n.numero ?? ""} volvió a quedar abierta.`;
}
