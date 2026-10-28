import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoIndicadores, EsqueletoTarjetas } from "../legajo/_components/esqueletos";

export default function CargandoProductos() {
  return (
    <div>
      <Cargando texto="Cargando la memoria técnica…" />
      <EsqueletoEncabezado />
      <EsqueletoIndicadores cantidad={3} />
      <Skeleton className="my-6 h-20 rounded-xl" />
      <EsqueletoTarjetas cantidad={6} className="md:grid-cols-2" />
    </div>
  );
}
