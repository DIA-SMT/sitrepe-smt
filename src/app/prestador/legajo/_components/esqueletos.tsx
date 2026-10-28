import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Esqueletos de carga reutilizados por los `loading.tsx` del módulo. */

export function EsqueletoEncabezado({ acciones = 1 }: { acciones?: number }) {
  return (
    <div className="flex flex-col gap-4 pb-6" aria-hidden>
      <Skeleton className="h-3.5 w-40" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-56 sm:w-72" />
            <Skeleton className="h-4 w-72 max-w-full sm:w-[28rem]" />
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

export function EsqueletoIndicadores({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", cantidad >= 4 ? "xl:grid-cols-4" : "lg:grid-cols-3")} aria-hidden>
      {Array.from({ length: cantidad }, (_, i) => (
        <Card key={i} className="gap-4 p-5">
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-10 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </Card>
      ))}
    </div>
  );
}

export function EsqueletoTabla({ filas = 6, className }: { filas?: number; className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)} aria-hidden>
      <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
        <Skeleton className="size-9 rounded-xl" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
            <Skeleton className="hidden h-4 w-20 md:block" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function EsqueletoTarjetas({ cantidad = 3, className }: { cantidad?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)} aria-hidden>
      {Array.from({ length: cantidad }, (_, i) => (
        <Card key={i} className="gap-4 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <SkeletonText lines={3} />
        </Card>
      ))}
    </div>
  );
}

/** Texto oculto para lectores de pantalla mientras carga. */
export function Cargando({ texto }: { texto: string }) {
  return (
    <p className="sr-only" role="status">
      {texto}
    </p>
  );
}
