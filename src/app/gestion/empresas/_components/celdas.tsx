import { CalendarX2, Droplets, SprayCan, TriangleAlert } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { formatFecha } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

/** Insignias F / T de actividades habilitadas. */
export function Actividades({
  fumigacion,
  tanques,
  className,
}: {
  fumigacion: boolean | null;
  tanques: boolean | null;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {fumigacion ? (
        <span
          title="Fumigación y desinfección"
          className="inline-flex h-6 items-center gap-1 rounded-md bg-azul-50 px-1.5 text-xs font-semibold text-azul-700 ring-1 ring-azul-100 ring-inset"
        >
          <SprayCan className="size-3.5" aria-hidden />F<span className="sr-only">umigación y desinfección</span>
        </span>
      ) : null}
      {tanques ? (
        <span
          title="Limpieza de tanques"
          className="inline-flex h-6 items-center gap-1 rounded-md bg-celeste-50 px-1.5 text-xs font-semibold text-celeste-800 ring-1 ring-celeste-200 ring-inset"
        >
          <Droplets className="size-3.5" aria-hidden />T<span className="sr-only">: limpieza de tanques</span>
        </span>
      ) : null}
      {!fumigacion && !tanques ? <span className="text-xs text-muted-foreground">Sin actividades</span> : null}
    </span>
  );
}

/** Fecha de vencimiento de la habilitación con los días que faltan (o que pasaron). */
export function Vencimiento({ fecha, dias, compacto = false }: { fecha: string | null; dias: number | null; compacto?: boolean }) {
  if (!fecha || dias === null) return <span className="text-muted-foreground">Sin fecha</span>;
  const vencida = dias < 0;
  const proxima = !vencida && dias <= 30;
  const texto = vencida
    ? `Venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`
    : dias === 0
      ? "Vence hoy"
      : `En ${dias} día${dias === 1 ? "" : "s"}`;
  return (
    <span className={cn("flex flex-col leading-tight", compacto && "flex-row items-center gap-1.5")}>
      <span className="font-medium text-foreground nums-tabular">{formatFecha(fecha)}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs",
          vencida ? "font-semibold text-danger" : proxima ? "font-semibold text-warning" : "text-muted-foreground",
        )}
      >
        {vencida ? <CalendarX2 className="size-3" aria-hidden /> : null}
        {texto}
      </span>
    </span>
  );
}

/** Ícono de advertencia con las observaciones de la empresa (inconsistencias de datos). */
export function IconoObservaciones({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <SimpleTooltip content={texto}>
      <span
        tabIndex={0}
        role="img"
        aria-label={`Observaciones: ${texto}`}
        className="inline-flex size-6 shrink-0 cursor-help items-center justify-center rounded-full bg-sol-100 text-sol-800 ring-1 ring-sol-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <TriangleAlert className="size-3.5" aria-hidden />
      </span>
    </SimpleTooltip>
  );
}
