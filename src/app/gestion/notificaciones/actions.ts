"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import {
  buscarEmpresas,
  buscarEstablecimientos,
  esPersonalDeInspeccion,
  type EntidadOpcion,
} from "@/lib/data/intimaciones";
import { fechaHoraLocalAISO, formatFecha, formatFechaHora, hoyISO } from "@/lib/domain/formato";
import { normalizarCuit } from "@/lib/domain/cuit";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA_HORA_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
/** Tolerancia para fechas "futuras" por diferencias de reloj. */
const TOLERANCIA_MS = 10 * 60 * 1000;

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Usá como máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

const idOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || UUID.test(v), "El identificador no es válido.");

const idRequerido = z.string().regex(UUID, "El identificador no es válido.");

const dni = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => /^\d{7,8}$/.test(v), "Ingresá un DNI de 7 u 8 dígitos.");

const fechaHoraPasada = z
  .string()
  .trim()
  .regex(FECHA_HORA_LOCAL, "Indicá la fecha y la hora.")
  .transform((v) => fechaHoraLocalAISO(v))
  .refine((iso) => new Date(iso).getTime() <= Date.now() + TOLERANCIA_MS, "La fecha no puede ser posterior a este momento.");

function revalidarNotificaciones(id?: string) {
  // El layout de gestión muestra el contador de alertas (incluye notificaciones vencidas).
  revalidatePath("/gestion", "layout");
  if (id) revalidatePath(`/imprimir/notificacion/${id}`);
}

// -----------------------------------------------------------------------------
// Buscadores (establecimientos y empresas) para los formularios
// -----------------------------------------------------------------------------

const esquemaBusqueda = z.object({
  tipo: z.enum(["establecimiento", "empresa"]),
  texto: z.string().trim().max(80),
});

export async function buscarEntidades(
  tipo: "establecimiento" | "empresa",
  texto: string,
): Promise<EstadoAccion<EntidadOpcion[]>> {
  await requerirStaff();
  // Los argumentos llegan del navegador: se validan aunque estén tipados.
  const parsed = esquemaBusqueda.safeParse({ tipo, texto });
  if (!parsed.success) return fallo("La búsqueda no es válida.");
  const consulta = parsed.data.texto;
  if (consulta.length < 2) return exito("", []);
  try {
    const resultados =
      parsed.data.tipo === "empresa" ? await buscarEmpresas(consulta) : await buscarEstablecimientos(consulta);
    return exito("", resultados);
  } catch (e) {
    return fallo(e instanceof Error ? e.message : "No se pudo completar la búsqueda.");
  }
}

/** Verifica que el establecimiento, la empresa y el inspector elegidos existan (evita errores de clave foránea). */
async function verificarReferencias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  refs: { establecimiento_id: string | null; empresa_id: string | null; inspector_id: string | null },
): Promise<string | null> {
  const [est, emp, inspectorValido] = await Promise.all([
    refs.establecimiento_id
      ? supabase.from("establecimientos").select("id").eq("id", refs.establecimiento_id).maybeSingle()
      : Promise.resolve({ data: { id: "" }, error: null }),
    refs.empresa_id
      ? supabase.from("empresas").select("id").eq("id", refs.empresa_id).maybeSingle()
      : Promise.resolve({ data: { id: "" }, error: null }),
    refs.inspector_id ? esPersonalDeInspeccion(refs.inspector_id) : Promise.resolve(true),
  ]);
  const error = est.error ?? emp.error;
  if (error) return mensajeError(error);
  if (!est.data) return "El establecimiento elegido ya no existe. Buscalo de nuevo.";
  if (!emp.data) return "La empresa elegida ya no existe. Buscala de nuevo.";
  if (!inspectorValido) return "El inspector elegido no está activo o no pertenece al área de inspección.";
  return null;
}

// -----------------------------------------------------------------------------
// Alta
// -----------------------------------------------------------------------------

