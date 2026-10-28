import type { Enums } from "@/lib/supabase/database.types";
import { formatFechaHora } from "@/lib/domain/formato";

/**
 * Reglas de la planilla (Art. 9.º a, Ord. 2681/98) compartidas por el servidor
 * (acciones y páginas) y el formulario del navegador. Son las mismas que aplica
 * public.presentar_declaracion(): la base sigue siendo la autoridad final.
 */

export type TipoServicio = Enums<"tipo_servicio">;

export type Antelacion = { minHoras: number; maxHoras: number };

export const ANTELACION_POR_DEFECTO: Antelacion = { minHoras: 24, maxHoras: 48 };

const HORA_MS = 3_600_000;

/** Marca de tiempo actual. Está aparte para no invocar Date.now() durante el render. */
export function ahoraMs(): number {
  return Date.now();
}

export function horasHasta(iso: string, ahora: number): number {
  return (Date.parse(iso) - ahora) / HORA_MS;
}

/** Rango de fecha y hora en que un servicio de fumigación puede declararse hoy. */
export function ventanaFumigacion(antelacion: Antelacion, ahora: number) {
  return {
    desde: new Date(ahora + antelacion.minHoras * HORA_MS),
    hasta: new Date(ahora + antelacion.maxHoras * HORA_MS),
  };
}

/** "Faltan 36 h", "Faltan 3 días", "Hace 2 h". */
export function describirAntelacion(horas: number): string {
  const abs = Math.abs(horas);
  const texto =
    abs < 1 ? `${Math.max(1, Math.round(abs * 60))} min` : abs < 72 ? `${Math.floor(abs)} h` : `${Math.round(abs / 24)} días`;
  return horas >= 0 ? `Faltan ${texto}` : `Hace ${texto}`;
}

/**
 * Valida la fecha del servicio: la fumigación se declara entre `min` y `max` horas
 * antes; la limpieza de tanques, una vez realizada. Devuelve el mensaje o null.
 */
export function errorFechaServicio(tipo: TipoServicio, iso: string, antelacion: Antelacion, ahora: number): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "Indicá una fecha y hora válidas.";
  if (tipo === "tanque") {
    return t > ahora
      ? "La limpieza de tanques se declara una vez realizada: indicá una fecha y hora que ya hayan pasado."
      : null;
  }
  const horas = (t - ahora) / HORA_MS;
  if (horas < antelacion.minHoras || horas > antelacion.maxHoras) {
    const { desde, hasta } = ventanaFumigacion(antelacion, ahora);
    return `El servicio debe declararse entre ${antelacion.minHoras} y ${antelacion.maxHoras} horas antes de realizarse: elegí una fecha entre el ${formatFechaHora(desde)} y el ${formatFechaHora(hasta)}.`;
  }
  return null;
}

export type CodigoProblema = "sin_firma" | "fuera_de_plazo" | "sin_productos" | "tanque_no_realizado" | "sin_analisis";

export type Problema = { codigo: CodigoProblema; texto: string };

export type DatosControl = {
  tipo: TipoServicio;
  firmado: boolean;
  fechaServicio: string | null;
  cantidadProductos: number;
  analisisCompletos: boolean;
};

/** Lo que le falta a un certificado para poder presentarse (vacío = listo). */
export function problemasDeCertificado(c: DatosControl, antelacion: Antelacion, ahora: number): Problema[] {
  const problemas: Problema[] = [];
  if (!c.firmado) problemas.push({ codigo: "sin_firma", texto: "Sin firma" });
  if (c.fechaServicio && errorFechaServicio(c.tipo, c.fechaServicio, antelacion, ahora)) {
    problemas.push(
      c.tipo === "tanque"
        ? { codigo: "tanque_no_realizado", texto: "Limpieza no realizada" }
        : { codigo: "fuera_de_plazo", texto: `Fuera de plazo · ${describirAntelacion(horasHasta(c.fechaServicio, ahora))}` },
    );
  }
  if (c.tipo === "fumigacion" && c.cantidadProductos === 0) problemas.push({ codigo: "sin_productos", texto: "Sin productos" });
  if (c.tipo === "tanque" && !c.analisisCompletos) problemas.push({ codigo: "sin_analisis", texto: "Faltan análisis" });
  return problemas;
}

export const UNIDADES = ["ml", "l", "g", "kg", "unidades"] as const;
export type Unidad = (typeof UNIDADES)[number];

export const ETIQUETA_UNIDAD: Record<Unidad, string> = {
  ml: "ml",
  l: "litros",
  g: "g",
  kg: "kg",
  unidades: "unidades",
};
