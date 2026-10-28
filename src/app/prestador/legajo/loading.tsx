import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoTarjetas } from "./_components/esqueletos";

export default function CargandoLegajo() {
  return (
    <div>
      <Cargando texto="Cargando el legajo digital…" />
      <EsqueletoEncabezado acciones={0} />
      <div className="mb-6 flex flex-col gap-6 rounded-panel bg-noche p-5 sm:p-7 xl:flex-row xl:items-end xl:justify-between" aria-hidden>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-48 opacity-30" />
          <Skeleton className="h-8 w-72 max-w-full opacity-30" />
          <Skeleton className="h-4 w-56 opacity-30" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full opacity-30" />
            <Skeleton className="h-6 w-40 rounded-full opacity-30" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl opacity-25" />
          ))}
        </div>
      </div>
      <div className="mb-6 flex gap-1 overflow-hidden rounded-xl bg-muted p-1 sm:w-fit" aria-hidden>
        {["w-24", "w-40", "w-36", "w-40"].map((w, i) => (
          <Skeleton key={i} className={`h-8 shrink-0 ${w}`} />
        ))}
      </div>
      <EsqueletoTarjetas cantidad={3} className="md:grid-cols-2 lg:grid-cols-3" />
    </div>
  );
}
