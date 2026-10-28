import {
  Cargando,
  EsqueletoEncabezado,
  EsqueletoStats,
  EsqueletoTarjetas,
} from "../configuracion/_compartido/esqueletos";

export default function CargandoNoticias() {
  return (
    <Cargando mensaje="Cargando las noticias…">
      <EsqueletoEncabezado acciones={2} />
      <EsqueletoStats cantidad={4} />
      <EsqueletoTarjetas cantidad={6} conImagen />
    </Cargando>
  );
}
