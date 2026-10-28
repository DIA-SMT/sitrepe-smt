import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Esqueleto del detalle de una liquidación. */
export default function CargandoLiquidacion() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando liquidación" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 pb-2">
        <Skeleton className="h-3 w-56" />
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-5 w-40" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Skeleton className="h-10 rounded-control" />
              <Skeleton className="h-10 rounded-control" />
              <Skeleton className="h-10 rounded-control sm:col-span-2" />
              <Skeleton className="h-16 rounded-control sm:col-span-2" />
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-5 w-48" />
            {Array.from({ length: 3 }, (_, i) => (
              <SkeletonText key={i} lines={2} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-60 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
