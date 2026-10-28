import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoNuevaNotificacion() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Preparando el formulario…</span>
      <div className="flex items-start gap-4 pb-2">
        <Skeleton className="hidden size-12 rounded-2xl sm:block" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="flex flex-col gap-6">
          {[5, 6, 3].map((filas, i) => (
            <div key={i} className="overflow-hidden rounded-card border border-border bg-card shadow-card">
              <div className="flex items-center gap-3 border-b border-border px-6 py-4">
                <Skeleton className="size-9 rounded-xl" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                </div>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                {Array.from({ length: filas }, (_, j) => (
                  <div key={j} className="flex flex-col gap-2">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-[30rem] w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
