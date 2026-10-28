import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  BellRing,
  CircleCheckBig,
  Eye,
  FilePenLine,
  Hourglass,
  ListChecks,
  MapPin,
  Plus,
  Printer,
  Send,
  Siren,
  UserRound,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import {
  ESTADOS_EFECTIVOS_NOTIFICACION,
  TIPOS_NOTIFICACION,
  esUuid,
  instanteActual,
  kpisNotificaciones,
  listarNotificaciones,
  notificacionesVencidas,
  obtenerEmpresaOpcion,
  obtenerEstablecimientoOpcion,
  textoParam,
  valorPermitido,
  type Notificacion,
} from "@/lib/data/intimaciones";
import { ESTADO_NOTIFICACION, PLAZO_NOTIFICACION, TIPO_NOTIFICACION } from "@/lib/domain/etiquetas";
import { formatFecha, formatRelativo } from "@/lib/domain/formato";
import { PlazoNotificacion } from "./_components/plazo-notificacion";

export const metadata: Metadata = {
  title: "Notificaciones",
  description: "Notificaciones con plazo a establecimientos y empresas: seguimiento de vencimientos y cumplimiento.",
};

type NotificacionesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** URL del listado sin algunos parámetros (conserva el resto de los filtros). */
function urlSin(params: Record<string, string | string[] | undefined>, quitar: string[]) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || k === "pagina" || quitar.includes(k)) continue;
    sp.set(k, Array.isArray(v) ? v[0] : v);
  }
  return `/gestion/notificaciones${sp.size ? `?${sp}` : ""}`;
}

function enlaceActa(n: Notificacion) {
  const p = new URLSearchParams({ motivo: "incumplimiento_notificacion" });
  if (n.id) p.set("notificacion", n.id);
  if (n.establecimiento_id) p.set("establecimiento", n.establecimiento_id);
  if (n.empresa_id) p.set("empresa", n.empresa_id);
  return `/gestion/actas/nueva?${p}`;
}

