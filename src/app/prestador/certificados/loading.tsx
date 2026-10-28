import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto del listado de certificados. */
export default function CargandoCertificados() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">Cargando certificados…</span>

      <div className="flex flex-col gap-4 pb-1">
        <Skeleton className="h-3.5 w-40" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="hidden size-12 rounded-2xl sm:block" />
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-[28rem] max-w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36 rounded-control" />
            <Skeleton className="h-10 w-44 rounded-control" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-card border border-border bg-card p-4 shadow-card">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="hidden h-3 w-28 sm:block" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-4 shadow-card sm:flex-row sm:flex-wrap">
        <Skeleton className="h-10 sm:w-72" />
        <Skeleton className="h-10 sm:w-52" />
        <Skeleton className="h-10 sm:w-52" />
        <Skeleton className="h-10 sm:w-52" />
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-4 w-16" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
              <Skeleton className="hidden h-4 w-24 md:block" />
              <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
