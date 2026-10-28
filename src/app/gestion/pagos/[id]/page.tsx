import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftRight,
  BadgeCheck,
  Building2,
  CircleCheckBig,
  FileText,
  History,
  Paperclip,
  Printer,
  Receipt,
  ShieldCheck,
  UserRound,
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
import { requerirStaff } from "@/lib/auth";
import {
  getCertificadosDePago,
  getCuenta,
  getNombrePerfil,
  getPago,
  getPagosMismaOperacion,
  type MedioPago,
} from "@/lib/data/pagos";
import { ESTADO_CERTIFICADO, ESTADO_PAGO, MEDIO_PAGO, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatPesos, formatRelativo, hoyISO } from "@/lib/domain/formato";
import { urlFirmada } from "@/lib/storage";
import { HistorialPago } from "@/app/prestador/pagos/_components/historial-pago";
import { ResumenImporte } from "@/app/prestador/pagos/_components/resumen-importe";
import { AccionesConciliacion } from "../_components/acciones-conciliacion";
import { Chequeos, type Chequeo } from "../_components/chequeos";
import { VisorComprobante } from "../_components/visor-comprobante";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pago = await getPago(id);
  return { title: pago?.codigo ? `Pago ${pago.codigo}` : "Pago" };
}

export default async function ConciliacionPagoPage({ params, searchParams }: Props) {
  const sesion = await requerirStaff();
  const puedeConciliar = sesion.perfil.rol === "admin" || sesion.perfil.rol === "control";
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const pago = await getPago(id);
  if (!pago || !pago.id) notFound();

  const [certificados, cuenta, urlComprobante, duplicados, verificador] = await Promise.all([
    getCertificadosDePago(pago.id),
    getCuenta(pago.cuenta_id),
    urlFirmada("comprobantes", pago.comprobante_path),
    getPagosMismaOperacion(pago),
    getNombrePerfil(pago.verificado_por),
  ]);

  const codigo = pago.codigo ?? "s/n";
  const estado = pago.estado;
  const contribuyente = pago.empresa_nombre ?? pago.contribuyente ?? "Sin contribuyente";
  const cuit = pago.empresa_cuit ?? pago.contribuyente_cuit;
  const mediosCuenta: MedioPago[] = cuenta?.medios_pago.length ? cuenta.medios_pago : ["transferencia"];
  const informado = Boolean(pago.informado_at || pago.fecha_pago);
  const timbrados = certificados.filter((c) => c.sello_codigo);

  // Controles automáticos de la conciliación.
  const chequeos: Chequeo[] = [];
  if (informado) {
    chequeos.push(
      pago.medio && mediosCuenta.includes(pago.medio)
        ? { resultado: "ok", titulo: `Medio admitido por la cuenta ${pago.cuenta_codigo ?? ""}`.trim() }
        : {
            resultado: "error",
            titulo: "El medio informado no corresponde a la cuenta",
            detalle: `La cuenta ${pago.cuenta_codigo ?? ""} admite: ${mediosCuenta.map((m) => MEDIO_PAGO[m].label.toLowerCase()).join(", ")}.`,
          },
    );
    if (pago.fecha_pago && pago.created_at) {
      // Día de la liquidación en hora de Tucumán (created_at es UTC: de 21 a 24 h ya sería el día siguiente).
      const generada = hoyISO(new Date(pago.created_at));
      chequeos.push(
        pago.fecha_pago >= generada
          ? { resultado: "ok", titulo: "Fecha de pago posterior a la liquidación" }
          : {
              resultado: "alerta",
              titulo: "El pago es anterior a la liquidación",
              detalle: `Pagado el ${formatFecha(pago.fecha_pago)}; liquidación generada el ${formatFecha(pago.created_at)}. Confirmá que el importe coincida.`,
            },
      );
    }
    chequeos.push(
      pago.comprobante_path
        ? { resultado: "ok", titulo: "Comprobante adjunto" }
        : {
            resultado: "alerta",
            titulo: "Sin comprobante adjunto",
            detalle: "Verificá el N.º de operación en el extracto de la cuenta.",
          },
    );
    if (pago.numero_operacion) {
      chequeos.push(
        duplicados.length === 0
          ? { resultado: "ok", titulo: "N.º de operación sin repetir" }
          : {
              resultado: "error",
              titulo: "N.º de operación ya informado en otro pago",
              detalle: (
                <span className="flex flex-wrap gap-x-2 gap-y-1">
                  {duplicados.map((d) => (
                    <Link key={d.id} href={`/gestion/pagos/${d.id}`} className="font-medium text-azul-700 hover:underline">
                      {d.codigo} ({d.empresa_nombre ?? d.contribuyente ?? "—"}, {etiqueta(ESTADO_PAGO, d.estado).label.toLowerCase()})
                    </Link>
                  ))}
                </span>
              ),
            },
      );
    }
  }

  return (
    <>
      <PageHeader
        title={`Pago ${codigo}`}
        description={`${contribuyente} · ${pago.arancel_concepto ?? "Arancel"}`}
        icon={Receipt}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Pagos", href: "/gestion/pagos" },
          { label: codigo },
        ]}
        actions={
          <>
            {pago.empresa_id ? (
              <Button asChild variant="outline">
                <Link href={`/gestion/empresas/${pago.empresa_id}`}>
                  <Building2 aria-hidden />
                  Ficha de la empresa
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/imprimir/liquidacion/${pago.id}`}>
                <Printer aria-hidden />
                Imprimir
              </Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_PAGO} valor={estado} size="lg" pulse={estado === "informado"} />
          {pago.cuenta_codigo ? (
            <Badge tone={pago.cuenta_codigo === "505" ? "azul" : "violeta"} size="lg">
              Cuenta {pago.cuenta_codigo}
            </Badge>
          ) : null}
          {informado && pago.medio ? (
            <Badge tone={MEDIO_PAGO[pago.medio].tono} variant="outline" size="lg">
              {MEDIO_PAGO[pago.medio].label}
            </Badge>
          ) : null}
        </div>
      </PageHeader>

      {sp.registrado === "1" ? (
        <Alert tone="success" title="Pago registrado y verificado" className="mb-6">
          El pago quedó conciliado en la cuenta {pago.cuenta_codigo ?? ""} y se incluirá en el informe de recaudación del mes.
        </Alert>
      ) : sp.registrado === "pendiente" && estado === "pendiente" ? (
        <Alert tone="warning" title="El pago se registró pero no se pudo verificar" className="mb-6">
          Revisá los datos y verificalo desde esta pantalla.
        </Alert>
      ) : null}

      {puedeConciliar ? (
        <div className="mb-6 flex flex-col gap-4 overflow-hidden rounded-card border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
            >
              <ArrowLeftRight className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-foreground">
                {estado === "informado"
                  ? "Conciliá este pago"
                  : estado === "pendiente"
                    ? "Liquidación sin pago informado"
                    : estado === "verificado"
                      ? "Pago conciliado"
                      : estado === "rechazado"
                        ? "Pago rechazado"
                        : "Liquidación anulada"}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {estado === "informado"
                  ? `Compará el importe esperado con la acreditación en la cuenta ${pago.cuenta_codigo ?? ""} y el comprobante.`
                  : estado === "pendiente"
                    ? pago.fecha_pago
                      ? "Tiene fecha de pago registrada: podés verificarlo."
                      : "Si la acreditación ya figura en el extracto, registrá el pago para timbrar los certificados."
                    : estado === "verificado"
                      ? `Verificado ${formatRelativo(pago.verificado_at)}${verificador ? ` por ${verificador}` : ""}.`
                      : estado === "rechazado"
                        ? "La empresa debe volver a informar el pago."
                        : "No admite más acciones."}
              </p>
            </div>
          </div>
          <AccionesConciliacion
            pagoId={pago.id}
            codigo={codigo}
            estado={estado}
            tieneFechaPago={Boolean(pago.fecha_pago)}
            carpetaComprobante={pago.empresa_id ?? "staff"}
            importe={formatPesos(pago.importe_total)}
            cuenta={pago.cuenta_codigo ?? ""}
            cantidadCertificados={certificados.filter((c) => c.estado === "controlado").length}
            medios={mediosCuenta.map((m) => ({ valor: m, label: MEDIO_PAGO[m].label }))}
            hoy={hoyISO()}
          />
        </div>
      ) : (
        <Alert tone="info" title="Solo lectura" className="mb-6">
          La conciliación de pagos la realizan Administración y Control de Empresas y Timbrado.
        </Alert>
      )}

      {estado === "rechazado" && pago.observaciones ? (
        <Alert tone="danger" title="Motivo del rechazo" className="mb-6">
          <p className="whitespace-pre-line">{pago.observaciones}</p>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {estado === "verificado" && timbrados.length > 0 ? (
            <div className="relative overflow-hidden rounded-card border border-emerald-200 bg-success-soft p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success text-white"
                >
                  <CircleCheckBig className="size-6" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div>
                    <h2 className="font-display text-base font-semibold text-emerald-900">Sellos asignados</h2>
                    <p className="text-sm text-emerald-900/80">
                      {timbrados.length === 1 ? "1 certificado timbrado" : `${timbrados.length} certificados timbrados`} el{" "}
                      {formatFechaHora(pago.verificado_at)}.
                    </p>
                  </div>
                  <ul className="flex flex-wrap gap-2" role="list">
                    {timbrados.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/gestion/certificados/${c.id}`}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[13px] ring-1 ring-emerald-200 transition-colors hover:ring-emerald-400"
                        >
                          <span className="font-mono font-semibold text-azul-700">N.º {c.numero}</span>
                          <span className="font-mono text-emerald-800">{c.sello_codigo}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          <SectionCard title="Importe esperado vs. informado" icon={ShieldCheck}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-xl border border-azul-100 bg-azul-50/50 p-4">
                <p className="text-xs font-semibold tracking-wide text-azul-700 uppercase">Esperado</p>
                <p className="font-display text-2xl font-bold tracking-tight text-foreground nums-tabular">
                  {formatPesos(pago.importe_total)}
                </p>
                <KeyValue
                  columns={1}
                  items={[
                    { label: "Cuenta", value: `${pago.cuenta_codigo ?? "—"} · ${pago.cuenta_banco ?? ""}` },
                    {
                      label: "CBU",
                      value: pago.cuenta_cbu ? <span className="font-mono text-[13px] break-all">{pago.cuenta_cbu}</span> : null,
                    },
                    { label: "Liquidada", value: formatFechaHora(pago.created_at) },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-subtle p-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Informado</p>
                {informado ? (
                  <>
                    <p className="font-display text-2xl font-bold tracking-tight text-foreground">
                      {formatFecha(pago.fecha_pago)}
                    </p>
                    <KeyValue
                      columns={1}
                      items={[
                        { label: "Medio", value: etiqueta(MEDIO_PAGO, pago.medio).label },
                        {
                          label: "N.º de operación",
                          value: pago.numero_operacion ? (
                            <span className="font-mono text-[13px]">{pago.numero_operacion}</span>
                          ) : null,
                        },
                        {
                          label: "Aviso",
                          value: pago.informado_at
                            ? `${formatFechaHora(pago.informado_at)} (${formatRelativo(pago.informado_at)})`
                            : "Registrado por la Dirección",
                        },
                      ]}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    La empresa todavía no informó el pago de esta liquidación.
                  </p>
                )}
              </div>
            </div>
            {chequeos.length > 0 ? (
              <div className="mt-5 flex flex-col gap-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Controles automáticos</p>
                <Chequeos items={chequeos} />
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Comprobante" icon={Paperclip}>
            <VisorComprobante url={urlComprobante} path={pago.comprobante_path} />
          </SectionCard>

          <SectionCard
            title="Certificados incluidos"
            description={
              certificados.length > 0
                ? `${certificados.length} ${certificados.length === 1 ? "certificado" : "certificados"} · ${formatPesos(pago.importe_unitario)} c/u`
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
                      : "Este concepto no se vincula con certificados."
                  }
                />
              </div>
            ) : (
              <Table framed={false}>
                <THead>
                  <TR>
                    <TH>N.º</TH>
                    <TH>Cliente</TH>
                    <TH className="hidden md:table-cell">Rubro</TH>
                    <TH>Servicio</TH>
                    <TH>Estado</TH>
                    <TH>Sello</TH>
                  </TR>
                </THead>
                <TBody>
                  {certificados.map((c) => (
                    <TR key={c.id ?? c.numero}>
                      <TD className="font-mono text-[13px] font-semibold whitespace-nowrap">
                        <Link href={`/gestion/certificados/${c.id}`} className="text-azul-700 hover:underline">
                          {c.numero}
                        </Link>
                      </TD>
                      <TD className="max-w-56">
                        <span className="line-clamp-1 font-medium">{c.cliente}</span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">{c.domicilio}</span>
                      </TD>
                      <TD className="hidden max-w-48 text-muted-foreground md:table-cell">
                        <span className="line-clamp-1">{c.rubro_nombre}</span>
                      </TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{formatFecha(c.fecha_servicio)}</TD>
                      <TD>
                        <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" />
                      </TD>
                      <TD className="font-mono text-[13px] whitespace-nowrap">{c.sello_codigo ?? "—"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </SectionCard>
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="Importe, contribuyente e historial">
          <ResumenImporte
            titulo="Importe de la liquidación"
            total={pago.importe_total}
            cantidad={pago.cantidad}
            unitario={pago.importe_unitario}
            concepto={pago.arancel_concepto}
            ordenanza={pago.arancel_ordenanza}
            articulo={pago.arancel_articulo}
          />
          <SectionCard
            title="Contribuyente"
            icon={pago.empresa_id ? Building2 : UserRound}
            actions={
              pago.empresa_id ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/gestion/pagos?empresa=${pago.empresa_id}&estado=todos`}>Sus pagos</Link>
                </Button>
              ) : null
            }
          >
            <KeyValue
              columns={1}
              items={[
                {
                  label: pago.empresa_id ? "Empresa" : "Nombre o razón social",
                  value: pago.empresa_id ? (
                    <Link href={`/gestion/empresas/${pago.empresa_id}`} className="text-azul-700 hover:underline">
                      {contribuyente}
                    </Link>
                  ) : (
                    contribuyente
                  ),
                },
                { label: "CUIT/CUIL", value: cuit ? <span className="nums-tabular">{cuit}</span> : null },
                ...(pago.observaciones && estado !== "rechazado"
                  ? [
                      {
                        // Un pago informado con observaciones es uno que se rechazó y la empresa volvió a informar.
                        label: estado === "informado" ? "Motivo del rechazo anterior" : "Observaciones",
                        value: <span className="whitespace-pre-line">{pago.observaciones}</span>,
                      },
                    ]
                  : []),
              ]}
            />
          </SectionCard>
          <SectionCard title="Historial" icon={History}>
            <HistorialPago pago={pago} />
          </SectionCard>
        </aside>
      </div>
    </>
  );
}
