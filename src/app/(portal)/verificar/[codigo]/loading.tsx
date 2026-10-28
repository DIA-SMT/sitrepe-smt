import { Skeleton } from "@/components/ui/skeleton";
import { Cargando } from "../../_components/esqueletos";

export default function CargandoVerificacion() {
  return (
    <Cargando etiqueta="Verificando el certificado…">
      <div className="mx-auto max-w-[90rem] px-2 pt-2 sm:px-4 sm:pt-3">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-noche sm:rounded-[2.25rem]">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 pt-8 pb-12 sm:pt-12 sm:pb-16">
            <span className="h-3 w-44 animate-pulse rounded-full bg-white/15" />
            <span className="relative flex size-24 items-center justify-center rounded-full bg-white/10 ring-8 ring-white/5 sm:size-28">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/10" />
            </span>
            <span className="h-3 w-40 animate-pulse rounded-full bg-white/15" />
            <span className="h-12 w-72 max-w-full animate-pulse rounded-xl bg-white/20 sm:h-14 sm:w-96" />
            <span className="h-4 w-80 max-w-full animate-pulse rounded-full bg-white/10" />
            <span className="mt-3 h-20 w-full max-w-md animate-pulse rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-card" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-card" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-44 rounded-card" />
            <Skeleton className="h-32 rounded-card" />
          </div>
        </div>
      </div>
    </Cargando>
  );
}
