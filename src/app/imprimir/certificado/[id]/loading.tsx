import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Esqueleto de la vista de impresión del certificado (una hoja A4). */
export default function CargandoImpresionCertificado() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="no-print">
      <span className="sr-only">Preparando el certificado para imprimir…</span>
      <div className="mx-auto mb-5 flex w-full max-w-[210mm] items-center justify-between gap-3 px-4 sm:px-0">
        <Skeleton className="h-8 w-44 rounded-control" />
        <div className="flex gap-2">
          <Skeleton className="hidden h-9 w-72 rounded-control sm:block" />
          <Skeleton className="h-10 w-48 rounded-control" />
        </div>
      </div>
      <div className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col gap-6 bg-white px-5 py-6 shadow-[0_20px_60px_-30px_rgb(2_6_38/0.35)] ring-1 ring-black/5 sm:px-[16mm] sm:py-[14mm]">
        <div className="flex items-start justify-between gap-6 border-b-2 border-azul-100 pb-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-36" />
            <SkeletonText lines={3} className="w-40" />
          </div>
          <Skeleton className="size-[84px] rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-80 max-w-full" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-full rounded-md" />
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <SkeletonText lines={3} />
          <Skeleton className="h-24 w-44 rounded-lg" />
        </div>
        <SkeletonText lines={5} />
        <SkeletonText lines={4} />
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="flex items-end justify-between gap-6">
          <SkeletonText lines={3} className="w-1/2" />
          <Skeleton className="size-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}
