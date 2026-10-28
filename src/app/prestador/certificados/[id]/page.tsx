import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  ClipboardList,
  Clock,
  Droplets,
  ExternalLink,
  FileSignature,
  FileText,
  FlaskConical,
  History,
  Printer,
  QrCode,
  Receipt,
  SprayCan,
  Stamp,
} from "lucide-react";
import { CodigoQR } from "@/components/shared/codigo-qr";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirEmpresa } from "@/lib/auth";
import {
  getCertificadoDetalle,
  huellaAbreviada,
  periodicidadTexto,
  plazoReingresoTexto,
  tituloCertificado,
} from "@/lib/data/certificados";
import { CLASE_PRODUCTO, ESTADO_CERTIFICADO, ORGANISMO, TIPO_SERVICIO, VIGENCIA } from "@/lib/domain/etiquetas";
import {
  formatFecha,
  formatFechaHora,
  formatLitros,
  formatNumero,
  formatSuperficie,
} from "@/lib/domain/formato";
import { urlVerificacion } from "@/lib/qr";
import { urlFirmada } from "@/lib/storage";
import { SelloPendiente, SelloTimbrado } from "@/app/imprimir/certificado/_components/sello-timbrado";
import { CopiarTexto } from "../../_components/copiar-texto";
import { PanelEstado } from "./_components/panel-estado";
import { Recorrido } from "./_components/recorrido";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const detalle = await getCertificadoDetalle(id);
    return { title: detalle?.certificado.numero ? `Certificado N.º ${detalle.certificado.numero}` : "Certificado" };
  } catch {
    // Sin sesión (la vista no se expone a anónimos) o error de lectura: la página se encarga de
    // redirigir o de mostrar el error; el título no debe romper la respuesta.
    return { title: "Certificado" };
  }
}

const IMPRESIONES = [
  { ejemplar: null, titulo: "Los 3 ejemplares", detalle: "Original, duplicado y triplicado (3 hojas A4)" },
  { ejemplar: "original", titulo: "Original", detalle: "Para el cliente" },
  { ejemplar: "duplicado", titulo: "Duplicado", detalle: "Para la Dirección de Salud Ambiental" },
  { ejemplar: "triplicado", titulo: "Triplicado", detalle: "Para la empresa" },
] as const;

