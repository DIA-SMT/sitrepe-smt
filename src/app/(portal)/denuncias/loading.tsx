import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado } from "../_components/esqueletos";

export default function CargandoDenuncias() {
  return (
    <Cargando etiqueta="Cargando el formulario de denuncias…">
      <EsqueletoEncabezado />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1.55fr_1fr] lg:px-8">
        <div className="flex flex-col gap-5 rounded-card border border-border bg-card p-6 shadow-card">
          <Skeleton className="h-5 w-48" />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-32 rounded-control" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 rounded-control" />
            <Skeleton className="h-10 rounded-control" />
          </div>
          <Skeleton className="ml-auto h-12 w-44 rounded-xl" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 rounded-control" />
            <Skeleton className="h-10 rounded-control" />
          </div>
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <SkeletonText lines={5} />
          </div>
        </div>
      </div>
    </Cargando>
  );
}
