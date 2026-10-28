import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Esqueleto de la hoja de liquidación. */
export default function CargandoLiquidacionImpresa() {
  return (
    <div role="status" aria-live="polite" aria-label="Preparando la liquidación" className="flex flex-col gap-5">
      <div className="mx-auto flex w-full max-w-[210mm] justify-between px-4 sm:px-0">
        <Skeleton className="h-8 w-44 rounded-control" />
        <Skeleton className="h-10 w-48 rounded-control" />
      </div>
      <div className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col gap-6 bg-white px-[16mm] py-[14mm] shadow-card">
        <div className="flex items-start justify-between border-b-2 border-azul-100 pb-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-16 w-36" />
        </div>
        <Skeleton className="h-6 w-56" />
        <SkeletonText lines={3} />
        <Skeleton className="h-24 w-full" />
        <SkeletonText lines={4} />
        <Skeleton className="h-40 w-full" />
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
