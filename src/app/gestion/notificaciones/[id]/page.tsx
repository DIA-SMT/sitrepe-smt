import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlarmClock,
  ArrowUpRight,
  Ban,
  BellRing,
  Building2,
  CircleCheckBig,
  FilePenLine,
  FileText,
  HandHelping,
  History,
  MapPin,
  Printer,
  Scale,
  Send,
  Store,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { instanteActual, obtenerNotificacion } from "@/lib/data/intimaciones";
import { ESTADO_ACTA, ESTADO_NOTIFICACION, MOTIVO_ACTA, PLAZO_NOTIFICACION, TIPO_NOTIFICACION } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { AccionesNotificacion } from "../_components/acciones-notificacion";
import { CuentaRegresiva } from "../_components/cuenta-regresiva";
import { SituacionEstablecimiento } from "../_components/situacion-establecimiento";
import { LUGAR_PRESENTACION, PLAZO_EN_LETRAS, textoIntimacion } from "../_components/textos";

type NotificacionPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: NotificacionPageProps): Promise<Metadata> {
  const { id } = await params;
  const datos = await obtenerNotificacion(id).catch(() => null);
  return { title: datos?.notificacion.numero ? `Notificación N.º ${datos.notificacion.numero}` : "Notificación" };
}

export default async function NotificacionPage({ params }: NotificacionPageProps) {
  await requerirStaff();
  const { id } = await params;
  const datos = await obtenerNotificacion(id);
  if (!datos) notFound();

  const { notificacion: n, actas, establecimiento, empresa } = datos;
  const ahora = instanteActual();
  const estado = n.estado_efectivo ?? n.estado ?? "emitida";
  const numero = n.numero ?? "s/n";
  const texto = n.tipo && n.plazo ? textoIntimacion(n.tipo, n.plazo) : null;

  const linea: (TimelineItem & { orden: number })[] = [];
  if (n.created_at) {
    linea.push({
      id: "emitida",
      orden: new Date(n.created_at).getTime(),
      date: n.created_at,
      title: "Notificación emitida",
      description: n.inspector_nombre ? `A cargo de ${n.inspector_nombre}.` : undefined,
      tone: "neutral",
      icon: Send,
    });
  }
  if (n.notificada_at) {
    linea.push({
      id: "notificada",
      orden: new Date(n.notificada_at).getTime(),
      date: n.notificada_at,
      title: "Entregada en mano",
      description: [n.persona_notificada, n.dni_notificado ? `DNI ${n.dni_notificado}` : null].filter(Boolean).join(" · "),
      tone: "azul",
      icon: HandHelping,
    });
  }
  if (n.vence_at && (estado === "notificada" || estado === "vencida" || estado === "acta_labrada")) {
    linea.push({
      id: "vence",
      orden: new Date(n.vence_at).getTime(),
      date: n.vence_at,
      title: estado === "notificada" ? "Vence el plazo" : "Venció el plazo",
      description: estado === "notificada" ? `Vence ${formatRelativo(n.vence_at, new Date(ahora))}.` : undefined,
      tone: estado === "notificada" ? "ambar" : "rojo",
      icon: AlarmClock,
    });
  }
  if (n.cumplida_at) {
    linea.push({
      id: "cumplida",
      orden: new Date(n.cumplida_at).getTime(),
      date: n.cumplida_at,
      title: "Documentación presentada",
      description:
        n.vence_at && new Date(n.cumplida_at).getTime() > new Date(n.vence_at).getTime() ? "Fuera de término." : "En término.",
      tone: "verde",
      icon: CircleCheckBig,
    });
  }
  for (const a of actas) {
    if (!a.fecha) continue;
    linea.push({
      id: `acta-${a.id}`,
      orden: new Date(a.fecha).getTime(),
      date: a.fecha,
      title: `Acta N.º ${a.numero ?? ""} labrada`,
      description: a.motivo ? MOTIVO_ACTA[a.motivo].label : undefined,
      tone: "violeta",
      icon: FilePenLine,
    });
  }
  if (estado === "anulada" && n.updated_at) {
    linea.push({
      id: "anulada",
      orden: new Date(n.updated_at).getTime(),
      date: n.updated_at,
      title: "Notificación anulada",
      tone: "neutral",
      icon: Ban,
    });
  }
  linea.sort((a, b) => b.orden - a.orden);

  return (
    <>
      <PageHeader
        title={`Notificación N.º ${numero}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span className="font-medium text-foreground">{n.razon_social}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {n.domicilio}
            </span>
          </span>
        }
        icon={BellRing}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Notificaciones", href: "/gestion/notificaciones" },
          { label: `N.º ${numero}` },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href={`/imprimir/notificacion/${id}`}>
              <Printer aria-hidden /> Imprimir
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_NOTIFICACION} valor={estado} size="lg" pulse={estado === "vencida"} />
          <EstadoBadge mapa={TIPO_NOTIFICACION} valor={n.tipo} size="lg" />
          {n.plazo ? (
            <Badge tone="neutral" size="lg">
              Plazo: {PLAZO_NOTIFICACION[n.plazo].label}
            </Badge>
          ) : null}
        </div>
      </PageHeader>

      {/* Estado del plazo */}
      <EstadoPlazo
        estado={estado}
        n={{ notificada_at: n.notificada_at, vence_at: n.vence_at, cumplida_at: n.cumplida_at }}
        ahora={ahora}
        actas={actas.map((a) => ({ id: a.id, numero: a.numero }))}
      >
        <AccionesNotificacion
          id={id}
          numero={numero}
          estado={estado}
          establecimientoId={n.establecimiento_id}
          empresaId={n.empresa_id}
        />
      </EstadoPlazo>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <SectionCard title="Destinatario" icon={n.empresa_id && !n.establecimiento_id ? Building2 : Store}>
            <KeyValue
              items={[
                { label: "Razón social", value: n.razon_social, full: true },
                { label: "Rubro", value: n.rubro },
                { label: "CUIT", value: n.cuit ? <span className="nums-tabular">{n.cuit}</span> : null },
                { label: "Domicilio", value: n.domicilio, full: true },
                { label: "O.T.", value: n.orden_trabajo },
                { label: "Inspector/a", value: n.inspector_nombre },
                ...(empresa
                  ? [
                      {
                        label: "Empresa prestadora",
                        value: (
                          <Link href={`/gestion/empresas/${empresa.id}`} className="text-azul-700 hover:underline">
                            {empresa.nombre_comercial}
                          </Link>
                        ),
                        full: true,
                      },
                    ]
                  : []),
              ]}
            />
          </SectionCard>

          <SectionCard
            title="Texto de la intimación"
            description="Así figura en la notificación impresa (original y duplicado)."
            icon={FileText}
          >
            {texto ? (
              <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-foreground">
                <p>{texto.intimacion}</p>
                <ol className="list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-azul-600">
                  {texto.documentos.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ol>
                {n.plazo ? (
                  <p className="w-fit rounded-lg bg-gradient-brand-soft px-3 py-2 text-sm font-semibold text-azul-900 ring-1 ring-azul-100">
                    Plazo: {PLAZO_EN_LETRAS[n.plazo]}
                  </p>
                ) : null}
                {n.observaciones ? (
                  <div className="rounded-xl border border-dashed border-border-strong bg-subtle/60 p-4">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Observaciones</p>
                    <p className="mt-1 text-sm whitespace-pre-line">{n.observaciones}</p>
                  </div>
                ) : null}
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                  <span>
                    <strong className="font-semibold text-foreground">Lugar de presentación:</strong> {LUGAR_PRESENTACION}
                  </span>
                </p>
                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <Scale className="size-3.5" aria-hidden /> Normativa citada
                  </p>
                  <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
                    {texto.normativa.map((t) => (
                      <li key={t} className="border-l-2 border-azul-100 pl-3">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos de tipo o plazo.</p>
            )}
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Seguimiento" icon={History}>
            <Timeline items={linea} />
          </SectionCard>

          {establecimiento ? (
            <SectionCard title="Establecimiento" description="Situación actual de sus certificados." icon={Store}>
              <SituacionEstablecimiento s={establecimiento} apilado />
            </SectionCard>
          ) : null}

          <SectionCard
            title="Actas vinculadas"
            icon={FilePenLine}
            flush={actas.length > 0}
            actions={
              actas.length > 0 ? (
                <Link
                  href="/gestion/actas"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-azul-700 hover:underline"
                >
                  Todas <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              ) : undefined
            }
          >
            {actas.length === 0 ? (
              <EmptyState
                compact
                icon={FilePenLine}
                title="Sin actas"
                description={
                  estado === "vencida"
                    ? "El plazo venció: labrá el acta por incumplimiento."
                    : "Si el destinatario no cumple en término, labrá el acta desde aquí."
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {actas.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/gestion/actas/${a.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/50"
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-[13px] font-semibold text-azul-700">N.º {a.numero}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatFecha(a.fecha)} · {a.motivo ? MOTIVO_ACTA[a.motivo].label : "—"}
                        </span>
                      </span>
                      <EstadoBadge mapa={ESTADO_ACTA} valor={a.estado} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

/** Tarjeta principal con el estado del plazo y las acciones disponibles. */
function EstadoPlazo({
  estado,
  n,
  ahora,
  actas,
  children,
}: {
  estado: string;
  n: { notificada_at: string | null; vence_at: string | null; cumplida_at: string | null };
  ahora: number;
  actas: { id: string | null; numero: string | null }[];
  children: React.ReactNode;
}) {
  const estilos: Record<string, { caja: string; titulo: string; icono: typeof BellRing; acento: string }> = {
    emitida: {
      caja: "border-border bg-card",
      titulo: "Pendiente de notificar",
      icono: Send,
      acento: "bg-noche-50 text-noche-700 ring-noche-200",
    },
    notificada: {
      caja: "border-azul-200 bg-linear-to-br from-azul-50/80 via-card to-card",
      titulo: "Plazo en curso",
      icono: AlarmClock,
      acento: "bg-gradient-brand text-white ring-transparent shadow-brand",
    },
    vencida: {
      caja: "border-red-200 bg-linear-to-br from-red-50 via-card to-card",
      titulo: "Plazo vencido sin cumplimiento",
      icono: AlarmClock,
      acento: "bg-red-600 text-white ring-transparent",
    },
    cumplida: {
      caja: "border-emerald-200 bg-linear-to-br from-emerald-50 via-card to-card",
      titulo: "Notificación cumplida",
      icono: CircleCheckBig,
      acento: "bg-emerald-600 text-white ring-transparent",
    },
    acta_labrada: {
      caja: "border-violet-200 bg-linear-to-br from-violet-50 via-card to-card",
      titulo: "Se labró acta por incumplimiento",
      icono: FilePenLine,
      acento: "bg-violet-600 text-white ring-transparent",
    },
    anulada: {
      caja: "border-border bg-subtle",
      titulo: "Notificación anulada",
      icono: Ban,
      acento: "bg-noche-100 text-noche-600 ring-noche-200",
    },
  };
  const e = estilos[estado] ?? estilos.emitida;
  const Icono = e.icono;

  let detalle: React.ReactNode = null;
  if (estado === "emitida") {
    detalle = (
      <ol className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
        {["Imprimí el original y el duplicado.", "Entregala y pedí firma, aclaración y DNI.", "Registrá la entrega: empieza a correr el plazo."].map(
          (paso, i) => (
            <li key={paso} className="flex items-start gap-2 rounded-xl bg-subtle/80 p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-azul-600 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span>{paso}</span>
            </li>
          ),
        )}
      </ol>
    );
  } else if ((estado === "notificada" || estado === "vencida") && n.vence_at) {
    detalle = <CuentaRegresiva desde={n.notificada_at} hasta={n.vence_at} ahora={ahora} />;
  } else if (estado === "cumplida") {
    const enTermino = !n.vence_at || !n.cumplida_at || new Date(n.cumplida_at).getTime() <= new Date(n.vence_at).getTime();
    detalle = (
      <p className="text-sm text-muted-foreground">
        Documentación presentada el <strong className="text-foreground">{formatFechaHora(n.cumplida_at)}</strong>
        {n.vence_at ? (enTermino ? ", dentro del plazo." : ", fuera de término.") : "."}
      </p>
    );
  } else if (estado === "acta_labrada") {
    detalle = (
      <div className="flex flex-wrap gap-2">
        {actas.map((a) => (
          <Button key={a.id} asChild variant="outline" size="sm">
            <Link href={`/gestion/actas/${a.id}`}>
              <FilePenLine aria-hidden /> Acta N.º {a.numero}
            </Link>
          </Button>
        ))}
      </div>
    );
  } else if (estado === "anulada") {
    detalle = <p className="text-sm text-muted-foreground">El motivo quedó registrado en las observaciones.</p>;
  }

  return (
    <section
      aria-label="Estado del plazo"
      className={cn("relative overflow-hidden rounded-card border p-5 shadow-card sm:p-6", e.caja)}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-center gap-3">
            <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl ring-1", e.acento)}>
              <Icono className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">{e.titulo}</h2>
              {n.vence_at && (estado === "notificada" || estado === "vencida") ? (
                <p className="text-[13px] text-muted-foreground">Vencimiento: {formatFechaHora(n.vence_at)}</p>
              ) : null}
            </div>
          </div>
          {detalle ? <div className="max-w-2xl">{detalle}</div> : null}
        </div>
        <div className="shrink-0 lg:max-w-sm">{children}</div>
      </div>
    </section>
  );
}
