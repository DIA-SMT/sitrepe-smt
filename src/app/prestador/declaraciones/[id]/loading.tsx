import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoDeclaracion() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando la declaración…</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-56" />
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-80 max-w-full" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-3/4" />
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="grid grid-cols-2 gap-4 px-6 py-4 md:grid-cols-6">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="hidden h-4 w-full md:block" />
              <Skeleton className="hidden h-4 w-20 md:block" />
              <Skeleton className="hidden h-4 w-28 md:block" />
              <Skeleton className="hidden h-6 w-24 rounded-full md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
