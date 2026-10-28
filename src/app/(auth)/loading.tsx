import { Skeleton } from "@/components/ui/skeleton";

/** Carga de las pantallas de acceso (dentro de la tarjeta del layout). */
export default function AuthLoading() {
  return (
    <div className="flex flex-col gap-6 pt-1" role="status" aria-label="Cargando">
      <Skeleton className="size-12 rounded-2xl" />
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-10 w-full rounded-control" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-10 w-full rounded-control" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