const esquemaNotificacion = z
  .object({
    tipo: z.enum(Constants.public.Enums.tipo_notificacion, { error: "Elegí el tipo de notificación." }),
    plazo: z.enum(Constants.public.Enums.plazo_notificacion, { error: "Elegí el plazo." }),
    establecimiento_id: idOpcional,
    empresa_id: idOpcional,
    razon_social: z
      .string({ error: "Ingresá la razón social o el nombre del establecimiento." })
      .trim()
      .min(2, "Ingresá la razón social o el nombre del establecimiento.")
      .max(200, "Usá como máximo 200 caracteres."),
    rubro: textoOpcional(150),
    cuit: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || normalizarCuit(v) !== null, "El CUIT debe tener 11 dígitos.")
      .transform((v) => (v ? normalizarCuit(v) : null)),
    domicilio: z
      .string({ error: "Ingresá el domicilio." })
      .trim()
      .min(3, "Ingresá el domicilio.")
      .max(250, "Usá como máximo 250 caracteres."),
    orden_trabajo: textoOpcional(40),
    inspector_id: idOpcional,
    observaciones: textoOpcional(2000),
    notificar_ahora: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "true"),
    persona_notificada: z.string().trim().optional(),
    dni_notificado: z.string().trim().optional(),
    notificada_at: z.string().trim().optional(),
  })
  .superRefine((d, ctx) => {
    if ((d.tipo === "documentacion" || d.tipo === "general") && !d.observaciones) {
      ctx.addIssue({
        code: "custom",
        path: ["observaciones"],
        message: "Detallá en observaciones qué debe presentar o regularizar el destinatario.",
      });
    }
    if (!d.notificar_ahora) return;
    if (!d.persona_notificada || d.persona_notificada.length < 3) {
      ctx.addIssue({ code: "custom", path: ["persona_notificada"], message: "Indicá quién recibió la notificación." });
    } else if (d.persona_notificada.length > 150) {
      ctx.addIssue({ code: "custom", path: ["persona_notificada"], message: "Usá como máximo 150 caracteres." });
    }
    if (!dni.safeParse(d.dni_notificado ?? "").success) {
      ctx.addIssue({ code: "custom", path: ["dni_notificado"], message: "Ingresá un DNI de 7 u 8 dígitos." });
    }
    const fecha = fechaHoraPasada.safeParse(d.notificada_at ?? "");
    if (!fecha.success) {
      ctx.addIssue({
        code: "custom",
        path: ["notificada_at"],
        message: fecha.error.issues[0]?.message ?? "Indicá la fecha y la hora.",
      });
    }
  });

export async function crearNotificacion(
  _prev: EstadoAccion<{ id: string }>,
  formData: FormData,
): Promise<EstadoAccion<{ id: string }>> {
  const sesion = await requerirStaff();
  const parsed = esquemaNotificacion.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();

  const problema = await verificarReferencias(supabase, d);
  if (problema) return fallo(problema);

  const notificacion = d.notificar_ahora
    ? {
        persona_notificada: d.persona_notificada ?? null,
        dni_notificado: dni.parse(d.dni_notificado ?? ""),
        notificada_at: fechaHoraPasada.parse(d.notificada_at ?? ""),
      }
    : { persona_notificada: null, dni_notificado: null, notificada_at: null };

  const { data, error } = await supabase
    .from("notificaciones")
    .insert({
      tipo: d.tipo,
      plazo: d.plazo,
      establecimiento_id: d.establecimiento_id,
      empresa_id: d.empresa_id,
      razon_social: d.razon_social,
      rubro: d.rubro,
      cuit: d.cuit,
      domicilio: d.domicilio,
      orden_trabajo: d.orden_trabajo,
      inspector_id: d.inspector_id ?? sesion.userId,
      observaciones: d.observaciones,
      ...notificacion,
    })
    .select("id, numero")
    .single();
  if (error) return fallo(mensajeError(error, "No se pudo emitir la notificación."));

  revalidarNotificaciones(data.id);
  if (d.establecimiento_id) revalidatePath(`/gestion/establecimientos/${d.establecimiento_id}`);
  return exito(
    d.notificar_ahora
      ? `Notificación N.º ${data.numero ?? ""} emitida y notificada: el plazo ya está corriendo.`
      : `Notificación N.º ${data.numero ?? ""} emitida. Registrá la entrega cuando la notifiques.`,
    { id: data.id },
  );
}

// -----------------------------------------------------------------------------
// Registrar la notificación (entrega en mano)
// -----------------------------------------------------------------------------

const esquemaRegistro = z.object({
  id: idRequerido,
  persona_notificada: z
    .string({ error: "Indicá quién recibió la notificación." })
    .trim()
    .min(3, "Indicá quién recibió la notificación.")
    .max(150, "Usá como máximo 150 caracteres."),
  dni_notificado: dni,
  notificada_at: fechaHoraPasada,
});

