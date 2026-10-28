import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado } from "../_components/esqueletos";

export default function CargandoVerificar() {
  return (
    <Cargando etiqueta="Cargando…">
      <EsqueletoEncabezado conBuscador />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-80 max-w-full" />
          <SkeletonText lines={2} />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-panel" />
      </div>
    </Cargando>
  );
}
