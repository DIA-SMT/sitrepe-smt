import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function PerfilLoading() {
  return (
    <div role="status" aria-label="Cargando tu perfil" className="flex flex-col gap-6">
      <div className="flex items-start gap-4 pb-2">
        <Skeleton className="hidden size-12 rounded-2xl sm:block" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
      <Card className="flex-row items-center gap-4 p-6">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card className="gap-5 p-6">
            <Skeleton className="h-5 w-40" />
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-10 w-full rounded-control" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-40 rounded-control" />
          </Card>
          <Card className="gap-4 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full rounded-control" />
            <Skeleton className="h-10 w-full rounded-control" />
          </Card>
        </div>
        <Card className="gap-4 p-6">
          <Skeleton className="h-5 w-32" />
          <SkeletonText lines={5} />
        </Card>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
