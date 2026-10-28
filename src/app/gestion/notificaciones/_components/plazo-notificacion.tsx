import { AlarmClock, CircleCheckBig, FilePenLine, Hourglass, Send } from "lucide-react";
import type { Notificacion } from "@/lib/data/intimaciones";
import { formatFecha, formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

const DIA_MS = 86_400_000;

/** Situación del plazo de una notificación, compacta (tablas y tarjetas). */
export function PlazoNotificacion({ n, ahora, className }: { n: Notificacion; ahora: number; className?: string }) {
  const base = cn("flex items-start gap-1.5 text-[13px] leading-snug", className);
  const ahoraFecha = new Date(ahora);

  switch (n.estado_efectivo) {
    case "emitida":
      return (
        <span className={cn(base, "text-muted-foreground")}>
          <Send className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>Sin notificar</span>
        </span>
      );
    case "notificada": {
      const restante = n.vence_at ? new Date(n.vence_at).getTime() - ahora : null;
      const urgente = restante !== null && restante < DIA_MS;
      return (
        <span className={cn(base, urgente ? "text-warning" : "text-foreground")}>
          <Hourglass className={cn("mt-0.5 size-3.5 shrink-0", urgente ? "text-warning" : "text-azul-600")} aria-hidden />
          <span className="flex flex-col">
            <span className="nums-tabular font-medium" title={formatFechaHora(n.vence_at)}>
              {formatFecha(n.vence_at)}
            </span>
            <span className={cn("text-xs", urgente ? "font-semibold" : "text-muted-foreground")}>
              vence {formatRelativo(n.vence_at, ahoraFecha)}
            </span>
          </span>
        </span>
      );
    }
    case "vencida":
      return (
        <span className={cn(base, "text-danger")}>
          <AlarmClock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="flex flex-col">
            <span className="nums-tabular font-semibold">{formatFecha(n.vence_at)}</span>
            <span className="text-xs">venció {formatRelativo(n.vence_at, ahoraFecha)}</span>
          </span>
        </span>
      );
    case "cumplida":
      return (
        <span className={cn(base, "text-success")}>
          <CircleCheckBig className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="nums-tabular">Cumplida {formatFecha(n.cumplida_at)}</span>
        </span>
      );
    case "acta_labrada":
      return (
        <span className={cn(base, "text-violet-700")}>
          <FilePenLine className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>Con acta</span>
        </span>
      );
    default:
      return <span className={cn(base, "text-muted-foreground")}>—</span>;
  }
}
