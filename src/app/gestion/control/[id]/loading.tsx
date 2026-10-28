import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function CargandoControlPlanilla() {
  return (
    <div role="status" aria-label="Cargando la planilla" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 pb-2">
        <Skeleton className="h-3.5 w-64" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="hidden size-12 rounded-2xl sm:block" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-72 max-w-full" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-52" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <SkeletonText lines={3} />
        </div>
        <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card xl:col-span-2">
          <Skeleton className="h-5 w-72 max-w-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
          <SkeletonText lines={2} />
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-9 w-64 rounded-xl" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-4 px-5 py-4 sm:px-6 md:flex-row md:items-start md:gap-5">
              <div className="grid min-w-0 flex-1 gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-[8rem_minmax(0,1fr)_8.5rem]">
                <Skeleton className="h-5 w-24 sm:col-span-2 xl:col-span-1" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-40 max-w-full" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-4 md:flex-col md:items-end xl:flex-row xl:gap-5">
                <div className="grid w-fit grid-cols-4 gap-1.5">
                  {Array.from({ length: 8 }, (_, j) => (
                    <Skeleton key={j} className="size-8 rounded-lg" />
                  ))}
                </div>
                <Skeleton className="h-10 w-44 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
