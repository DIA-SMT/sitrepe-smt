import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function InscripcionLoading() {
  return (
    <div role="status" aria-label="Cargando la inscripción" className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <Skeleton className="hidden size-12 rounded-2xl sm:block" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-panel" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <Skeleton className="h-5 w-40" />
          </div>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex gap-4 border-b border-border px-6 py-4 last:border-b-0">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-48" />
                <SkeletonText lines={2} />
              </div>
            </div>
          ))}
        </Card>
        <div className="flex flex-col gap-6">
          <Card className="gap-4 p-6">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <SkeletonText lines={2} className="flex-1" />
              </div>
            ))}
          </Card>
          <Card className="gap-3 p-6">
            <Skeleton className="h-5 w-36" />
            <SkeletonText lines={5} />
          </Card>
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
