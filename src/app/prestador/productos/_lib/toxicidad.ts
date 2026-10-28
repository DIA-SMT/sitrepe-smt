import type { Etiqueta } from "@/lib/domain/etiquetas";

/** Categorías toxicológicas (clasificación OMS usada por ANMAT y SENASA). */
export const TOXICIDAD: Record<string, Etiqueta> = {
  Ia: { label: "Clase Ia · Sumamente peligroso", tono: "rojo" },
  Ib: { label: "Clase Ib · Muy peligroso", tono: "rojo" },
  II: { label: "Clase II · Moderadamente peligroso", tono: "ambar" },
  III: { label: "Clase III · Poco peligroso", tono: "celeste" },
  IV: { label: "Clase IV · Normalmente no ofrece peligro", tono: "verde" },
};

export function etiquetaToxicidad(categoria: string | null | undefined): Etiqueta | null {
  if (!categoria) return null;
  return TOXICIDAD[categoria] ?? { label: `Clase ${categoria}`, tono: "neutral" };
}

/** "2 h", "24 h", "Inmediato". */
export function textoReingreso(horas: number | null | undefined): string {
  if (horas === null || horas === undefined) return "Sin dato";
  if (horas === 0) return "Inmediato";
  return `${horas} h`;
}
