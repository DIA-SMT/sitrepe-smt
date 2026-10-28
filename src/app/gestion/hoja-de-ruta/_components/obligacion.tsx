import { Droplets, SprayCan } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { ESTADO_OBLIGACION } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

/** "venció hace 12 días", "vence hoy", "vence en 5 días". */
export function textoVencimiento(fecha: string | null | undefined): string | null {
  const dias = diasHasta(fecha);
  if (dias === null) return null;
  if (dias < 0) return `venció hace ${-dias} ${-dias === 1 ? "día" : "días"}`;
  if (dias === 0) return "vence hoy";
  return `vence en ${dias} ${dias === 1 ? "día" : "días"}`;
}

type ObligacionProps = {
  tipo: "fumigacion" | "tanque";
  estado: string | null;
  vencimiento?: string | null;
  empresa?: string | null;
  /** Variante compacta para listas. */
  compacta?: boolean;
  className?: string;
};

/** Estado de una obligación (fumigación o tanques) con su vencimiento y la última empresa. */
export function Obligacion({ tipo, estado, vencimiento, empresa, compacta = false, className }: ObligacionProps) {
  const Icono = tipo === "fumigacion" ? SprayCan : Droplets;
  const titulo = tipo === "fumigacion" ? "Fumigación" : "Tanques";
  const venc = textoVencimiento(vencimiento);
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        <Icono className="size-3.5" aria-hidden />
        {titulo}
      </p>
      <EstadoBadge mapa={ESTADO_OBLIGACION} valor={estado ?? "sin_certificado"} size="sm" />
      {estado !== "no_aplica" && vencimiento ? (
        <p className={cn("text-xs leading-snug text-muted-foreground", compacta && "truncate")}>
          <span className="nums-tabular">{formatFecha(vencimiento)}</span>
          {venc ? <span className={cn(estado === "vencido" && "font-medium text-danger")}> · {venc}</span> : null}
        </p>
      ) : null}
      {estado !== "no_aplica" && empresa ? (
        <p className={cn("text-xs leading-snug text-muted-foreground", compacta && "truncate")} title={empresa}>
          {empresa}
        </p>
      ) : null}
    </div>
  );
}

/** Franja de color según la prioridad de la hoja de ruta. */
export function colorPrioridad(prioridad: number | null | undefined): string {
  if (prioridad === 1) return "bg-red-500";
  if (prioridad === 2) return "bg-violet-500";
  return "bg-amber-400";
}

export const ETIQUETA_PRIORIDAD: Record<number, string> = {
  1: "Prioridad alta: certificado vencido",
  2: "Prioridad media: sin certificado presentado",
  3: "Prioridad baja: por vencer",
};
