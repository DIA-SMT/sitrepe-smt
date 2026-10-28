import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoStats } from "../configuracion/_compartido/esqueletos";

export default function CargandoAuditoria() {
  return (
    <Cargando mensaje="Cargando el registro de auditoría…">
      <EsqueletoEncabezado acciones={0} />
      <EsqueletoStats cantidad={4} />
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card" aria-hidden>
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex flex-col flex-wrap gap-2 border-b border-border px-5 py-4 sm:flex-row sm:px-6">
          {["sm:w-56", "sm:w-48", "sm:w-72", "sm:w-44", "sm:w-44", "sm:w-64"].map((ancho, i) => (
            <Skeleton key={i} className={`h-10 w-full rounded-control ${ancho}`} />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="hidden h-3 w-20 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </Cargando>
  );
}
