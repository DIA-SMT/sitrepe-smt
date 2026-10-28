import type { Tono } from "@/lib/domain/etiquetas";

/**
 * Plazos de la renovación anual (Art. 8.º, Ord. 2681/98): la DDJJ de categorización del año N se
 * presenta dentro de los tres meses siguientes, es decir, entre el 1/1 y el 31/3 del año N + 1.
 */
export type EstadoPlazo = "anticipada" | "en_plazo" | "fuera_de_plazo";

export const ESTADO_PLAZO: Record<EstadoPlazo, { label: string; tono: Tono; detalle: string }> = {
  anticipada: { label: "Anticipada", tono: "celeste", detalle: "Podés presentarla antes de que empiece el plazo." },
  en_plazo: { label: "Dentro del plazo", tono: "verde", detalle: "Estás dentro de los tres meses previstos." },
  fuera_de_plazo: {
    label: "Fuera de plazo",
    tono: "rojo",
    detalle: "El plazo venció: presentala igual para regularizar la habilitación.",
  },
};

export function plazoDdjj(anio: number, hoy: string) {
  const inicio = `${anio + 1}-01-01`;
  const limite = `${anio + 1}-03-31`;
  const estado: EstadoPlazo = hoy < inicio ? "anticipada" : hoy <= limite ? "en_plazo" : "fuera_de_plazo";
  return { anio, inicio, limite, estado };
}

/** Años que se pueden declarar hoy (el anterior y el en curso) y el sugerido. */
export function aniosDeclarables(hoy: string, yaAprobados: number[]) {
  const anioActual = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7));
  const opciones = [anioActual - 1, anioActual]
    .filter((a) => !yaAprobados.includes(a))
    .map((a) => plazoDdjj(a, hoy));
  const preferido = mes <= 3 ? anioActual - 1 : anioActual;
  const sugerido = opciones.find((o) => o.anio === preferido)?.anio ?? opciones[0]?.anio ?? null;
  return { opciones, sugerido };
}

/** "Vence hoy", "Vence en 12 días", "Venció hace 3 días". */
export function textoDias(dias: number | null): string {
  if (dias === null) return "Sin fecha de vencimiento";
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  if (dias > 0) return `Vence en ${dias.toLocaleString("es-AR")} días`;
  if (dias === -1) return "Venció ayer";
  return `Venció hace ${Math.abs(dias).toLocaleString("es-AR")} días`;
}
