import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoTarjetas } from "../_components/esqueletos";

export default function CargandoNoticias() {
  return (
    <Cargando etiqueta="Cargando noticias…">
      <EsqueletoEncabezado />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Skeleton className="h-72 rounded-card" />
        <EsqueletoTarjetas cantidad={6} />
      </div>
    </Cargando>
  );
}
