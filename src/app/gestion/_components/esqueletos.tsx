import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Piezas de carga para los loading.tsx del módulo (imitan PageHeader, StatCard y tablas). */

export function EsqueletoEncabezado({ acciones = 1 }: { acciones?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-3.5 w-48" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 shrink-0 rounded-2xl sm:block" />
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-8 w-64 max-w-[70vw]" />
            <Skeleton className="h-4 w-96 max-w-[80vw]" />
          </div>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: acciones }, (_, i) => (
            <Skeleton key={i} className="h-10 w-36 rounded-control" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function EsqueletoStats({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", cantidad >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")} aria-hidden>
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-10 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function EsqueletoTabla({ filas = 8, columnas = 6, filtros = true }: { filas?: number; columnas?: number; filtros?: boolean }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card" aria-hidden>
      <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
        <Skeleton className="size-9 rounded-xl" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      {filtros ? (
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:px-6">
          <Skeleton className="h-10 w-full rounded-control sm:w-72" />
          <Skeleton className="h-10 w-full rounded-control sm:w-52" />
          <Skeleton className="h-10 w-full rounded-control sm:w-52" />
        </div>
      ) : null}
      <div className="hidden h-11 items-center gap-6 bg-subtle px-5 md:flex">
        {Array.from({ length: columnas }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="flex items-center gap-6 px-5 py-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/5" />
            </div>
            {Array.from({ length: Math.max(0, columnas - 3) }, (_, j) => (
              <Skeleton key={j} className="hidden h-3.5 flex-1 md:block" />
            ))}
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EsqueletoTarjeta({ lineas = 4, className }: { lineas?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card sm:p-6", className)} aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="h-4 w-40" />
      </div>
      <SkeletonText lines={lineas} />
    </div>
  );
}

/** Contenedor con aviso accesible de carga. */
export function Cargando({ mensaje, children }: { mensaje: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{mensaje}</span>
      {children}
    </div>
  );
}
