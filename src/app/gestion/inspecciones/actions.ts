"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff, ROLES_STAFF } from "@/lib/auth";
import { hoyISO } from "@/lib/domain/formato";
import { createClient, type SupabaseServer } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";
import { checklistPara } from "./_components/checklist";

const vacioANull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const idOpcional = z.preprocess(vacioANull, z.guid("Identificador inválido.").nullable().default(null));
const textoOpcional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || null : null),
    z.string().max(max, `Usá como máximo ${max} caracteres.`).nullable(),
  );
const fecha = z.string({ message: "Indicá la fecha." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Indicá una fecha válida.");
const coordenada = (min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : null),
    z.number().min(min, "Coordenada fuera de rango.").max(max, "Coordenada fuera de rango.").nullable(),
  );

/** Revalida las pantallas de fiscalización que muestran inspecciones. */
function revalidarFiscalizacion(ids: { inspeccion?: string; establecimiento?: string | null; denuncia?: string | null }) {
  revalidatePath("/gestion/inspecciones");
  revalidatePath("/gestion/hoja-de-ruta", "layout");
  if (ids.inspeccion) revalidatePath(`/gestion/inspecciones/${ids.inspeccion}`);
  if (ids.establecimiento) revalidatePath(`/gestion/establecimientos/${ids.establecimiento}`);
  if (ids.denuncia) {
    revalidatePath("/gestion/denuncias");
    revalidatePath(`/gestion/denuncias/${ids.denuncia}`);
  }
}

/** Verifica que el inspector asignado sea un usuario activo del staff. */
async function inspectorValido(supabase: SupabaseServer, id: string | null): Promise<string | null> {
  if (!id) return null;
  const { data, error } = await supabase.from("perfiles").select("id, rol, activo").eq("id", id).maybeSingle();
  if (error) return mensajeError(error);
  if (!data || !data.activo || !ROLES_STAFF.some((r) => r === data.rol)) {
    return "El inspector elegido no es un usuario activo del área.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Programar inspección
// ---------------------------------------------------------------------------

const esquemaNueva = z
  .object({
    tipo: z.enum(Constants.public.Enums.tipo_inspeccion, { message: "Elegí el tipo de inspección." }),
    fecha_programada: fecha,
    inspector_id: idOpcional,
    establecimiento_id: idOpcional,
    empresa_id: idOpcional,
    certificado_id: idOpcional,
    denuncia_id: idOpcional,
    observaciones: textoOpcional(2000),
  })
  .superRefine((d, ctx) => {
    if (d.fecha_programada < hoyISO()) {
      ctx.addIssue({ code: "custom", path: ["fecha_programada"], message: "Programala para hoy o una fecha futura." });
    }
    if ((d.tipo === "deposito_anual" || d.tipo === "habilitacion") && !d.empresa_id) {
      ctx.addIssue({ code: "custom", path: ["empresa_id"], message: "Elegí la empresa cuya oficina y depósito vas a inspeccionar." });
    } else if (!d.establecimiento_id && !d.empresa_id && !d.certificado_id) {
      ctx.addIssue({ code: "custom", path: ["establecimiento_id"], message: "Elegí un establecimiento o una empresa." });
    }
  });

export async function crearInspeccion(_prev: EstadoAccion<{ id: string }>, formData: FormData): Promise<EstadoAccion<{ id: string }>> {
  await requerirStaff();
  const parsed = esquemaNueva.safeParse({
    tipo: formData.get("tipo"),
    fecha_programada: formData.get("fecha_programada"),
    inspector_id: formData.get("inspector_id"),
    establecimiento_id: formData.get("establecimiento_id"),
    empresa_id: formData.get("empresa_id"),
    certificado_id: formData.get("certificado_id"),
    denuncia_id: formData.get("denuncia_id"),
    observaciones: formData.get("observaciones"),
  });
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();

  const errorInspector = await inspectorValido(supabase, d.inspector_id);
  if (errorInspector) return fallo(errorInspector, { inspector_id: [errorInspector] });

  // El certificado define el lugar y la empresa del servicio a muestrear (no se toman del formulario).
  let establecimientoId = d.establecimiento_id;
  let empresaId = d.empresa_id;
  if (d.certificado_id) {
    const { data: cert, error } = await supabase
      .from("certificados")
      .select("id, empresa_id, establecimiento_id, estado")
      .eq("id", d.certificado_id)
      .maybeSingle();
    if (error) return fallo(mensajeError(error));
    if (!cert) return fallo("No se encontró el certificado del servicio.");
    if (cert.estado === "anulado") return fallo("El certificado está anulado: no corresponde inspeccionar ese servicio.");
    empresaId = cert.empresa_id;
    establecimientoId = cert.establecimiento_id ?? establecimientoId;
  }

  let denuncia: { id: string; estado: string; asignada_a: string | null } | null = null;
  if (d.denuncia_id) {
    const { data, error } = await supabase
      .from("denuncias")
      .select("id, estado, asignada_a")
      .eq("id", d.denuncia_id)
      .maybeSingle();
    if (error) return fallo(mensajeError(error));
    if (!data) return fallo("No se encontró la denuncia vinculada.");
    denuncia = data;
  }

  const { data: creada, error } = await supabase
    .from("inspecciones")
    .insert({
      tipo: d.tipo,
      estado: "programada",
      fecha_programada: d.fecha_programada,
      inspector_id: d.inspector_id,
      establecimiento_id: establecimientoId,
      empresa_id: empresaId,
      certificado_id: d.certificado_id,
      denuncia_id: d.denuncia_id,
      observaciones: d.observaciones,
    })
    .select("id, codigo")
    .single();
  if (error) return fallo(mensajeError(error));

  if (denuncia && (denuncia.estado === "recibida" || denuncia.estado === "en_curso")) {
    const { error: errorDenuncia } = await supabase
      .from("denuncias")
      .update({ estado: "inspeccion_programada", asignada_a: denuncia.asignada_a ?? d.inspector_id })
      .eq("id", denuncia.id);
    if (errorDenuncia) {
      revalidarFiscalizacion({ inspeccion: creada.id, establecimiento: establecimientoId, denuncia: denuncia.id });
      return exito(
        `Inspección ${creada.codigo ?? ""} programada, pero no se pudo actualizar la denuncia: ${mensajeError(errorDenuncia)}`,
        { id: creada.id },
      );
    }
  }

  revalidarFiscalizacion({ inspeccion: creada.id, establecimiento: establecimientoId, denuncia: denuncia?.id });
  return exito(`Inspección ${creada.codigo ?? ""} programada.`, { id: creada.id });
}

// ---------------------------------------------------------------------------
// Registrar resultado
// ---------------------------------------------------------------------------

const esquemaResultado = z.object({
  id: z.guid("Inspección inválida."),
  resultado: z.enum(Constants.public.Enums.resultado_inspeccion, { message: "Elegí el resultado de la inspección." }),
  observaciones: textoOpcional(4000),
  lat: coordenada(-90, 90),
  lng: coordenada(-180, 180),
});

export async function registrarResultado(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirStaff();
  const parsed = esquemaResultado.safeParse({
    id: formData.get("id"),
    resultado: formData.get("resultado"),
    observaciones: formData.get("observaciones"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  });
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();

  const { data: insp, error: errorLectura } = await supabase
    .from("inspecciones")
    .select(
      "id, tipo, estado, establecimiento_id, denuncia_id, inspector_id, observaciones, establecimiento:establecimientos(tiene_tanque)",
    )
    .eq("id", d.id)
    .maybeSingle();
  if (errorLectura) return fallo(mensajeError(errorLectura));
  if (!insp) return fallo("No se encontró la inspección.");
  if (insp.estado !== "programada") return fallo("La inspección ya fue registrada o cancelada.");

  // El checklist se arma con los ítems del tipo de inspección (las claves no vienen del cliente).
  const items = checklistPara(insp.tipo, { tieneTanque: insp.establecimiento?.tiene_tanque ?? false });
  const checklist: Record<string, boolean> = {};
  for (const item of items) {
    const v = formData.get(`check_${item.clave}`);
    if (v === "si") checklist[item.clave] = true;
    else if (v === "no") checklist[item.clave] = false;
  }
  const incumplidos = items.filter((i) => checklist[i.clave] === false);

  if (d.resultado === "conforme" && incumplidos.length > 0) {
    const mensaje = `Marcaste ${incumplidos.length === 1 ? "un ítem que no cumple" : `${incumplidos.length} ítems que no cumplen`}: el resultado no puede ser conforme.`;
    return fallo(mensaje, { resultado: [mensaje] });
  }
  if (d.resultado !== "conforme" && !d.observaciones) {
    const mensaje =
      d.resultado === "ausente"
        ? "Indicá qué encontraste (cerrado, sin responsable, domicilio inexistente…)."
        : "Describí las irregularidades constatadas.";
    return fallo(mensaje, { observaciones: [mensaje] });
  }
  if ((d.lat === null) !== (d.lng === null)) {
    return fallo("La ubicación está incompleta: registrala de nuevo o quitála.");
  }

  // Las indicaciones cargadas al programar no se pierden: quedan después de lo constatado.
  const indicaciones = insp.observaciones?.trim();
  const observaciones =
    indicaciones && indicaciones !== d.observaciones
      ? [d.observaciones, `Indicaciones de la programación: ${indicaciones}`].filter(Boolean).join("\n\n")
      : d.observaciones;

  const { data: actualizada, error } = await supabase
    .from("inspecciones")
    .update({
      estado: "realizada",
      resultado: d.resultado,
      checklist,
      observaciones,
      lat: d.lat,
      lng: d.lng,
      // Si nadie la tenía asignada, queda a nombre de quien registra el resultado.
      inspector_id: insp.inspector_id ?? sesion.userId,
    })
    .eq("id", d.id)
    .eq("estado", "programada")
    .select("id, codigo")
    .maybeSingle();
  if (error) return fallo(mensajeError(error));
  if (!actualizada) return fallo("La inspección ya fue registrada o cancelada por otra persona.");

  // La denuncia vuelve a "en curso" para que el área la resuelva con el resultado a la vista.
  if (insp.denuncia_id) {
    await supabase
      .from("denuncias")
      .update({ estado: "en_curso" })
      .eq("id", insp.denuncia_id)
      .eq("estado", "inspeccion_programada");
  }

  revalidarFiscalizacion({ inspeccion: d.id, establecimiento: insp.establecimiento_id, denuncia: insp.denuncia_id });
  return exito(
    d.resultado === "conforme"
      ? `Inspección ${actualizada.codigo ?? ""} registrada como conforme.`
      : `Inspección ${actualizada.codigo ?? ""} registrada. Si corresponde, labrá el acta.`,
  );
}

// ---------------------------------------------------------------------------
// Reprogramar y cancelar
// ---------------------------------------------------------------------------

const esquemaReprogramar = z.object({
  id: z.guid("Inspección inválida."),
  fecha_programada: fecha.refine((f) => f >= hoyISO(), "Elegí hoy o una fecha futura."),
  inspector_id: idOpcional,
});

export async function reprogramarInspeccion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff();
  const parsed = esquemaReprogramar.safeParse({
    id: formData.get("id"),
    fecha_programada: formData.get("fecha_programada"),
    inspector_id: formData.get("inspector_id"),
  });
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();

  const errorInspector = await inspectorValido(supabase, d.inspector_id);
  if (errorInspector) return fallo(errorInspector, { inspector_id: [errorInspector] });

  const { data, error } = await supabase
    .from("inspecciones")
    .update({ fecha_programada: d.fecha_programada, inspector_id: d.inspector_id })
    .eq("id", d.id)
    .eq("estado", "programada")
    .select("id, establecimiento_id")
    .maybeSingle();
  if (error) return fallo(mensajeError(error));
  if (!data) return fallo("Solo se pueden reprogramar inspecciones programadas.");

  revalidarFiscalizacion({ inspeccion: d.id, establecimiento: data.establecimiento_id });
  return exito("Inspección reprogramada.");
}

const esquemaCancelar = z.object({
  id: z.guid("Inspección inválida."),
  motivo: z
    .string({ message: "Indicá el motivo." })
    .trim()
    .min(5, "Contá brevemente por qué se cancela (al menos 5 caracteres).")
    .max(500, "Usá como máximo 500 caracteres."),
});

export async function cancelarInspeccion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff();
  const parsed = esquemaCancelar.safeParse({ id: formData.get("id"), motivo: formData.get("motivo") });
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();

  const { data: insp, error: errorLectura } = await supabase
    .from("inspecciones")
    .select("id, estado, observaciones, establecimiento_id, denuncia_id")
    .eq("id", d.id)
    .maybeSingle();
  if (errorLectura) return fallo(mensajeError(errorLectura));
  if (!insp) return fallo("No se encontró la inspección.");
  if (insp.estado !== "programada") return fallo("Solo se pueden cancelar inspecciones programadas.");

  const observaciones = [insp.observaciones, `Cancelada: ${d.motivo}`].filter(Boolean).join("\n");
  const { data, error } = await supabase
    .from("inspecciones")
    .update({ estado: "cancelada", observaciones })
    .eq("id", d.id)
    .eq("estado", "programada")
    .select("id")
    .maybeSingle();
  if (error) return fallo(mensajeError(error));
  if (!data) return fallo("La inspección ya no está programada.");

  if (insp.denuncia_id) {
    await supabase
      .from("denuncias")
      .update({ estado: "en_curso" })
      .eq("id", insp.denuncia_id)
      .eq("estado", "inspeccion_programada");
  }

  revalidarFiscalizacion({ inspeccion: d.id, establecimiento: insp.establecimiento_id, denuncia: insp.denuncia_id });
  return exito("Inspección cancelada.");
}
