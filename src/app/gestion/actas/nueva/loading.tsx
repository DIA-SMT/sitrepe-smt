import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoNuevaActa() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Preparando el formulario del acta…</span>
      <div className="flex items-start gap-4 pb-2">
        <Skeleton className="hidden size-12 rounded-2xl sm:block" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="flex flex-col gap-6">
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="mb-5 h-5 w-40" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="mb-5 h-5 w-48" />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
            <Skeleton className="mt-6 h-36 w-full" />
            <Skeleton className="mt-4 h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-80 w-full rounded-card" />
      </div>
    </div>
  );
}
