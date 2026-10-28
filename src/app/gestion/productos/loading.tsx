import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoTabla } from "../_components/esqueletos";

export default function CargandoProductos() {
  return (
    <Cargando mensaje="Cargando el catálogo de productos…">
      <div className="flex flex-col gap-4">
        <EsqueletoEncabezado acciones={1} />
        <div className="flex w-fit gap-1 rounded-xl bg-muted p-1" aria-hidden>
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-60 rounded-lg" />
        </div>
      </div>
      <EsqueletoTabla filas={8} columnas={7} />
    </Cargando>
  );
}
