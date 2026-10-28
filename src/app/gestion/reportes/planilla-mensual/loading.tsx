import { Skeleton } from "@/components/ui/skeleton";
import { CargandoReporte, EsqueletoEncabezado, EsqueletoStats, EsqueletoTabla } from "../_components/esqueletos";

export default function CargandoPlanillaMensual() {
  return (
    <CargandoReporte etiqueta="Cargando la planilla mensual…">
      <EsqueletoEncabezado controles={2} />
      <Skeleton className="h-12 w-full rounded-xl" />
      <EsqueletoStats />
      <EsqueletoTabla filas={8} columnas={9} />
    </CargandoReporte>
  );
}
