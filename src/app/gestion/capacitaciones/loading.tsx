import {
  Cargando,
  EsqueletoEncabezado,
  EsqueletoSegmentos,
  EsqueletoStats,
  EsqueletoTarjetas,
} from "../configuracion/_compartido/esqueletos";

export default function CargandoCapacitaciones() {
  return (
    <Cargando mensaje="Cargando las capacitaciones…">
      <EsqueletoEncabezado acciones={2} />
      <EsqueletoStats cantidad={4} />
      <EsqueletoSegmentos cantidad={3} />
      <EsqueletoTarjetas cantidad={6} />
    </Cargando>
  );
}
