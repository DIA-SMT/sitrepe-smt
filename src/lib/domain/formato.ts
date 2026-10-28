import { APP } from "@/lib/config";

const TZ = APP.zonaHoraria;

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 });
const pesosSinDecimales = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat("es-AR");

/** $ 5.497,00 */
export function formatPesos(valor: number | string | null | undefined, decimales = true): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = typeof valor === "string" ? Number(valor) : valor;
  return (decimales ? pesos : pesosSinDecimales).format(n);
}

export function formatNumero(valor: number | string | null | undefined, maxDecimales = 2): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = typeof valor === "string" ? Number(valor) : valor;
  return maxDecimales === 0 ? numero.format(Math.round(n)) : new Intl.NumberFormat("es-AR", { maximumFractionDigits: maxDecimales }).format(n);
}

/** Interpreta 'YYYY-MM-DD' como fecha local (sin corrimiento por zona horaria). */
function parsearFecha(valor: string | Date): Date {
  if (valor instanceof Date) return valor;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, d, 15)); // mediodía UTC: el mismo día en Argentina
  }
  return new Date(valor);
}

/** 26/10/2026 */
export function formatFecha(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    parsearFecha(valor),
  );
}

/** 26 de octubre de 2026 */
export function formatFechaLarga(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(
    parsearFecha(valor),
  );
}

/** 26/10/2026 14:30 */
export function formatFechaHora(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsearFecha(valor));
}

/** 14:30 */
export function formatHora(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(
    parsearFecha(valor),
  );
}

/** "octubre de 2026" a partir de año y mes (1-12) o de una fecha. */
export function formatMes(valor: string | Date | { anio: number; mes: number }): string {
  const fecha =
    typeof valor === "object" && !(valor instanceof Date) ? new Date(Date.UTC(valor.anio, valor.mes - 1, 15)) : parsearFecha(valor);
  return new Intl.DateTimeFormat("es-AR", { timeZone: TZ, month: "long", year: "numeric" }).format(fecha);
}

/** "oct 26" para ejes de gráficos a partir de 'YYYY-MM'. */
export function formatMesCorto(valor: string): string {
  const [a, m] = valor.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", month: "short", year: "2-digit" })
    .format(new Date(Date.UTC(a, m - 1, 15)))
    .replace(".", "");
}

/** "hace 3 días", "en 2 horas" */
export function formatRelativo(valor: string | Date | null | undefined, ahora: Date = new Date()): string {
  if (!valor) return "—";
  const fecha = parsearFecha(valor);
  const diffSeg = Math.round((fecha.getTime() - ahora.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
  const abs = Math.abs(diffSeg);
  if (abs < 60) return rtf.format(diffSeg, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSeg / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSeg / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSeg / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSeg / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSeg / (86400 * 365)), "year");
}

/** Días enteros desde hoy (Tucumán) hasta la fecha 'YYYY-MM-DD' (negativo si ya pasó). */
export function diasHasta(fecha: string | null | undefined, hoy: string = hoyISO()): number | null {
  if (!fecha) return null;
  const a = parsearFecha(fecha.slice(0, 10)).getTime();
  const b = parsearFecha(hoy).getTime();
  return Math.round((a - b) / 86400000);
}

/** Fecha de hoy en Tucumán como 'YYYY-MM-DD'. */
export function hoyISO(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/**
 * Convierte el valor de un <input type="datetime-local"> (hora de Tucumán, UTC-3)
 * a ISO con zona, para guardar en columnas timestamptz.
 */
export function fechaHoraLocalAISO(valor: string): string {
  return new Date(`${valor.length === 16 ? `${valor}:00` : valor}-03:00`).toISOString();
}

/** Convierte un timestamptz a valor para <input type="datetime-local"> en hora de Tucumán. */
export function isoAFechaHoraLocal(valor: string | Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(parsearFecha(valor));
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "00";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour") === "24" ? "00" : p("hour")}:${p("minute")}`;
}

export function formatSuperficie(m2: number | string | null | undefined): string {
  return m2 === null || m2 === undefined ? "—" : `${formatNumero(m2)} m²`;
}

export function formatLitros(l: number | string | null | undefined): string {
  return l === null || l === undefined ? "—" : `${formatNumero(l, 0)} L`;
}

/** Iniciales para avatares. */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
