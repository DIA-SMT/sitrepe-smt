import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoTabla } from "../../configuracion/_compartido/esqueletos";

export default function CargandoCapacitacion() {
  return (
    <Cargando mensaje="Cargando la capacitación…">
      <EsqueletoEncabezado acciones={2} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" aria-hidden>
        <div className="flex gap-6 rounded-card border border-border bg-card p-6 shadow-card">
          <Skeleton className="h-24 w-20 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
            <SkeletonText lines={3} />
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-3.5 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      </div>
      <EsqueletoTabla filas={6} columnas={6} />
    </Cargando>
  );
}
