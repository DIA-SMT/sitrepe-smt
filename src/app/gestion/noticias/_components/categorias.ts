import {
  GraduationCap,
  HeartPulse,
  Landmark,
  Megaphone,
  Newspaper,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Tono } from "@/lib/domain/etiquetas";

/** Categorías sugeridas (las mismas que reconoce el portal para ilustrar las noticias sin imagen). */
export const CATEGORIAS_NOTICIA = [
  "Institucional",
  "Normativa",
  "Recomendaciones",
  "Salud",
  "Capacitación",
  "Campaña",
  "Novedades",
] as const;

export type EstiloCategoria = { tono: Tono; icono: LucideIcon; fondo: string };

const ESTILOS: Record<string, EstiloCategoria> = {
  institucional: { tono: "azul", icono: Landmark, fondo: "from-azul-700 via-azul-600 to-celeste-500" },
  normativa: { tono: "violeta", icono: Scale, fondo: "from-noche-800 via-azul-800 to-violet-600" },
  recomendaciones: { tono: "verde", icono: ShieldCheck, fondo: "from-emerald-700 via-emerald-600 to-celeste-500" },
  salud: { tono: "rojo", icono: HeartPulse, fondo: "from-azul-700 via-celeste-600 to-emerald-500" },
  capacitacion: { tono: "celeste", icono: GraduationCap, fondo: "from-celeste-700 via-celeste-500 to-azul-500" },
  campana: { tono: "ambar", icono: Megaphone, fondo: "from-azul-800 via-azul-600 to-sol-500" },
};

const POR_DEFECTO: EstiloCategoria = { tono: "celeste", icono: Newspaper, fondo: "from-azul-600 via-celeste-600 to-celeste-400" };

function sinAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Estilo visual de una categoría (tolerante a mayúsculas y acentos), igual que en el portal. */
export function estiloCategoria(categoria: string | null | undefined): EstiloCategoria {
  const clave = sinAcentos(categoria ?? "").toLowerCase().trim();
  if (clave.startsWith("capacitac")) return ESTILOS.capacitacion;
  if (clave.startsWith("campan")) return ESTILOS.campana;
  return ESTILOS[clave] ?? POR_DEFECTO;
}

/** Dirección amigable a partir de un texto: "Limpieza de tanques: 180 días" → "limpieza-de-tanques-180-dias". */
export function generarSlug(texto: string): string {
  return sinAcentos(texto)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Separa el cuerpo en párrafos por líneas en blanco (mismo criterio que la página pública). */
export function parrafos(cuerpo: string): string[] {
  return cuerpo
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function contarPalabras(texto: string): number {
  return texto.trim() ? texto.trim().split(/\s+/).length : 0;
}

/** Minutos estimados de lectura (≈ 200 palabras por minuto). */
export function minutosLectura(texto: string): number {
  return Math.max(1, Math.round(contarPalabras(texto) / 200));
}
