/**
 * Matrícula profesional del asesor técnico (CIAZT para ingenieros agrónomos).
 * Misma regla que la vista v_matriculas y la RPC firmar_certificados: vale la
 * constancia no rechazada con la vigencia más lejana; "por vencer" desde 7 días antes.
 */

export const DIAS_AVISO_MATRICULA = 7;

export type SituacionMatricula = "vigente" | "por_vencer" | "vencida" | "sin_informar";

type ConstanciaMatricula = {
  tipo: string | null;
  tecnico_id: string | null;
  estado: string | null;
  vence: string | null;
};

/** Suma días a una fecha YYYY-MM-DD (sin zona horaria). */
function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

export function situacionMatricula(vence: string | null | undefined, hoy: string): SituacionMatricula {
  if (!vence) return "sin_informar";
  if (vence < hoy) return "vencida";
  if (vence <= sumarDias(hoy, DIAS_AVISO_MATRICULA)) return "por_vencer";
  return "vigente";
}

/** Constancia vigente (la de vencimiento más lejano) de un asesor, entre los documentos del legajo. */
export function constanciaVigente<T extends ConstanciaMatricula>(documentos: T[], tecnicoId: string): T | null {
  let mejor: T | null = null;
  for (const d of documentos) {
    if (d.tipo !== "constancia_matricula" || d.tecnico_id !== tecnicoId || d.estado === "rechazado" || !d.vence) continue;
    if (!mejor || d.vence > (mejor.vence ?? "")) mejor = d;
  }
  return mejor;
}

/** El asesor puede firmar certificados: la matrícula no está vencida ni sin informar. */
export function puedeFirmarConMatricula(situacion: SituacionMatricula): boolean {
  return situacion === "vigente" || situacion === "por_vencer";
}
