import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  Ban,
  CircleCheckBig,
  ClipboardCheck,
  ClipboardList,
  Files,
  Inbox,
  MessageSquareWarning,
  SearchX,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import {
  DIAS_CONTROLADAS_RECIENTES,
  type DeclaracionBandeja,
  type ParamsBusqueda,
  TIPOS_SERVICIO,
  VISTAS_BANDEJA,
  type VistaBandeja,
  esUuid,
  esValor,
  getBandejaControl,
  getResumenControl,
  primerValor,
} from "@/lib/data/control";
import { TIPO_SERVICIO, TIPO_SERVICIO_CORTO } from "@/lib/domain/etiquetas";
import { formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { FiltrosBandeja } from "./_components/filtros-bandeja";

export const metadata: Metadata = { title: "Control de declaraciones" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const PESTANAS: Record<VistaBandeja, { label: string; icono: typeof Inbox; descripcion: string }> = {
  presentadas: {
    label: "Por controlar",
    icono: Inbox,
    descripcion:
      "Primero las fumigaciones, por el servicio más próximo: atendé las de menos de 24 h. Las limpiezas de tanque (ya realizadas) van al final.",
  },
  observadas: {
    label: "Observadas",
    icono: MessageSquareWarning,
    descripcion: "Esperan correcciones de la empresa; vuelven a la bandeja cuando las presenten de nuevo.",
  },
  controladas: {
    label: "Controladas",
    icono: CircleCheckBig,
    descripcion: `Planillas controladas en los últimos ${DIAS_CONTROLADAS_RECIENTES} días.`,
  },
  rechazadas: {
    label: "Rechazadas",
    icono: Ban,
    descripcion: "Planillas rechazadas por el área, con su motivo.",
  },
};

export default async function ControlBandejaPage({ searchParams }: Props) {
  await requerirStaff();
  const sp = await searchParams;
  const vistaParam = primerValor(sp.vista);
  const vista: VistaBandeja = esValor(VISTAS_BANDEJA, vistaParam) ? vistaParam : "presentadas";
  const tipoParam = primerValor(sp.tipo);
  const tipo = esValor(TIPOS_SERVICIO, tipoParam) ? tipoParam : undefined;
  const busqueda = primerValor(sp.q);
  const { pagina, desde, hasta } = rangoPagina(sp.pagina);

  const [{ filas, total }, resumen] = await Promise.all([
    getBandejaControl({ vista, busqueda, tipo, desde, hasta }),
    getResumenControl(),
  ]);
  const ahora = new Date();
  const hayFiltros = !!busqueda || !!tipo;

  return (
    <>
      <PageHeader
        title="Control de declaraciones"
        description="Verificá cada planilla de servicios y sus certificados antes del timbrado (Art. 10.º a, Ord. 2681/98)."
        icon={ClipboardCheck}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Control de declaraciones" }]}
        actions={
          <Button asChild variant="outline">
            <Link href="/gestion/certificados">
              <BadgeCheck aria-hidden />
              Buscar certificados
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <ResultadoReciente params={sp} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Planillas por controlar"
            value={resumen.conteos.presentadas}
            icon={ClipboardList}
            tone="azul"
            hint="Presentadas por las empresas"
            href="/gestion/control"
          />
          <StatCard
            label="Servicios en menos de 24 h"
            value={resumen.urgentes}
            icon={AlarmClock}
            tone={resumen.urgentes > 0 ? "rojo" : "verde"}
            hint={resumen.urgentes > 0 ? "Priorizalas: el servicio es inminente" : "Ninguna planilla urgente"}
          />
          <StatCard
            label="Certificados a verificar"
            value={resumen.certificadosPorVerificar}
            icon={Files}
            tone="celeste"
            hint="En planillas presentadas"
          />
          <StatCard
            label="Resueltas hoy"
            value={resumen.resueltasHoy}
            icon={CircleCheckBig}
            tone="verde"
            hint="Controladas, observadas o rechazadas"
          />
        </div>

        <nav aria-label="Estados de las planillas" className="-mx-1 overflow-x-auto px-1 pb-1">
          <ul className="flex w-max gap-2">
            {VISTAS_BANDEJA.map((v) => {
              const p = PESTANAS[v];
              const Icono = p.icono;
              const activa = v === vista;
              const cantidad = resumen.conteos[v];
              return (
                <li key={v}>
                  <Link
                    href={hrefVista(v, sp)}
                    aria-current={activa ? "page" : undefined}
                    scroll={false}
                    className={cn(
                      "group inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium whitespace-nowrap transition-all",
                      activa
                        ? "border-azul-600 bg-azul-600 text-white shadow-brand"
                        : "border-border bg-card text-noche-700 hover:-translate-y-px hover:border-azul-200 hover:text-azul-700 hover:shadow-card",
                    )}
                  >
                    <Icono className="size-4" aria-hidden />
                    {p.label}
                    <span
                      className={cn(
                        "min-w-6 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums",
                        activa
                          ? "bg-white/20 text-white"
                          : v === "presentadas" && cantidad > 0
                            ? "bg-sol-400 text-noche-950"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {cantidad}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <SectionCard
          title={PESTANAS[vista].label}
          description={PESTANAS[vista].descripcion}
          icon={PESTANAS[vista].icono}
          flush
          footer={
            total > 0 ? (
              <Paginacion
                pagina={pagina}
                total={total}
                params={{ ...sp, resultado: undefined, dj: undefined, n: undefined, id: undefined }}
                ruta="/gestion/control"
                className="w-full"
              />
            ) : undefined
          }
        >
          <div className="border-b border-border px-5 py-3 sm:px-6">
            <FiltrosBandeja tipos={TIPOS_SERVICIO.map((t) => ({ valor: t, label: TIPO_SERVICIO[t].label }))} />
          </div>

          {filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              {hayFiltros ? (
                <EmptyState
                  compact
                  icon={SearchX}
                  title="No hay planillas con esos filtros"
                  description="Probá con otro código, empresa o CUIT."
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link href={hrefVista(vista, {})}>Limpiar filtros</Link>
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  compact
                  icon={PESTANAS[vista].icono}
                  title={vista === "presentadas" ? "No hay planillas para controlar" : `Sin planillas ${PESTANAS[vista].label.toLowerCase()}`}
                  description={
                    vista === "presentadas"
                      ? "Cuando las empresas presenten sus planillas de servicios, vas a verlas acá. ¡Bandeja al día!"
                      : "No hay planillas en este estado por el momento."
                  }
                />
              )}
            </div>
          ) : (
            <>
              <div
                aria-hidden
                className="hidden grid-cols-[8.5rem_minmax(0,1fr)_5.5rem_11.5rem_7.5rem_7.5rem] gap-x-5 border-b border-border bg-subtle px-6 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase xl:grid"
              >
                <span>Planilla</span>
                <span>Empresa</span>
                <span>Cert.</span>
                <span>Primer servicio</span>
                <span>{vista === "presentadas" ? "Presentada" : "Resuelta"}</span>
                <span />
              </div>
              <ol aria-label={`Planillas ${PESTANAS[vista].label.toLowerCase()}`} className="divide-y divide-border">
                {filas.map((d) => (
                  <FilaPlanilla key={d.id ?? d.codigo} declaracion={d} vista={vista} ahora={ahora} />
                ))}
              </ol>
            </>
          )}
        </SectionCard>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------- */

function hrefVista(vista: VistaBandeja, sp: ParamsBusqueda): string {
  const params = new URLSearchParams();
  if (vista !== "presentadas") params.set("vista", vista);
  const q = primerValor(sp.q);
  const tipo = primerValor(sp.tipo);
  if (q) params.set("q", q);
  if (tipo) params.set("tipo", tipo);
  return `/gestion/control${params.size ? `?${params.toString()}` : ""}`;
}

type Urgencia = { label: string; tono: "rojo" | "ambar" | "neutral" | "celeste"; pulso: boolean; destacada: boolean };

function urgenciaServicio(d: DeclaracionBandeja, ahora: Date): Urgencia | null {
  const primerServicio = d.primer_servicio;
  if (!primerServicio) return null;
  // La limpieza de tanques se declara una vez realizada: no hay plazo que vigilar.
  if (d.tipo === "tanque") {
    return { label: `Realizada ${formatRelativo(d.ultimo_servicio ?? primerServicio, ahora)}`, tono: "celeste", pulso: false, destacada: false };
  }
  const horas = (new Date(primerServicio).getTime() - ahora.getTime()) / 3_600_000;
  if (horas < 0) return { label: "Servicio ya iniciado", tono: "rojo", pulso: false, destacada: true };
  if (horas < 24) {
    const texto = horas < 1 ? "En menos de 1 h" : `En ${Math.round(horas)} h`;
    return { label: texto, tono: "rojo", pulso: true, destacada: true };
  }
  if (horas < 48) return { label: `En ${Math.round(horas)} h`, tono: "ambar", pulso: false, destacada: false };
  return { label: formatRelativo(primerServicio, ahora), tono: "neutral", pulso: false, destacada: false };
}

function FilaPlanilla({ declaracion: d, vista, ahora }: { declaracion: DeclaracionBandeja; vista: VistaBandeja; ahora: Date }) {
  const urgencia = vista === "presentadas" ? urgenciaServicio(d, ahora) : null;
  const href = d.id ? `/gestion/control/${d.id}` : "/gestion/control";
  const cantidad = d.cantidad_certificados ?? 0;
  const observados = d.observados ?? 0;
  const fechaReferencia = vista === "presentadas" ? d.presentada_at : (d.controlada_at ?? d.presentada_at);

  return (
    <li
      className={cn(
        "relative grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-azul-50/40 sm:grid-cols-3 sm:px-6",
        "xl:grid-cols-[8.5rem_minmax(0,1fr)_5.5rem_11.5rem_7.5rem_7.5rem] xl:items-center xl:gap-x-5",
        urgencia?.destacada && "bg-red-50/40",
      )}
    >
      {urgencia?.destacada ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-red-500" /> : null}

      <div className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
        <Link
          href={href}
          className="w-fit rounded-sm font-display text-[15px] font-semibold text-foreground transition-colors after:absolute after:inset-0 hover:text-azul-700 xl:after:hidden"
        >
          {d.codigo ?? "Planilla sin código"}
        </Link>
        <Badge tone={d.tipo === "tanque" ? "celeste" : "azul"} size="sm">
          {d.tipo ? TIPO_SERVICIO_CORTO[d.tipo] : "Servicio"}
        </Badge>
      </div>

      <div className="col-span-2 flex min-w-0 flex-col xl:col-span-1">
        <span className="sr-only">Empresa:</span>
        <p className="truncate font-medium text-foreground" title={d.empresa_nombre ?? undefined}>
          {d.empresa_nombre ?? "Empresa sin nombre"}
        </p>
        <p className="nums-tabular text-[13px] text-muted-foreground">{d.empresa_cuit ? `CUIT ${d.empresa_cuit}` : "Sin CUIT"}</p>
        {vista !== "presentadas" && d.observaciones ? (
          <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground" title={d.observaciones}>
            {d.observaciones}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground xl:hidden">Certificados</span>
        <p className="font-display text-xl leading-none font-semibold tabular-nums text-foreground">
          {cantidad}
          <span className="sr-only"> {cantidad === 1 ? "certificado" : "certificados"}</span>
        </p>
        <p className="hidden text-xs text-muted-foreground xl:block" aria-hidden>
          {cantidad === 1 ? "certificado" : "certificados"}
        </p>
        {observados > 0 ? <p className="text-xs font-medium text-amber-800">{observados} observados</p> : null}
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground xl:sr-only">Primer servicio</span>
        <p className="nums-tabular text-sm font-medium text-foreground">
          {d.primer_servicio ? formatFechaHora(d.primer_servicio) : "Sin fecha"}
        </p>
        {urgencia ? (
          <Badge tone={urgencia.tono} dot pulse={urgencia.pulso} size="sm">
            {urgencia.label}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground xl:sr-only">{vista === "presentadas" ? "Presentada" : "Resuelta"}</span>
        <p className="text-sm text-foreground" title={fechaReferencia ? formatFechaHora(fechaReferencia) : undefined}>
          {fechaReferencia ? formatRelativo(fechaReferencia, ahora) : "—"}
        </p>
      </div>

      <div className="relative z-10 hidden justify-end xl:flex">
        <Button asChild size="sm" variant={vista === "presentadas" ? "primary" : "outline"}>
          <Link href={href} aria-label={`${vista === "presentadas" ? "Controlar" : "Ver"} la planilla ${d.codigo ?? ""}`}>
            {vista === "presentadas" ? "Controlar" : "Ver"}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </li>
  );
}

const RESULTADOS = {
  controlada: {
    tono: "success",
    titulo: (dj: string) => `Planilla ${dj} controlada`,
    texto: () => "Todos sus certificados quedaron controlados: la empresa ya puede pagar el timbrado.",
  },
  observada: {
    tono: "warning",
    titulo: (dj: string) => `Planilla ${dj} observada`,
    texto: (n: number) =>
      `${n === 1 ? "1 certificado volvió" : `${n} certificados volvieron`} a la empresa para corregir; el resto quedó controlado.`,
  },
  rechazada: {
    tono: "danger",
    titulo: (dj: string) => `Planilla ${dj} rechazada`,
    texto: () => "Sus certificados sin pago asociado fueron anulados y la empresa fue notificada en su panel.",
  },
} as const;

/** Banner con el resultado de la última resolución (llega por la URL al volver del control). */
function ResultadoReciente({ params }: { params: ParamsBusqueda }) {
  const resultado = primerValor(params.resultado);
  if (resultado !== "controlada" && resultado !== "observada" && resultado !== "rechazada") return null;
  const r = RESULTADOS[resultado];
  const dj = primerValor(params.dj).slice(0, 40) || "";
  const n = Math.max(0, Number.parseInt(primerValor(params.n), 10) || 0);
  const id = primerValor(params.id);

  return (
    <Alert
      tone={r.tono}
      title={r.titulo(dj)}
      className="animate-fade-up"
      action={
        <div className="flex flex-wrap items-center gap-1">
          {esUuid(id) ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/gestion/control/${id}`}>Ver planilla</Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/gestion/control" aria-label="Cerrar aviso" scroll={false}>
              <X aria-hidden />
            </Link>
          </Button>
        </div>
      }
    >
      {r.texto(n)}
    </Alert>
  );
}
