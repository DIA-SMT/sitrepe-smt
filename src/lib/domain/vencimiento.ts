import type { Enums } from "@/lib/supabase/database.types";
import { diasHasta, hoyISO } from "./formato";

type Periodicidad = Enums<"periodicidad">;
type TipoServicio = Enums<"tipo_servicio">;

const MESES: Record<Exclude<Periodicidad, "unica_vez">, number> = {
  mensual: 1,
  bimestral: 2,
  trimestral: 3,
  cuatrimestral: 4,
  semestral: 6,
  anual: 12,
};

export const DIAS_VENCIMIENTO_TANQUE = 180;
export const DIAS_ALERTA_VENCIMIENTO = 15;

/**
 * Misma regla que public.calcular_vencimiento() en la base (solo para mostrar
 * una vista previa; el valor definitivo lo calcula la base).
 * @param fechaServicio 'YYYY-MM-DD' (fecha local del servicio)
 * @param diasTanque vigencia de tanques (parámetro vencimiento_tanque_dias; 180 por defecto)
 */
export function calcularVencimiento(
  tipo: TipoServicio,
  periodicidad: Periodicidad | null | undefined,
  fechaServicio: string,
  diasTanque: number = DIAS_VENCIMIENTO_TANQUE,
): string | null {
  const [a, m, d] = fechaServicio.slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return null;
  const base = new Date(Date.UTC(a, m - 1, d));
  if (tipo === "tanque") {
    base.setUTCDate(base.getUTCDate() + diasTanque);
    return base.toISOString().slice(0, 10);
  }
  if (!periodicidad || periodicidad === "unica_vez") return null;
  const meses = MESES[periodicidad];
  // Igual que Postgres: si el día no existe en el mes destino, usa el último día del mes.
  const destino = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(d, ultimoDia));
  return destino.toISOString().slice(0, 10);
}

export type Vigencia = "vigente" | "por_vencer" | "vencido" | "sin_timbrar" | "anulado" | "sin_certificado";

/** Vigencia de una fecha de vencimiento respecto de hoy. */
export function vigenciaDe(fechaVencimiento: string | null | undefined, hoy: string = hoyISO()): Vigencia {
  if (!fechaVencimiento) return "vigente";
  const dias = diasHasta(fechaVencimiento, hoy) ?? 0;
  if (dias < 0) return "vencido";
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return "por_vencer";
  return "vigente";
}
