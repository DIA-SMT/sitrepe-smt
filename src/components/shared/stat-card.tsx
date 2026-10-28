import Link from "next/link";
import { ArrowUpRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, type FormatoNumero } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";

export type StatTone = "azul" | "celeste" | "verde" | "ambar" | "rojo" | "violeta" | "neutral";

const toneStyles: Record<StatTone, { icon: string; glow: string }> = {
  azul: { icon: "bg-gradient-brand text-white shadow-brand", glow: "bg-azul-400/25" },
  celeste: { icon: "bg-celeste-100 text-celeste-700 ring-1 ring-celeste-200", glow: "bg-celeste-300/30" },
  verde: { icon: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", glow: "bg-emerald-300/25" },
  ambar: { icon: "bg-sol-100 text-sol-800 ring-1 ring-sol-300", glow: "bg-sol-300/35" },
  rojo: { icon: "bg-red-50 text-red-600 ring-1 ring-red-200", glow: "bg-red-300/25" },
  violeta: { icon: "bg-violet-50 text-violet-700 ring-1 ring-violet-200", glow: "bg-violet-300/25" },
  neutral: { icon: "bg-noche-50 text-noche-700 ring-1 ring-noche-200", glow: "bg-noche-200/40" },
};

export type StatCardProps = {
  label: string;
  /** Número (se anima) o texto ya formateado. */
  value: number | string;
  format?: FormatoNumero;
  icon?: LucideIcon;
  tone?: StatTone;
  /** Texto de variación, p. ej. "+12% vs. mes anterior". */
  delta?: string;
  /** Dirección de la variación. */
  trend?: "up" | "down" | "flat";
  /** Si subir es bueno (verde) o malo (rojo). Por defecto `true`. */
  upIsGood?: boolean;
  /** Texto secundario (si no hay delta). */
  hint?: string;
  /** Convierte la tarjeta en un enlace. */
  href?: string;
  className?: string;
};

/** Tarjeta de indicador (KPI) con conteo animado. */
export function StatCard({
  label,
  value,
  format = "number",
  icon: Icon,
  tone = "azul",
  delta,
  trend = "flat",
  upIsGood = true,
  hint,
  href,
  className,
}: StatCardProps) {
  const t = toneStyles[tone];
  const bueno = trend === "flat" ? null : (trend === "up") === upIsGood;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const contenido = (
    <>
      <span aria-hidden className={cn("pointer-events-none absolute -top-10 -right-10 size-32 rounded-full blur-2xl", t.glow)} />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", t.icon)}>
            <Icon className="size-5" strokeWidth={1.9} />
          </span>
        ) : null}
      </div>
      <div className="relative mt-1 flex flex-col gap-2">
        <p className="text-[2rem] leading-none font-semibold tracking-tight text-foreground">
          {typeof value === "number" ? <AnimatedNumber value={value} format={format} /> : value}
        </p>
        {delta ? (
          <p className="flex flex-wrap items-center gap-1.5 text-[13px]">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold",
                bueno === true && "bg-success-soft text-success",
                bueno === false && "bg-danger-soft text-danger",
                bueno === null && "bg-muted text-muted-foreground",
              )}
            >
              <TrendIcon className="size-3.5" aria-hidden />
              <span className="sr-only">{trend === "up" ? "Sube:" : trend === "down" ? "Baja:" : "Sin cambios:"}</span>
              {delta}
            </span>
            {hint ? <span className="text-muted-foreground">{hint}</span> : null}
          </p>
        ) : hint ? (
          <p className="text-[13px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {href ? (
        <ArrowUpRight
          aria-hidden
          className="absolute right-4 bottom-4 size-4 text-noche-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-azul-600"
        />
      ) : null}
    </>
  );

  const base = cn(
    "group relative flex flex-col gap-3 overflow-hidden rounded-card border border-border bg-card p-5 shadow-card",
    href && "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-azul-200 hover:shadow-elevated",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={base}>
        {contenido}
      </Link>
    );
  }
  return <div className={base}>{contenido}</div>;
}
