import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Encabezado de una vista de reportes: título, descripción, controles (período, empresa) y acciones. */
export function EncabezadoSeccion({
  titulo,
  descripcion,
  icono: Icono,
  controles,
  acciones,
  className,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  icono?: LucideIcon;
  controles?: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icono ? (
            <span
              aria-hidden
              className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
            >
              <Icono className="size-5" strokeWidth={1.9} />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-xl leading-tight font-semibold tracking-tight text-foreground first-letter:uppercase">
              {titulo}
            </h2>
            {descripcion ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{descripcion}</p> : null}
          </div>
        </div>
        {acciones ? <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{acciones}</div> : null}
      </div>
      {controles ? <div className="no-print flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{controles}</div> : null}
    </section>
  );
}
