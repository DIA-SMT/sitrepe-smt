import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function CargandoImpresionActa() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Preparando el acta para imprimir…</span>
      <div className="mx-auto mb-5 flex w-full max-w-[210mm] items-center justify-between gap-3 px-4 sm:px-0">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-52" />
      </div>
      <div className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col gap-6 bg-white px-[16mm] py-[14mm] shadow-[0_20px_60px_-30px_rgb(2_6_38/0.35)] ring-1 ring-black/5">
        <div className="flex items-start justify-between border-b-2 border-azul-100 pb-4">
          <Skeleton className="h-12 w-56" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-24 w-full" />
        <SkeletonText lines={6} />
        <Skeleton className="h-20 w-full" />
        <div className="mt-auto grid grid-cols-2 gap-10">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}
