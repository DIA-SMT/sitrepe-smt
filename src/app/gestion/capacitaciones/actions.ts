"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { fechaHoraLocalAISO } from "@/lib/domain/formato";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/* Capacitaciones: las gestiona Administración o Control (RLS: puede_controlar). */
const ROLES = ["admin", "control"] as const;

const casilla = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Usá como máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

const numero = (v: unknown) => (typeof v === "string" ? v.trim().replace(",", ".") : v);

const esquemaCapacitacion = z
  .object({
    id: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined)
      .pipe(z.uuid({ message: "Identificador inválido." }).optional()),
    titulo: z
      .string()
      .trim()
      .min(5, "Escribí un título de al menos 5 caracteres.")
      .max(160, "Usá como máximo 160 caracteres."),
    descripcion: z
      .string()
      .trim()
      .min(20, "Describí la capacitación (al menos 20 caracteres).")
      .max(2000, "Usá como máximo 2.000 caracteres."),
    modalidad: z.enum(Constants.public.Enums.modalidad_capacitacion, {
      message: "Elegí la modalidad.",
    }),
    lugar: textoOpcional(200),
    fecha_inicio: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "Indicá la fecha y la hora de inicio."),
    duracion_horas: z.preprocess(
      numero,
      z.coerce
        .number({ message: "Indicá la duración en horas." })
        .min(0.5, "La duración mínima es de media hora.")
        .max(200, "Revisá la duración (máximo 200 horas).")
        .multipleOf(0.5, "Usá horas enteras o medias horas (p. ej. 1,5)."),
    ),
    cupo: z.preprocess(
      (v) => (v === "" || v === undefined ? null : numero(v)),
      z.coerce
        .number({ message: "El cupo debe ser un número." })
        .int("El cupo debe ser un número entero.")
        .min(1, "El cupo debe ser de al menos 1 persona.")
        .max(10000, "Revisá el cupo.")
        .nullable(),
    ),
    estado: z.enum(Constants.public.Enums.estado_capacitacion, {
      message: "Elegí el estado.",
    }),
    destinatarios: textoOpcional(300),
  })
  .superRefine((d, ctx) => {
    if (d.modalidad !== "virtual" && !d.lugar) {
      ctx.addIssue({
        code: "custom",
        path: ["lugar"],
        message: "Indicá dónde se dicta (dirección o sede).",
      });
    }
  });

/** Fecha y hora del formulario (hora de Tucumán) a ISO; null si no es una fecha real (p. ej. 31/02). */
function isoSeguro(valor: string): string | null {
  try {
    return fechaHoraLocalAISO(valor);
  } catch {
    // toISOString() lanza RangeError con fechas inexistentes.
    return null;
  }
}

function revalidarCapacitaciones(id?: string) {
  revalidatePath("/gestion/capacitaciones");
  if (id) revalidatePath(`/gestion/capacitaciones/${id}`);
  revalidatePath("/capacitaciones");
}

/** Alta o edición de una capacitación (con `id`, edita). */
export async function guardarCapacitacion(
  _prev: EstadoAccion<{ id: string }>,
  formData: FormData,
): Promise<EstadoAccion<{ id: string }>> {
  await requerirStaff(ROLES);
  const parsed = esquemaCapacitacion.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  const fechaInicio = isoSeguro(d.fecha_inicio);
  if (!fechaInicio) {
    return fallo("Revisá los datos marcados.", {
      fecha_inicio: ["La fecha no es válida."],
    });
  }
  const yaComenzo = new Date(fechaInicio).getTime() < Date.now();

  const supabase = await createClient();

  // La inscripción solo puede abrirse para una fecha futura. Al editar una capacitación que ya
  // estaba abierta sin tocar la fecha (p. ej. corregir la descripción), no se bloquea el guardado.
  if (d.estado === "abierta" && yaComenzo) {
    let bloquear = true;
    if (d.id) {
      const { data: actual, error } = await supabase
        .from("capacitaciones")
        .select("estado, fecha_inicio")
        .eq("id", d.id)
        .maybeSingle();
      if (error) return fallo(mensajeError(error, "No se pudo obtener la capacitación."));
      if (!actual) return fallo("La capacitación ya no existe.");
      bloquear =
        actual.estado !== "abierta" || new Date(actual.fecha_inicio).getTime() !== new Date(fechaInicio).getTime();
    }
    if (bloquear) {
      return fallo("Revisá los datos marcados.", {
        fecha_inicio: ["Para abrir la inscripción, la fecha de inicio tiene que ser futura."],
      });
    }
  }
  const campos = {
    titulo: d.titulo,
    descripcion: d.descripcion,
    modalidad: d.modalidad,
    lugar: d.lugar,
    fecha_inicio: fechaInicio,
    duracion_horas: d.duracion_horas,
    cupo: d.cupo,
    estado: d.estado,
    destinatarios: d.destinatarios,
  };

  if (!d.id) {
    const { data, error } = await supabase.from("capacitaciones").insert(campos).select("id").single();
    if (error) return fallo(mensajeError(error, "No se pudo crear la capacitación."));
    revalidarCapacitaciones(data.id);
    return exito(
      d.estado === "abierta" ? "Capacitación creada: ya se puede inscribir desde el portal." : "Capacitación creada.",
      { id: data.id },
    );
  }

  if (d.cupo !== null) {
    const { count, error } = await supabase
      .from("capacitacion_inscripciones")
      .select("id", { count: "exact", head: true })
      .eq("capacitacion_id", d.id);
    if (error) return fallo(mensajeError(error, "No se pudo verificar la cantidad de inscriptos."));
    if ((count ?? 0) > d.cupo) {
      return fallo("Revisá los datos marcados.", {
        cupo: [`Ya hay ${count} inscriptos: el cupo no puede ser menor.`],
      });
    }
  }

  const { data, error } = await supabase
    .from("capacitaciones")
    .update(campos)
    .eq("id", d.id)
    .select("id")
    .maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo guardar la capacitación."));
  if (!data) return fallo("La capacitación ya no existe.");
  revalidarCapacitaciones(d.id);
  return exito("Cambios guardados.", { id: d.id });
}

