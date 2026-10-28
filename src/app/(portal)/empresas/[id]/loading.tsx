import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado } from "../../_components/esqueletos";

export default function CargandoEmpresa() {
  return (
    <Cargando etiqueta="Cargando la ficha de la empresa…">
      <EsqueletoEncabezado />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1.6fr_1fr] lg:px-8">
        <div className="flex flex-col gap-6">
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="mb-6 h-5 w-48" />
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="mb-6 h-5 w-56" />
            <SkeletonText lines={5} />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="mb-5 h-5 w-40" />
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="mb-4 flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-52 rounded-card" />
        </div>
      </div>
    </Cargando>
  );
}
