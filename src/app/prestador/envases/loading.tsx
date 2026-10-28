import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoIndicadores, EsqueletoTabla } from "../legajo/_components/esqueletos";

export default function CargandoEnvases() {
  return (
    <div>
      <Cargando texto="Cargando la trazabilidad de envases…" />
      <EsqueletoEncabezado acciones={2} />
      <EsqueletoIndicadores cantidad={4} />
      <Skeleton className="my-6 h-20 rounded-xl" />
      <div className="flex flex-col gap-6">
        <EsqueletoTabla filas={3} />
        <EsqueletoTabla filas={6} />
      </div>
    </div>
  );
}
