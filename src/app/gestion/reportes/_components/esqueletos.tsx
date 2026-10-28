import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Contenedor accesible de las pantallas de carga de reportes. */
export function CargandoReporte({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{etiqueta}</span>
      <div aria-hidden className="contents">
        {children}
      </div>
    </div>
  );
}

/** Encabezado de sección con selector de período y acciones. */
export function EsqueletoEncabezado({ controles = 1 }: { controles?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-72 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-control" />
          <Skeleton className="h-10 w-48 rounded-control" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: controles }, (_, i) => (
          <Skeleton key={i} className={cn("h-11 rounded-2xl", i === 0 ? "w-80 max-w-full" : "w-72 max-w-full")} />
        ))}
      </div>
    </div>
  );
}

export function EsqueletoStats({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", cantidad === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="size-10 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function EsqueletoGrafico({ alto = "h-64" }: { alto?: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <Skeleton className={cn("w-full rounded-xl", alto)} />
    </div>
  );
}

export function EsqueletoTabla({ filas = 6, columnas = 6 }: { filas?: number; columnas?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Skeleton className="size-9 rounded-xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: filas }, (_, f) => (
          <div key={f} className="flex items-center gap-4 px-6 py-3.5">
            {Array.from({ length: columnas }, (_, c) => (
              <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-40" : "w-20", c > 2 && "hidden sm:block")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EsqueletoTarjeta() {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-64 max-w-full" />
      <SkeletonText lines={2} />
    </div>
  );
}
