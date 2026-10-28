import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Esqueleto de la nota de rendición mensual. */
export default function CargandoInformeRecaudacion() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-5">
      <span className="sr-only">Preparando la nota de rendición…</span>
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
        <Skeleton className="h-6 w-80 max-w-full" />
        <Skeleton className="ml-auto h-4 w-56" />
        <SkeletonText lines={4} className="max-w-sm" />
        <SkeletonText lines={3} />
        <Skeleton className="h-20 w-full" />
        <SkeletonText lines={2} />
        <Skeleton className="h-40 w-full" />
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}
