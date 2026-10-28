import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoStats } from "./_compartido/esqueletos";

export default function CargandoConfiguracion() {
  return (
    <Cargando mensaje="Cargando la configuración…">
      <EsqueletoEncabezado acciones={0} />
      <EsqueletoStats cantidad={4} />
      <div className="flex gap-5 border-b border-border pb-3" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-28" />
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-card border border-border bg-card shadow-card" aria-hidden>
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <Skeleton className="size-9 rounded-xl" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }, (_, j) => (
              <div key={j} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-64 max-w-[70vw]" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-7 w-28" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Cargando>
  );
}
