import { Cargando, EsqueletoEncabezado, EsqueletoStats, EsqueletoTabla } from "../_components/esqueletos";

export default function CargandoPadron() {
  return (
    <Cargando mensaje="Cargando el padrón de empresas…">
      <EsqueletoEncabezado acciones={2} />
      <EsqueletoStats cantidad={4} />
      <EsqueletoTabla filas={10} columnas={9} />
    </Cargando>
  );
}
