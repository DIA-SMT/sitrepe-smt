import { z } from "zod";
import { hoyISO } from "@/lib/domain/formato";

/** Utilidades de validación compartidas por las acciones del módulo de legajo. */

export const idValido = z.uuid("Identificador inválido.");

/** Texto obligatorio recortado. */
export function textoRequerido(min: number, max: number, mensaje: string) {
  return z.string(mensaje).trim().min(min, mensaje).max(max, `Usá como máximo ${max} caracteres.`);
}

/** Texto opcional: "" → null. */
export function textoOpcional(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Usá como máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));
}

/** Fecha 'AAAA-MM-DD' opcional ("" → null). */
export const fechaOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Ingresá una fecha válida.");

/** Fecha 'AAAA-MM-DD' que no puede ser posterior a hoy (hora de Tucumán). */
export const fechaHastaHoy = z
  .string("Ingresá la fecha.")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida.")
  .refine((v) => v <= hoyISO(), "La fecha no puede ser posterior a hoy.");

/** Casilla de verificación de un formulario HTML. */
export const casilla = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined()])
  .transform((v) => v === "on" || v === "true");

/**
 * Ruta de Storage subida con <SubirArchivo>: debe estar dentro de la carpeta de la empresa
 * (la primera carpeta es siempre el id de la empresa, ver lib/storage.ts).
 */
export function rutaEmpresa(carpeta: string[], mensaje = "Adjuntá el archivo.") {
  const prefijo = `${carpeta.join("/")}/`;
  return z
    .string(mensaje)
    .trim()
    .min(1, mensaje)
    .max(400, "La ruta del archivo es demasiado larga.")
    .refine((p) => p.startsWith(prefijo) && !p.includes("..") && p.length > prefijo.length, {
      message: "El archivo no corresponde a la carpeta de tu empresa. Volvé a subirlo.",
    });
}

/** Igual que `rutaEmpresa` pero opcional ("" → null). */
export function rutaEmpresaOpcional(carpeta: string[]) {
  const prefijo = `${carpeta.join("/")}/`;
  return z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((p) => p === null || (p.startsWith(prefijo) && !p.includes("..") && p.length > prefijo.length), {
      message: "El archivo no corresponde a la carpeta de tu empresa. Volvé a subirlo.",
    });
}

const PREFIJO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

/** Nombre legible del archivo: el enviado por el formulario o, si falta, el derivado de la ruta. */
export function nombreArchivo(path: string, nombreEnviado?: string | null): string {
  const enviado = nombreEnviado?.trim();
  if (enviado) return enviado.slice(0, 200);
  return (path.split("/").pop() ?? "archivo").replace(PREFIJO_UUID, "") || "archivo";
}

type ResultadoParse = { success: true } | { success: false; error: z.ZodError };

/**
 * Junta los errores por campo de varios `safeParse` (p. ej. el esquema del formulario y la
 * validación de cada archivo adjunto, cuyo nombre de campo se indica en `campos`).
 */
export function juntarErrores(
  principal: ResultadoParse,
  campos: Record<string, ResultadoParse> = {},
): Record<string, string[]> | null {
  const errores: Record<string, string[]> = {};
  if (!principal.success) {
    for (const issue of principal.error.issues) {
      const clave = issue.path.join(".") || "_";
      (errores[clave] ??= []).push(issue.message);
    }
  }
  for (const [campo, resultado] of Object.entries(campos)) {
    if (!resultado.success) errores[campo] = [resultado.error.issues[0]?.message ?? "Dato inválido."];
  }
  return Object.keys(errores).length > 0 ? errores : null;
}

/** FormData → objeto plano (solo valores de texto). */
export function datosFormulario(formData: FormData): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, valor] of formData.entries()) {
    if (typeof valor === "string") salida[clave] = valor;
  }
  return salida;
}
