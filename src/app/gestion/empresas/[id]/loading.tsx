import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoStats, EsqueletoTarjeta } from "../../_components/esqueletos";

export default function CargandoLegajo() {
  return (
    <Cargando mensaje="Cargando el legajo de la empresa…">
      <div className="flex flex-col gap-3">
        <EsqueletoEncabezado acciones={2} />
        <div className="flex flex-wrap gap-2" aria-hidden>
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
      </div>
      <EsqueletoStats cantidad={4} />
      <div className="flex gap-5 overflow-hidden border-b border-border pb-3" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-24 shrink-0" />
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <EsqueletoTarjeta lineas={10} />
        <EsqueletoTarjeta lineas={6} />
      </div>
    </Cargando>
  );
}
