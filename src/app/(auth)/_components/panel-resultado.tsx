import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PanelResultadoProps = {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  /** Botones o links al pie. */
  actions?: React.ReactNode;
  tone?: "exito" | "info";
  className?: string;
};

/** Confirmación que reemplaza al formulario cuando la operación se completó (correo enviado, clave actualizada…). */
export function PanelResultado({ icon: Icon, title, children, actions, tone = "exito", className }: PanelResultadoProps) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-5 py-4 text-center animate-fade-up", className)}>
      <div className="relative">
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 -m-4 rounded-full blur-xl",
            tone === "exito" ? "bg-emerald-200/60" : "bg-azul-200/60",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "relative flex size-16 items-center justify-center rounded-2xl animate-pop-in",
            tone === "exito"
              ? "bg-emerald-50 text-success ring-1 ring-emerald-200"
              : "bg-gradient-brand text-white shadow-brand",
          )}
        >
          <Icon className="size-8" strokeWidth={1.8} />
          <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-sol-400 ring-2 ring-card" />
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {children ? <div className="text-[15px] leading-relaxed text-muted-foreground">{children}</div> : null}
      </div>
      {actions ? <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">{actions}</div> : null}
    </div>
  );
}
