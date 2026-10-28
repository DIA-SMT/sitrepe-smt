import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoStats, EsqueletoTabla } from "../configuracion/_compartido/esqueletos";

export default function CargandoUsuarios() {
  return (
    <Cargando mensaje="Cargando los usuarios…">
      <EsqueletoEncabezado acciones={1} />
      <EsqueletoStats cantidad={4} />
      <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-card" aria-hidden>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex flex-wrap gap-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-3.5 w-28" />
          ))}
        </div>
      </div>
      <EsqueletoTabla filas={8} columnas={5} />
    </Cargando>
  );
}
