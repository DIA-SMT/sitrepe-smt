import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Ban,
  BadgeCheck,
  Building2,
  CalendarClock,
  CalendarX,
  FileSignature,
  FlaskConical,
  Hourglass,
  MapPin,
  MessageSquareWarning,
  QrCode,
  SearchX,
  ShieldCheck,
  Stamp,
  Timer,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { KeyValue } from "@/components/shared/key-value";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP } from "@/lib/config";
import { type VerificacionCertificado, verificarCertificado } from "@/lib/data/portal";
import { ORGANISMO, TIPO_SERVICIO } from "@/lib/domain/etiquetas";
import {
  diasHasta,
  formatFecha,
  formatFechaHora,
  formatFechaLarga,
  formatLitros,
  formatNumero,
  formatSuperficie,
} from "@/lib/domain/formato";
import { DIAS_ALERTA_VENCIMIENTO } from "@/lib/domain/vencimiento";
import { cn } from "@/lib/utils";
import { BuscadorCertificado } from "../../_components/buscador-certificado";
import { CopiarTexto } from "../../_components/copiar-texto";
import { esCodigoValido, normalizarCodigo } from "../../_lib/codigo";
import { plazoReingreso } from "../../_lib/reingreso";
import { RelojConsulta } from "../_components/reloj-consulta";

type Props = { params: Promise<{ codigo: string }> };

function decodificar(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  return {
    title: `Verificación ${normalizarCodigo(decodificar(codigo)).slice(0, 40)}`,
    description: "Resultado de la verificación pública de un certificado de fumigación o limpieza de tanques.",
    // Contiene datos del servicio (cliente, domicilio): no se indexa.
    robots: { index: false, follow: false },
  };
}

type Estado = "vigente" | "vencido" | "sin_timbrar" | "anulado" | "no_encontrado";

const VISTAS: Record<
  Estado,
  { titulo: string; icono: LucideIcon; fondo: string; texto: string; anillo: string; reloj: string }
> = {
  vigente: {
    titulo: "Válido y vigente",
    icono: ShieldCheck,
    fondo: "bg-linear-to-br from-emerald-600 via-emerald-700 to-emerald-900",
    texto: "text-white",
    anillo: "bg-white text-emerald-700",
    reloj: "text-emerald-100",
  },
  vencido: {
    titulo: "Vencido",
    icono: CalendarX,
    fondo: "bg-linear-to-br from-red-600 via-red-700 to-red-900",
    texto: "text-white",
    anillo: "bg-white text-red-700",
    reloj: "text-red-100",
  },
  sin_timbrar: {
    titulo: "Sin timbrar",
    icono: Hourglass,
    fondo: "bg-linear-to-br from-sol-300 via-sol-400 to-amber-500",
    texto: "text-noche-950",
    anillo: "bg-noche-950 text-sol-300",
    reloj: "text-noche-800",
  },
  anulado: {
    titulo: "Anulado",
    icono: Ban,
    fondo: "bg-linear-to-br from-noche-700 via-noche-800 to-red-900",
    texto: "text-white",
    anillo: "bg-white text-red-700",
    reloj: "text-noche-200",
  },
  no_encontrado: {
    titulo: "No encontrado",
    icono: SearchX,
    fondo: "bg-noche",
    texto: "text-white",
    anillo: "bg-white text-noche-800",
    reloj: "text-noche-200",
  },
};

function descripcionEstado(estado: Estado, c: VerificacionCertificado | null, codigo: string): string {
  if (!c) return `No existe un certificado con el código ${codigo}. Revisá que esté bien escrito: si el código es correcto, el certificado no es válido.`;
  switch (estado) {
    case "vigente":
      return c.fecha_vencimiento
        ? `Certificado timbrado por la Municipalidad. Vence el ${formatFechaLarga(c.fecha_vencimiento)}.`
        : "Certificado timbrado por la Municipalidad, sin fecha de vencimiento (servicio por única vez).";
    case "vencido":
      return `Venció el ${formatFechaLarga(c.fecha_vencimiento)}. El establecimiento tiene que renovar el servicio con una empresa habilitada.`;
    case "sin_timbrar":
      return "El servicio fue declarado ante la Dirección, pero el certificado todavía no fue timbrado. Hasta que se timbre, no es válido.";
    case "anulado":
      return "La Dirección de Salud Ambiental anuló este certificado. No tiene validez.";
    default:
      return "";
  }
}

