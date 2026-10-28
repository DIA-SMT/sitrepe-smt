import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoTarjeta } from "../../_components/esqueletos";

export default function CargandoTramite() {
  return (
    <Cargando mensaje="Cargando el trámite…">
      <EsqueletoEncabezado acciones={1} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <EsqueletoTarjeta lineas={8} />
          <EsqueletoTarjeta lineas={6} />
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-6 shadow-card" aria-hidden>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <EsqueletoTarjeta lineas={5} />
        </div>
      </div>
    </Cargando>
  );
}