export default async function CertificadoDetallePage({ params }: Props) {
  const sesion = await requerirEmpresa();
  const { id } = await params;
  const detalle = await getCertificadoDetalle(id);
  if (!detalle || detalle.certificado.empresa_id !== sesion.empresa.id) notFound();

  const { certificado: c, productos, establecimiento, pago } = detalle;
  const esTanque = c.tipo === "tanque";
  const TipoIcon = esTanque ? Droplets : SprayCan;
  const timbrado = c.estado === "timbrado" && !!c.sello_codigo;
  const puedeFirmar =
    sesion.perfil.rol === "tecnico" && !!sesion.perfil.tecnico_id && sesion.perfil.tecnico_id === c.tecnico_id;
  const codigo = c.codigo_verificacion;
  const url = codigo ? urlVerificacion(codigo) : null;
  const huella = huellaAbreviada(c.firma_hash);

  const [urlBacteriologico, urlFisicoquimico] = esTanque
    ? await Promise.all([
        urlFirmada("documentos", c.analisis_bacteriologico_path),
        urlFirmada("documentos", c.analisis_fisicoquimico_path),
      ])
    : [null, null];

  return (
    <>
      <PageHeader
        title={`Certificado N.º ${c.numero ?? "—"}`}
        description={
          <>
            {tituloCertificado(c.tipo)} · <span className="font-medium text-foreground">{c.cliente ?? "—"}</span>
          </>
        }
        icon={BadgeCheck}
        breadcrumb={[
          { label: "Inicio", href: "/prestador" },
          { label: "Certificados", href: "/prestador/certificados" },
          { label: `N.º ${c.numero ?? "—"}` },
        ]}
        actions={
          <>
            {c.declaracion_id ? (
              <Button asChild variant="outline">
                <Link href={`/prestador/declaraciones/${c.declaracion_id}`}>
                  <ClipboardList aria-hidden /> Ir a la declaración
                </Link>
              </Button>
            ) : null}
            {/* Una liquidación anulada ya no es el pago del certificado: vuelve a quedar "listo para pagar". */}
            {pago && pago.estado !== "anulado" ? (
              <Button asChild variant="outline">
                <Link href={`/prestador/pagos/${pago.id}`}>
                  <Receipt aria-hidden /> Ir al pago
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`/imprimir/certificado/${c.id}`}>
                <Printer aria-hidden /> Imprimir 3 ejemplares
              </Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="lg" />
          {c.estado === "timbrado" ? (
            <EstadoBadge mapa={VIGENCIA} valor={c.vigencia} size="lg" pulse={c.vigencia === "por_vencer"} />
          ) : null}
          <Badge tone={esTanque ? "celeste" : "azul"} size="lg">
            <TipoIcon aria-hidden /> {c.tipo ? TIPO_SERVICIO[c.tipo].label : "—"}
          </Badge>
          {c.sello_codigo ? (
            <Badge tone="verde" variant="outline" size="lg" className="font-mono">
              <Stamp aria-hidden /> {c.sello_codigo}
            </Badge>
          ) : null}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <PanelEstado detalle={detalle} puedeFirmar={puedeFirmar} />

          <SectionCard title="Datos del servicio" icon={ClipboardList} description="Tal como figuran en el certificado">
            <KeyValue
              columns={3}
              items={[
                { label: "Cliente (titular o razón social)", value: c.cliente, full: false },
                { label: "CUIT del cliente", value: c.cliente_cuit },
                {
                  label: "Establecimiento",
                  value: establecimiento
                    ? `${establecimiento.nombre}${establecimiento.nombre_fantasia ? ` (${establecimiento.nombre_fantasia})` : ""}`
                    : null,
                },
                { label: "Domicilio del servicio", value: c.domicilio },
                {
                  label: "Barrio y zona",
                  value: [c.establecimiento_barrio, c.establecimiento_zona].filter(Boolean).join(" · ") || null,
                },
                { label: "Fecha y hora del servicio", value: formatFechaHora(c.fecha_servicio) },
                {
                  label: "Rubro (Anexo Ord. 2681/98)",
                  value: c.rubro_nombre ? (
                    <>
                      {c.rubro_nombre}
                      {c.rubro_grupo ? <span className="block text-xs text-muted-foreground">{c.rubro_grupo}</span> : null}
                    </>
                  ) : null,
                },
                { label: "Periodicidad", value: periodicidadTexto(c.tipo, c.rubro_periodicidad) },
                {
                  label: "Vencimiento",
                  value: c.fecha_vencimiento ? formatFecha(c.fecha_vencimiento) : "Servicio por única vez",
                },
                esTanque
                  ? { label: "Capacidad del tanque", value: formatLitros(c.capacidad_litros) }
                  : { label: "Superficie tratada", value: formatSuperficie(c.superficie_m2) },
                { label: "Plazo de reingreso", value: plazoReingresoTexto(c.plazo_reingreso_horas) },
                {
                  label: "Asesor técnico",
                  value: c.tecnico_nombre ? (
                    <>
                      {c.tecnico_nombre}
                      <span className="block text-xs text-muted-foreground">
                        {c.tecnico_titulo ?? ""}
                        {c.tecnico_matricula ? ` · Mat. ${c.tecnico_matricula}` : ""}
                      </span>
                    </>
                  ) : null,
                },
              ]}
            />
          </SectionCard>

          <SectionCard
            title={esTanque ? "Productos utilizados" : "Productos aplicados"}
            description="Registro ANMAT o SENASA y cantidades de cada producto"
            icon={FlaskConical}
            flush
            footer={
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4 text-amber-600" aria-hidden />
                Plazo de reingreso del certificado:{" "}
                <strong className="font-semibold text-foreground">{plazoReingresoTexto(c.plazo_reingreso_horas)}</strong>
                <span className="hidden sm:inline">(el mayor entre los productos aplicados)</span>
              </p>
            }
          >
            {productos.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  compact
                  icon={FlaskConical}
                  title="Sin productos declarados"
                  description={
                    c.estado === "borrador" || c.estado === "observado"
                      ? "Cargá los productos aplicados desde la declaración antes de presentarla."
                      : "Este certificado no tiene productos registrados."
                  }
                  className="border-none"
                />
              </div>
            ) : (
              <Table framed={false}>
                <THead>
                  <TR>
                    <TH>Producto</TH>
                    <TH>Principio activo</TH>
                    <TH>Registro</TH>
                    <TH numeric>Cantidad</TH>
                    <TH numeric>Reingreso</TH>
                  </TR>
                </THead>
                <TBody>
                  {productos.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium">{p.nombre}</span>
                          <EstadoBadge mapa={CLASE_PRODUCTO} valor={p.clase} size="sm" />
                        </div>
                      </TD>
                      <TD className="text-[13px]">
                        {p.principioActivo}
                        {p.concentracion ? <span className="text-muted-foreground"> · {p.concentracion}</span> : null}
                      </TD>
                      <TD className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <EstadoBadge mapa={ORGANISMO} valor={p.organismo} size="sm" />
                          <span className="font-mono text-xs">{p.registro}</span>
                        </span>
                      </TD>
                      <TD numeric className="whitespace-nowrap">
                        {formatNumero(p.cantidad, 3)} {p.unidad}
                      </TD>
                      <TD numeric className="whitespace-nowrap">
                        {p.plazoReingresoHoras === 0 ? "Inmediato" : `${p.plazoReingresoHoras} h`}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </SectionCard>

          {esTanque ? (
            <SectionCard
              title="Análisis del agua"
              description="Bacteriológico y físico-químico tomados después de la limpieza (Ord. 2004/92)"
              icon={Droplets}
            >
              <div className="flex flex-col gap-4">
                <KeyValue columns={1} items={[{ label: "Laboratorio", value: c.laboratorio }]} />
                <ul className="grid gap-3 sm:grid-cols-2">
                  {[
                    { titulo: "Análisis bacteriológico", path: c.analisis_bacteriologico_path, url: urlBacteriologico },
                    { titulo: "Análisis físico-químico", path: c.analisis_fisicoquimico_path, url: urlFisicoquimico },
                  ].map((a) => (
                    <li key={a.titulo} className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                      <span
                        aria-hidden
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-celeste-100 text-celeste-700 ring-1 ring-celeste-200"
                      >
                        <FileText className="size-5" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-semibold">{a.titulo}</span>
                        <span className="text-xs text-muted-foreground">
                          {a.path ? "Adjunto en el legajo del certificado" : "No adjuntado"}
                        </span>
                      </div>
                      {a.url ? (
                        <Button asChild variant="outline" size="sm">
                          <a href={a.url} target="_blank" rel="noopener noreferrer">
                            Ver <ExternalLink aria-hidden />
                          </a>
                        </Button>
                      ) : (
                        <Badge tone={a.path ? "neutral" : "ambar"} size="sm" dot>
                          {a.path ? "No disponible" : "Pendiente"}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </SectionCard>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title="Firma digital" description="Asesor técnico registrado en el padrón" icon={FileSignature}>
              {c.firma_hash && c.firmado_at ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                    >
                      <FileSignature className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{c.tecnico_nombre ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">Firmó el {formatFechaHora(c.firmado_at)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-noche-950 px-3.5 py-3 text-white">
                    <p className="text-[11px] font-semibold tracking-wide text-noche-300 uppercase">Huella (SHA-256)</p>
                    <p className="mt-1 font-mono text-sm font-semibold tracking-tight text-celeste-200">{huella}</p>
                  </div>
                  <details className="group text-xs text-muted-foreground">
                    <summary className="cursor-pointer font-medium text-azul-700 hover:underline">Ver huella completa</summary>
                    <p className="mt-2 font-mono break-all text-foreground">{c.firma_hash}</p>
                  </details>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={FileSignature}
                  title="Pendiente de firma"
                  description={
                    puedeFirmar
                      ? "Firmalo digitalmente para poder presentar la declaración."
                      : `${c.tecnico_nombre ?? "El asesor técnico"} tiene que firmarlo desde su cuenta.`
                  }
                  className="border-none p-0"
                  action={
                    puedeFirmar && (c.estado === "borrador" || c.estado === "observado") ? (
                      <Button asChild size="sm">
                        <Link href="/prestador/firmas">
                          <FileSignature aria-hidden /> Ir a firmas
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </SectionCard>

            <SectionCard title="Sello de timbrado" description="Da validez al certificado (Art. 9.º b)" icon={Stamp}>
              <div className="flex flex-col items-center gap-3 text-center">
                {timbrado && c.sello_codigo ? (
                  <>
                    <SelloTimbrado codigo={c.sello_codigo} fecha={c.timbrado_at} tamanio={150} idUnico={`detalle-${c.id}`} />
                    <p className="text-sm">
                      <span className="font-mono font-semibold">{c.sello_codigo}</span>
                      <span className="block text-xs text-muted-foreground">
                        Timbrado el {formatFechaHora(c.timbrado_at)}
                        {pago?.codigo ? ` · Liquidación ${pago.codigo}` : ""}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <SelloPendiente tamanio={140} texto={c.estado === "anulado" ? "Anulado" : "Sin timbrar"} />
                    <p className="text-[13px] text-muted-foreground">
                      {c.estado === "anulado"
                        ? "Los certificados anulados no se timbran."
                        : "Se sella digitalmente cuando la Dirección verifica el pago del timbrado."}
                    </p>
                  </>
                )}
              </div>
            </SectionCard>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="Verificación, recorrido e impresión">
          <SectionCard title="Verificación pública" description="Para inspectores y vecinos" icon={QrCode}>
            {codigo && url ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative rounded-2xl bg-white p-3 shadow-card ring-1 ring-border">
                  <CodigoQR codigo={codigo} tamanio={176} />
                  <span aria-hidden className="absolute -top-1.5 -right-1.5 size-3.5 rounded-full bg-sol-400 ring-2 ring-white" />
                </div>
                <div className="flex w-full flex-col items-center gap-1 text-center">
                  <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Código</span>
                  <span className="font-mono text-lg font-bold tracking-tight text-azul-800">{codigo}</span>
                </div>
                <div className="w-full rounded-xl border border-border bg-subtle px-3 py-2.5">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">URL de verificación</p>
                  <p className="mt-0.5 font-mono text-xs break-all text-foreground">{url}</p>
                </div>
                <div className="flex w-full flex-wrap gap-2">
                  <CopiarTexto texto={url} etiqueta="Copiar URL" mensaje="URL de verificación copiada" className="flex-1" />
                  <Button asChild variant="secondary" size="sm" className="flex-1">
                    <Link href={`/verificar/${encodeURIComponent(codigo)}`} target="_blank" rel="noopener noreferrer">
                      Abrir <ExternalLink aria-hidden />
                    </Link>
                  </Button>
                </div>
                {!timbrado ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Hasta que se timbre, la verificación pública lo muestra como <strong>sin timbrar</strong>.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">El certificado todavía no tiene código de verificación.</p>
            )}
          </SectionCard>

          <SectionCard title="Recorrido" description="Del alta al timbrado" icon={History}>
            <Recorrido detalle={detalle} />
          </SectionCard>

          <SectionCard title="Impresión" description="Hojas A4 con QR y sello" icon={Printer} flush>
            <ul className="divide-y divide-border">
              {IMPRESIONES.map((i) => (
                <li key={i.titulo}>
                  <Link
                    href={i.ejemplar ? `/imprimir/certificado/${c.id}?ejemplar=${i.ejemplar}` : `/imprimir/certificado/${c.id}`}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-azul-50/50 focus-visible:bg-azul-50/60 focus-visible:outline-none"
                  >
                    <span
                      aria-hidden
                      className={
                        i.ejemplar === null
                          ? "flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
                          : "flex size-9 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100"
                      }
                    >
                      <Printer className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-semibold text-foreground group-hover:text-azul-800">{i.titulo}</span>
                      <span className="truncate text-xs text-muted-foreground">{i.detalle}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </aside>
      </div>
    </>
  );
}
