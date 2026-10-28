import { Skeleton } from "@/components/ui/skeleton";
import { Cargando } from "./_components/esqueletos";

/** Carga de la portada (las demás páginas del portal tienen su propio esqueleto). */
export default function CargandoPortada() {
  return (
    <Cargando etiqueta="Cargando el portal…">
      <div className="relative -mt-[73px] bg-gradient-brand-soft pt-[73px]">
        <div className="mx-auto max-w-[90rem] px-2 pt-2 sm:px-4 sm:pt-3">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-brand sm:rounded-[2.25rem]">
            <div className="mx-auto grid max-w-7xl gap-12 px-5 pt-10 pb-24 sm:px-8 sm:pt-14 sm:pb-28 lg:grid-cols-[1.2fr_1fr] lg:px-10 lg:pt-20 lg:pb-36">
              <div className="flex flex-col gap-5">
                <span className="h-6 w-72 max-w-full animate-pulse rounded-full bg-white/15" />
                <span className="h-12 w-full max-w-xl animate-pulse rounded-xl bg-white/20" />
                <span className="h-12 w-4/5 max-w-lg animate-pulse rounded-xl bg-white/20" />
                <span className="h-4 w-full max-w-lg animate-pulse rounded-full bg-white/10" />
                <span className="mt-4 h-16 w-full max-w-xl animate-pulse rounded-2xl bg-white/90" />
              </div>
              <div className="hidden h-80 animate-pulse rounded-panel bg-white/20 sm:block" />
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 mx-auto -mt-16 grid max-w-7xl grid-cols-1 gap-3 px-4 min-[420px]:grid-cols-2 sm:-mt-20 sm:gap-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pt-20 pb-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-card" />
        ))}
      </div>
    </Cargando>
  );
}
