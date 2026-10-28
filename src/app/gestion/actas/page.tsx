import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CalendarRange, CircleCheckBig, Eye, FilePenLine, Gavel, PenLine, Plus, Printer, X } from "lucide-react";
import { CHART_COLORS } from "@/components/shared/chart-colors";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import {
  ESTADOS_ACTA,
  MOTIVOS_ACTA,
  distribucionMotivosActas,
  esUuid,
  fechaParam,
  kpisActas,
  listarActas,
  obtenerEmpresaOpcion,
  obtenerEstablecimientoOpcion,
  textoParam,
  valorPermitido,
  type Acta,
} from "@/lib/data/intimaciones";
import { ESTADO_ACTA, MOTIVO_ACTA } from "@/lib/domain/etiquetas";
import { formatFecha, formatHora, formatMes, hoyISO } from "@/lib/domain/formato";

export const metadata: Metadata = {
  title: "Actas de infracción",
  description: "Actas de infracción labradas por la Dirección de Salud Ambiental y su elevación al Tribunal Municipal de Faltas.",
};

type ActasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** URL del registro sin algunos parámetros (conserva el resto de los filtros). */
function urlSin(params: Record<string, string | string[] | undefined>, quitar: string[]) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || k === "pagina" || quitar.includes(k)) continue;
    sp.set(k, Array.isArray(v) ? v[0] : v);
  }
  return `/gestion/actas${sp.size ? `?${sp}` : ""}`;
}

function infractor(a: Acta) {
  return a.establecimiento_nombre ?? a.empresa_nombre ?? "Sin identificar";
}

