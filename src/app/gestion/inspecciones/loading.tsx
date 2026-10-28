import { Skeleton } from "@/components/ui/skeleton";
import { EsqueletoEncabezado, EsqueletoIndicadores, EsqueletoLista } from "../hoja-de-ruta/_components/esqueletos";

export default function Cargando() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando inspecciones">
      <EsqueletoEncabezado />
      <Skeleton className="h-48 rounded-panel" />
      <EsqueletoIndicadores />
      <EsqueletoLista filas={6} />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
