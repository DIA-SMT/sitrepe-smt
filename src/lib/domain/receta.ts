/**
 * Receta domisanitaria de compra y aplicación (Anexo I). No se carga aparte: es el
 * servicio de fumigación declarado, con plaga objetivo y método de aplicación,
 * emitido al firmarlo el asesor técnico.
 */

/** Sugerencias para el campo libre de plaga objetivo. */
export const PLAGAS_SUGERIDAS = [
  "Cucarachas",
  "Roedores",
  "Mosquitos (Aedes aegypti)",
  "Hormigas",
  "Moscas",
  "Pulgas y garrapatas",
  "Alacranes y arañas",
  "Chinches",
  "Polillas",
  "Termitas",
  "Palomas",
] as const;

/** Sugerencias para el campo libre de método de aplicación. */
export const METODOS_SUGERIDOS = [
  "Pulverización residual",
  "Gel en puntos críticos",
  "Cebos rodenticidas en estaciones de cebado",
  "Cebos en gel",
  "Nebulización en frío (ULV)",
  "Termonebulización",
  "Espolvoreo",
  "Fumigación con pastillas",
] as const;

/** Número impreso de la receta: N.º de registro de la empresa (4 dígitos) y correlativo (8 dígitos). */
export function formatNumeroReceta(numeroRegistro: number | null | undefined, recetaNumero: number | null | undefined): string | null {
  if (!recetaNumero) return null;
  return `${String(numeroRegistro ?? 0).padStart(4, "0")}-${String(recetaNumero).padStart(8, "0")}`;
}

/** Copias de la receta impresa (por triplicado). */
export const COPIAS_RECETA = [
  { etiqueta: "Original", destinatario: "Comercio que expende el producto" },
  { etiqueta: "Duplicado", destinatario: "Empresa aplicadora" },
  { etiqueta: "Triplicado", destinatario: "Asesor técnico" },
] as const;

/** Las recetas se conservan al menos un año (archivo digital). */
export const ANIOS_ARCHIVO_RECETA = 1;