export default async function ActasPage({ searchParams }: ActasPageProps) {
  await requerirStaff();
  const params = await searchParams;
  const filtros = {
    estado: valorPermitido(params.estado, ESTADOS_ACTA),
    motivo: valorPermitido(params.motivo, MOTIVOS_ACTA),
    desde: fechaParam(params.desde),
    hasta: fechaParam(params.hasta),
    q: textoParam(params.q),
    establecimiento: textoParam(params.establecimiento),
    empresa: textoParam(params.empresa),
  };
  const { pagina, desde, hasta, tamanio } = rangoPagina(params.pagina);

  const [kpis, listado, motivos, filtroEstablecimiento, filtroEmpresa] = await Promise.all([
    kpisActas(),
    listarActas(filtros, { desde, hasta }),
    distribucionMotivosActas(),
    obtenerEstablecimientoOpcion(filtros.establecimiento),
    obtenerEmpresaOpcion(filtros.empresa),
  ]);
  const totalMotivos = motivos.reduce((s, m) => s + m.cantidad, 0);
  // Un establecimiento o empresa en la URL también filtra (aunque ya no exista y no se muestre su nombre).
  const hayFiltros = Boolean(
    filtros.estado ||
      filtros.motivo ||
      filtros.desde ||
      filtros.hasta ||
      filtros.q ||
      esUuid(filtros.establecimiento) ||
      esUuid(filtros.empresa),
  );
  const filtroContexto = filtroEstablecimiento ?? filtroEmpresa;
  const hoy = hoyISO();
  const mesActual = formatMes(hoy);

  return (
    <>
      <PageHeader
        title="Actas de infracción"
        description="Infracciones constatadas en terreno (Art. 2.º Ord. 2681/98; Ord. 2004/92 t.o. 3098/01). Se elevan al Tribunal Municipal de Faltas según el Código de Faltas (Ord. 758/82)."
        icon={FilePenLine}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Fiscalización" }, { label: "Actas" }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/gestion/notificaciones">
                <BellRing aria-hidden /> Notificaciones
              </Link>
            </Button>
            <Button asChild variant="danger">
              <Link href="/gestion/actas/nueva">
                <Plus aria-hidden /> Labrar acta
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Labradas sin elevar"
          value={kpis.labradas}
          icon={PenLine}
          tone="ambar"
          hint="Pendientes de elevar al Tribunal"
          href="/gestion/actas?estado=labrada"
        />
        <StatCard
          label="Elevadas al Tribunal"
          value={kpis.elevadas}
          icon={Gavel}
          tone="violeta"
          hint="Esperando resolución"
          href="/gestion/actas?estado=elevada"
        />
        <StatCard
          label="Resueltas"
          value={kpis.resueltas}
          icon={CircleCheckBig}
          tone="verde"
          hint="Con resolución registrada"
          href="/gestion/actas?estado=resuelta"
        />
        <StatCard
          label="Labradas este mes"
          value={kpis.delMes}
          icon={CalendarRange}
          tone="azul"
          hint={`${mesActual.charAt(0).toUpperCase()}${mesActual.slice(1)} (sin anuladas)`}
          href={`/gestion/actas?desde=${hoy.slice(0, 8)}01`}
        />
      </div>

      {totalMotivos > 0 ? (
        <section
          aria-labelledby="titulo-motivos"
          className="mt-6 rounded-card border border-border bg-card p-5 shadow-card sm:px-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-motivos" className="font-display text-base font-semibold text-foreground">
              Motivos más frecuentes
            </h2>
            <p className="text-[13px] text-muted-foreground">{totalMotivos} actas vigentes (sin contar anuladas)</p>
          </div>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
            {motivos.map((m, i) => (
              <span
                key={m.motivo}
                className="h-full transition-[width] duration-700 first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(m.cantidad / totalMotivos) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
            ))}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {motivos.map((m, i) => (
              <li key={m.motivo}>
                <Link
                  href={`/gestion/actas?motivo=${m.motivo}`}
                  className="group inline-flex items-center gap-2 rounded-md text-[13px] text-foreground"
                >
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="group-hover:underline">{MOTIVO_ACTA[m.motivo].label}</span>
                  <span className="nums-tabular font-semibold">{m.cantidad}</span>
                  <span className="text-muted-foreground">({Math.round((m.cantidad / totalMotivos) * 100)} %)</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SectionCard
        className="mt-6"
        title="Registro de actas"
        description={listado.total === 1 ? "1 acta" : `${listado.total.toLocaleString("es-AR")} actas`}
        icon={FilePenLine}
        flush
        footer={
          listado.total > 0 ? (
            <Paginacion pagina={pagina} total={listado.total} tamanio={tamanio} params={params} ruta="/gestion/actas" className="w-full" />
          ) : undefined
        }
      >
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:px-6">
          <FiltrosUrl
            campos={[
              { tipo: "busqueda", nombre: "q", placeholder: "Buscá por N.º, establecimiento, empresa o notificación" },
              {
                tipo: "select",
                nombre: "estado",
                etiqueta: "Estado",
                opciones: ESTADOS_ACTA.map((e) => ({ valor: e, label: ESTADO_ACTA[e].label })),
              },
              {
                tipo: "select",
                nombre: "motivo",
                etiqueta: "Motivo",
                opciones: MOTIVOS_ACTA.map((m) => ({ valor: m, label: MOTIVO_ACTA[m].label })),
              },
              { tipo: "fecha", nombre: "desde", etiqueta: "Desde" },
              { tipo: "fecha", nombre: "hasta", etiqueta: "Hasta" },
            ]}
          />
          {filtroContexto ? (
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-muted-foreground">{filtroEstablecimiento ? "Establecimiento:" : "Empresa:"}</span>
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
              icon={FilePenLine}
              title={`La página ${pagina} no tiene resultados`}
              description={`Hay ${listado.total.toLocaleString("es-AR")} actas con estos filtros: volvé a la primera página.`}
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
              icon={FilePenLine}
              title={hayFiltros || filtroContexto ? "No hay actas con esos filtros" : "Todavía no se labraron actas"}
              description={
                hayFiltros || filtroContexto
                  ? "Probá con otro estado, motivo o rango de fechas."
                  : "Las actas se labran desde una inspección, desde una notificación vencida o directamente desde aquí."
              }
              action={
                hayFiltros || filtroContexto ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/gestion/actas">Ver todas</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="danger">
                    <Link href="/gestion/actas/nueva">
                      <Plus aria-hidden /> Labrar acta
                    </Link>
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden">
              {listado.filas.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/gestion/actas/${a.id}`}
                    className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-azul-50/50 active:bg-azul-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="nums-tabular font-mono text-xs text-muted-foreground">
                          {a.numero} · {formatFecha(a.fecha)}
                        </p>
                        <p className="truncate font-semibold text-foreground">{infractor(a)}</p>
                        {a.establecimiento_domicilio ? (
                          <p className="truncate text-[13px] text-muted-foreground">{a.establecimiento_domicilio}</p>
                        ) : null}
                      </div>
                      <EstadoBadge mapa={ESTADO_ACTA} valor={a.estado} size="sm" />
                    </div>
                    <EstadoBadge mapa={MOTIVO_ACTA} valor={a.motivo} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>

            <Table framed={false} containerClassName="hidden md:block">
              <THead>
                <TR>
                  <TH>N.º y fecha</TH>
                  <TH>Presunto infractor</TH>
                  <TH>Motivo</TH>
                  <TH>Origen</TH>
                  <TH>Estado</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {listado.filas.map((a) => (
                  <TR key={a.id}>
                    <TD className="whitespace-nowrap">
                      <Link
                        href={`/gestion/actas/${a.id}`}
                        className="nums-tabular font-mono text-[13px] font-semibold text-azul-700 hover:underline"
                      >
                        {a.numero}
                      </Link>
                      <p className="nums-tabular text-xs text-muted-foreground">
                        {formatFecha(a.fecha)} · {formatHora(a.fecha)}
                      </p>
                    </TD>
                    <TD className="max-w-72">
                      <p className="truncate font-medium">{infractor(a)}</p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {a.establecimiento_nombre && a.empresa_nombre
                          ? `Empresa: ${a.empresa_nombre}`
                          : (a.establecimiento_domicilio ?? (a.empresa_nombre ? "Empresa prestadora" : ""))}
                      </p>
                    </TD>
                    <TD>
                      <EstadoBadge mapa={MOTIVO_ACTA} valor={a.motivo} size="sm" />
                    </TD>
                    <TD className="text-[13px] whitespace-nowrap text-muted-foreground">
                      {a.notificacion_numero ? (
                        <Link href={`/gestion/notificaciones/${a.notificacion_id}`} className="hover:text-azul-700 hover:underline">
                          Notif. {a.notificacion_numero}
                        </Link>
                      ) : a.inspeccion_codigo ? (
                        <Link href={`/gestion/inspecciones/${a.inspeccion_id}`} className="hover:text-azul-700 hover:underline">
                          {a.inspeccion_codigo}
                        </Link>
                      ) : (
                        "Directa"
                      )}
                      {a.inspector_nombre ? <p className="text-xs">{a.inspector_nombre}</p> : null}
                    </TD>
                    <TD>
                      <EstadoBadge mapa={ESTADO_ACTA} valor={a.estado} />
                    </TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Imprimir acta ${a.numero}`}>
                          <Link href={`/imprimir/acta/${a.id}`}>
                            <Printer aria-hidden />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Ver acta ${a.numero}`}>
                          <Link href={`/gestion/actas/${a.id}`}>
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
