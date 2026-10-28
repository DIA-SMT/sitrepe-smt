import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoTarjetas } from "../_components/esqueletos";

export default function CargandoEmpresas() {
  return (
    <Cargando etiqueta="Cargando empresas habilitadas…">
      <EsqueletoEncabezado />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card lg:flex-row">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-full lg:w-96" />
          <Skeleton className="h-11 w-full lg:w-48" />
        </div>
        <Skeleton className="h-4 w-44" />
        <EsqueletoTarjetas cantidad={9} className="md:grid-cols-2 xl:grid-cols-3" />
      </div>
    </Cargando>
  );
}
