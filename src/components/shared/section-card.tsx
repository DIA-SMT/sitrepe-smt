import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SectionCardProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Acciones a la derecha del encabezado. */
  actions?: React.ReactNode;
  /** Pie de la tarjeta (paginación, totales, links). */
  footer?: React.ReactNode;
  /** Sin padding en el cuerpo (para tablas o listas a sangre). */
  flush?: boolean;
  id?: string;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
};

/** Tarjeta de sección con encabezado (título, descripción, acciones). */
export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  footer,
  flush = false,
  id,
  className,
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <Card id={id} className={cn("overflow-hidden", className)}>
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100"
            >
              <Icon className="size-[18px]" strokeWidth={1.9} />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-base leading-snug font-semibold text-foreground">{title}</h2>
            {description ? <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn(!flush && "p-5 sm:p-6", contentClassName)}>{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-subtle/70 px-5 py-3 text-sm sm:px-6">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
