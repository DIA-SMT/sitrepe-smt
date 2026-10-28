import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoTabla } from "../_components/esqueletos";

export default function CargandoTramites() {
  return (
    <Cargando mensaje="Cargando la bandeja de trámites…">
      <div className="flex flex-col gap-4">
        <EsqueletoEncabezado acciones={1} />
        <div className="flex w-fit gap-1 rounded-xl bg-muted p-1" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
      </div>
      <EsqueletoTabla filas={8} columnas={7} />
    </Cargando>
  );
}
