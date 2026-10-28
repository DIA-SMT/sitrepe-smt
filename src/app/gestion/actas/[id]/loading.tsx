import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function CargandoActa() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando el acta…</span>
      <div className="flex flex-col gap-3 pb-2">
        <Skeleton className="h-3.5 w-56" />
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
      </div>
      <div className="flex items-start justify-around rounded-card border border-border bg-card px-6 py-5 shadow-card">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="mb-5 h-5 w-44" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="mt-5 flex flex-wrap gap-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="mb-5 h-5 w-40" />
            <SkeletonText lines={4} />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          {[3, 4, 2].map((filas, i) => (
            <div key={i} className="rounded-card border border-border bg-card p-6 shadow-card">
              <Skeleton className="mb-5 h-5 w-32" />
              <div className="flex flex-col gap-3">
                {Array.from({ length: filas }, (_, j) => (
                  <Skeleton key={j} className="h-9 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
