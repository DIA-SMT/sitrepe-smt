import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EsqueletoLista } from "./_components/esqueletos";

export default function Cargando() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Cargando la hoja de ruta">
      <Card className="flex flex-col gap-2 p-4 sm:flex-row" aria-hidden>
        <Skeleton className="h-10 w-full sm:w-64" />
        <Skeleton className="h-10 w-full sm:w-40" />
        <Skeleton className="h-10 w-full sm:w-48" />
        <Skeleton className="h-10 w-full sm:w-44" />
      </Card>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <EsqueletoLista filas={7} />
        <Skeleton className="hidden h-[calc(100dvh-12rem)] rounded-card xl:block" />
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