const MENSAJE_ESTADO: Record<(typeof Constants.public.Enums.estado_capacitacion)[number], string> = {
  abierta: "Inscripción abierta en el portal.",
  cerrada: "Inscripción cerrada.",
  finalizada: "Capacitación marcada como finalizada.",
  cancelada: "Capacitación cancelada: ya no se muestra en el portal.",
};

/** Cambia el estado (abrir o cerrar la inscripción, finalizar, cancelar). */
export async function cambiarEstadoCapacitacion(formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES);
  const parsed = z
    .object({
      id: z.uuid({ message: "Identificador inválido." }),
      estado: z.enum(Constants.public.Enums.estado_capacitacion, {
        message: "Estado inválido.",
      }),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, estado } = parsed.data;

  const supabase = await createClient();
  if (estado === "abierta") {
    const { data: actual, error } = await supabase
      .from("capacitaciones")
      .select("fecha_inicio")
      .eq("id", id)
      .maybeSingle();
    if (error) return fallo(mensajeError(error, "No se pudo obtener la capacitación."));
    if (!actual) return fallo("La capacitación ya no existe.");
    if (new Date(actual.fecha_inicio).getTime() < Date.now()) {
      return fallo("La capacitación ya comenzó: para reabrir la inscripción, editá la fecha de inicio.");
    }
  }
  const { data, error } = await supabase
    .from("capacitaciones")
    .update({ estado })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo cambiar el estado."));
  if (!data) return fallo("La capacitación ya no existe.");
  revalidarCapacitaciones(id);
  return exito(MENSAJE_ESTADO[estado]);
}

/** Marca o desmarca la asistencia de un inscripto (al marcarla, la base asigna el código de certificado). */
export async function marcarAsistencia(formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES);
  const parsed = z
    .object({
      id: z.uuid({ message: "Identificador inválido." }),
      capacitacion: z.uuid({ message: "Identificador inválido." }),
      asistio: casilla,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, capacitacion, asistio } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("capacitacion_inscripciones")
    .update({ asistio })
    .eq("id", id)
    .eq("capacitacion_id", capacitacion)
    .select("nombre, certificado_codigo")
    .maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo registrar la asistencia."));
  if (!data) return fallo("La inscripción ya no existe.");
  revalidarCapacitaciones(capacitacion);
  return exito(
    asistio
      ? `Asistencia registrada para ${data.nombre}${data.certificado_codigo ? ` · certificado ${data.certificado_codigo}` : ""}.`
      : `Se quitó la asistencia de ${data.nombre}.`,
  );
}

/** Marca como presentes a todos los inscriptos que todavía figuran ausentes. */
export async function marcarTodosPresentes(formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES);
  const parsed = z
    .object({ capacitacion: z.uuid({ message: "Identificador inválido." }) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { capacitacion } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("capacitacion_inscripciones")
    .update({ asistio: true })
    .eq("capacitacion_id", capacitacion)
    .eq("asistio", false)
    .select("id");
  if (error) return fallo(mensajeError(error, "No se pudo registrar la asistencia."));
  revalidarCapacitaciones(capacitacion);
  const n = data?.length ?? 0;
  return n === 0
    ? exito("Todos los inscriptos ya figuraban como presentes.")
    : exito(`Asistencia registrada para ${n} ${n === 1 ? "persona" : "personas"}. Se generaron sus certificados.`);
}
