import { Ban, ReceiptText, Send, Stamp, XCircle } from "lucide-react";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { CODIGOS_ARANCEL_CERTIFICADOS, type PagoVista } from "@/lib/data/pagos";
import { MEDIO_PAGO, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatPesos } from "@/lib/domain/formato";

/** Línea de tiempo de una liquidación: generación, pago informado y resolución. */
export function HistorialPago({ pago }: { pago: PagoVista }) {
  const items: TimelineItem[] = [];
  const esTimbrado = CODIGOS_ARANCEL_CERTIFICADOS.includes(pago.arancel_codigo ?? "");

  if (pago.estado === "verificado" && pago.verificado_at) {
    items.push({
      id: "verificado",
      date: pago.verificado_at,
      title: esTimbrado ? "Pago verificado y certificados timbrados" : "Pago verificado",
      description:
        pago.observaciones ??
        (esTimbrado
          ? "Acreditación conciliada por la Dirección. Se asignó un sello digital a cada certificado."
          : "Acreditación conciliada por la Dirección."),
      tone: "verde",
      icon: Stamp,
    });
  }
  if (pago.estado === "rechazado" && pago.updated_at) {
    items.push({
      id: "rechazado",
      date: pago.updated_at,
      title: "Pago rechazado",
      description: pago.observaciones ?? undefined,
      tone: "rojo",
      icon: XCircle,
    });
  }
  if (pago.estado === "anulado" && pago.updated_at) {
    items.push({
      id: "anulado",
      date: pago.updated_at,
      title: "Liquidación anulada",
      description: esTimbrado
        ? "Los certificados quedaron liberados para una nueva liquidación."
        : "La liquidación quedó sin efecto.",
      tone: "neutral",
      icon: Ban,
    });
  }
  const datosPago = pago.fecha_pago
    ? [
        etiqueta(MEDIO_PAGO, pago.medio).label,
        pago.numero_operacion ? `operación N.º ${pago.numero_operacion}` : null,
        `pagado el ${formatFecha(pago.fecha_pago)}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  // Liquidación de timbrado cuyo pago no informó la empresa sino que registró la Dirección.
  const fechaRegistro = esTimbrado && !pago.informado_at && datosPago ? (pago.verificado_at ?? pago.updated_at) : null;

  if (pago.informado_at) {
    items.push({
      id: "informado",
      date: pago.informado_at,
      title: "Pago informado",
      description: datosPago ?? etiqueta(MEDIO_PAGO, pago.medio).label,
      tone: "celeste",
      icon: Send,
    });
  } else if (fechaRegistro) {
    items.push({
      id: "registrado",
      date: fechaRegistro,
      title: "Pago registrado por la Dirección",
      description: datosPago ?? undefined,
      tone: "celeste",
      icon: Send,
    });
  }
  if (pago.created_at) {
    const importe = `${pago.cantidad ?? 0} × ${formatPesos(pago.importe_unitario)} = ${formatPesos(pago.importe_total)}`;
    items.push({
      id: "generada",
      date: pago.created_at,
      title: esTimbrado ? "Liquidación generada" : "Pago registrado por la Dirección",
      description: !esTimbrado && datosPago ? `${importe} · ${datosPago}` : importe,
      tone: "azul",
      icon: ReceiptText,
    });
  }

  if (items.length === 0) return <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>;
  return <Timeline items={items} />;
}
