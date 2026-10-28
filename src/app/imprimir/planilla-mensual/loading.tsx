import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Esqueleto de la planilla mensual imprimible. */
export default function CargandoPlanillaImpresa() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-5">
      <span className="sr-only">Preparando la planilla mensual…</span>
      <div aria-hidden className="mx-auto flex w-full max-w-[210mm] justify-between px-4 sm:px-0">
        <Skeleton className="h-8 w-44 rounded-control" />
        <Skeleton className="h-10 w-48 rounded-control" />
      </div>
      <div
        aria-hidden
        className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col gap-6 bg-white px-[16mm] py-[14mm] shadow-card"
      >
        <div className="flex items-start justify-between border-b-2 border-azul-100 pb-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-16 w-36" />
        </div>
        <Skeleton className="h-6 w-72 max-w-full" />
        <SkeletonText lines={3} />
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
