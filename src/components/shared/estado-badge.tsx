import { StatusBadge } from "@/components/shared/status-badge";
import { type Etiqueta, etiqueta } from "@/lib/domain/etiquetas";

type EstadoBadgeProps = {
  /** Mapa de etiquetas de lib/domain/etiquetas (p. ej. ESTADO_CERTIFICADO). */
  mapa: Record<string, Etiqueta>;
  valor: string | null | undefined;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
};

/** Badge de estado a partir de los mapas de etiquetas del dominio. */
export function EstadoBadge({ mapa, valor, size, pulse, className }: EstadoBadgeProps) {
  const e = etiqueta(mapa, valor);
  return <StatusBadge label={e.label} tone={e.tono} size={size} pulse={pulse} className={className} />;
}
