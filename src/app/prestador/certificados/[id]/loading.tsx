import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

function TarjetaEsqueleto({ lineas = 4, alto }: { lineas?: number; alto?: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Skeleton className="size-9 rounded-xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <div className="p-6">{alto ? <Skeleton className={alto} /> : <SkeletonText lines={lineas} />}</div>
    </div>
  );
}

/** Esqueleto del detalle de un certificado. */
export default function CargandoCertificado() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Cargando certificado…</span>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-3.5 w-56" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="hidden size-12 rounded-2xl sm:block" />
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-40 rounded-control" />
            <Skeleton className="h-10 w-48 rounded-control" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-44 rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-28 rounded-card" />
          <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <Skeleton className="size-9 rounded-xl" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
          <TarjetaEsqueleto lineas={4} />
          <div className="grid gap-6 md:grid-cols-2">
            <TarjetaEsqueleto lineas={3} />
            <TarjetaEsqueleto alto="mx-auto size-36 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <TarjetaEsqueleto alto="mx-auto size-48 rounded-2xl" />
          <TarjetaEsqueleto lineas={6} />
        </div>
      </div>
    </div>
  );
}
