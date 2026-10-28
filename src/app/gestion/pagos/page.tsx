import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ChartColumn,
  Hourglass,
  Inbox,
  Landmark,
  Plus,
  Receipt,
  SearchX,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard, type StatTone } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import { getCuentas } from "@/lib/data/catalogos";
import {
  esEstadoPago,
  esUuid,
  getBandejaPagos,
  getConteosPorEstado,
  getEmpresasPadron,
  getKpisConciliacion,
  type EstadoPago,
  type FiltrosBandeja,
} from "@/lib/data/pagos";
import { ESTADO_PAGO, MEDIO_PAGO, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatMes, formatPesos, formatRelativo, hoyISO } from "@/lib/domain/formato";
import { urlConPagina } from "@/app/prestador/pagos/_components/url-pagina";
import { PestaniasEstado } from "./_components/pestanias-estado";

export const metadata: Metadata = { title: "Pagos y conciliación" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const RUTA = "/gestion/pagos";
const TONO_CUENTA: StatTone[] = ["verde", "celeste", "violeta"];

function primero(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function BandejaPagosPage({ searchParams }: Props) {
  const sesion = await requerirStaff();
  const puedeConciliar = sesion.perfil.rol === "admin" || sesion.perfil.rol === "control";
  const sp = await searchParams;

  // Por defecto, "A verificar"; si se llega desde la ficha de una empresa (?empresa=), todos sus pagos.
  const empresaCruda = primero(sp.empresa);
  const empresaParam = esUuid(empresaCruda) ? empresaCruda : undefined;
  const predeterminada: EstadoPago | "todos" = empresaParam ? "todos" : "informado";
  const estadoParam = primero(sp.estado);
  const pestania: EstadoPago | "todos" =
    estadoParam === "todos" ? "todos" : esEstadoPago(estadoParam) ? estadoParam : predeterminada;
  const filtros: FiltrosBandeja = {
    estado: pestania === "todos" ? null : pestania,
    cuenta: primero(sp.cuenta),
    empresa: empresaParam,
    desde: primero(sp.desde),
    hasta: primero(sp.hasta),
    q: primero(sp.q),
  };
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);

  const [{ pagos, total }, conteos, kpis, cuentas, empresas] = await Promise.all([
    getBandejaPagos(filtros, { desde, hasta }),
    getConteosPorEstado(filtros),
    getKpisConciliacion(),
    getCuentas(),
    getEmpresasPadron(),
  ]);
  // La página pedida quedó vacía (p. ej. se concilió el único pago de la última página): ir a la última.
  if (pagos.length === 0 && total > 0 && pagina > 1) redirect(urlConPagina(RUTA, sp, Math.ceil(total / tamanio)));

  const mes = formatMes(hoyISO());
  const empresaFiltrada = filtros.empresa ? empresas.find((e) => e.id === filtros.empresa) : undefined;
  const hayFiltros = Boolean(filtros.cuenta || filtros.empresa || filtros.desde || filtros.hasta || filtros.q);

  return (
    <>
      <PageHeader
        title="Pagos y conciliación"
        description="Verificá las transferencias, boletas y pagos electrónicos contra las cuentas 505 y 091 del Banco Macro. Al verificar, cada certificado recibe su sello digital (Arts. 9.º b y 11.º, Ord. 2681/98)."
        icon={Receipt}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Control y timbrado" }, { label: "Pagos" }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/gestion/reportes/recaudacion">
                <ChartColumn aria-hidden />
                Recaudación
              </Link>
            </Button>
            {puedeConciliar ? (
              <Button asChild>
                <Link href={`${RUTA}/nuevo`}>
                  <Plus aria-hidden />
                  Registrar otro concepto
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monto a verificar"
          value={kpis.aVerificar.monto}
          format="currency"
          icon={Inbox}
          tone="azul"
          hint={
            kpis.aVerificar.cantidad === 0
              ? "bandeja al día"
              : `${kpis.aVerificar.cantidad} ${kpis.aVerificar.cantidad === 1 ? "pago" : "pagos"} · el más antiguo ${formatRelativo(kpis.aVerificar.masAntiguo)}`
          }
          href={RUTA}
        />
        {cuentas.slice(0, 2).map((c, i) => {
          const dato = kpis.verificadoMes[c.codigo] ?? { monto: 0, cantidad: 0 };
          return (
            <StatCard
              key={c.id}
              label={`Verificado en ${mes} · ${c.codigo}`}
              value={dato.monto}
              format="currency"
              icon={Landmark}
              tone={TONO_CUENTA[i] ?? "verde"}
              hint={`${dato.cantidad} ${dato.cantidad === 1 ? "pago" : "pagos"} · ${c.codigo === "505" ? "timbrado y tanques" : "otros conceptos"}`}
              href={`${RUTA}?estado=verificado&cuenta=${encodeURIComponent(c.codigo)}`}
            />
          );
        })}
        <StatCard
          label="Liquidaciones sin pagar"
          value={kpis.pendientesDePago}
          icon={Hourglass}
          tone="ambar"
          hint="generadas y aún no informadas"
          href={`${RUTA}?estado=pendiente`}
        />
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <PestaniasEstado actual={pestania} predeterminada={predeterminada} conteos={conteos} params={sp} ruta={RUTA} />

        <SectionCard
          title={
            pestania === "todos"
              ? "Todos los pagos"
              : pestania === "informado"
                ? "Pagos a verificar"
                : `Pagos ${ESTADO_PAGO[pestania].label.toLowerCase()}`
          }
          description={
            empresaFiltrada
              ? `De ${empresaFiltrada.nombre_comercial} · ${total.toLocaleString("es-AR")} resultados`
              : pestania === "informado"
                ? "Ordenados por fecha de aviso: atendé primero los más antiguos."
                : `${total.toLocaleString("es-AR")} resultados`
          }
          icon={Wallet}
          flush
          footer={
            total > 0 ? (
              <Paginacion className="w-full" pagina={pagina} total={total} tamanio={tamanio} params={sp} ruta={RUTA} />
            ) : null
          }
        >
          <div className="border-b border-border bg-subtle/60 px-5 py-3 sm:px-6">
            <FiltrosUrl
              campos={[
                { tipo: "busqueda", nombre: "q", placeholder: "Buscá por código, empresa, CUIT u operación…" },
                {
                  tipo: "select",
                  nombre: "cuenta",
                  etiqueta: "Cuenta",
                  opciones: cuentas.map((c) => ({ valor: c.codigo, label: `Cuenta ${c.codigo}` })),
                  className: "sm:w-40",
                },
                {
                  tipo: "select",
                  nombre: "empresa",
                  etiqueta: "Empresa",
                  opciones: empresas.map((e) => ({ valor: e.id, label: e.nombre_comercial })),
                  className: "sm:w-56",
                },
                { tipo: "fecha", nombre: "desde", etiqueta: "Pagado desde" },
                { tipo: "fecha", nombre: "hasta", etiqueta: "hasta" },
              ]}
            />
          </div>

          {pagos.length === 0 ? (
            <div className="p-5 sm:p-6">
              {hayFiltros ? (
                <EmptyState
                  compact
                  icon={SearchX}
                  title="No hay pagos con esos filtros"
                  description="Probá con otra cuenta, empresa o rango de fechas."
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link href={pestania === "informado" ? RUTA : `${RUTA}?estado=${pestania}`}>
                        Limpiar filtros
                      </Link>
                    </Button>
                  }
                />
              ) : pestania === "informado" ? (
                <EmptyState
                  compact
                  icon={Inbox}
                  title="No hay pagos a verificar"
                  description="Cuando una empresa informe una transferencia, aparece acá para conciliarla."
                />
              ) : (
                <EmptyState compact icon={Receipt} title="Sin pagos en este estado" />
              )}
            </div>
          ) : (
            <>
              {/* Móvil: tarjetas */}
              <ul className="divide-y divide-border md:hidden" role="list">
                {pagos.map((p) => {
                  const nombre = p.empresa_nombre ?? p.contribuyente ?? "Sin contribuyente";
                  const conciliable = p.estado === "informado" && puedeConciliar;
                  return (
                    <li key={p.id ?? p.codigo}>
                      <Link
                        href={`${RUTA}/${p.id}`}
                        className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-azul-50/50 focus-visible:bg-azul-50/50"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">{nombre}</span>
                            <span className="font-mono text-[12px] font-semibold text-azul-700">{p.codigo ?? "—"}</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block font-display text-base font-bold text-foreground nums-tabular">
                              {formatPesos(p.importe_total)}
                            </span>
                            {p.cuenta_codigo ? (
                              <Badge tone={p.cuenta_codigo === "505" ? "azul" : "violeta"} size="sm">
                                Cuenta {p.cuenta_codigo}
                              </Badge>
                            ) : null}
                          </span>
                        </span>
                        <span className="line-clamp-1 text-[13px] text-muted-foreground">
                          {p.cantidad ?? 0} × {p.arancel_concepto ?? "Arancel"}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                          {p.fecha_pago ? <span>{etiqueta(MEDIO_PAGO, p.medio).label}</span> : null}
                          {p.numero_operacion ? <span className="font-mono">Op. {p.numero_operacion}</span> : null}
                          {p.fecha_pago ? <span>Pagado el {formatFecha(p.fecha_pago)}</span> : null}
                          {p.informado_at ? <span>Informado {formatRelativo(p.informado_at)}</span> : null}
                        </span>
                        <span className="flex items-center justify-between gap-3">
                          <EstadoBadge mapa={ESTADO_PAGO} valor={p.estado} size="sm" />
                          <span
                            className={
                              conciliable
                                ? "inline-flex items-center gap-1 text-[13px] font-semibold text-azul-700"
                                : "inline-flex items-center gap-1 text-[13px] text-muted-foreground"
                            }
                          >
                            {conciliable ? "Conciliar" : "Ver detalle"}
                            <ArrowRight className="size-3.5" aria-hidden />
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {/* Escritorio: tabla */}
              <Table framed={false} containerClassName="hidden md:block">
                <THead>
                  <TR>
                    <TH>Contribuyente</TH>
                    <TH>Liquidación</TH>
                    <TH>Concepto</TH>
                    <TH numeric>Cant.</TH>
                    <TH numeric>Total</TH>
                    <TH>Medio</TH>
                    <TH>N.º operación</TH>
                    <TH>Fecha de pago</TH>
                    <TH>Informado</TH>
                    {pestania === "todos" ? <TH>Estado</TH> : null}
                    <TH>
                      <span className="sr-only">Acciones</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {pagos.map((p) => {
                    const nombre = p.empresa_nombre ?? p.contribuyente ?? "Sin contribuyente";
                    const cuit = p.empresa_cuit ?? p.contribuyente_cuit;
                    return (
                      <TR key={p.id ?? p.codigo}>
                        <TD className="max-w-56">
                          <span className="line-clamp-1 font-medium" title={nombre}>
                            {nombre}
                          </span>
                          {cuit ? <span className="text-xs text-muted-foreground nums-tabular">{cuit}</span> : null}
                        </TD>
                        <TD className="font-mono text-[13px] font-semibold whitespace-nowrap">
                          <Link href={`${RUTA}/${p.id}`} className="text-azul-700 hover:underline">
                            {p.codigo ?? "—"}
                          </Link>
                        </TD>
                        <TD className="max-w-60">
                          <span className="line-clamp-1" title={p.arancel_concepto ?? undefined}>
                            {p.arancel_concepto}
                          </span>
                          {p.cuenta_codigo ? (
                            <Badge tone={p.cuenta_codigo === "505" ? "azul" : "violeta"} size="sm" className="mt-0.5">
                              Cuenta {p.cuenta_codigo}
                            </Badge>
                          ) : null}
                        </TD>
                        <TD numeric>{p.cantidad ?? "—"}</TD>
                        <TD numeric className="font-semibold whitespace-nowrap">
                          {formatPesos(p.importe_total)}
                        </TD>
                        <TD className="whitespace-nowrap text-muted-foreground">
                          {p.fecha_pago ? etiqueta(MEDIO_PAGO, p.medio).label : "—"}
                        </TD>
                        <TD className="font-mono text-[13px] whitespace-nowrap">{p.numero_operacion ?? "—"}</TD>
                        <TD className="whitespace-nowrap">{formatFecha(p.fecha_pago)}</TD>
                        <TD
                          className="whitespace-nowrap text-muted-foreground"
                          title={p.informado_at ? formatFechaHora(p.informado_at) : undefined}
                        >
                          {p.informado_at ? formatRelativo(p.informado_at) : "—"}
                        </TD>
                        {pestania === "todos" ? (
                          <TD>
                            <EstadoBadge mapa={ESTADO_PAGO} valor={p.estado} size="sm" />
                          </TD>
                        ) : null}
                        <TD align="right">
                          <Button asChild variant={p.estado === "informado" && puedeConciliar ? "secondary" : "ghost"} size="sm">
                            <Link
                              href={`${RUTA}/${p.id}`}
                              aria-label={`${p.estado === "informado" && puedeConciliar ? "Conciliar" : "Ver"} ${p.codigo ?? "pago"}`}
                            >
                              {p.estado === "informado" && puedeConciliar ? "Conciliar" : "Ver"}
                              <ArrowRight aria-hidden />
                            </Link>
                          </Button>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </>
          )}
        </SectionCard>
      </div>
    </>
  );
}
