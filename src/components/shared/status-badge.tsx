import { Badge, type BadgeTone } from "@/components/ui/badge";

export type StatusBadgeProps = {
  label: string;
  tone: BadgeTone;
  /** Punto de color (por defecto sí: el estado nunca depende solo del color de fondo). */
  dot?: boolean;
  /** Punto animado para estados "en curso". */
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Badge de estado genérico. Cada módulo mapea sus estados a `{ label, tone }`, p. ej.:
 * `{ vigente: { label: "Vigente", tone: "verde" }, vencido: { label: "Vencido", tone: "rojo" } }`.
 */
export function StatusBadge({ label, tone, dot = true, pulse = false, size, className }: StatusBadgeProps) {
  return (
    <Badge tone={tone} dot={dot} pulse={pulse} size={size} className={className}>
      {label}
    </Badge>
  );
}
