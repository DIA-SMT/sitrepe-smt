import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Esqueletos de carga de las pantallas de fiscalización. */

export function EsqueletoEncabezado() {
  return (
    <div className="flex flex-col gap-4 pb-6" aria-hidden>
      <Skeleton className="h-3.5 w-48" />
      <div className="flex items-start gap-4">
        <Skeleton className="hidden size-12 rounded-2xl sm:block" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
    </div>
  );
}

export function EsqueletoIndicadores({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: cantidad }, (_, i) => (
        <Card key={i} className="gap-3 p-5">
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-10 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-16" />
        </Card>
      ))}
    </div>
  );
}

export function EsqueletoLista({ filas = 6 }: { filas?: number }) {
  return (
    <Card className="overflow-hidden" aria-hidden>
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <Skeleton className="size-9 rounded-xl" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row">
        <Skeleton className="h-10 w-full sm:w-72" />
        <Skeleton className="h-10 w-full sm:w-52" />
        <Skeleton className="h-10 w-full sm:w-52" />
      </div>
      <ul className="divide-y divide-border">
        {Array.from({ length: filas }, (_, i) => (
          <li key={i} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3 max-w-72" />
              <Skeleton className="h-3 w-1/2 max-w-56" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function EsqueletoFicha() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-hidden>
      <div className="flex flex-col gap-6">
        <Card className="gap-4 p-6">
          <Skeleton className="h-5 w-40" />
          <SkeletonText lines={4} />
        </Card>
        <Card className="gap-4 p-6">
          <Skeleton className="h-5 w-52" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </Card>
      </div>
      <div className="flex flex-col gap-6">
        <Card className="gap-3 p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </Card>
        <Card className="gap-3 p-5">
          <SkeletonText lines={3} />
        </Card>
      </div>
    </div>
  );
}

export function EsqueletoPagina({ conIndicadores = true, filas = 6 }: { conIndicadores?: boolean; filas?: number }) {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando">
      <EsqueletoEncabezado />
      {conIndicadores ? <EsqueletoIndicadores /> : null}
      <EsqueletoLista filas={filas} />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
