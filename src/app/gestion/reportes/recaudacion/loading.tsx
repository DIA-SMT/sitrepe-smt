import { CargandoReporte, EsqueletoEncabezado, EsqueletoTabla, EsqueletoTarjeta } from "../_components/esqueletos";

export default function CargandoRecaudacion() {
  return (
    <CargandoReporte etiqueta="Cargando el informe de recaudación…">
      <EsqueletoEncabezado />
      <EsqueletoTarjeta />
      <EsqueletoTabla filas={3} columnas={5} />
      <EsqueletoTabla filas={4} columnas={5} />
      <EsqueletoTabla filas={8} columnas={8} />
    </CargandoReporte>
  );
}
