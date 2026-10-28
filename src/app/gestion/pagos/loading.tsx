import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto de la bandeja de conciliación. */
export default function CargandoBandejaPagos() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando pagos" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 pb-2">
        <Skeleton className="h-3 w-48" />
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          <Skeleton className="hidden h-10 w-48 rounded-control sm:block" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-2 h-12 w-full max-w-3xl rounded-2xl" />
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border bg-subtle/60 px-6 py-3">
          <Skeleton className="h-10 w-72 rounded-control" />
          <Skeleton className="h-10 w-40 rounded-control" />
          <Skeleton className="h-10 w-56 rounded-control" />
        </div>
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr] items-center gap-4 px-6 py-4">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-20 justify-self-end" />
              <Skeleton className="h-8 w-24 justify-self-end rounded-control" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
