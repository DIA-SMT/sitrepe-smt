"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { buscarEstablecimientosPorTexto, type OpcionEstablecimiento, ZONAS } from "@/lib/data/fiscalizacion";
import { cuitValido, normalizarCuit } from "@/lib/domain/cuit";
import { createClient } from "@/lib/supabase/server";

/** Búsqueda para los selectores de establecimiento (inspecciones, denuncias). */
export async function buscarEstablecimientos(texto: string): Promise<OpcionEstablecimiento[]> {
  await requerirStaff();
  if (typeof texto !== "string") return [];
  return buscarEstablecimientosPorTexto(texto);
}

const vacioANull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const textoOpcional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || null : null),
    z.string().max(max, `Usá como máximo ${max} caracteres.`).nullable(),
  );
const casilla = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const coordenada = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : null),
  z.number({ message: "Ingresá un número (p. ej. -26.8241)." }).nullable(),
);

/** Gran San Miguel de Tucumán (con margen): detecta coordenadas invertidas o de otra ciudad. */
const LIMITES = { latMin: -27.2, latMax: -26.4, lngMin: -65.7, lngMax: -64.8 };

const esquemaEstablecimiento = z
  .object({
    nombre: z
      .string({ message: "Ingresá el nombre o razón social." })
      .trim()
      .min(2, "Ingresá el nombre o razón social.")
      .max(200, "Usá como máximo 200 caracteres."),
    nombre_fantasia: textoOpcional(200),
    cuit: z.preprocess(vacioANull, z.string().nullable()),
    domicilio: z
      .string({ message: "Ingresá el domicilio." })
      .trim()
      .min(3, "Ingresá el domicilio (calle y número).")
      .max(300, "Usá como máximo 300 caracteres."),
    barrio: textoOpcional(120),
    // La zona y el CUIT se validan contra la lista/dígito verificador en `validarContraActual`
    // (al editar se conservan los valores ya cargados, p. ej. por una empresa al declarar).
    zona: z.preprocess(vacioANull, z.string().trim().max(40, "Elegí una zona de la lista.").nullable()),
    lat: coordenada,
    lng: coordenada,
    rubro_id: z.preprocess(
      (v) => (typeof v === "string" && v !== "" ? Number(v) : null),
      z.number().int().positive("Elegí un rubro.").nullable(),
    ),
    tiene_tanque: casilla,
    afluencia_publico: casilla,
    telefono: textoOpcional(60),
    email: z.preprocess(vacioANull, z.email("Ingresá un correo válido.").nullable()),
  })
  .superRefine((d, ctx) => {
    if (d.cuit !== null && !normalizarCuit(d.cuit)) {
      ctx.addIssue({ code: "custom", path: ["cuit"], message: "El CUIT debe tener 11 dígitos." });
    }
    if ((d.lat === null) !== (d.lng === null)) {
      ctx.addIssue({ code: "custom", path: [d.lat === null ? "lat" : "lng"], message: "Completá latitud y longitud, o dejá ambas vacías." });
    }
    if (d.lat !== null && (d.lat < LIMITES.latMin || d.lat > LIMITES.latMax)) {
      ctx.addIssue({ code: "custom", path: ["lat"], message: "La latitud queda fuera de San Miguel de Tucumán (debería rondar -26,8)." });
    }
    if (d.lng !== null && (d.lng < LIMITES.lngMin || d.lng > LIMITES.lngMax)) {
      ctx.addIssue({ code: "custom", path: ["lng"], message: "La longitud queda fuera de San Miguel de Tucumán (debería rondar -65,2)." });
    }
  });

