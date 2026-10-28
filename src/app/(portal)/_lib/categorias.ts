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

export type EstiloCategoria = {
  tono: Tono;
  icono: LucideIcon;
  /** Degradé del recuadro ilustrado cuando la noticia no tiene imagen. */
  fondo: string;
};

const ESTILOS: Record<string, EstiloCategoria> = {
  institucional: { tono: "azul", icono: Landmark, fondo: "from-azul-700 via-azul-600 to-celeste-500" },
  normativa: { tono: "violeta", icono: Scale, fondo: "from-noche-800 via-azul-800 to-violet-600" },
  recomendaciones: { tono: "verde", icono: ShieldCheck, fondo: "from-emerald-700 via-emerald-600 to-celeste-500" },
  salud: { tono: "rojo", icono: HeartPulse, fondo: "from-azul-700 via-celeste-600 to-emerald-500" },
  capacitacion: { tono: "celeste", icono: GraduationCap, fondo: "from-celeste-700 via-celeste-500 to-azul-500" },
  campana: { tono: "ambar", icono: Megaphone, fondo: "from-azul-800 via-azul-600 to-sol-500" },
};

const POR_DEFECTO: EstiloCategoria = { tono: "celeste", icono: Newspaper, fondo: "from-azul-600 via-celeste-600 to-celeste-400" };

/** Estilo visual de una categoría de noticia (tolerante a mayúsculas y acentos). */
export function estiloCategoria(categoria: string | null | undefined): EstiloCategoria {
  const clave = (categoria ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  if (clave.startsWith("capacitac")) return ESTILOS.capacitacion;
  if (clave.startsWith("campan")) return ESTILOS.campana;
  return ESTILOS[clave] ?? POR_DEFECTO;
}

/**
 * Separa el cuerpo (texto plano) en párrafos por líneas en blanco. Acepta también la secuencia
 * literal "\n" que puede quedar en textos cargados desde SQL sin escape.
 */
export function parrafos(cuerpo: string): string[] {
  return cuerpo
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
