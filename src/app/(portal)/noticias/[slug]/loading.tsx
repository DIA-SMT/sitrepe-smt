import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado } from "../../_components/esqueletos";

export default function CargandoNoticia() {
  return (
    <Cargando etiqueta="Cargando la noticia…">
      <EsqueletoEncabezado />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_20rem] lg:px-8">
        <div>
          <Skeleton className="aspect-[21/9] w-full rounded-panel" />
          <div className="mx-auto mt-10 flex max-w-[68ch] flex-col gap-6">
            <SkeletonText lines={3} />
            <SkeletonText lines={4} />
            <SkeletonText lines={3} />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </div>
    </Cargando>
  );
}
