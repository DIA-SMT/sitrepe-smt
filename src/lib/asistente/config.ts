/** Migue, el asistente virtual de la plataforma (chat flotante en la esquina inferior derecha). */
export const ASISTENTE = {
  nombre: "Migue",
  avatar: "/brand/migue-avatar.webp",
  ilustracion: "/brand/migue.webp",
} as const;

/** Desde qué área se usa el asistente: define el tono, la guía y las herramientas disponibles. */
export type AmbitoAsistente = "portal" | "prestador" | "gestion";

/** Evento del stream de respuesta (NDJSON) de /api/asistente. */
export type EventoAsistente = { tipo: "texto" | "estado" | "error"; valor: string };

/** Modelo de OpenRouter por defecto; se puede cambiar con OPENROUTER_MODEL. */
export const MODELO_POR_DEFECTO = "anthropic/claude-haiku-5.5";

/** El asistente solo se muestra si el servidor tiene la clave de OpenRouter. */
export function asistenteHabilitado(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}
