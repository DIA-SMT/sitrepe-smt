import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function CargandoNotificacion() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando la notificación…</span>
      <div className="flex flex-col gap-3 pb-2">
        <Skeleton className="h-3.5 w-64" />
        <div className="flex items-start gap-4">
          <Skeleton className="hidden size-12 rounded-2xl sm:block" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
      </div>
      <div className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-xl" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="mt-5 grid max-w-2xl grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="mb-5 h-5 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="mb-5 h-5 w-52" />
            <SkeletonText lines={6} />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="mb-5 h-5 w-32" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="mb-4 flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
