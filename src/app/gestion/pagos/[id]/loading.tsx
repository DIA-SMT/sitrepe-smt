import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Esqueleto de la conciliación de un pago. */
export default function CargandoConciliacion() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando pago" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 pb-2">
        <Skeleton className="h-3 w-56" />
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-12 w-44 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-5 w-56" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
            <SkeletonText lines={3} />
          </div>
          <Skeleton className="h-96 rounded-card" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-60 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
          <Skeleton className="h-56 rounded-card" />
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
