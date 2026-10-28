import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Banknote,
  Building2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  ExternalLink,
  FilePlus2,
  FileSignature,
  FileText,
  Files,
  FlaskConical,
  History,
  Link2,
  MessageSquareWarning,
  Printer,
  QrCode,
  Receipt,
  Send,
  ShieldCheck,
  Stamp,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CodigoQR } from "@/components/shared/codigo-qr";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import { type DetalleCertificado, getCertificadoDetalle, getCertificadoVista, puedeControlar } from "@/lib/data/control";
import {
  ESTADO_CERTIFICADO,
  ESTADO_DECLARACION,
  ESTADO_INSPECCION,
  ESTADO_OBLIGACION,
  ESTADO_PAGO,
  ORGANISMO,
  PERIODICIDAD,
  RESULTADO_INSPECCION,
  TIPO_INSPECCION,
  TIPO_SERVICIO,
  VIGENCIA,
  etiqueta,
} from "@/lib/domain/etiquetas";
import {
  diasHasta,
  formatFecha,
  formatFechaHora,
  formatLitros,
  formatNumero,
  formatPesos,
  formatSuperficie,
} from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { AnularCertificado } from "./_components/anular-certificado";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const certificado = await getCertificadoVista(id);
  return { title: certificado?.numero ? `Certificado N.º ${certificado.numero}` : "Certificado" };
}

const EJEMPLARES = [
  { valor: "original", label: "Original", detalle: "Para el cliente" },
  { valor: "duplicado", label: "Duplicado", detalle: "Para el municipio" },
  { valor: "triplicado", label: "Triplicado", detalle: "Para la empresa" },
] as const;

