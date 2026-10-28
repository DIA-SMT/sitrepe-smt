import { EsqueletoEncabezado, EsqueletoFicha } from "../../hoja-de-ruta/_components/esqueletos";

export default function Cargando() {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Cargando el formulario">
      <EsqueletoEncabezado />
      <EsqueletoFicha />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
