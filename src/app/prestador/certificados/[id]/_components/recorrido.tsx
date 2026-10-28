import { Ban, ClipboardCheck, FilePlus2, FileSignature, Receipt, Send, Stamp, TriangleAlert } from "lucide-react";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import type { CertificadoDetalle } from "@/lib/data/certificados";
import { ESTADO_PAGO } from "@/lib/domain/etiquetas";

type Paso = TimelineItem & { orden: number };

/**
 * Recorrido del certificado: carga → firma → presentación → control → pago → timbrado.
 * Los pasos que faltan se muestran como "Pendiente" para ver cuánto queda.
 */
export function Recorrido({ detalle }: { detalle: CertificadoDetalle }) {
  const { certificado: c, declaracion, pago } = detalle;
  const anulado = c.estado === "anulado";
  const hechos: Paso[] = [];
  const pendientes: TimelineItem[] = [];

  if (c.created_at) {
    hechos.push({
      orden: 1,
      date: c.created_at,
      title: "Cargado",
      description: declaracion?.codigo ? `En la declaración ${declaracion.codigo}` : "Certificado creado",
      tone: "neutral",
      icon: FilePlus2,
    });
  }

  if (c.firmado_at) {
    hechos.push({
      orden: 2,
      date: c.firmado_at,
      title: "Firmado digitalmente",
      description: c.tecnico_nombre ? `Por ${c.tecnico_nombre}` : undefined,
      tone: "violeta",
      icon: FileSignature,
    });
  } else if (!anulado) {
    pendientes.push({ date: "Pendiente", title: "Firma del asesor técnico", tone: "neutral", icon: FileSignature });
  }

  const presentado = !!declaracion?.presentada_at && c.estado !== "borrador";
  if (presentado && declaracion?.presentada_at) {
    hechos.push({
      orden: 3,
      date: declaracion.presentada_at,
      title: "Presentado en la planilla",
      description: "Ante Control de Empresas",
      tone: "azul",
      icon: Send,
    });
  } else if (!anulado) {
    pendientes.push({ date: "Pendiente", title: "Presentación de la declaración", tone: "neutral", icon: Send });
  }

  const controlado = c.estado === "controlado" || c.estado === "timbrado";
  if (c.estado === "observado" && declaracion?.controlada_at) {
    hechos.push({
      orden: 4,
      date: declaracion.controlada_at,
      title: "Observado",
      description: c.observaciones ?? "Con observaciones del área",
      tone: "ambar",
      icon: TriangleAlert,
    });
  } else if (controlado && declaracion?.controlada_at) {
    hechos.push({
      orden: 4,
      date: declaracion.controlada_at,
      title: "Controlado",
      description: "Verificado por Control de Empresas",
      tone: "celeste",
      icon: ClipboardCheck,
    });
  } else if (!anulado && !controlado) {
    pendientes.push({ date: "Pendiente", title: "Control de la Dirección", tone: "neutral", icon: ClipboardCheck });
  }

  if (pago && pago.estado !== "anulado") {
    hechos.push({
      orden: 5,
      date: pago.informado_at ?? pago.created_at,
      title: pago.informado_at ? "Pago informado" : "Timbrado liquidado",
      description: `${pago.codigo ?? "Liquidación"} · ${ESTADO_PAGO[pago.estado].label}`,
      tone: pago.estado === "rechazado" ? "rojo" : "violeta",
      icon: Receipt,
    });
  } else if (!anulado && c.estado !== "timbrado") {
    pendientes.push({ date: "Pendiente", title: "Pago del timbrado", tone: "neutral", icon: Receipt });
  }

  if (c.timbrado_at) {
    hechos.push({
      orden: 6,
      date: c.timbrado_at,
      title: "Timbrado",
      description: c.sello_codigo ? `Sello ${c.sello_codigo}` : "Sellado digital",
      tone: "verde",
      icon: Stamp,
    });
  } else if (!anulado) {
    pendientes.push({ date: "Pendiente", title: "Sellado digital (timbrado)", tone: "neutral", icon: Stamp });
  }

  if (anulado) {
    hechos.push({
      orden: 7,
      date: c.updated_at ?? c.created_at ?? "—",
      title: "Anulado",
      description: c.anulado_motivo ?? undefined,
      tone: "rojo",
      icon: Ban,
    });
  }

  const ordenados: TimelineItem[] = hechos.sort((a, b) => a.orden - b.orden);
  return <Timeline items={[...ordenados, ...pendientes]} />;
}
