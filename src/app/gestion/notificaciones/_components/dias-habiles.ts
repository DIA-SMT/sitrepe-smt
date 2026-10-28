import { APP } from "@/lib/config";

/**
 * Réplica en TypeScript de `public.sumar_dias_habiles` (solo para la vista
 * previa en pantalla: el vencimiento real lo calcula y guarda la base).
 * Suma días de a uno y cuenta solo los de lunes a viernes que no son feriado,
 * en hora de Tucumán. Conserva la hora del momento de notificación.
 */

const DIA_MS = 86_400_000;

const fechaLocal = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP.zonaHoraria,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 'YYYY-MM-DD' en hora de Tucumán. */
function diaLocal(ms: number): string {
  return fechaLocal.format(new Date(ms));
}

/** 0 = domingo … 6 = sábado, para una fecha 'YYYY-MM-DD'. */
function diaDeSemana(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

export function esDiaHabil(fecha: string, feriados: ReadonlySet<string>): boolean {
  const dia = diaDeSemana(fecha);
  return dia !== 0 && dia !== 6 && !feriados.has(fecha);
}

/** Devuelve el instante (ms) de vencimiento. */
export function sumarDiasHabiles(desdeMs: number, dias: number, feriados: ReadonlySet<string>): number {
  let v = desdeMs;
  let n = 0;
  // Tucumán no tiene horario de verano: sumar 24 h equivale a sumar un día calendario.
  while (n < dias) {
    v += DIA_MS;
    if (esDiaHabil(diaLocal(v), feriados)) n += 1;
  }
  return v;
}
