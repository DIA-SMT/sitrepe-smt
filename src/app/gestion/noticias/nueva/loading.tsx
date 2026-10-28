import { Skeleton } from "@/components/ui/skeleton";
import { Cargando, EsqueletoEncabezado, EsqueletoFormulario } from "../../configuracion/_compartido/esqueletos";

export default function CargandoEditorNoticia() {
  return (
    <Cargando mensaje="Preparando el editor…">
      <EsqueletoEncabezado acciones={0} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-hidden>
        <EsqueletoFormulario campos={6} />
        <div className="hidden flex-col overflow-hidden rounded-card border border-border bg-card shadow-card lg:flex">
          <Skeleton className="aspect-[21/9] w-full rounded-none" />
          <div className="flex flex-col gap-3 p-6">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </Cargando>
  );
}
