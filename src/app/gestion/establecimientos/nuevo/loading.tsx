import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { EsqueletoEncabezado } from "../../hoja-de-ruta/_components/esqueletos";

export default function Cargando() {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Cargando el formulario">
      <EsqueletoEncabezado />
      <Card className="mx-auto w-full max-w-3xl gap-5 p-6" aria-hidden>
        <Skeleton className="h-5 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 sm:col-span-2" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <SkeletonText lines={2} />
      </Card>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
