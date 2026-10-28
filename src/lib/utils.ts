import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge con los tokens propios del tema (globals.css) registrados,
 * para que p. ej. `rounded-card` y `rounded-xl` se reconozcan como conflicto.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["control", "card", "panel"],
      shadow: ["card", "elevated", "brand", "glow"],
    },
  },
});

/** Combina clases condicionales y resuelve conflictos de Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Iniciales de un nombre ("María José Pérez" → "MP"). */
export function iniciales(nombre: string, max = 2) {
  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0 && !/^(de|del|la|las|los|y)$/i.test(p));
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, max).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase().slice(0, max);
}

const nf = new Intl.NumberFormat("es-AR");
const nfCompact = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });
const nfMoneda = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const nfPorcentaje = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 1 });

export type FormatoNumero = "number" | "compact" | "currency" | "percent";

/**
 * Formatea números en es-AR. `percent` espera el valor en escala 0–100.
 */
export function formatearNumero(valor: number, formato: FormatoNumero = "number") {
  switch (formato) {
    case "compact":
      return nfCompact.format(valor);
    case "currency":
      return nfMoneda.format(valor);
    case "percent":
      return nfPorcentaje.format(valor / 100);
    default:
      return nf.format(valor);
  }
}
