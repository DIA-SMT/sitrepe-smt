import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoIndicadores, EsqueletoTabla } from "../legajo/_components/esqueletos";

export default function CargandoAvisos() {
  return (
    <div>
      <Cargando texto="Cargando avisos y comunicaciones…" />
      <EsqueletoEncabezado />
      <EsqueletoIndicadores cantidad={4} />
      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="gap-0 overflow-hidden xl:col-span-3" aria-hidden>
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="h-4 w-48" />
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-4 border-b border-border px-6 py-5 last:border-0">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
                <SkeletonText lines={2} />
              </div>
            </div>
          ))}
        </Card>
        <div className="flex flex-col gap-6 xl:col-span-2">
          <EsqueletoTabla filas={3} />
          <EsqueletoTabla filas={2} />
        </div>
      </div>
    </div>
  );
}
