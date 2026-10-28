import Link from "next/link";
import {
  ArrowRight,
  Ban,
  CalendarClock,
  ClipboardCheck,
  FileSignature,
  Hourglass,
  Send,
  ShieldAlert,
  ShieldCheck,
  Stamp,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CertificadoDetalle } from "@/lib/data/certificados";
import { ESTADO_PAGO } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha, formatFechaHora, formatFechaLarga, hoyISO } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

type Tono = "verde" | "ambar" | "rojo" | "azul" | "celeste" | "violeta" | "neutral";

const TONOS: Record<Tono, { caja: string; icono: string; titulo: string }> = {
  verde: { caja: "border-emerald-200 bg-emerald-50/70", icono: "bg-emerald-600 text-white", titulo: "text-emerald-900" },
  ambar: { caja: "border-amber-200 bg-sol-50", icono: "bg-sol-400 text-noche-950", titulo: "text-amber-900" },
  rojo: { caja: "border-red-200 bg-red-50/80", icono: "bg-red-600 text-white", titulo: "text-red-900" },
  azul: { caja: "border-azul-200 bg-azul-50", icono: "bg-gradient-brand text-white", titulo: "text-azul-900" },
  celeste: { caja: "border-celeste-200 bg-celeste-50", icono: "bg-celeste-600 text-white", titulo: "text-celeste-900" },
  violeta: { caja: "border-violet-200 bg-violet-50", icono: "bg-violet-600 text-white", titulo: "text-violet-900" },
  neutral: { caja: "border-border bg-subtle", icono: "bg-noche-700 text-white", titulo: "text-foreground" },
};

type Accion = { label: string; href: string; icon?: LucideIcon; variante?: "primary" | "outline" | "sol" };