export default async function CertificadoDetallePage({ params }: Props) {
  const sesion = await requerirStaff();
  const { id } = await params;
  const esAdmin = sesion.perfil.rol === "admin";
  const detalle = await getCertificadoDetalle(id, { conAuditoria: esAdmin });
  if (!detalle) notFound();

  const { certificado: c, declaracion, pago, establecimiento, productos, inspecciones } = detalle;
  const estado = c.estado ?? "borrador";
  const tipo = c.tipo ?? "fumigacion";
  const numero = c.numero ?? "—";
  const controla = puedeControlar(sesion.perfil.rol);
  const anulado = estado === "anulado";
  // Solo tiene sentido inspeccionar servicios declarados por la empresa (no borradores ni anulados).
  const inspeccionable = !anulado && estado !== "borrador";
  // Liquidación en curso: anular no recalcula su importe (lo resuelve Timbrado al conciliar).
  const liquidacionEnCurso =
    pago && (pago.estado === "pendiente" || pago.estado === "informado") ? (pago.codigo ?? "sin código") : null;
  const urlInspeccion = `/gestion/inspecciones/nueva?${new URLSearchParams({
    certificado: c.id,
    tipo: "muestreo_servicio",
    ...(c.empresa_id ? { empresa: c.empresa_id } : {}),
    ...(c.establecimiento_id ? { establecimiento: c.establecimiento_id } : {}),
  }).toString()}`;
  const diasVence = diasHasta(c.fecha_vencimiento);
  const IconoTipo = tipo === "tanque" ? Droplets : BadgeCheck;

  return (
    <>
      <PageHeader
        title={`Certificado N.º ${numero}`}
        description={`${etiqueta(TIPO_SERVICIO, tipo).label} · ${c.empresa_nombre ?? "Empresa"}`}
        icon={IconoTipo}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Certificados", href: "/gestion/certificados" },
          { label: `N.º ${numero}` },
        ]}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Printer aria-hidden />
                  Imprimir
                  <ChevronDown aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ejemplar a imprimir</DropdownMenuLabel>
                {EJEMPLARES.map((e) => (
                  <DropdownMenuItem key={e.valor} asChild>
                    <Link href={`/imprimir/certificado/${c.id}?ejemplar=${e.valor}`} target="_blank" rel="noopener">
                      <FileText aria-hidden />
                      <span className="flex flex-col leading-tight">
                        {e.label}
                        <span className="text-xs text-muted-foreground">{e.detalle}</span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/imprimir/certificado/${c.id}?ejemplar=todos`} target="_blank" rel="noopener">
                    <Files aria-hidden />
                    Los tres ejemplares
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {inspeccionable ? (
              <Button asChild variant="secondary">
                <Link href={urlInspeccion}>
                  <ShieldCheck aria-hidden />
                  Programar inspección
                </Link>
              </Button>
            ) : null}
            {controla && !anulado ? (
              <AnularCertificado
                certificadoId={c.id}
                numero={numero}
                timbrado={estado === "timbrado"}
                liquidacionEnCurso={liquidacionEnCurso}
              />
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={estado} size="lg" />
          {estado === "timbrado" && c.vigencia ? <EstadoBadge mapa={VIGENCIA} valor={c.vigencia} size="lg" /> : null}
          {c.sello_codigo ? (
            <Badge tone="verde" variant="solid" size="lg">
              <Stamp aria-hidden />
              Sello {c.sello_codigo}
            </Badge>
          ) : null}
          {c.empresa_numero_registro ? (
            <Badge variant="outline" size="lg">
              Registro N.º {c.empresa_numero_registro}
            </Badge>
          ) : null}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <AvisoEstado detalle={detalle} />

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
            <SectionCard title="Datos del servicio" icon={ClipboardList}>
              <KeyValue
                columns={2}
                items={[
                  { label: "Cliente", value: c.cliente },
                  { label: "CUIT del cliente", value: c.cliente_cuit },
                  { label: "Domicilio del servicio", value: c.domicilio, full: true },
                  {
                    label: "Establecimiento",
                    value: c.establecimiento_id ? (
                      <Link
                        href={`/gestion/establecimientos/${c.establecimiento_id}`}
                        className="inline-flex items-center gap-1 text-azul-700 hover:underline"
                      >
                        {establecimiento?.nombre ?? "Ver establecimiento"}
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      </Link>
                    ) : (
                      "Sin vincular"
                    ),
                  },
                  {
                    label: "Barrio y zona",
                    value:
                      [c.establecimiento_barrio, c.establecimiento_zona].filter(Boolean).join(" · ") ||
                      [establecimiento?.barrio, establecimiento?.zona].filter(Boolean).join(" · ") ||
                      null,
                  },
                  {
                    label: "Rubro (Anexo)",
                    value: c.rubro_nombre ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <span>
                          {c.rubro_grupo ? `${c.rubro_grupo} · ` : ""}
                          {c.rubro_nombre}
                        </span>
                        {c.rubro_periodicidad ? (
                          <EstadoBadge mapa={PERIODICIDAD} valor={c.rubro_periodicidad} size="sm" />
                        ) : null}
                      </span>
                    ) : null,
                    full: true,
                  },
                  tipo === "tanque"
                    ? { label: "Capacidad del tanque", value: formatLitros(c.capacidad_litros) }
                    : { label: "Superficie tratada", value: formatSuperficie(c.superficie_m2) },
                  { label: "Fecha y hora del servicio", value: c.fecha_servicio ? formatFechaHora(c.fecha_servicio) : null },
                  {
                    label: "Vencimiento",
                    value: c.fecha_vencimiento ? (
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        {formatFecha(c.fecha_vencimiento)}
                        {estado === "timbrado" && diasVence !== null ? (
                          <span
                            className={cn(
                              "text-xs font-medium",
                              diasVence < 0 ? "text-red-700" : diasVence <= 15 ? "text-amber-800" : "text-muted-foreground",
                            )}
                          >
                            {diasVence < 0
                              ? `venció hace ${Math.abs(diasVence) === 1 ? "1 día" : `${Math.abs(diasVence)} días`}`
                              : diasVence === 0
                                ? "vence hoy"
                                : diasVence === 1
                                  ? "vence mañana"
                                  : `faltan ${diasVence} días`}
                          </span>
                        ) : null}
                      </span>
                    ) : c.rubro_periodicidad === "unica_vez" ? (
                      "Servicio por única vez (sin vencimiento)"
                    ) : null,
                  },
                  {
                    label: "Plazo de reingreso",
                    value: c.plazo_reingreso_horas !== null ? `${c.plazo_reingreso_horas} h` : null,
                  },
                  ...(tipo === "tanque" ? [{ label: "Laboratorio", value: c.laboratorio }] : []),
                ]}
              />
            </SectionCard>

            {tipo === "fumigacion" ? (
              <SectionCard
                title="Productos aplicados"
                description="Con su registro ANMAT o SENASA, según la memoria técnica de la empresa."
                icon={FlaskConical}
                flush
              >
                {productos.length === 0 ? (
                  <div className="p-5 sm:p-6">
                    <EmptyState compact icon={FlaskConical} title="Sin productos informados" description="El certificado no detalla productos aplicados." />
                  </div>
                ) : (
                  <Table framed={false}>
                    <THead>
                      <TR>
                        <TH>Producto</TH>
                        <TH>Registro</TH>
                        <TH numeric>Cantidad</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {productos.map((p) => (
                        <TR key={p.producto_id || p.nombre}>
                          <TD>
                            <p className="font-medium">{p.nombre}</p>
                            <p className="text-[13px] text-muted-foreground">{p.principio_activo}</p>
                          </TD>
                          <TD>
                            <span className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                              <EstadoBadge mapa={ORGANISMO} valor={p.organismo} size="sm" />
                              <span className="nums-tabular text-[13px]">{p.registro}</span>
                            </span>
                          </TD>
                          <TD numeric className="whitespace-nowrap">
                            {formatNumero(p.cantidad, 3)} {p.unidad}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </SectionCard>
            ) : (
              <SectionCard title="Análisis del agua" description="Exigidos por la Ord. 2004/92 (t.o. Ord. 3098/01)." icon={Droplets}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ArchivoAnalisis titulo="Análisis bacteriológico" url={detalle.analisis.bacteriologico} cargado={!!c.analisis_bacteriologico_path} />
                  <ArchivoAnalisis titulo="Análisis físico-químico" url={detalle.analisis.fisicoquimico} cargado={!!c.analisis_fisicoquimico_path} />
                </div>
              </SectionCard>
            )}

            <SectionCard title="Firma digital del asesor técnico" description="Art. 5.º, Ord. 2681/98" icon={FileSignature}>
              {c.firma_hash && c.firmado_at ? (
                <div className="flex flex-col gap-4">
                  <KeyValue
                    columns={3}
                    items={[
                      { label: "Asesor técnico", value: c.tecnico_nombre },
                      { label: "Título", value: c.tecnico_titulo },
                      { label: "Matrícula", value: c.tecnico_matricula },
                      { label: "Firmado el", value: formatFechaHora(c.firmado_at) },
                      { label: "Firmante (usuario)", value: detalle.firmante },
                    ]}
                  />
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-emerald-900">Huella de la firma (SHA-256)</p>
                      <p className="font-mono text-xs break-all text-emerald-900/80">{c.firma_hash}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert tone="warning" title="Certificado sin firma">
                  {c.tecnico_nombre
                    ? `Falta la firma digital de ${c.tecnico_nombre}.`
                    : "Falta la firma digital del asesor técnico declarado."}{" "}
                  Si cambian datos sustantivos después de firmar, la firma se invalida automáticamente.
                </Alert>
              )}
            </SectionCard>

            {detalle.auditoria ? <SeccionAuditoria detalle={detalle} /> : null}
          </div>

          <div className="grid min-w-0 content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
            <SectionCard title="Verificación pública" description="Código QR impreso en el certificado" icon={QrCode}>
              {c.codigo_verificacion ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="relative rounded-2xl bg-white p-3 shadow-card ring-1 ring-border">
                    <CodigoQR codigo={c.codigo_verificacion} tamanio={168} className={cn(anulado && "opacity-30")} />
                    {anulado ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Badge tone="rojo" variant="solid" size="lg">
                          Anulado
                        </Badge>
                      </span>
                    ) : null}
                  </div>
                  <p className="font-mono text-base font-semibold tracking-wider text-foreground">{c.codigo_verificacion}</p>
                  <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {estado === "timbrado"
                      ? "Al escanearlo, inspectores y vecinos confirman la validez y el vencimiento."
                      : anulado
                        ? "El QR informa que el certificado fue anulado."
                        : "El QR valida el certificado recién cuando esté timbrado."}
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/verificar/${encodeURIComponent(c.codigo_verificacion)}`} target="_blank" rel="noopener">
                      Ver verificación pública
                      <ExternalLink aria-hidden />
                      <span className="sr-only">(se abre en una pestaña nueva)</span>
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin código de verificación.</p>
              )}
            </SectionCard>

            <SectionCard title="Timbrado" description="Pago del arancel y sellado digital" icon={Stamp}>
              <div className="flex flex-col gap-4">
                {c.sello_codigo && c.timbrado_at ? (
                  <div className="relative overflow-hidden rounded-xl bg-gradient-brand p-4 text-white shadow-brand">
                    <Stamp aria-hidden className="absolute -right-3 -bottom-3 size-20 text-white/15" />
                    <p className="text-xs font-medium tracking-wide text-white/80 uppercase">Sello digital</p>
                    <p className="font-mono text-lg font-semibold tracking-wide">{c.sello_codigo}</p>
                    <p className="mt-1 text-[13px] text-white/85">
                      {formatFechaHora(c.timbrado_at)}
                      {detalle.timbradoPor ? ` · ${detalle.timbradoPor}` : ""}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border-strong bg-subtle p-4 text-sm text-muted-foreground">
                    {anulado
                      ? "El certificado fue anulado sin timbrar."
                      : estado === "controlado"
                        ? "Controlado: falta que la empresa pague el timbrado y que el área verifique el pago."
                        : "Se timbra cuando el área controla la planilla y verifica el pago del arancel."}
                  </div>
                )}

                {pago ? (
                  <Link
                    href={`/gestion/pagos/${pago.id}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-px hover:border-azul-200 hover:shadow-card"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-azul-50 text-azul-600 ring-1 ring-azul-100">
                        <Receipt className="size-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Liquidación {pago.codigo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPesos(pago.importe_total)} · {pago.cantidad === 1 ? "1 certificado" : `${pago.cantidad ?? 0} certificados`}
                          {pago.cuenta_codigo ? ` · Cta. ${pago.cuenta_codigo}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <EstadoBadge mapa={ESTADO_PAGO} valor={pago.estado} size="sm" />
                      <ArrowUpRight
                        className="size-4 text-noche-300 transition-colors group-hover:text-azul-600"
                        aria-hidden
                      />
                    </div>
                  </Link>
                ) : (
                  <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Banknote className="size-4 shrink-0" aria-hidden />
                    Sin liquidación de timbrado generada.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Vínculos" icon={Link2} flush>
              <ul className="divide-y divide-border">
                {c.declaracion_id ? (
                  <Vinculo
                    href={`/gestion/control/${c.declaracion_id}`}
                    icono={ClipboardCheck}
                    titulo={`Planilla ${c.declaracion_codigo ?? declaracion?.codigo ?? ""}`.trim()}
                    detalle="Control de la declaración"
                    extra={<EstadoBadge mapa={ESTADO_DECLARACION} valor={declaracion?.estado ?? c.declaracion_estado} size="sm" />}
                  />
                ) : null}
                {c.empresa_id ? (
                  <Vinculo
                    href={`/gestion/empresas/${c.empresa_id}`}
                    icono={Building2}
                    titulo={c.empresa_nombre ?? "Empresa"}
                    detalle={c.empresa_cuit ? `Legajo · CUIT ${c.empresa_cuit}` : "Legajo de la empresa"}
                  />
                ) : null}
                {c.establecimiento_id ? (
                  <Vinculo
                    href={`/gestion/establecimientos/${c.establecimiento_id}`}
                    icono={Store}
                    titulo={establecimiento?.nombre ?? "Establecimiento"}
                    detalle={establecimiento?.domicilio ?? "Ficha del establecimiento"}
                    extra={
                      establecimiento ? (
                        <EstadoBadge
                          mapa={ESTADO_OBLIGACION}
                          valor={tipo === "tanque" ? establecimiento.estado_tanque : establecimiento.estado_fumigacion}
                          size="sm"
                        />
                      ) : null
                    }
                  />
                ) : null}
                {c.pago_id ? (
                  <Vinculo
                    href={`/gestion/pagos/${c.pago_id}`}
                    icono={Receipt}
                    titulo={`Liquidación ${c.pago_codigo ?? ""}`.trim()}
                    detalle="Pago del timbrado"
                    extra={<EstadoBadge mapa={ESTADO_PAGO} valor={c.pago_estado} size="sm" />}
                  />
                ) : null}
                {c.empresa_id ? (
                  <Vinculo
                    href={`/gestion/certificados?empresa=${c.empresa_id}`}
                    icono={Files}
                    titulo="Otros certificados de la empresa"
                    detalle="Buscador filtrado por empresa"
                  />
                ) : null}
              </ul>
            </SectionCard>

            <SectionCard
              title="Inspecciones"
              description="Controles en terreno sobre este servicio"
              icon={ShieldCheck}
              flush
              actions={
                inspeccionable && inspecciones.length > 0 ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={urlInspeccion}>Programar</Link>
                  </Button>
                ) : null
              }
            >
              {inspecciones.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={ShieldCheck}
                    title="Sin inspecciones"
                    description={
                      inspeccionable
                        ? "Podés verificar el servicio en el lugar con una inspección por muestreo (Art. 10.º b)."
                        : "No hay inspecciones registradas para este certificado."
                    }
                    action={
                      inspeccionable ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={urlInspeccion}>
                            <ShieldCheck aria-hidden />
                            Programar inspección por muestreo
                          </Link>
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {inspecciones.map((i) => (
                    <li key={i.id}>
                      <Link
                        href={`/gestion/inspecciones/${i.id}`}
                        className="flex flex-col gap-1.5 px-5 py-3.5 transition-colors hover:bg-azul-50/40"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{i.codigo ?? "Inspección"}</span>
                          <EstadoBadge mapa={ESTADO_INSPECCION} valor={i.estado} size="sm" />
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          {etiqueta(TIPO_INSPECCION, i.tipo).label}
                          <span aria-hidden>·</span>
                          {formatFecha(i.fecha_programada)}
                          {i.inspector_nombre ? (
                            <>
                              <span aria-hidden>·</span>
                              {i.inspector_nombre}
                            </>
                          ) : null}
                          {i.resultado ? <EstadoBadge mapa={RESULTADO_INSPECCION} valor={i.resultado} size="sm" /> : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Historial" icon={History}>
              <Timeline items={historial(detalle)} />
            </SectionCard>
          </div>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------- */

function AvisoEstado({ detalle }: { detalle: DetalleCertificado }) {
  const { certificado: c, declaracion } = detalle;
  const planilla =
    c.declaracion_id ? (
      <Button asChild variant="outline" size="sm">
        <Link href={`/gestion/control/${c.declaracion_id}`}>Ver planilla</Link>
      </Button>
    ) : undefined;

  switch (c.estado) {
    case "anulado":
      return (
        <Alert tone="danger" title="Certificado anulado">
          {c.anulado_motivo ? `Motivo: ${c.anulado_motivo}` : "El certificado no tiene validez."}
        </Alert>
      );
    case "observado":
      return (
        <Alert tone="warning" title="Observado por el área" action={planilla}>
          {c.observaciones ?? "La empresa debe corregirlo y volver a presentar la planilla."}
        </Alert>
      );
    case "declarado":
      return (
        <Alert tone="info" title="Pendiente de control" action={planilla}>
          Está incluido en la planilla {declaracion?.codigo ?? c.declaracion_codigo ?? ""} presentada por la empresa.
        </Alert>
      );
    case "controlado":
      return (
        <Alert tone="info" title="Controlado, pendiente de timbrado">
          Todavía no es válido: falta el pago del arancel y su verificación por el área.
        </Alert>
      );
    case "borrador":
      return (
        <Alert tone="info" title="Borrador">
          La empresa todavía no presentó este certificado en una planilla.
        </Alert>
      );
    default:
      return null;
  }
}

function Vinculo({
  href,
  icono: Icono,
  titulo,
  detalle,
  extra,
}: {
  href: string;
  icono: LucideIcon;
  titulo: string;
  detalle: string;
  extra?: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/40">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-azul-50 text-azul-600 ring-1 ring-azul-100 transition-colors group-hover:bg-azul-600 group-hover:text-white"
        >
          <Icono className="size-[18px]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">{titulo}</span>
          <span className="truncate text-xs text-muted-foreground">{detalle}</span>
        </span>
        {extra}
        <ArrowUpRight className="size-4 shrink-0 text-noche-300 transition-colors group-hover:text-azul-600" aria-hidden />
      </Link>
    </li>
  );
}

function ArchivoAnalisis({ titulo, url, cargado }: { titulo: string; url: string | null; cargado: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
          cargado ? "bg-celeste-50 text-celeste-700 ring-celeste-200" : "bg-red-50 text-red-700 ring-red-200",
        )}
      >
        <FileText className="size-[18px]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold text-foreground">{titulo}</span>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] text-azul-700 hover:underline">
            Ver archivo
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">(se abre en una pestaña nueva)</span>
          </a>
        ) : (
          <span className="text-[13px] text-muted-foreground">{cargado ? "No se pudo generar el enlace" : "No adjuntado"}</span>
        )}
      </div>
    </div>
  );
}

const ACCION_AUDITORIA: Record<string, { label: string; tono: "verde" | "azul" | "rojo" }> = {
  INSERT: { label: "Alta", tono: "verde" },
  UPDATE: { label: "Modificación", tono: "azul" },
  DELETE: { label: "Baja", tono: "rojo" },
};

function SeccionAuditoria({ detalle }: { detalle: DetalleCertificado }) {
  const trazas = detalle.auditoria ?? [];
  return (
    <SectionCard
      title="Auditoría del certificado"
      description="Registro inmutable de cambios (visible solo para Administración)."
      icon={History}
      flush
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/gestion/auditoria">
            Ir a Auditoría
            <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      }
    >
      {trazas.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState compact icon={History} title="Sin registros de auditoría" description="No hay cambios registrados para este certificado." />
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {trazas.map((t) => {
            const accion = ACCION_AUDITORIA[t.accion] ?? { label: t.accion, tono: "azul" as const };
            return (
              <li key={t.id} className="flex flex-col gap-2 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={accion.tono} size="sm" dot>
                    {accion.label}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{t.usuario ?? "Sistema"}</span>
                  <time dateTime={t.fecha} className="nums-tabular ml-auto text-xs text-muted-foreground">
                    {formatFechaHora(t.fecha)}
                  </time>
                </div>
                {t.cambios.length > 0 ? (
                  <dl className="grid gap-1.5 rounded-xl bg-subtle p-3 text-[13px]">
                    {t.cambios.map((cambio) => (
                      <div key={cambio.campo} className="grid gap-0.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
                        <dt className="text-muted-foreground">{cambio.campo}</dt>
                        <dd className="flex min-w-0 flex-wrap items-center gap-1.5 break-all">
                          <span className="text-muted-foreground line-through decoration-red-300">{cambio.antes}</span>
                          <ArrowRight className="size-3.5 shrink-0 text-azul-600" aria-label="cambió a" />
                          <span className="font-medium text-foreground">{cambio.despues}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-[13px] text-muted-foreground">
                    {t.accion === "INSERT" ? "Alta del certificado por la empresa." : "Sin cambios de datos visibles."}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}

function historial(detalle: DetalleCertificado): TimelineItem[] {
  const { certificado: c, declaracion, pago } = detalle;
  const items: TimelineItem[] = [];

  if (c.created_at) {
    items.push({
      id: "carga",
      date: c.created_at,
      title: "Cargado por la empresa",
      description: detalle.cargadoPor ? `Por ${detalle.cargadoPor}.` : undefined,
      tone: "neutral",
      icon: FilePlus2,
    });
  }
  if (c.firmado_at) {
    items.push({
      id: "firma",
      date: c.firmado_at,
      title: "Firmado digitalmente",
      description: `Por ${detalle.firmante ?? c.tecnico_nombre ?? "el asesor técnico"}.`,
      tone: "celeste",
      icon: FileSignature,
    });
  }
  if (declaracion?.presentada_at) {
    items.push({
      id: "declarado",
      date: declaracion.presentada_at,
      title: `Declarado en la planilla ${declaracion.codigo ?? ""}`.trim(),
      tone: "azul",
      icon: Send,
    });
  }
  if (declaracion?.controlada_at) {
    if (c.estado === "observado") {
      items.push({
        id: "observado",
        date: declaracion.controlada_at,
        title: "Observado por el área",
        description: c.observaciones ?? undefined,
        tone: "ambar",
        icon: MessageSquareWarning,
      });
    } else if (c.estado === "controlado" || c.estado === "timbrado" || c.pago_id) {
      items.push({
        id: "controlado",
        date: declaracion.controlada_at,
        title: "Controlado por el área",
        tone: "celeste",
        icon: ClipboardCheck,
      });
    }
  }
  if (pago?.created_at) {
    items.push({
      id: "liquidacion",
      date: pago.created_at,
      title: `Liquidación ${pago.codigo ?? ""} generada`.trim(),
      description: `${formatPesos(pago.importe_total)}${pago.arancel_concepto ? ` · ${pago.arancel_concepto}` : ""}`,
      tone: "violeta",
      icon: Receipt,
    });
  }
  if (pago?.informado_at) {
    items.push({ id: "informado", date: pago.informado_at, title: "Pago informado por la empresa", tone: "azul", icon: Banknote });
  }
  if (c.timbrado_at) {
    items.push({
      id: "timbrado",
      date: c.timbrado_at,
      title: "Timbrado y sellado digital",
      description: `${c.sello_codigo ? `Sello ${c.sello_codigo}` : "Sellado"}${detalle.timbradoPor ? ` · ${detalle.timbradoPor}` : ""}.`,
      tone: "verde",
      icon: Stamp,
    });
  }
  if (c.estado === "anulado" && c.updated_at) {
    items.push({
      id: "anulado",
      date: c.updated_at,
      title: "Certificado anulado",
      description: c.anulado_motivo ?? undefined,
      tone: "rojo",
      icon: Ban,
    });
  }

  const tiempo = (item: TimelineItem) => new Date(item.date).getTime() || 0;
  return items.sort((a, b) => tiempo(b) - tiempo(a));
}
