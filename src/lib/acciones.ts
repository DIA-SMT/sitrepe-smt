import type { ZodError } from "zod";

/**
 * Resultado estándar de una Server Action, pensado para `useActionState`.
 * - ok: si la operación se completó
 * - mensaje: texto para mostrar (toast o alerta)
 * - errores: errores por campo (de zod)
 * - datos: información adicional (p. ej. el id creado)
 */
export type EstadoAccion<T = unknown> = {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
  datos?: T;
};

export const estadoInicial: EstadoAccion = { ok: false };

export function exito<T>(mensaje: string, datos?: T): EstadoAccion<T> {
  return { ok: true, mensaje, datos };
}

export function fallo(mensaje: string, errores?: EstadoAccion["errores"]): EstadoAccion<never> {
  return { ok: false, mensaje, errores };
}

export function falloValidacion(error: ZodError): EstadoAccion<never> {
  const errores: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const clave = issue.path.join(".") || "_";
    (errores[clave] ??= []).push(issue.message);
  }
  return { ok: false, mensaje: "Revisá los datos marcados.", errores };
}

type ErrorConCodigo = { message?: string; code?: string; details?: string | null; hint?: string | null } | null | undefined;

/**
 * Traduce errores de Supabase/Postgres a mensajes para el usuario.
 * Las reglas de negocio de la base lanzan errores P0001 con el mensaje ya redactado.
 */
export function mensajeError(error: ErrorConCodigo, porDefecto = "No se pudo completar la operación."): string {
  if (!error) return porDefecto;
  const mensaje = error.message ?? "";
  switch (error.code) {
    case "P0001":
      return mensaje;
    case "23505":
      return "Ya existe un registro con esos datos (valor duplicado).";
    case "23503":
      return "El registro está vinculado con otros datos y no puede modificarse.";
    case "23514":
      return "Algún dato no cumple con el formato requerido.";
    case "23502":
      return "Falta completar un dato obligatorio.";
    case "42501":
      return "No tenés permisos para realizar esta acción.";
    case "PGRST116":
      return "No se encontró el registro solicitado.";
    default:
      if (/row-level security/i.test(mensaje) || /permission denied/i.test(mensaje)) {
        return "No tenés permisos para realizar esta acción.";
      }
      if (/Invalid login credentials/i.test(mensaje)) return "Correo o contraseña incorrectos.";
      if (/Email not confirmed/i.test(mensaje)) return "Confirmá tu correo electrónico antes de ingresar.";
      if (/User already registered/i.test(mensaje)) return "Ya existe una cuenta con ese correo.";
      return mensaje || porDefecto;
  }
}

/** Ruta interna segura para redirigir (evita redirecciones abiertas como "//x" o "/\x"). */
export function rutaInternaSegura(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return null;
  return /[\r\n\t]/.test(valor) ? null : valor;
}