function Panel({
  tono,
  icon: Icon,
  titulo,
  children,
  acciones = [],
}: {
  tono: Tono;
  icon: LucideIcon;
  titulo: string;
  children?: React.ReactNode;
  acciones?: Accion[];
}) {
  const t = TONOS[tono];
  return (
    <section
      aria-label="Estado del certificado"
      className={cn("flex flex-col gap-4 rounded-card border p-5 sm:flex-row sm:items-center sm:p-6", t.caja)}
    >
      <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-card", t.icono)}>
        <Icon className="size-6" strokeWidth={1.9} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className={cn("font-display text-lg leading-snug font-semibold", t.titulo)}>{titulo}</h2>
        {children ? <div className="text-sm leading-relaxed text-foreground/85">{children}</div> : null}
      </div>
      {acciones.length > 0 ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {acciones.map((a) => {
            const AIcon = a.icon ?? ArrowRight;
            return (
              <Button key={a.href} asChild variant={a.variante ?? "primary"} size="sm">
                <Link href={a.href}>
                  <AIcon aria-hidden /> {a.label}
                </Link>
              </Button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

/** Vigencia de un certificado timbrado: fecha de vencimiento, días y barra de vida útil. */
function PanelVigencia({ detalle }: { detalle: CertificadoDetalle }) {
  const c = detalle.certificado;
  const dias = diasHasta(c.fecha_vencimiento);
  // Día del servicio en hora de Tucumán (fecha_servicio es timestamptz: cortar el ISO daría el día UTC).
  const diaServicio = c.fecha_servicio ? hoyISO(new Date(c.fecha_servicio)) : null;
  const total = diaServicio && c.fecha_vencimiento ? diasHasta(c.fecha_vencimiento, diaServicio) : null;
  const restante = dias !== null && total ? Math.max(0, Math.min(100, (dias / Math.max(1, total)) * 100)) : 0;
  const vigencia = c.vigencia;
  const tono: Tono = vigencia === "vencido" ? "rojo" : vigencia === "por_vencer" ? "ambar" : "verde";
  const t = TONOS[tono];
  const titulo =
    vigencia === "vencido"
      ? "Certificado vencido"
      : vigencia === "por_vencer"
        ? "Certificado válido, por vencer"
        : "Certificado válido y vigente";

  return (
    <section aria-label="Vigencia del certificado" className={cn("overflow-hidden rounded-card border", t.caja)}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-card", t.icono)}>
          {vigencia === "vencido" ? <ShieldAlert className="size-6" /> : <ShieldCheck className="size-6" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className={cn("font-display text-lg leading-snug font-semibold", t.titulo)}>{titulo}</h2>
          <p className="text-sm text-foreground/85">
            Timbrado el {formatFechaHora(c.timbrado_at)} con el sello{" "}
            <span className="font-mono font-semibold text-foreground">{c.sello_codigo}</span>.
            {vigencia === "vencido"
              ? " El establecimiento necesita un nuevo servicio."
              : vigencia === "por_vencer"
                ? " Es un buen momento para coordinar el próximo servicio con el cliente."
                : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start rounded-xl bg-white/80 px-4 py-2.5 ring-1 ring-black/5 sm:items-end">
          <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <CalendarClock className="size-3.5" aria-hidden /> Vence
          </span>
          <span className="nums-tabular font-display text-2xl leading-tight font-bold text-foreground">
            {c.fecha_vencimiento ? formatFecha(c.fecha_vencimiento) : "Única vez"}
          </span>
          {dias !== null ? (
            <span className={cn("text-xs font-semibold", t.titulo)}>
              {dias < 0
                ? `Venció hace ${Math.abs(dias)} ${dias === -1 ? "día" : "días"}`
                : dias === 0
                  ? "Vence hoy"
                  : dias === 1
                    ? "Falta 1 día"
                    : `Faltan ${dias} días`}
            </span>
          ) : null}
        </div>
      </div>
      {c.fecha_vencimiento && total ? (
        <div className="border-t border-black/5 bg-white/50 px-5 py-3 sm:px-6">
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>Servicio: {formatFecha(c.fecha_servicio)}</span>
            <span>Vencimiento: {formatFechaLarga(c.fecha_vencimiento)}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Vigencia restante del certificado"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(restante)}
            className="h-2 overflow-hidden rounded-full bg-black/5"
          >
            <div
              className={cn(
                "h-full rounded-full",
                tono === "verde" && "bg-linear-to-r from-emerald-500 to-celeste-400",
                tono === "ambar" && "bg-amber-500",
                tono === "rojo" && "bg-red-500",
              )}
              style={{ width: `${restante}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Estado actual del certificado y el próximo paso del circuito. */
export function PanelEstado({ detalle, puedeFirmar }: { detalle: CertificadoDetalle; puedeFirmar: boolean }) {
  const { certificado: c, declaracion, pago } = detalle;
  const declaracionHref = c.declaracion_id ? `/prestador/declaraciones/${c.declaracion_id}` : "/prestador/declaraciones";

  switch (c.estado) {
    case "timbrado":
      return <PanelVigencia detalle={detalle} />;
    case "anulado":
      return (
        <Panel tono="rojo" icon={Ban} titulo="Certificado anulado">
          {c.anulado_motivo ? (
            <>
              Motivo: <strong className="font-semibold">{c.anulado_motivo}</strong>
            </>
          ) : (
            "Este certificado fue anulado y no tiene validez."
          )}
        </Panel>
      );
    case "observado":
      return (
        <Panel
          tono="ambar"
          icon={TriangleAlert}
          titulo="Observado por Control de Empresas"
          acciones={[
            { label: "Corregir en la declaración", href: declaracionHref, variante: "primary" },
            ...(puedeFirmar && !c.firma_hash
              ? [{ label: "Firmar", href: "/prestador/firmas", icon: FileSignature, variante: "outline" as const }]
              : []),
          ]}
        >
          {c.observaciones ? (
            <span className="block rounded-lg bg-white/80 px-3 py-2 ring-1 ring-amber-200">{c.observaciones}</span>
          ) : (
            "Revisá los datos observados, corregilos y volvé a presentar la declaración."
          )}
          <span className="mt-1.5 block text-[13px]">
            {c.firma_hash
              ? "Si corregís datos del servicio, la firma se invalida y el asesor técnico tiene que volver a firmarlo."
              : `Falta la firma: ${c.tecnico_nombre ?? "el asesor técnico"} tiene que volver a firmarlo antes de presentar.`}
          </span>
        </Panel>
      );
    case "declarado":
      return (
        <Panel tono="azul" icon={ClipboardCheck} titulo="En control de la Dirección" acciones={[{ label: "Ver declaración", href: declaracionHref, variante: "outline" }]}>
          La planilla{declaracion?.codigo ? ` ${declaracion.codigo}` : ""} fue presentada
          {declaracion?.presentada_at ? ` el ${formatFechaHora(declaracion.presentada_at)}` : ""}. Control de Empresas verifica
          que coincida con lo declarado; después vas a poder pagar el timbrado.
        </Panel>
      );
    case "controlado": {
      const pagoActivo = pago && pago.estado !== "anulado";
      if (pagoActivo) {
        const rechazado = pago.estado === "rechazado";
        return (
          <Panel
            tono={rechazado ? "rojo" : "violeta"}
            icon={rechazado ? TriangleAlert : Hourglass}
            titulo={
              rechazado
                ? "El pago del timbrado fue rechazado"
                : pago.estado === "informado"
                  ? "Pago informado: en verificación"
                  : "Timbrado liquidado, pendiente de pago"
            }
            acciones={[{ label: "Ir al pago", href: `/prestador/pagos/${pago.id}`, icon: Stamp }]}
          >
            Liquidación <span className="font-mono font-semibold">{pago.codigo ?? "—"}</span> ·{" "}
            {ESTADO_PAGO[pago.estado].label}.{" "}
            {pago.estado === "informado"
              ? "Cuando la Dirección acredite la transferencia, el certificado queda timbrado automáticamente."
              : rechazado
                ? "Revisá el motivo e informá nuevamente el pago."
                : "Pagá por transferencia e informá el comprobante."}
          </Panel>
        );
      }
      return (
        <Panel
          tono="celeste"
          icon={Stamp}
          titulo="Listo para pagar el timbrado"
          acciones={[{ label: "Pagar timbrado", href: "/prestador/pagos", icon: Stamp, variante: "sol" }]}
        >
          Control de Empresas lo verificó. Generá la liquidación del timbrado e informá el pago: al acreditarse, la Dirección lo
          sella digitalmente y queda válido.
        </Panel>
      );
    }
    case "borrador":
    default: {
      if (!c.firma_hash) {
        return (
          <Panel
            tono="violeta"
            icon={FileSignature}
            titulo="Falta la firma del asesor técnico"
            acciones={
              puedeFirmar
                ? [{ label: "Firmar ahora", href: "/prestador/firmas", icon: FileSignature }]
                : [{ label: "Ver declaración", href: declaracionHref, variante: "outline" }]
            }
          >
            {puedeFirmar
              ? "Revisá los datos y firmalo digitalmente para poder presentar la declaración."
              : `${c.tecnico_nombre ?? "El asesor técnico"} tiene que firmarlo digitalmente desde su cuenta antes de presentar la declaración.`}
          </Panel>
        );
      }
      return (
        <Panel
          tono="neutral"
          icon={Send}
          titulo="Firmado: falta presentar la declaración"
          acciones={[{ label: "Presentar declaración", href: declaracionHref, icon: Send }]}
        >
          {c.tipo === "tanque"
            ? "Presentá la declaración con los análisis bacteriológico y físico-químico del agua adjuntos para que Control de Empresas la verifique."
            : "Presentá la planilla entre 24 y 48 horas antes del servicio para que Control de Empresas la verifique (Art. 9.º a)."}
        </Panel>
      );
    }
  }
}
