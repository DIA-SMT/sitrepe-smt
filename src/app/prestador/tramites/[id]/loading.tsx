import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoTabla } from "../../legajo/_components/esqueletos";

export default function CargandoTramite() {
  return (
    <div>
      <Cargando texto="Cargando el trámite…" />
      <EsqueletoEncabezado />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="gap-5 p-6" aria-hidden>
            <Skeleton className="h-5 w-48" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          </Card>
          <EsqueletoTabla filas={2} />
        </div>
        <Card className="gap-4 p-6" aria-hidden>
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <SkeletonText lines={2} className="flex-1" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
