import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Esqueleto de la banda de encabezado de las páginas internas. */
export function EsqueletoEncabezado({ conBuscador = false }: { conBuscador?: boolean }) {
  return (
    <div className="relative -mt-[73px] border-b border-border bg-gradient-brand-soft pt-[73px]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-8 pb-10 sm:px-6 sm:pt-10 sm:pb-14 lg:px-8">
        <Skeleton className="h-3.5 w-40" />
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-14 rounded-2xl sm:block" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-2/3 max-w-lg" />
          </div>
        </div>
        {conBuscador ? <Skeleton className="mt-2 h-12 w-full max-w-xl rounded-xl" /> : null}
      </div>
    </div>
  );
}

/** Grilla de tarjetas en carga. */
export function EsqueletoTarjetas({ cantidad = 6, className }: { cantidad?: number; className?: string }) {
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)} aria-hidden>
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <SkeletonText lines={3} />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Contenedor de página con texto accesible de carga. */
export function Cargando({ children, etiqueta = "Cargando…" }: { children: React.ReactNode; etiqueta?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{etiqueta}</span>
      {children}
    </div>
  );
}
