import { cn } from "@/lib/utils";

/**
 * Pétalo inspirado en el isotipo (hoja asimétrica). Decorativo: no reemplaza al logo oficial.
 * Caja de referencia: 100 × 160.
 */
const PETALO = "M52 0C86 28 102 78 88 122C80 146 64 158 50 160C24 146 4 112 6 72C8 40 26 14 52 0Z";

type Tono = "light" | "dark" | "brand";

const PALETAS: Record<Tono, { a: string; b: string; sol: string; opA: number; opB: number; opSol: number; linea: string }> = {
  // Sobre fondos claros: tintes suaves
  light: { a: "#cadefe", b: "#c0e3fe", sol: "#fef08e", opA: 0.7, opB: 0.75, opSol: 0.9, linea: "#9ec2ff" },
  // Sobre fondos noche: colores de marca translúcidos
  dark: { a: "#0066ff", b: "#2eb1ff", sol: "#f4dc00", opA: 0.32, opB: 0.22, opSol: 0.85, linea: "#2eb1ff" },
  // A todo color (usar con moderación)
  brand: { a: "#0066ff", b: "#2eb1ff", sol: "#f4dc00", opA: 1, opB: 1, opSol: 1, linea: "#0066ff" },
};

export type PetalDecorProps = {
  /**
   * hero: composición grande (derecha) · sidebar: esquina inferior · corner: esquina superior chica ·
   * scatter: pétalos sueltos por toda el área.
   */
  variant?: "hero" | "sidebar" | "corner" | "scatter";
  tone?: Tono;
  /** Flotación lenta (se desactiva con prefers-reduced-motion). */
  animated?: boolean;
  className?: string;
};

/** Pétalos y sol decorativos para fondos (posición absoluta, `aria-hidden`). */
export function PetalDecor({ variant = "hero", tone = "light", animated = false, className }: PetalDecorProps) {
  const p = PALETAS[tone];
  const flotar = animated ? "animate-float" : undefined;

  if (variant === "scatter") {
    const items = [
      { x: 6, y: 12, r: -24, s: 0.28, c: p.a, o: p.opA },
      { x: 82, y: 8, r: 32, s: 0.22, c: p.b, o: p.opB },
      { x: 68, y: 70, r: -12, s: 0.34, c: p.a, o: p.opA * 0.8 },
      { x: 18, y: 78, r: 40, s: 0.2, c: p.b, o: p.opB },
      { x: 44, y: 34, r: 12, s: 0.16, c: p.b, o: p.opB * 0.7 },
    ];
    return (
      <svg
        aria-hidden
        focusable="false"
        className={cn("pointer-events-none absolute inset-0 h-full w-full select-none", className)}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {items.map((it, i) => (
          <path
            key={i}
            d={PETALO}
            fill={it.c}
            fillOpacity={it.o}
            transform={`translate(${it.x} ${it.y}) rotate(${it.r}) scale(${it.s * 0.45})`}
          />
        ))}
        <circle cx="88" cy="40" r="1.6" fill={p.sol} fillOpacity={p.opSol} />
        <circle cx="10" cy="48" r="1" fill={p.sol} fillOpacity={p.opSol * 0.8} />
      </svg>
    );
  }

  const posiciones: Record<Exclude<PetalDecorProps["variant"], "scatter" | undefined>, string> = {
    hero: "right-[-6%] top-1/2 h-[120%] max-h-[640px] -translate-y-1/2",
    sidebar: "-right-16 -bottom-10 h-72",
    corner: "-top-10 -right-8 h-44",
  };

  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 400 400"
      className={cn("pointer-events-none absolute aspect-square select-none", posiciones[variant], className)}
    >
      {/* Trazo orbital fino */}
      <circle cx="200" cy="200" r="182" fill="none" stroke={p.linea} strokeOpacity={tone === "dark" ? 0.18 : 0.35} strokeDasharray="2 7" />
      <g className={flotar} style={{ transformOrigin: "200px 200px", transformBox: "view-box" }}>
        <path d={PETALO} fill={p.a} fillOpacity={p.opA} transform="translate(92 98) rotate(-16) scale(1.55)" />
        <path d={PETALO} fill={p.b} fillOpacity={p.opB} transform="translate(214 130) rotate(26) scale(1.3)" />
        <circle cx="236" cy="78" r="24" fill={p.sol} fillOpacity={p.opSol} />
      </g>
      <circle cx="74" cy="64" r="5" fill={p.b} fillOpacity={p.opB} />
      <circle cx="344" cy="300" r="7" fill={p.sol} fillOpacity={p.opSol * 0.7} />
    </svg>
  );
}

/** Resplandores difusos azul/celeste para fondos oscuros o claros. */
export function BrandGlow({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className={cn(
          "absolute -top-24 -left-24 size-96 rounded-full blur-3xl",
          tone === "dark" ? "bg-azul-600/35" : "bg-azul-200/50",
        )}
      />
      <div
        className={cn(
          "absolute -right-20 -bottom-28 size-[28rem] rounded-full blur-3xl",
          tone === "dark" ? "bg-celeste-400/20" : "bg-celeste-200/50",
        )}
      />
      <div
        className={cn(
          "absolute top-1/3 right-1/4 size-40 rounded-full blur-3xl",
          tone === "dark" ? "bg-sol-400/10" : "bg-sol-200/40",
        )}
      />
    </div>
  );
}

/** Clases de degradé de marca reutilizables (Tailwind las detecta como literales). */
export const brandGradients = {
  /** Fondo azul → celeste (texto blanco en tamaños grandes). */
  fondo: "bg-gradient-brand",
  /** Fondo claro suave. */
  suave: "bg-gradient-brand-soft",
  /** Superficie noche con resplandores. */
  noche: "bg-noche",
  /** Texto azul → celeste (títulos grandes sobre claro). */
  texto: "text-gradient-brand",
  /** Texto claro para fondos oscuros. */
  textoClaro: "text-gradient-light",
  /** Línea acento azul → celeste → sol. */
  acento: "bg-linear-to-r from-azul-600 via-celeste-400 to-sol-400",
} as const;

/** Línea fina de acento con los tres colores del isotipo. */
export function BrandStripe({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-1 w-full", brandGradients.acento, className)} />;
}
