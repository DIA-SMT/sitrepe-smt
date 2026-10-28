import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoNuevaDeclaracion() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-panel border border-border bg-card shadow-card">
            <Skeleton className="h-40 rounded-none" />
            <div className="flex flex-col gap-3 p-6">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-3 h-12 w-56" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-36 rounded-panel" />
    </div>
  );
}
