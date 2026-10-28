import Image from "next/image";
import { cn } from "@/lib/utils";

const ALT = "Municipalidad de San Miguel de Tucumán";

/** Archivos oficiales (no redibujar ni alterar). */
const LOGOS = {
  positivo: { src: "/brand/Logo_SMT_pos_1.png", width: 911, height: 298 },
  negativo: { src: "/brand/Logo_SMT_neg_1.png", width: 910, height: 297 },
} as const;

/** Alto en px de cada tamaño; el ancho se calcula respetando la proporción oficial. */
const ALTOS = { xs: 24, sm: 32, md: 40, lg: 52, xl: 72 } as const;

export type LogoProps = {
  /** "positivo" (texto oscuro, fondos claros) · "negativo" (texto blanco, fondos oscuros). */
  variant?: "positivo" | "negativo";
  size?: keyof typeof ALTOS;
  /** Alto exacto en px (tiene prioridad sobre `size`). */
  height?: number;
  /** Cargar con prioridad (logo visible arriba de todo). */
  priority?: boolean;
  className?: string;
};

/** Logo oficial de la Municipalidad de San Miguel de Tucumán. */
export function Logo({ variant = "positivo", size = "md", height, priority = false, className }: LogoProps) {
  const logo = LOGOS[variant];
  const alto = height ?? ALTOS[size];
  const ancho = Math.round((alto * logo.width) / logo.height);
  return (
    <Image
      src={logo.src}
      alt={ALT}
      width={ancho}
      height={alto}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn("h-auto max-w-full shrink-0 select-none", className)}
      style={{ width: ancho, height: "auto" }}
      draggable={false}
    />
  );
}

export type IsotipoProps = {
  /** Alto en px. */
  size?: number;
  className?: string;
  /** Por defecto es decorativo (alt vacío). Pasá un texto si va solo, sin el nombre al lado. */
  alt?: string;
  priority?: boolean;
};

/** Isotipo oficial (pétalo azul, pétalo celeste y sol amarillo). */
export function Isotipo({ size = 32, className, alt = "", priority = false }: IsotipoProps) {
  const ancho = Math.round((size * 260) / 298);
  return (
    <Image
      src="/brand/isotipo.png"
      alt={alt}
      width={ancho}
      height={size}
      loading={priority ? "eager" : "lazy"}
      className={cn("shrink-0 select-none", className)}
      style={{ width: ancho, height: size }}
      draggable={false}
    />
  );
}
