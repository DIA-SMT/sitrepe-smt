import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  Cargando,
  EsqueletoEncabezado,
  EsqueletoFormulario,
  EsqueletoStats,
} from "../configuracion/_compartido/esqueletos";

export default function CargandoAvisos() {
  return (
    <Cargando mensaje="Cargando los avisos…">
      <EsqueletoEncabezado acciones={0} />
      <EsqueletoStats cantidad={4} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]" aria-hidden>
        <EsqueletoFormulario campos={5} />
        <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-4 px-6 py-4">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <SkeletonText lines={2} />
                  <Skeleton className="h-5 w-32 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Cargando>
  );
}
