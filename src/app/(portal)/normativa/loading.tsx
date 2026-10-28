import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado } from "../_components/esqueletos";

export default function CargandoNormativa() {
  return (
    <Cargando etiqueta="Cargando la normativa…">
      <EsqueletoEncabezado />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[14rem_1fr] lg:px-8">
        <div className="hidden flex-col gap-3 lg:flex">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-40" />
          ))}
        </div>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-80 max-w-full" />
            <SkeletonText lines={2} className="max-w-2xl" />
          </div>
          <Skeleton className="h-48 rounded-card" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-card" />
            ))}
          </div>
        </div>
      </div>
    </Cargando>
  );
}
