import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoDeclaraciones() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando declaraciones…</span>
      <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-7 w-72" />
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
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border px-6 py-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-10 w-52" />
          <Skeleton className="h-10 w-52" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="ml-auto h-4 w-28" />
              <Skeleton className="hidden h-8 w-24 md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
