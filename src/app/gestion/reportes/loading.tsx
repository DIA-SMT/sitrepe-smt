import { Skeleton } from "@/components/ui/skeleton";
import { CargandoReporte, EsqueletoGrafico, EsqueletoStats, EsqueletoTabla } from "./_components/esqueletos";

export default function CargandoResumenReportes() {
  return (
    <CargandoReporte etiqueta="Cargando el resumen de reportes…">
      <div className="grid gap-8 rounded-panel bg-noche-100/70 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-64 rounded-full" />
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-12 w-80 max-w-full" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <Skeleton className="h-2.5 w-full max-w-xl rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-48 rounded-control" />
            <Skeleton className="h-10 w-32 rounded-control" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      </div>
      <EsqueletoStats />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <EsqueletoGrafico alto="h-72" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      </div>
      <EsqueletoTabla filas={6} columnas={6} />
    </CargandoReporte>
  );
}
