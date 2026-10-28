import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto del alta de pagos de otros conceptos. */
export default function CargandoNuevoPago() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando formulario" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 pb-2">
        <Skeleton className="h-3 w-56" />
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-7 w-80 max-w-full" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-5 rounded-card border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <Skeleton className="h-10 rounded-control" />
              <Skeleton className="h-10 w-48 rounded-control" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 rounded-card" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
