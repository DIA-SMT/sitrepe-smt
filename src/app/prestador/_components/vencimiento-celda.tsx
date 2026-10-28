import { EstadoBadge } from "@/components/shared/estado-badge";
import { VIGENCIA } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

/** "vence hoy", "en 3 días", "hace 5 días". */
export function textoDias(fecha: string | null | undefined): string | null {
  const dias = diasHasta(fecha);
  if (dias === null) return null;
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  if (dias > 1) return `en ${dias} días`;
  if (dias === -1) return "venció ayer";
  return `venció hace ${Math.abs(dias)} días`;
}

/** Fecha de vencimiento + badge de vigencia (y días restantes si corresponde). */
export function VencimientoCelda({
  fecha,
  vigencia,
  className,
}: {
  fecha: string | null | undefined;
  vigencia: string | null | undefined;
  className?: string;
}) {
  const relevante = vigencia === "vigente" || vigencia === "por_vencer" || vigencia === "vencido";
  const dias = relevante && vigencia !== "vigente" ? textoDias(fecha) : null;
  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <span className="nums-tabular font-medium whitespace-nowrap text-foreground">
        {fecha ? formatFecha(fecha) : <span className="text-muted-foreground">Única vez</span>}
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <EstadoBadge mapa={VIGENCIA} valor={vigencia} size="sm" pulse={vigencia === "por_vencer"} />
        {dias ? <span className="text-[11px] whitespace-nowrap text-muted-foreground">{dias}</span> : null}
      </span>
    </div>
  );
}
