import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  CircleX,
  FlaskConical,
  Hourglass,
  MapPinned,
  MessageSquareWarning,
  Paperclip,
  ScrollText,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { type CampoFiltro, FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requerirEmpresa } from "@/lib/auth";
import { getResumenTramites, getTramitesEmpresa } from "@/lib/data/legajo";
import { ESTADO_TRAMITE, TIPO_TRAMITE, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatRelativo } from "@/lib/domain/formato";
import { Constants, type Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { resumenTramite } from "./_lib/datos";

export const metadata: Metadata = {
  title: "Trámites",
  description: "Seguimiento de los trámites de la empresa ante la Dirección de Salud Ambiental.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ACCESOS: { titulo: string; detalle: string; href: string; icono: LucideIcon }[] = [
  {
    titulo: "Renovación anual",
    detalle: "DDJJ de categorización y libre deuda",
    href: "/prestador/legajo?tab=renovacion",
    icono: CalendarClock,
  },
  { titulo: "Asesor técnico", detalle: "Alta o reemplazo con título autenticado", href: "/prestador/legajo?tab=tecnicos", icono: UserPlus },
  { titulo: "Cambio de domicilio", detalle: "Oficina o depósito, con libre deuda", href: "/prestador/legajo?tab=empresa", icono: MapPinned },
  { titulo: "Alta de producto", detalle: "Ampliá tu memoria técnica", href: "/prestador/productos", icono: FlaskConical },
];

function primero(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function esTipo(v: string | undefined): v is Enums<"tipo_tramite"> {
  return Constants.public.Enums.tipo_tramite.some((t) => t === v);
}

function esEstado(v: string | undefined): v is Enums<"estado_tramite"> {
  return Constants.public.Enums.estado_tramite.some((e) => e === v && e !== "borrador");
}

export default async function TramitesPage({ searchParams }: Props) {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const sp = await searchParams;
  const tipoParam = primero(sp.tipo);
  const estadoParam = primero(sp.estado);
  const tipo = esTipo(tipoParam) ? tipoParam : undefined;
  const estado = esEstado(estadoParam) ? estadoParam : undefined;
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);

  const [resumen, { filas, total }] = await Promise.all([
    getResumenTramites(empresaId),
    getTramitesEmpresa(empresaId, { tipo, estado, desde, hasta }),
  ]);
  const totalGeneral = resumen.presentado + resumen.observado + resumen.aprobado + resumen.rechazado;
  const filtrado = Boolean(tipo || estado);

  const filtros: CampoFiltro[] = [
    {
      tipo: "select",
      nombre: "tipo",
      etiqueta: "Trámite",
      opciones: Constants.public.Enums.tipo_tramite.map((t) => ({ valor: t, label: TIPO_TRAMITE[t].label })),
    },
    {
      tipo: "select",
      nombre: "estado",
      etiqueta: "Estado",
      opciones: Constants.public.Enums.estado_tramite
        .filter((e) => e !== "borrador")
        .map((e) => ({ valor: e, label: ESTADO_TRAMITE[e].label })),
    },
  ];

  return (
    <>
      <PageHeader
        title="Trámites"
        description="Seguí el estado de tus solicitudes ante la Dirección de Salud Ambiental y respondé las observaciones."
        icon={ScrollText}
        breadcrumb={[{ label: "Prestadores", href: "/prestador" }, { label: "Trámites" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="En revisión"
          value={resumen.presentado}
          icon={Hourglass}
          tone="azul"
          hint="Presentados a la Dirección"
          href="/prestador/tramites?estado=presentado"
        />
        <StatCard
          label="Observados"
          value={resumen.observado}
          icon={MessageSquareWarning}
          tone={resumen.observado > 0 ? "ambar" : "neutral"}
          hint={resumen.observado > 0 ? "Requieren tu respuesta" : "Nada pendiente de tu parte"}
          href="/prestador/tramites?estado=observado"
        />
        <StatCard label="Aprobados" value={resumen.aprobado} icon={CircleCheck} tone="verde" href="/prestador/tramites?estado=aprobado" />
        <StatCard
          label="Rechazados"
          value={resumen.rechazado}
          icon={CircleX}
          tone={resumen.rechazado > 0 ? "rojo" : "neutral"}
          href="/prestador/tramites?estado=rechazado"
        />
      </div>

      {resumen.observado > 0 && estado !== "observado" ? (
        <Alert
          tone="warning"
          className="mt-6"
          title={`Tenés ${resumen.observado} trámite${resumen.observado === 1 ? "" : "s"} con observaciones`}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/prestador/tramites?estado=observado">Ver observados</Link>
            </Button>
          }
        >
          Corregí lo indicado por la Dirección y volvé a presentarlos para que puedan resolverse.
        </Alert>
      ) : null}

      <section aria-labelledby="iniciar-tramite" className="mt-8">
        <h2 id="iniciar-tramite" className="mb-3 font-display text-base font-semibold">
          Iniciar un trámite
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ACCESOS.map(({ titulo, detalle, href, icono: Icono }) => (
            <li key={titulo}>
              <Link
                href={href}
                className="group relative flex h-full items-center gap-3 overflow-hidden rounded-card border border-border bg-card p-4 shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-azul-200 hover:shadow-elevated"
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100 transition-colors group-hover:bg-gradient-brand group-hover:text-white"
                >
                  <Icono className="size-5" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{titulo}</span>
                  <span className="block text-[13px] leading-snug text-muted-foreground">{detalle}</span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-noche-300 transition-all group-hover:translate-x-0.5 group-hover:text-azul-600"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <SectionCard
        className="mt-8"
        title="Historial de trámites"
        description={
          filtrado
            ? `${total.toLocaleString("es-AR")} resultado${total === 1 ? "" : "s"} con los filtros aplicados`
            : `${totalGeneral.toLocaleString("es-AR")} trámite${totalGeneral === 1 ? "" : "s"} presentado${totalGeneral === 1 ? "" : "s"}`
        }
        icon={ScrollText}
        flush
        footer={
          total > tamanio ? (
            <Paginacion pagina={pagina} total={total} tamanio={tamanio} params={sp} ruta="/prestador/tramites" className="w-full" />
          ) : undefined
        }
      >
        <div className="border-b border-border px-5 py-3 sm:px-6">
          <FiltrosUrl campos={filtros} />
        </div>
        {filas.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              compact
              icon={ScrollText}
              title={filtrado ? "No hay trámites con esos filtros" : "Todavía no presentaste trámites"}
              description={
                filtrado
                  ? "Probá con otro tipo o estado."
                  : "Las renovaciones, altas de asesores, cambios de domicilio y altas de productos aparecerán acá."
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filas.map((t) => {
              const tipoEtiqueta = etiqueta(TIPO_TRAMITE, t.tipo);
              const observado = t.estado === "observado";
              return (
                <li key={t.id}>
                  <Link
                    href={`/prestador/tramites/${t.id}`}
                    className={cn(
                      "group grid gap-3 px-5 py-4 transition-colors hover:bg-azul-50/50 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-6",
                      observado && "bg-warning-soft/40",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-foreground">{t.codigo ?? "Sin código"}</span>
                        <Badge tone={tipoEtiqueta.tono} size="sm">
                          {tipoEtiqueta.label}
                        </Badge>
                        {(t.cantidad_documentos ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="size-3.5" aria-hidden />
                            {t.cantidad_documentos}
                            <span className="sr-only">documentos adjuntos</span>
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm text-foreground">{resumenTramite(t.tipo, t.datos)}</p>
                      {observado && t.observaciones ? (
                        <p className="mt-1 line-clamp-2 text-[13px] text-amber-900">
                          <span className="font-semibold">Observación: </span>
                          {t.observaciones}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground md:flex-col md:items-end md:gap-1">
                      <span title={t.presentado_at ? formatFecha(t.presentado_at) : undefined}>
                        Presentado {formatRelativo(t.presentado_at ?? t.created_at)}
                      </span>
                      {t.resuelto_at ? <span>Resuelto el {formatFecha(t.resuelto_at)}</span> : null}
                    </div>
                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <EstadoBadge mapa={ESTADO_TRAMITE} valor={t.estado} pulse={observado} />
                      {observado ? (
                        <span className="text-[13px] font-semibold text-azul-700 group-hover:underline">Responder</span>
                      ) : null}
                      <ChevronRight
                        className="size-4 shrink-0 text-noche-300 transition-transform group-hover:translate-x-0.5 group-hover:text-azul-600"
                        aria-hidden
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