function leerFormulario(formData: FormData) {
  return esquemaEstablecimiento.safeParse({
    nombre: formData.get("nombre"),
    nombre_fantasia: formData.get("nombre_fantasia"),
    cuit: formData.get("cuit"),
    domicilio: formData.get("domicilio"),
    barrio: formData.get("barrio"),
    zona: formData.get("zona"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    rubro_id: formData.get("rubro_id"),
    tiene_tanque: formData.get("tiene_tanque"),
    afluencia_publico: formData.get("afluencia_publico"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
  });
}

type DatosEstablecimiento = z.infer<typeof esquemaEstablecimiento>;

/**
 * CUIT con dígito verificador válido y zona de la lista. Al editar se aceptan sin cambios los
 * valores ya guardados (p. ej. un CUIT o una zona que cargó una empresa al declarar el servicio):
 * si no, no se podría guardar ningún otro cambio de la ficha.
 */
function validarContraActual(
  d: DatosEstablecimiento,
  actual: { cuit: string | null; zona: string | null } | null,
): Record<string, string[]> | null {
  const errores: Record<string, string[]> = {};
  const cuit = d.cuit ? normalizarCuit(d.cuit) : null;
  if (cuit && !cuitValido(cuit) && cuit !== actual?.cuit) {
    errores.cuit = ["El CUIT no es válido (revisá el dígito verificador)."];
  }
  if (d.zona && !ZONAS.some((z) => z === d.zona) && d.zona !== actual?.zona) {
    errores.zona = ["Elegí una zona de la lista."];
  }
  return Object.keys(errores).length > 0 ? errores : null;
}

function aFila(d: DatosEstablecimiento) {
  return {
    nombre: d.nombre,
    nombre_fantasia: d.nombre_fantasia,
    cuit: d.cuit ? normalizarCuit(d.cuit) : null,
    domicilio: d.domicilio,
    barrio: d.barrio,
    zona: d.zona,
    lat: d.lat,
    lng: d.lng,
    rubro_id: d.rubro_id,
    tiene_tanque: d.tiene_tanque,
    afluencia_publico: d.afluencia_publico,
    telefono: d.telefono,
    email: d.email,
  };
}

/** Escapa los comodines de ILIKE para comparar el domicilio literal. */
const literal = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function crearEstablecimiento(
  _prev: EstadoAccion<{ id: string }>,
  formData: FormData,
): Promise<EstadoAccion<{ id: string }>> {
  await requerirStaff();
  const parsed = leerFormulario(formData);
  if (!parsed.success) return falloValidacion(parsed.error);
  const errores = validarContraActual(parsed.data, null);
  if (errores) return fallo("Revisá los datos marcados.", errores);
  const fila = aFila(parsed.data);
  const supabase = await createClient();

  if (formData.get("forzar") !== "on") {
    const { data: existente, error } = await supabase
      .from("establecimientos")
      .select("id, nombre")
      .eq("activo", true)
      .ilike("domicilio", literal(fila.domicilio))
      .limit(1)
      .maybeSingle();
    if (error) return fallo(mensajeError(error));
    if (existente) {
      const mensaje = `Ya hay un establecimiento en ese domicilio: ${existente.nombre}.`;
      return fallo(`${mensaje} Si es otro local, confirmalo y guardá de nuevo.`, {
        domicilio: [mensaje],
        duplicado: [existente.id],
      });
    }
  }

  const { data, error } = await supabase.from("establecimientos").insert(fila).select("id").single();
  if (error) return fallo(mensajeError(error));

  revalidatePath("/gestion/establecimientos");
  revalidatePath("/gestion/hoja-de-ruta", "layout");
  return exito("Establecimiento agregado al padrón.", { id: data.id });
}

export async function actualizarEstablecimiento(
  _prev: EstadoAccion<{ id: string }>,
  formData: FormData,
): Promise<EstadoAccion<{ id: string }>> {
  await requerirStaff();
  const id = z.guid().safeParse(formData.get("id"));
  if (!id.success) return fallo("Establecimiento inválido.");
  const parsed = leerFormulario(formData);
  if (!parsed.success) return falloValidacion(parsed.error);
  const supabase = await createClient();

  const { data: actual, error: errorLectura } = await supabase
    .from("establecimientos")
    .select("cuit, zona")
    .eq("id", id.data)
    .maybeSingle();
  if (errorLectura) return fallo(mensajeError(errorLectura));
  if (!actual) return fallo("No se encontró el establecimiento.");
  const errores = validarContraActual(parsed.data, actual);
  if (errores) return fallo("Revisá los datos marcados.", errores);

  const { data, error } = await supabase
    .from("establecimientos")
    .update(aFila(parsed.data))
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error) return fallo(mensajeError(error));
  if (!data) return fallo("No se encontró el establecimiento.");

  revalidatePath("/gestion/establecimientos");
  revalidatePath(`/gestion/establecimientos/${id.data}`);
  revalidatePath("/gestion/hoja-de-ruta", "layout");
  return exito("Datos del establecimiento actualizados.", { id: id.data });
}

const esquemaActivo = z.object({
  id: z.guid("Establecimiento inválido."),
  activo: z.enum(["true", "false"]).transform((v) => v === "true"),
});

/** Baja (deja de figurar en la hoja de ruta) o reactivación. */
export async function cambiarActivoEstablecimiento(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff();
  const parsed = esquemaActivo.safeParse({ id: formData.get("id"), activo: formData.get("activo") });
  if (!parsed.success) return falloValidacion(parsed.error);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("establecimientos")
    .update({ activo: parsed.data.activo })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) return fallo(mensajeError(error));
  if (!data) return fallo("No se encontró el establecimiento.");

  revalidatePath("/gestion/establecimientos");
  revalidatePath(`/gestion/establecimientos/${parsed.data.id}`);
  revalidatePath("/gestion/hoja-de-ruta", "layout");
  return exito(parsed.data.activo ? "Establecimiento reactivado." : "Establecimiento dado de baja del padrón.");
}
