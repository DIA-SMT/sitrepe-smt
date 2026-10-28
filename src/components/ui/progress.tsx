import { cn } from "@/lib/utils";

const tones = {
  azul: { bar: "bg-linear-to-r from-azul-600 to-celeste-400", track: "bg-azul-100" },
  verde: { bar: "bg-emerald-500", track: "bg-emerald-100" },
  ambar: { bar: "bg-amber-500", track: "bg-amber-100" },
  rojo: { bar: "bg-red-500", track: "bg-red-100" },
  sol: { bar: "bg-sol-400", track: "bg-sol-100" },
} as const;

export type ProgressProps = {
  value: number;
  max?: number;
  tone?: keyof typeof tones;
  size?: "sm" | "md" | "lg";
  /** Etiqueta accesible y visible. */
  label?: React.ReactNode;
  /** Muestra el porcentaje a la derecha del label. */
  showValue?: boolean;
  className?: string;
};

/** Barra de progreso (track del mismo tono que el relleno). */
export function Progress({ value, max = 100, tone = "azul", size = "md", label, showValue, className }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const t = tones[tone];
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label || showValue ? (
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          {label ? <span className="font-medium text-foreground">{label}</span> : <span />}
          {showValue ? <span className="nums-tabular text-muted-foreground">{Math.round(pct)}%</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={typeof label === "string" ? label : undefined}
        className={cn(
          "relative w-full overflow-hidden rounded-full",
          t.track,
          size === "sm" && "h-1.5",
          size === "md" && "h-2.5",
          size === "lg" && "h-3.5",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", t.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
