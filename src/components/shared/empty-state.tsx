import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Botón o link de acción principal. */
  action?: React.ReactNode;
  /** Versión compacta (dentro de tarjetas o tablas). */
  compact?: boolean;
  className?: string;
};

/** Estado vacío amigable con ícono, texto y acción. */
export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-card border border-dashed border-border-strong bg-card text-center",
        compact ? "gap-3 px-6 py-10" : "gap-4 px-6 py-16",
        className,
      )}
    >
      <div aria-hidden className="bg-dots mask-fade pointer-events-none absolute inset-0 text-azul-600 opacity-60" />
      <div className="relative">
        <span aria-hidden className="absolute inset-0 -m-3 rounded-full bg-azul-100/60 blur-xl" />
        <span
          aria-hidden
          className={cn(
            "relative flex items-center justify-center rounded-2xl bg-card text-azul-600 shadow-card ring-1 ring-azul-100",
            compact ? "size-12" : "size-16",
          )}
        >
          <Icon className={compact ? "size-6" : "size-7"} strokeWidth={1.75} />
          <span className="absolute -top-1 -right-1 size-3 rounded-full bg-sol-400 ring-2 ring-card" />
        </span>
      </div>
      <div className="relative flex max-w-md flex-col gap-1.5">
        <h3 className={cn("font-display font-semibold text-foreground", compact ? "text-base" : "text-lg")}>{title}</h3>
        {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="relative mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
