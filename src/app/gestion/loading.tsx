import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Carga del panel (y de las secciones de gestión que no tengan una propia). */
export default function CargandoGestion() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">Cargando el panel de gestión…</span>

      {/* Encabezado genérico: también se ve al entrar a secciones de gestión sin carga propia. */}
      <div className="flex items-start gap-4" aria-hidden>
        <Skeleton className="hidden size-12 shrink-0 rounded-2xl sm:block" />
        <div className="flex w-full max-w-xl flex-col gap-2.5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" aria-hidden>
        <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-2 w-2/3 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-card">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" aria-hidden>
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" aria-hidden>
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-5 w-32" />
            <SkeletonText lines={5} />
          </div>
        ))}
      </div>
    </div>
  );
}