export default async function ResultadoVerificacionPage({ params }: Props) {
  const { codigo: crudo } = await params;
  const codigo = normalizarCodigo(decodificar(crudo));
  // URL canónica (mayúsculas, con guiones): evita duplicados al compartir el enlace.
  if (esCodigoValido(codigo) && codigo !== crudo) redirect(`/verificar/${encodeURIComponent(codigo)}`);

  const c = await verificarCertificado(codigo);
  const estado: Estado = c ? c.vigencia : "no_encontrado";
  const vista = VISTAS[estado];
  const Icono = vista.icono;
  const dias = c?.fecha_vencimiento ? diasHasta(c.fecha_vencimiento) : null;
  const porVencer = estado === "vigente" && dias !== null && dias <= DIAS_ALERTA_VENCIMIENTO;
  const valido = estado === "vigente";
  // Un enlace manipulado puede traer un "código" enorme: se acota para no romper el panel.
  const codigoMostrado = codigo ? (codigo.length > 40 ? `${codigo.slice(0, 40)}…` : codigo) : "—";

  return (
    <>
      {/* Panel de estado (pensado para abrirse al escanear el QR en la calle) */}
      <section aria-labelledby="estado-certificado" className="mx-auto max-w-[90rem] px-2 pt-2 sm:px-4 sm:pt-3">
        <div className={cn("relative overflow-hidden rounded-[1.75rem] shadow-elevated sm:rounded-[2.25rem]", vista.fondo, vista.texto)}>
          <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-20" />
          <PetalDecor variant="corner" tone="dark" className="h-64 opacity-70 sm:h-96" />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-8 pb-12 text-center sm:px-6 sm:pt-12 sm:pb-16">
            <RelojConsulta className={vista.reloj} />
            <span
              aria-hidden
              className={cn(
                "mt-6 flex size-24 animate-pop-in items-center justify-center rounded-full shadow-elevated ring-8 ring-white/20 sm:size-28",
                vista.anillo,
              )}
            >
              <Icono className="size-12 sm:size-14" strokeWidth={1.8} />
            </span>
            <p className="mt-6 text-sm font-semibold tracking-[0.16em] uppercase opacity-90">
              {c ? `Certificado de ${c.tipo === "tanque" ? "limpieza de tanques" : "fumigación"}` : "Verificación de certificado"}
            </p>
            <h1 id="estado-certificado" className="mt-2 font-display text-4xl leading-none font-extrabold tracking-tight uppercase sm:text-6xl">
              {vista.titulo}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed [overflow-wrap:anywhere] opacity-95 sm:text-lg">
              {descripcionEstado(estado, c, codigoMostrado)}
            </p>
            {porVencer ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/30">
                <TriangleAlert className="size-4" aria-hidden />
                {dias === 0 ? "Vence hoy" : `Vence en ${dias} ${dias === 1 ? "día" : "días"}`}
              </p>
            ) : null}

            <div className="mt-8 flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white/12 p-4 ring-1 ring-white/25 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-left">
                <p className="text-xs opacity-80">{c?.sello_codigo && codigo === c.sello_codigo ? "Sello de timbrado" : "Código de verificación"}</p>
                <p className="truncate font-mono text-lg font-semibold tracking-wider">{codigoMostrado}</p>
              </div>
              {esCodigoValido(codigo) ? (
                <CopiarTexto
                  texto={codigo}
                  etiqueta="Copiar código"
                  descripcion="el código"
                  variant="secondary"
                  className="shrink-0 bg-white text-noche-900 ring-0 hover:bg-white/90 hover:text-noche-950"
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        {!valido ? (
          <Alert
            tone={estado === "sin_timbrar" ? "warning" : "danger"}
            title={c ? "Este certificado no es válido ante una inspección" : "No pudimos encontrar el certificado"}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/denuncias">
                  <MessageSquareWarning aria-hidden />
                  Denunciar
                </Link>
              </Button>
            }
          >
            {c
              ? "Si te entregaron este certificado como válido o la empresa no regulariza la situación, podés hacer una denuncia."
              : "Si alguien te entregó un certificado con este código, puede tratarse de un servicio sin registrar. Podés denunciarlo."}
          </Alert>
        ) : null}

        {c ? <DetalleCertificado c={c} /> : null}

        <SectionCard title="Verificar otro certificado" icon={QrCode}>
          <BuscadorCertificado variante="panel" />
        </SectionCard>

        <p className="text-center text-xs text-muted-foreground">
          Verificación oficial de la {APP.direccion} · {APP.municipio}. Ante dudas escribí a{" "}
          <a href={`mailto:${APP.contacto.email}`} className="font-medium text-azul-700 hover:underline">
            {APP.contacto.email}
          </a>
          .
        </p>
      </div>
    </>
  );
}

