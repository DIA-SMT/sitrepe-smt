import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EsqueletoEncabezado, EsqueletoFicha } from "../../hoja-de-ruta/_components/esqueletos";

export default function Cargando() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando la ficha del establecimiento">
      <EsqueletoEncabezado />
      <div className="grid gap-4 md:grid-cols-2" aria-hidden>
        {[0, 1].map((i) => (
          <Card key={i} className="gap-4 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-11 w-48 rounded-xl" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <Skeleton className="h-14 w-full" />
          </Card>
        ))}
      </div>
      <EsqueletoFicha />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
