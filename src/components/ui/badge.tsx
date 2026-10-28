import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "azul" | "celeste" | "verde" | "ambar" | "rojo" | "violeta";

export const BADGE_TONES: BadgeTone[] = ["neutral", "azul", "celeste", "verde", "ambar", "rojo", "violeta"];

const soft: Record<BadgeTone, string> = {
  neutral: "bg-noche-50 text-noche-700 ring-noche-200/80",
  azul: "bg-azul-50 text-azul-700 ring-azul-200/70",
  celeste: "bg-celeste-50 text-celeste-800 ring-celeste-200/80",
  verde: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  ambar: "bg-amber-50 text-amber-800 ring-amber-200/90",
  rojo: "bg-red-50 text-red-700 ring-red-200/80",
  violeta: "bg-violet-50 text-violet-700 ring-violet-200/80",
};

const solid: Record<BadgeTone, string> = {
  neutral: "bg-noche-700 text-white ring-noche-700",
  azul: "bg-azul-600 text-white ring-azul-600",
  celeste: "bg-celeste-700 text-white ring-celeste-700",
  verde: "bg-emerald-700 text-white ring-emerald-700",
  ambar: "bg-sol-400 text-noche-950 ring-sol-500",
  rojo: "bg-red-600 text-white ring-red-600",
  violeta: "bg-violet-600 text-white ring-violet-600",
};

const dots: Record<BadgeTone, string> = {
  neutral: "bg-noche-400",
  azul: "bg-azul-600",
  celeste: "bg-celeste-500",
  verde: "bg-emerald-500",
  ambar: "bg-amber-500",
  rojo: "bg-red-500",
  violeta: "bg-violet-500",
};

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      size: {
        sm: "h-5 px-2 text-[11px]",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-[13px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    tone?: BadgeTone;
    variant?: "soft" | "solid" | "outline";
    /** Punto de color a la izquierda (refuerza el estado sin depender solo del color de fondo). */
    dot?: boolean;
    /** Anima el punto (p. ej. "En curso"). */
    pulse?: boolean;
  };

/** Etiqueta compacta. Tonos: neutral · azul · celeste · verde · ambar · rojo · violeta. */
export function Badge({
  className,
  tone = "neutral",
  variant = "soft",
  size,
  dot = false,
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        badgeVariants({ size }),
        variant === "soft" && soft[tone],
        variant === "solid" && solid[tone],
        variant === "outline" && cn("bg-card ring-border-strong", "text-foreground"),
        className,
      )}
      {...props}
    >
      {dot ? (
        <span className="relative flex size-1.5 shrink-0" aria-hidden>
          {pulse ? (
            <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", dots[tone])} />
          ) : null}
          <span
            className={cn("relative inline-flex size-1.5 rounded-full", variant === "solid" ? "bg-current" : dots[tone])}
          />
        </span>
      ) : null}
      {children}
    </span>
  );
}
