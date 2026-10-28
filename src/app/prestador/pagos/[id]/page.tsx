import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CircleCheckBig,
  FileText,
  History,
  Hourglass,
  Paperclip,
  Printer,
  ReceiptText,
  Send,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirEmpresa } from "@/lib/auth";
import { getCertificadosDePago, getCuenta, getPago, type MedioPago } from "@/lib/data/pagos";
import { ESTADO_CERTIFICADO, ESTADO_PAGO, MEDIO_PAGO, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatRelativo, hoyISO } from "@/lib/domain/formato";
import { urlFirmada } from "@/lib/storage";
import { AnularLiquidacion } from "../_components/anular-liquidacion";
import { DatosCuenta } from "../_components/datos-cuenta";
import { HistorialPago } from "../_components/historial-pago";
import { InformarPagoForm } from "../_components/informar-pago";
import { ResumenImporte } from "../_components/resumen-importe";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pago = await getPago(id);
  return { title: pago?.codigo ? `Liquidación ${pago.codigo}` : "Liquidación" };
}

export default async function LiquidacionPrestadorPage({ params, searchParams }: Props) {
  const { empresa } = await requerirEmpresa();
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const pago = await getPago(id);
  if (!pago || !pago.id || pago.empresa_id !== empresa.id) notFound();

  const [certificados, cuenta, urlComprobante] = await Promise.all([
    getCertificadosDePago(pago.id),
    getCuenta(pago.cuenta_id),
    urlFirmada("comprobantes", pago.comprobante_path),
  ]);

  const estado = pago.estado;
  const puedeInformar = estado === "pendiente" || estado === "rechazado";
  const recienGenerada = sp.generada === "1" && estado === "pendiente";
  const recienInformado = sp.informado === "1" && estado === "informado";
  const mediosCuenta: MedioPago[] = cuenta?.medios_pago.length ? cuenta.medios_pago : ["transferencia"];
  const medios = mediosCuenta.map((m) => ({ valor: m, label: MEDIO_PAGO[m].label }));
  const codigo = pago.codigo ?? "s/n";

  return (
    <>
      <PageHeader
        title={`Liquidación ${codigo}`}
        description={pago.arancel_concepto ?? undefined}
        icon={ReceiptText}
        breadcrumb={[
          { label: "Inicio", href: "/prestador" },
          { label: "Pagos y timbrado", href: "/prestador/pagos" },
          { label: codigo },
        ]}
        actions={
          <>
            <AnularLiquidacion pagoId={pago.id} codigo={codigo} mostrarBoton={puedeInformar} />
            <Button asChild variant="outline">
              <Link href={`/imprimir/liquidacion/${pago.id}`}>
                <Printer aria-hidden />
                Imprimir liquidación
              </Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_PAGO} valor={estado} size="lg" pulse={estado === "informado"} />
          {pago.cuenta_codigo ? (
            <Badge tone="neutral" variant="outline" size="lg">
              Cuenta {pago.cuenta_codigo}
            </Badge>
          ) : null}
          <span className="text-[13px] text-muted-foreground">Generada {formatRelativo(pago.created_at)}</span>
        </div>
      </PageHeader>

      {recienGenerada ? (
        <Alert tone="success" title="Liquidación generada" className="mb-6">
          Transferí el importe a la cuenta indicada y después informá el pago con el comprobante para que la Dirección
          selle tus certificados.
        </Alert>
      ) : recienInformado ? (
        <Alert tone="success" title="Pago informado" className="mb-6">
          La Dirección va a conciliar la acreditación con el banco y, al verificarla, sellará tus certificados. Podés
          seguir el estado desde esta pantalla o desde Pagos y timbrado.
        </Alert>
      ) : null}

      {/* En móvil primero el importe y la cuenta (hacen falta para pagar); en escritorio, columna derecha. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
        <aside className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-1" aria-label="Importe y datos de pago">
          <ResumenImporte
            titulo={estado === "verificado" ? "Total abonado" : estado === "anulado" ? "Importe anulado" : "Total a pagar"}
            total={pago.importe_total}
            cantidad={pago.cantidad}
            unitario={pago.importe_unitario}
            concepto={pago.arancel_concepto}
            ordenanza={pago.arancel_ordenanza}
            articulo={pago.arancel_articulo}
          />
          {estado !== "anulado" ? (
            <DatosCuenta
              cuenta={cuenta}
              codigo={pago.cuenta_codigo}
              banco={pago.cuenta_banco}
              cbu={pago.cuenta_cbu}
              nombre={pago.cuenta_nombre}
              instrucciones={puedeInformar}
            />
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {estado === "rechazado" ? (
            <Alert tone="danger" title="La Dirección rechazó el pago informado">
              <p className="whitespace-pre-line">{pago.observaciones ?? "Sin observaciones."}</p>
              <p className="mt-1">Corregí los datos y volvé a informar el pago.</p>
            </Alert>
          ) : null}

          {puedeInformar ? (
            <SectionCard
              title={estado === "rechazado" ? "Volvé a informar el pago" : "Informar pago"}
              description="Una vez que pagaste, cargá los datos de la operación y el comprobante."
              icon={Send}
            >
              <InformarPagoForm
                pagoId={pago.id}
                empresaId={empresa.id}
                hoy={hoyISO()}
                medios={medios}
                reintento={estado === "rechazado"}
              />
            </SectionCard>
          ) : null}

          {estado === "informado" ? (
            <SectionCard
              title="Pago en verificación"
              description={`Informado ${formatRelativo(pago.informado_at)}. La Dirección concilia la acreditación con el banco.`}
              icon={Hourglass}
              actions={
                urlComprobante ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={urlComprobante} target="_blank" rel="noopener noreferrer">
                      <Paperclip aria-hidden />
                      Ver comprobante
                    </a>
                  </Button>
                ) : null
              }
            >
              <KeyValue
                columns={3}
                items={[
                  { label: "Medio", value: etiqueta(MEDIO_PAGO, pago.medio).label },
                  { label: "N.º de operación", value: pago.numero_operacion },
                  { label: "Fecha de pago", value: formatFecha(pago.fecha_pago) },
                ]}
              />
            </SectionCard>
          ) : null}

          {estado === "verificado" ? (
            <div className="relative overflow-hidden rounded-card border border-emerald-200 bg-success-soft p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success text-white shadow-[0_10px_24px_-12px_rgb(14_124_85/0.8)]"
                >
                  <CircleCheckBig className="size-6" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <h2 className="font-display text-lg font-semibold text-emerald-900">
                    {certificados.length > 0 ? "Pago verificado: certificados timbrados" : "Pago verificado"}
                  </h2>
                  <p className="text-sm text-emerald-900/80">
                    Verificado el {formatFechaHora(pago.verificado_at)}.{" "}
                    {certificados.length > 0
                      ? "Cada certificado tiene su sello digital y ya es válido frente a tus clientes y a los inspectores. Imprimí los tres ejemplares desde la lista de abajo."
                      : "La Dirección acreditó el pago de este concepto."}
                  </p>
                  {urlComprobante ? (
                    <a
                      href={urlComprobante}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-emerald-800 underline-offset-4 hover:underline"
                    >
                      <Paperclip className="size-3.5" aria-hidden />
                      Ver comprobante informado
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {estado === "anulado" ? (
            <Alert
              tone="info"
              title="Liquidación anulada"
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/prestador/pagos">
                    <ArrowLeft aria-hidden />
                    Volver a pagos
                  </Link>
                </Button>
              }
            >
              Sus certificados quedaron liberados: podés incluirlos en una nueva liquidación.
            </Alert>
          ) : null}

          <SectionCard
            title="Certificados incluidos"
            description={
              certificados.length > 0
                ? `${certificados.length} ${certificados.length === 1 ? "certificado" : "certificados"} · se cobra una vez por certificado, no por ejemplar`
                : undefined
            }
            icon={BadgeCheck}
            flush
          >
            {certificados.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState
                  compact
                  icon={FileText}
                  title="Sin certificados vinculados"
                  description={
                    estado === "anulado"
                      ? "Al anular la liquidación, los certificados se liberaron."
                      : "Esta liquidación corresponde a un arancel que no se vincula con certificados."
                  }
                />
              </div>
            ) : (
              <Table framed={false}>
                <THead>
                  <TR>
                    <TH>N.º</TH>
                    <TH>Cliente</TH>
                    <TH className="hidden md:table-cell">Domicilio</TH>
                    <TH>Servicio</TH>
                    <TH>{estado === "verificado" ? "Sello digital" : "Estado"}</TH>
                    <TH>
                      <span className="sr-only">Acciones</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {certificados.map((c) => (
                    <TR key={c.id ?? c.numero}>
                      <TD className="font-mono text-[13px] font-semibold whitespace-nowrap text-azul-700">{c.numero}</TD>
                      <TD className="max-w-56">
                        <span className="line-clamp-1 font-medium">{c.cliente}</span>
                        {c.rubro_nombre ? (
                          <span className="line-clamp-1 text-xs text-muted-foreground">{c.rubro_nombre}</span>
                        ) : null}
                      </TD>
                      <TD className="hidden max-w-56 text-muted-foreground md:table-cell">
                        <span className="line-clamp-1">{c.domicilio}</span>
                      </TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{formatFecha(c.fecha_servicio)}</TD>
                      <TD className="whitespace-nowrap">
                        {c.sello_codigo ? (
                          <Badge tone="verde" variant="solid" size="sm" className="font-mono">
                            {c.sello_codigo}
                          </Badge>
                        ) : (
                          <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" />
                        )}
                      </TD>
                      <TD align="right" className="whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          {c.estado === "timbrado" ? (
                            <Button asChild variant="ghost" size="icon-sm">
                              <Link
                                href={`/imprimir/certificado/${c.id}?ejemplar=todos`}
                                aria-label={`Imprimir certificado N.º ${c.numero ?? ""}`}
                                title="Imprimir los tres ejemplares"
                              >
                                <Printer aria-hidden />
                              </Link>
                            </Button>
                          ) : null}
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/prestador/certificados/${c.id}`}>Ver</Link>
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Historial" icon={History} className="min-w-0 lg:col-start-2 lg:row-start-2">
          <HistorialPago pago={pago} />
        </SectionCard>
      </div>
    </>
  );
}
