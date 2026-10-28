import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoCertificados() {
  return (
    <div role="status" aria-label="Cargando certificados" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-44" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border px-5 py-4 sm:px-6">
          <Skeleton className="h-10 w-full sm:w-80" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full sm:w-52" />
          ))}
        </div>
        <div className="hidden h-11 border-b border-border bg-subtle xl:block" />
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="grid gap-3 px-5 py-4 sm:px-6 xl:grid-cols-[7rem_1fr_1.6fr_9rem_6rem_2rem] xl:items-center xl:gap-4"
            >
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-36" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-44 max-w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="hidden flex-col gap-2 xl:flex">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="hidden h-6 w-20 rounded-full xl:block" />
              <Skeleton className="hidden size-8 rounded-lg xl:block" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
