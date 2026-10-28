import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoFirmas() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando firmas pendientes…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-24 rounded-panel" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
      {Array.from({ length: 2 }, (_, g) => (
        <div key={g} className="overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="flex items-center gap-3 border-b border-border bg-subtle/70 px-5 py-3">
            <Skeleton className="size-[18px] rounded-[5px]" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <Skeleton className="size-[18px] rounded-[5px]" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="hidden h-4 w-32 sm:block" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
