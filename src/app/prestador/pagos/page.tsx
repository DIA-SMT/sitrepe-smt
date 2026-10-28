import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Hourglass,
  Landmark,
  ReceiptText,
  Stamp,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirEmpresa } from "@/lib/auth";
import { getArancelesVigentes } from "@/lib/data/catalogos";
import {
  ARANCEL_POR_TIPO,
  ESTADOS_PAGO,
  esEstadoPago,
  getCertificadosParaTimbrar,
  getPagosEmpresa,
  getResumenPagosEmpresa,
  type CertificadoParaTimbrar,
  type TipoServicio,
} from "@/lib/data/pagos";
import { ESTADO_PAGO, TIPO_SERVICIO } from "@/lib/domain/etiquetas";
import { formatFecha, formatPesos, formatRelativo, hoyISO } from "@/lib/domain/formato";
import { PasosTimbrado } from "./_components/pasos-timbrado";
import { SelectorTimbrado, type CertificadoSeleccionable } from "./_components/selector-timbrado";
import { urlConPagina } from "./_components/url-pagina";

export const metadata: Metadata = { title: "Pagos y timbrado" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const RUTA = "/prestador/pagos";
const TIPOS: TipoServicio[] = ["fumigacion", "tanque"];

function primero(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function aSeleccionable(c: CertificadoParaTimbrar): CertificadoSeleccionable | null {
  if (!c.id) return null;
  return {
    id: c.id,
    numero: c.numero ?? "s/n",
    cliente: c.cliente ?? "Sin cliente",
    domicilio: c.domicilio ?? "Sin domicilio",
    rubro: c.rubro_nombre,
    fechaServicio: c.fecha_servicio,
    declaracion: c.declaracion_codigo,
  };
}

export default async function PagosPrestadorPage({ searchParams }: Props) {
  const { empresa } = await requerirEmpresa();
  const sp = await searchParams;
  const estadoParam = primero(sp.estado);
  const estado = esEstadoPago(estadoParam) ? estadoParam : undefined;
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);

  const [certificados, aranceles, resumen, { pagos, total }] = await Promise.all([
    getCertificadosParaTimbrar(empresa.id),
    getArancelesVigentes(),
    getResumenPagosEmpresa(empresa.id),
    getPagosEmpresa(empresa.id, { estado, desde, hasta }),
  ]);
  // La página pedida quedó vacía (p. ej. se anuló la única liquidación de la última página): ir a la última.
  if (pagos.length === 0 && total > 0 && pagina > 1) redirect(urlConPagina(RUTA, sp, Math.ceil(total / tamanio)));

  const grupos = TIPOS.map((tipo) => {
    const arancel = aranceles.find((a) => a.codigo === ARANCEL_POR_TIPO[tipo]) ?? null;
    return {
      tipo,
      titulo: TIPO_SERVICIO[tipo].label,
      arancel: arancel
        ? {
            concepto: arancel.concepto,
            importe: Number(arancel.importe),
            unidad: arancel.unidad,
            ordenanza: arancel.ordenanza,
            articulo: arancel.articulo,
            cuenta: arancel.cuenta?.codigo ?? null,
          }
        : null,
      certificados: certificados
        .filter((c) => c.tipo === tipo)
        .map(aSeleccionable)
        .filter((c): c is CertificadoSeleccionable => c !== null),
    };
  }).filter((g) => g.certificados.length > 0);

  const anio = hoyISO().slice(0, 4);

  return (
    <>
      <PageHeader
        title="Pagos y timbrado"
        description="Liquidá el arancel de los certificados controlados, informá el pago y seguí la verificación. El sellado digital se aplica cuando la Dirección acredita el pago (Art. 9.º b, Ord. 2681/98; Ord. Tarifaria 5487)."
        icon={Stamp}
        breadcrumb={[{ label: "Inicio", href: "/prestador" }, { label: "Pagos y timbrado" }]}
        actions={
          <Button asChild variant="outline">
            <Link href="/prestador/certificados">
              <BadgeCheck aria-hidden />
              Mis certificados
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Listos para timbrar"
          value={certificados.length}
          icon={BadgeCheck}
          tone="celeste"
          hint="certificados controlados sin liquidar"
        />
        <StatCard
          label="A pagar"
          value={resumen.aPagar.monto}
          format="currency"
          icon={Wallet}
          tone="ambar"
          hint={
            resumen.aPagar.cantidad === 0
              ? "sin liquidaciones pendientes"
              : `${resumen.aPagar.cantidad} ${resumen.aPagar.cantidad === 1 ? "liquidación" : "liquidaciones"}`
          }
          href={resumen.aPagar.cantidad > 0 ? `${RUTA}?estado=pendiente` : undefined}
        />
        <StatCard
          label="En verificación"
          value={resumen.enVerificacion.monto}
          format="currency"
          icon={Hourglass}
          tone="azul"
          hint={
            resumen.enVerificacion.cantidad === 0
              ? "nada a la espera"
              : `${resumen.enVerificacion.cantidad} ${resumen.enVerificacion.cantidad === 1 ? "pago informado" : "pagos informados"}`
          }
          href={resumen.enVerificacion.cantidad > 0 ? `${RUTA}?estado=informado` : undefined}
        />
        <StatCard
          label={`Pagado en ${anio}`}
          value={resumen.pagadoAnio.monto}
          format="currency"
          icon={Stamp}
          tone="verde"
          hint={
            resumen.pagadoAnio.unidades === 1
              ? "1 certificado sellado"
              : `${resumen.pagadoAnio.unidades.toLocaleString("es-AR")} certificados sellados`
          }
          href={resumen.pagadoAnio.cantidad > 0 ? `${RUTA}?estado=verificado` : undefined}
        />
      </div>

      {resumen.rechazados > 0 ? (
        <Alert
          tone="danger"
          className="mt-6"
          title={
            resumen.rechazados === 1
              ? "Tenés una liquidación con el pago rechazado"
              : `Tenés ${resumen.rechazados} liquidaciones con el pago rechazado`
          }
          action={
            <Button asChild size="sm" variant="outline">
              <Link href={`${RUTA}?estado=rechazado`}>Revisar</Link>
            </Button>
          }
        >
          Consultá el motivo y volvé a informar el pago con los datos correctos.
        </Alert>
      ) : null}

      <section aria-labelledby="titulo-listos" className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="titulo-listos" className="font-display text-lg font-semibold text-foreground">
            Certificados listos para timbrar
          </h2>
          <p className="text-sm text-muted-foreground">
            Control de Empresas ya los cotejó con la planilla. Se liquidan por separado los de fumigación y los de
            limpieza de tanques.
          </p>
        </div>
        <PasosTimbrado />
        {grupos.length === 0 ? (
          <EmptyState
            compact
            icon={ClipboardList}
            title="No tenés certificados listos para timbrar"
            description="Cuando Control de Empresas verifique tus declaraciones, los certificados controlados aparecen acá para liquidar el arancel."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/prestador/declaraciones">
                  Ver mis declaraciones
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
          />
        ) : (
          grupos.map((g) => (
            <SelectorTimbrado key={g.tipo} tipo={g.tipo} titulo={g.titulo} arancel={g.arancel} certificados={g.certificados} />
          ))
        )}
      </section>

      <SectionCard
        id="liquidaciones"
        className="mt-8"
        title="Mis liquidaciones"
        description="Liquidaciones de timbrado y otros aranceles de tu empresa."
        icon={ReceiptText}
        flush
        actions={
          <FiltrosUrl
            campos={[
              {
                tipo: "select",
                nombre: "estado",
                etiqueta: "Estado",
                opciones: ESTADOS_PAGO.map((e) => ({ valor: e, label: ESTADO_PAGO[e].label })),
              },
            ]}
          />
        }
        footer={
          total > 0 ? <Paginacion className="w-full" pagina={pagina} total={total} tamanio={tamanio} params={sp} ruta={RUTA} /> : null
        }
      >
        {pagos.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              compact
              icon={Landmark}
              title={estado ? `No hay liquidaciones en estado "${ESTADO_PAGO[estado].label.toLowerCase()}"` : "Todavía no generaste liquidaciones"}
              description={
                estado
                  ? "Probá con otro estado o limpiá el filtro."
                  : "Seleccioná certificados listos para timbrar y generá tu primera liquidación."
              }
            />
          </div>
        ) : (
          <>
            {/* Móvil: tarjetas */}
            <ul className="divide-y divide-border sm:hidden" role="list">
              {pagos.map((p) => (
                <li key={p.id ?? p.codigo}>
                  <Link
                    href={`${RUTA}/${p.id}`}
                    className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-azul-50/50 focus-visible:bg-azul-50/50"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[13px] font-semibold text-azul-700">{p.codigo ?? "—"}</span>
                      <EstadoBadge mapa={ESTADO_PAGO} valor={p.estado} size="sm" />
                    </span>
                    <span className="text-sm font-medium text-foreground">{p.arancel_concepto}</span>
                    <span className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
                      <span>
                        {p.cantidad ?? 0} × {formatPesos(p.importe_unitario)} · {formatFecha(p.created_at)}
                      </span>
                      <span className="font-semibold text-foreground nums-tabular">{formatPesos(p.importe_total)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {/* Escritorio: tabla */}
            <Table framed={false} containerClassName="hidden sm:block">
              <THead>
                <TR>
                  <TH>Liquidación</TH>
                  <TH>Concepto</TH>
                  <TH numeric>Cant.</TH>
                  <TH numeric>Total</TH>
                  <TH>Cuenta</TH>
                  <TH>Estado</TH>
                  <TH>Generada</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {pagos.map((p) => (
                  <TR key={p.id ?? p.codigo}>
                    <TD className="font-mono text-[13px] font-semibold whitespace-nowrap">
                      <Link href={`${RUTA}/${p.id}`} className="text-azul-700 hover:underline">
                        {p.codigo ?? "—"}
                      </Link>
                    </TD>
                    <TD className="max-w-64">
                      <span className="line-clamp-2">{p.arancel_concepto}</span>
                    </TD>
                    <TD numeric>{p.cantidad ?? "—"}</TD>
                    <TD numeric className="font-semibold whitespace-nowrap">
                      {formatPesos(p.importe_total)}
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{p.cuenta_codigo ?? "—"}</TD>
                    <TD>
                      <EstadoBadge mapa={ESTADO_PAGO} valor={p.estado} />
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground" title={formatFecha(p.created_at)}>
                      {formatRelativo(p.created_at)}
                    </TD>
                    <TD align="right">
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={`${RUTA}/${p.id}`}
                          aria-label={`${p.estado === "pendiente" || p.estado === "rechazado" ? "Informar pago de la" : "Ver"} liquidación ${p.codigo ?? ""}`}
                        >
                          {p.estado === "pendiente" || p.estado === "rechazado" ? "Informar pago" : "Ver"}
                          <ArrowRight aria-hidden />
                        </Link>
                      </Button>
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