function DetalleCertificado({ c }: { c: VerificacionCertificado }) {
  const tipo = TIPO_SERVICIO[c.tipo];
  // Si el certificado no trae el plazo, se toma el mayor informado por sus productos (sin inventar un
  // "inmediato" cuando ninguno lo informa).
  const plazosProductos = c.productos.flatMap((p) => (p.plazo_reingreso_horas === null ? [] : [p.plazo_reingreso_horas]));
  const plazo = c.plazo_reingreso_horas ?? (plazosProductos.length ? Math.max(...plazosProductos) : null);

  return (
    <>
      {/* Resumen rápido */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato icono={CalendarClock} etiqueta="Servicio" valor={formatFecha(c.fecha_servicio)} />
        <Dato
          icono={CalendarX}
          etiqueta="Vencimiento"
          valor={c.fecha_vencimiento ? formatFecha(c.fecha_vencimiento) : "Única vez"}
          destacado={c.vigencia === "vencido"}
        />
        <Dato icono={Timer} etiqueta="Reingreso" valor={plazoReingreso(plazo)} />
        <Dato icono={Stamp} etiqueta="Timbrado" valor={c.timbrado_at ? formatFecha(c.timbrado_at) : "Pendiente"} destacado={!c.timbrado_at} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Servicio"
          description={`Certificado N.º ${c.numero}`}
          icon={BadgeCheck}
          actions={<Badge tone={tipo.tono}>{tipo.label}</Badge>}
        >
          <KeyValue
            columns={1}
            items={[
              { label: "Cliente o establecimiento", value: c.cliente },
              {
                label: "Domicilio del servicio",
                value: (
                  <span className="inline-flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    {c.domicilio}
                  </span>
                ),
              },
              { label: "Rubro (Anexo Ord. 2681/98)", value: c.rubro ? `${c.rubro}${c.rubro_grupo ? ` · ${c.rubro_grupo}` : ""}` : null },
              c.tipo === "tanque"
                ? { label: "Capacidad", value: c.capacidad_litros !== null ? formatLitros(c.capacidad_litros) : null }
                : { label: "Superficie tratada", value: c.superficie_m2 !== null ? formatSuperficie(c.superficie_m2) : null },
              { label: "Fecha y hora del servicio", value: formatFechaHora(c.fecha_servicio) },
              {
                label: "Vencimiento",
                value: c.fecha_vencimiento ? formatFechaLarga(c.fecha_vencimiento) : "Servicio por única vez (sin vencimiento)",
              },
            ]}
          />
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard
            title="Empresa prestadora"
            icon={Building2}
            actions={
              c.empresa.habilitada ? (
                <Badge tone="verde" dot>
                  Habilitada
                </Badge>
              ) : (
                <Badge tone="rojo" dot>
                  No habilitada hoy
                </Badge>
              )
            }
          >
            <div className="flex flex-col gap-4">
              <KeyValue
                columns={2}
                items={[
                  { label: "Empresa", value: c.empresa.nombre, full: true },
                  { label: "CUIT", value: c.empresa.cuit ? <span className="nums-tabular">{c.empresa.cuit}</span> : null },
                  { label: "N.º de registro", value: c.empresa.numero_registro },
                  { label: "Autorización", value: c.empresa.resolucion_dsa ? `Res. ${c.empresa.resolucion_dsa}` : null, full: true },
                ]}
              />
              {c.empresa.habilitada ? (
                <Button asChild variant="secondary" size="sm" className="w-fit">
                  <Link href={`/empresas/${c.empresa.id}`}>
                    Ver ficha de la empresa
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  La empresa no figura hoy como habilitada para este servicio. Consultá el{" "}
                  <Link href="/empresas" className="font-medium text-azul-700 hover:underline">
                    listado oficial
                  </Link>
                  .
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Asesor técnico responsable"
            icon={FileSignature}
            actions={
              c.firmado ? (
                <Badge tone="verde" dot>
                  Firmado digitalmente
                </Badge>
              ) : (
                <Badge tone="ambar" dot>
                  Sin firma
                </Badge>
              )
            }
          >
            <KeyValue
              columns={2}
              items={[
                { label: "Nombre", value: c.tecnico.nombre, full: true },
                { label: "Título", value: c.tecnico.titulo },
                { label: "Matrícula", value: c.tecnico.matricula },
              ]}
            />
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Productos aplicados"
        description="Con su registro ANMAT o SENASA y el plazo para volver a usar el ambiente"
        icon={FlaskConical}
        flush
      >
        {c.productos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">
            {c.tipo === "tanque"
              ? "No se declararon productos para esta limpieza."
              : "El certificado no tiene productos declarados."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {c.productos.map((p, i) => {
              const organismo = p.organismo ? ORGANISMO[p.organismo] : null;
              return (
                <li key={`${i}-${p.nombre}`} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{p.nombre}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {[p.principio_activo, p.cantidad !== null ? `${formatNumero(p.cantidad, 3)} ${p.unidad ?? ""}`.trim() : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {organismo ? (
                      <Badge tone={organismo.tono}>
                        <BadgeCheck aria-hidden />
                        {organismo.label}
                        {p.registro ? <span className="nums-tabular"> N.º {p.registro}</span> : null}
                      </Badge>
                    ) : (
                      <Badge tone="ambar">Sin registro informado</Badge>
                    )}
                    <Badge tone="neutral">
                      <Timer aria-hidden />
                      Reingreso: {plazoReingreso(p.plazo_reingreso_horas)}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {c.sello_codigo || c.timbrado_at ? <SelloTimbrado c={c} /> : null}
    </>
  );
}

/**
 * Sello de timbrado. Solo se destaca en verde si el certificado es válido: un certificado anulado o
 * vencido conserva su sello, pero ya no acredita el servicio.
 */
function SelloTimbrado({ c }: { c: VerificacionCertificado }) {
  const vigente = c.vigencia === "vigente";
  const anulado = c.vigencia === "anulado";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border p-5 sm:flex-row sm:items-center sm:justify-between",
        vigente ? "border-emerald-200 bg-success-soft" : "border-border bg-muted/60",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl bg-white ring-1",
            vigente ? "text-success ring-emerald-200" : "text-noche-500 ring-border",
          )}
        >
          <Stamp className="size-5" />
        </span>
        <div>
          <p className={cn("font-display font-semibold", vigente ? "text-emerald-900" : "text-foreground")}>
            Sello de timbrado digital
            {anulado ? <span className="ml-2 text-sm font-medium text-danger">(certificado anulado)</span> : null}
            {c.vigencia === "vencido" ? <span className="ml-2 text-sm font-medium text-danger">(certificado vencido)</span> : null}
          </p>
          <p className={cn("text-sm", vigente ? "text-emerald-900/80" : "text-muted-foreground")}>
            {c.sello_codigo ? (
              <span className={cn("font-mono font-semibold", anulado && "line-through")}>{c.sello_codigo}</span>
            ) : null}
            {c.timbrado_at ? ` · ${formatFechaHora(c.timbrado_at)}` : null}
          </p>
        </div>
      </div>
      {c.sello_codigo ? <CopiarTexto texto={c.sello_codigo} etiqueta="Copiar sello" descripcion="el sello" /> : null}
    </div>
  );
}

function Dato({
  icono: Icono,
  etiqueta,
  valor,
  destacado = false,
}: {
  icono: LucideIcon;
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-card border bg-card p-4 shadow-card",
        destacado ? "border-red-200 bg-danger-soft" : "border-border",
      )}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icono className="size-3.5" aria-hidden />
        {etiqueta}
      </p>
      <p className={cn("font-display text-lg font-semibold nums-tabular", destacado ? "text-danger" : "text-foreground")}>{valor}</p>
    </div>
  );
}