export default async function NotificacionesPage({ searchParams }: NotificacionesPageProps) {
  await requerirStaff();
  const params = await searchParams;
  const filtros = {
    estado: valorPermitido(params.estado, ESTADOS_EFECTIVOS_NOTIFICACION),
    tipo: valorPermitido(params.tipo, TIPOS_NOTIFICACION),
    q: textoParam(params.q),
    establecimiento: textoParam(params.establecimiento),
    empresa: textoParam(params.empresa),
  };
  const { pagina, desde, hasta, tamanio } = rangoPagina(params.pagina);

  const [kpis, listado, vencidas, filtroEstablecimiento, filtroEmpresa] = await Promise.all([
    kpisNotificaciones(),
    listarNotificaciones(filtros, { desde, hasta }),
    notificacionesVencidas(6),
    obtenerEstablecimientoOpcion(filtros.establecimiento),
    obtenerEmpresaOpcion(filtros.empresa),
  ]);
  const ahora = instanteActual();
  const cerradas = kpis.cumplidas + kpis.conActa + kpis.vencidas;
  const tasaCumplimiento = cerradas > 0 ? Math.round((kpis.cumplidas / cerradas) * 100) : null;
  // Un establecimiento o empresa en la URL también filtra (aunque ya no exista y no se muestre su nombre).
  const hayFiltros = Boolean(
    filtros.estado || filtros.tipo || filtros.q || esUuid(filtros.establecimiento) || esUuid(filtros.empresa),
  );
  const filtroContexto = filtroEstablecimiento ?? filtroEmpresa;

  return (
    <>
      <PageHeader
        title="Notificaciones"
        description="Intimaciones con plazo en días hábiles: limpieza de tanques (Ord. 2004/92 t.o. 3098/01), fumigación (Ord. 2681/98) y documentación. Seguí cada plazo y labrá el acta si no se cumple."
        icon={BellRing}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Fiscalización" }, { label: "Notificaciones" }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/gestion/actas">
                <FilePenLine aria-hidden /> Actas
              </Link>
            </Button>
            <Button asChild>
              <Link href="/gestion/notificaciones/nueva">
                <Plus aria-hidden /> Nueva notificación
              </Link>
            </Button>
          </>
        }
      >
        {tasaCumplimiento !== null ? (
          <div className="flex max-w-xl flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3 shadow-card sm:flex-row sm:items-center sm:gap-4">
            <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
              <ListChecks className="size-4 text-azul-600" aria-hidden /> Cumplimiento
            </span>
            <Progress
              value={tasaCumplimiento}
              tone={tasaCumplimiento >= 70 ? "verde" : tasaCumplimiento >= 40 ? "ambar" : "rojo"}
              size="sm"
              label={`Cumplimiento de notificaciones: ${tasaCumplimiento} %`}
              className="flex-1 [&>div:first-child]:sr-only"
            />
            <span className="shrink-0 text-[13px] text-muted-foreground">
              <strong className="font-semibold text-foreground">{tasaCumplimiento} %</strong> de {cerradas} con plazo
              cerrado
            </span>
          </div>
        ) : null}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Emitidas sin notificar"
          value={kpis.emitidas}
          icon={Send}
          tone="neutral"
          hint="Imprimilas y entregalas en terreno"
          href="/gestion/notificaciones?estado=emitida"
        />
        <StatCard
          label="En plazo"
          value={kpis.enPlazo}
          icon={Hourglass}
          tone="azul"
          hint="Notificadas, con plazo corriendo"
          href="/gestion/notificaciones?estado=notificada"
        />
        <StatCard
          label="Plazo vencido"
          value={kpis.vencidas}
          icon={AlarmClock}
          tone="rojo"
          hint={kpis.vencidas > 0 ? "Corresponde labrar acta" : "Ninguna pendiente"}
          href="/gestion/notificaciones?estado=vencida"
        />
        <StatCard
          label="Cumplidas"
          value={kpis.cumplidas}
          icon={CircleCheckBig}
          tone="verde"
          hint={`${kpis.conActa} terminaron en acta`}
          href="/gestion/notificaciones?estado=cumplida"
        />
      </div>

      {vencidas.length > 0 && !filtros.estado && !filtroContexto ? (
        <section
          aria-labelledby="titulo-vencidas"
          className="relative mt-6 overflow-hidden rounded-card border border-red-200 bg-linear-to-br from-red-50 via-card to-card shadow-card"
        >
          <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-red-300/25 blur-3xl" />
          <div className="relative flex flex-col gap-3 border-b border-red-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-[0_8px_20px_-10px_rgb(208_48_63/0.8)]"
              >
                <Siren className="size-5" />
              </span>
              <div>
                <h2 id="titulo-vencidas" className="font-display text-base font-semibold text-red-900">
                  Plazos vencidos: corresponde labrar acta
                </h2>
                <p className="text-[13px] text-red-800/80">
                  {kpis.vencidas === 1
                    ? "1 notificación venció sin que se presentara la documentación."
                    : `${kpis.vencidas} notificaciones vencieron sin que se presentara la documentación.`}
                </p>
              </div>
            </div>
            {kpis.vencidas > vencidas.length ? (
              <Button asChild variant="ghost" size="sm" className="text-red-700 hover:bg-red-100">
                <Link href="/gestion/notificaciones?estado=vencida">
                  Ver las {kpis.vencidas} <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>
          <ul className="relative grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {vencidas.map((n) => (
              <li
                key={n.id}
                className="group flex flex-col gap-3 rounded-xl border border-red-100 bg-card p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="nums-tabular font-mono text-xs text-muted-foreground">N.º {n.numero}</p>
                    <p className="truncate font-display text-[15px] font-semibold text-foreground">{n.razon_social}</p>
                  </div>
                  <Badge tone="rojo" size="sm" dot pulse>
                    {capitalizar(`venció ${formatRelativo(n.vence_at, new Date(ahora))}`)}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="size-3.5 shrink-0" aria-hidden /> {n.domicilio}
                  </span>
                  {n.persona_notificada ? (
                    <span className="flex items-center gap-1.5 truncate">
                      <UserRound className="size-3.5 shrink-0" aria-hidden /> Recibió {n.persona_notificada} el{" "}
                      {formatFecha(n.notificada_at)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button asChild variant="danger" size="sm">
                    <Link href={enlaceActa(n)}>
                      <FilePenLine aria-hidden /> Labrar acta
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/gestion/notificaciones/${n.id}`}>
                      Ver detalle <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SectionCard
        className="mt-6"
        title="Todas las notificaciones"
        description={
          listado.total === 1 ? "1 notificación" : `${listado.total.toLocaleString("es-AR")} notificaciones`
        }
        icon={BellRing}
        flush
        footer={
          listado.total > 0 ? (
            <Paginacion
              pagina={pagina}
              total={listado.total}
              tamanio={tamanio}
              params={params}
              ruta="/gestion/notificaciones"
              className="w-full"
            />
          ) : undefined
        }
      >
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:px-6">
          <FiltrosUrl
            campos={[
              { tipo: "busqueda", nombre: "q", placeholder: "Buscá por N.º, razón social, domicilio, CUIT u O.T." },
              {
                tipo: "select",
                nombre: "estado",
                etiqueta: "Estado",
                opciones: ESTADOS_EFECTIVOS_NOTIFICACION.map((e) => ({ valor: e, label: ESTADO_NOTIFICACION[e].label })),
              },
              {
                tipo: "select",
                nombre: "tipo",
                etiqueta: "Tipo",
                opciones: TIPOS_NOTIFICACION.map((t) => ({ valor: t, label: TIPO_NOTIFICACION[t].label })),
              },
            ]}
          />
          {filtroContexto ? (
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-muted-foreground">
                {filtroEstablecimiento ? "Establecimiento:" : "Empresa:"}
              </span>
              <Badge tone="azul" size="lg">
                {filtroContexto.nombre}
              </Badge>
              <Link
                href={urlSin(params, ["establecimiento", "empresa"])}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden /> Quitar filtro
              </Link>
            </div>
          ) : null}
        </div>

        {listado.filas.length === 0 && listado.total > 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              compact
              icon={BellRing}
              title={`La página ${pagina} no tiene resultados`}
              description={`Hay ${listado.total.toLocaleString("es-AR")} notificaciones con estos filtros: volvé a la primera página.`}
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href={urlSin(params, [])}>Ir a la primera página</Link>
                </Button>
              }
            />
          </div>
        ) : listado.filas.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              compact
              icon={BellRing}
              title={hayFiltros || filtroContexto ? "No hay notificaciones con esos filtros" : "Todavía no hay notificaciones"}
              description={
                hayFiltros || filtroContexto
                  ? "Probá con otro estado, tipo o texto de búsqueda."
                  : "Emití la primera desde aquí o desde la hoja de ruta, cuando un establecimiento tenga el certificado vencido."
              }
              action={
                hayFiltros || filtroContexto ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/gestion/notificaciones">Ver todas</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    <Link href="/gestion/notificaciones/nueva">
                      <Plus aria-hidden /> Nueva notificación
                    </Link>
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            {/* Móvil: tarjetas */}
            <ul className="divide-y divide-border md:hidden">
              {listado.filas.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/gestion/notificaciones/${n.id}`}
                    className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-azul-50/50 active:bg-azul-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="nums-tabular font-mono text-xs text-muted-foreground">N.º {n.numero}</p>
                        <p className="truncate font-semibold text-foreground">{n.razon_social}</p>
                        <p className="truncate text-[13px] text-muted-foreground">{n.domicilio}</p>
                      </div>
                      <EstadoBadge
                        mapa={ESTADO_NOTIFICACION}
                        valor={n.estado_efectivo}
                        size="sm"
                        pulse={n.estado_efectivo === "vencida"}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <PlazoNotificacion n={n} ahora={ahora} />
                      <EstadoBadge mapa={TIPO_NOTIFICACION} valor={n.tipo} size="sm" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Escritorio: tabla */}
            <Table framed={false} containerClassName="hidden md:block">
              <THead>
                <TR>
                  <TH>N.º</TH>
                  <TH>Destinatario</TH>
                  <TH>Tipo y plazo</TH>
                  <TH>Vencimiento</TH>
                  <TH>Estado</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {listado.filas.map((n) => (
                  <TR key={n.id} className={n.estado_efectivo === "vencida" ? "bg-red-50/40" : undefined}>
                    <TD className="whitespace-nowrap">
                      <Link
                        href={`/gestion/notificaciones/${n.id}`}
                        className="nums-tabular font-mono text-[13px] font-semibold text-azul-700 hover:underline"
                      >
                        {n.numero}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatFecha(n.created_at)}</p>
                    </TD>
                    <TD className="max-w-72">
                      <p className="truncate font-medium">{n.razon_social}</p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {[n.domicilio, n.cuit ? `CUIT ${n.cuit}` : null].filter(Boolean).join(" · ")}
                      </p>
                    </TD>
                    <TD>
                      <div className="flex flex-col items-start gap-1">
                        <EstadoBadge mapa={TIPO_NOTIFICACION} valor={n.tipo} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {n.plazo ? PLAZO_NOTIFICACION[n.plazo].label : "—"}
                        </span>
                      </div>
                    </TD>
                    <TD>
                      <PlazoNotificacion n={n} ahora={ahora} />
                    </TD>
                    <TD>
                      <EstadoBadge
                        mapa={ESTADO_NOTIFICACION}
                        valor={n.estado_efectivo}
                        pulse={n.estado_efectivo === "vencida"}
                      />
                    </TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        {n.estado_efectivo === "vencida" ? (
                          <Button asChild variant="danger" size="sm">
                            <Link href={enlaceActa(n)}>
                              <FilePenLine aria-hidden /> Acta
                            </Link>
                          </Button>
                        ) : null}
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Imprimir notificación ${n.numero}`}>
                          <Link href={`/imprimir/notificacion/${n.id}`}>
                            <Printer aria-hidden />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Ver notificación ${n.numero}`}>
                          <Link href={`/gestion/notificaciones/${n.id}`}>
                            <Eye aria-hidden />
                          </Link>
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </>
        )}
      </SectionCard>
    </>
  );
}
