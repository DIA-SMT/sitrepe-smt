import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoBandejaControl() {
  return (
    <div role="status" aria-label="Cargando la bandeja de control" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-44" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-36 shrink-0 rounded-xl" />
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
        </div>
        <div className="border-b border-border px-5 py-3 sm:px-6">
          <Skeleton className="h-10 w-full sm:w-96" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-3 sm:px-6 xl:grid-cols-[8.5rem_minmax(0,1fr)_5.5rem_11.5rem_7.5rem_7.5rem] xl:items-center xl:gap-x-5"
            >
              <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="col-span-2 flex flex-col gap-2 xl:col-span-1">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-12" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-36 max-w-full" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="hidden h-8 w-24 justify-self-end xl:block" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
