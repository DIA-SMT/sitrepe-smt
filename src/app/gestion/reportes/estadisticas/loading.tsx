import { CargandoReporte, EsqueletoEncabezado, EsqueletoGrafico, EsqueletoStats } from "../_components/esqueletos";

export default function CargandoEstadisticas() {
  return (
    <CargandoReporte etiqueta="Calculando las estadísticas…">
      <EsqueletoEncabezado />
      <EsqueletoStats />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <EsqueletoGrafico alto="h-72" />
        <EsqueletoGrafico alto="h-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <EsqueletoGrafico />
        <EsqueletoGrafico />
      </div>
    </CargandoReporte>
  );
}