export async function registrarNotificacion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff();
  const parsed = esquemaRegistro.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, ...datos } = parsed.data;

  const supabase = await createClient();
  const { data: actual, error: errorLectura } = await supabase
    .from("notificaciones")
    .select("created_at")
    .eq("id", id)
    .maybeSingle();
  if (errorLectura) return fallo(mensajeError(errorLectura));
  if (!actual) return fallo("No se encontró la notificación.");
  // Se entrega impresa: no puede haberse notificado antes de emitirla.
  if (new Date(datos.notificada_at).getTime() < new Date(actual.created_at).getTime() - TOLERANCIA_MS) {
    return fallo("Revisá la fecha.", {
      notificada_at: [`No puede ser anterior a la emisión (${formatFechaHora(actual.created_at)}).`],
    });
  }

  const { data, error } = await supabase
    .from("notificaciones")
    .update(datos)
    .eq("id", id)
    .eq("estado", "emitida")
    .select("id, vence_at");
  if (error) return fallo(mensajeError(error, "No se pudo registrar la notificación."));
  if (!data || data.length === 0) {
    return fallo("La notificación ya fue registrada o cambió de estado. Actualizá la página.");
  }

  revalidarNotificaciones(id);
  const vence = data[0]?.vence_at;
  return exito(vence ? `Notificación registrada. El plazo vence el ${formatFecha(vence)}.` : "Notificación registrada.");
}

// -----------------------------------------------------------------------------
// Marcar como cumplida
// -----------------------------------------------------------------------------

const esquemaCumplida = z.object({
  id: idRequerido,
  cumplida_at: fechaHoraPasada,
});

export async function marcarCumplida(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff();
  const parsed = esquemaCumplida.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, cumplida_at } = parsed.data;

  const supabase = await createClient();
  const { data: actual, error: errorLectura } = await supabase
    .from("notificaciones")
    .select("created_at, notificada_at")
    .eq("id", id)
    .maybeSingle();
  if (errorLectura) return fallo(mensajeError(errorLectura));
  if (!actual) return fallo("No se encontró la notificación.");
  const inicio = actual.notificada_at ?? actual.created_at;
  if (new Date(cumplida_at).getTime() < new Date(inicio).getTime() - TOLERANCIA_MS) {
    return fallo("Revisá la fecha.", {
      cumplida_at: [
        `No puede ser anterior a la ${actual.notificada_at ? "notificación" : "emisión"} (${formatFechaHora(inicio)}).`,
      ],
    });
  }

  const { data, error } = await supabase
    .from("notificaciones")
    .update({ estado: "cumplida", cumplida_at })
    .eq("id", id)
    .in("estado", ["emitida", "notificada"])
    .select("id");
  if (error) return fallo(mensajeError(error, "No se pudo marcar la notificación como cumplida."));
  if (!data || data.length === 0) {
    return fallo("La notificación ya no está pendiente (fue cumplida, anulada o tiene acta). Actualizá la página.");
  }

  revalidarNotificaciones(id);
  return exito("Notificación marcada como cumplida.");
}

// -----------------------------------------------------------------------------
// Anular
// -----------------------------------------------------------------------------

const esquemaAnulacion = z.object({
  id: idRequerido,
  motivo: z
    .string({ error: "Indicá el motivo de la anulación." })
    .trim()
    .min(5, "Indicá el motivo de la anulación (al menos 5 caracteres).")
    .max(500, "Usá como máximo 500 caracteres."),
});

export async function anularNotificacion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirStaff();
  const parsed = esquemaAnulacion.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, motivo } = parsed.data;

  const supabase = await createClient();
  const { data: actual, error: errorLectura } = await supabase
    .from("notificaciones")
    .select("observaciones, estado")
    .eq("id", id)
    .maybeSingle();
  if (errorLectura) return fallo(mensajeError(errorLectura));
  if (!actual) return fallo("No se encontró la notificación.");

  const firmante = `${sesion.perfil.nombre} ${sesion.perfil.apellido}`.trim() || sesion.email;
  const nota = `Anulada el ${formatFecha(hoyISO())} por ${firmante}: ${motivo}`;
  const observaciones = [actual.observaciones, nota].filter(Boolean).join("\n");

  const { data, error } = await supabase
    .from("notificaciones")
    .update({ estado: "anulada", observaciones })
    .eq("id", id)
    .in("estado", ["emitida", "notificada"])
    .select("id");
  if (error) return fallo(mensajeError(error, "No se pudo anular la notificación."));
  if (!data || data.length === 0) {
    return fallo("La notificación ya no se puede anular (fue cumplida o tiene acta labrada).");
  }

  revalidarNotificaciones(id);
  return exito("Notificación anulada.");
}
