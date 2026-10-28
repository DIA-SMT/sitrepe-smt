import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Esqueleto del área de prestadores (inicio y pantallas sin carga propia). */
export default function CargandoPrestador() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Cargando…</span>

      <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-44 rounded-control" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-panel bg-noche p-6 lg:col-span-3">
          <div className="flex flex-col gap-4 opacity-40">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-7 w-72 max-w-full" />
            <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
              <Skeleton className="h-20 w-32" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card lg:col-span-2">
          <Skeleton className="h-5 w-36" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card xl:col-span-2">
          <Skeleton className="h-5 w-48" />
          <div className="flex h-64 items-end gap-3 pt-4">
            {[40, 65, 50, 80, 55, 90, 70, 60, 85, 75, 95, 68].map((alto, i) => (
              <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${alto}%` }} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <SkeletonText lines={2} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
