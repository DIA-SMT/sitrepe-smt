import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado } from "../_components/esqueletos";

export default function CargandoCapacitaciones() {
  return (
    <Cargando etiqueta="Cargando capacitaciones…">
      <EsqueletoEncabezado />
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Skeleton className="h-7 w-64" />
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="grid gap-5 rounded-card border border-border bg-card p-5 shadow-card sm:grid-cols-[auto_1fr] sm:p-6 lg:grid-cols-[auto_1fr_17rem]"
          >
            <Skeleton className="h-24 w-[4.5rem] rounded-2xl" />
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <SkeletonText lines={2} />
            </div>
            <div className="flex flex-col justify-center gap-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-10 w-full rounded-control" />
            </div>
          </div>
        ))}
      </div>
    </Cargando>
  );
}
