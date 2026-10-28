import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoIndicadores, EsqueletoTabla } from "../legajo/_components/esqueletos";

export default function CargandoTramites() {
  return (
    <div>
      <Cargando texto="Cargando tus trámites…" />
      <EsqueletoEncabezado acciones={0} />
      <EsqueletoIndicadores cantidad={4} />
      <Skeleton className="mt-8 mb-3 h-5 w-36" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="flex-row items-center gap-3 p-4">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </Card>
        ))}
      </div>
      <EsqueletoTabla filas={6} className="mt-8" />
    </div>
  );
}
