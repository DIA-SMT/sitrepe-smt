import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

function TarjetaEsqueleto({ lineas = 3, alto }: { lineas?: number; alto?: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="h-4 w-40" />
      </div>
      {alto ? <Skeleton className={alto} /> : <SkeletonText lines={lineas} />}
    </div>
  );
}

export default function CargandoCertificado() {
  return (
    <div role="status" aria-label="Cargando el certificado" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 pb-2">
        <Skeleton className="h-3.5 w-56" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="hidden size-12 rounded-2xl sm:block" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-44" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <div className="flex flex-col gap-5 rounded-card border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2 border-l-2 border-azul-100 pl-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-44 max-w-full" />
                </div>
              ))}
            </div>
          </div>
          <TarjetaEsqueleto alto="h-32 w-full rounded-xl" />
          <TarjetaEsqueleto lineas={3} />
        </div>
        <div className="grid content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
          <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-4 w-40 self-start" />
            <Skeleton className="size-44 rounded-2xl" />
            <Skeleton className="h-4 w-36" />
          </div>
          <TarjetaEsqueleto alto="h-24 w-full rounded-xl" />
          <TarjetaEsqueleto lineas={4} />
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
