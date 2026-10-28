import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Esqueleto de "Pagos y timbrado" mientras se cargan certificados y liquidaciones. */
export default function CargandoPagos() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando pagos y timbrado" className="flex flex-col gap-6">
      <div className="flex items-start gap-4 pb-2">
        <Skeleton className="hidden size-12 rounded-2xl sm:block" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-card" />
        ))}
      </div>
      <div className="rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-80 max-w-full" />
          </div>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-4">
              <Skeleton className="size-[18px] rounded-[5px]" />
              <SkeletonText lines={2} className="flex-1" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-10 w-48 rounded-control" />
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
