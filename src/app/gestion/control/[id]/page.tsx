import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  BookOpenCheck,
  Building2,
  CalendarRange,
  CircleCheckBig,
  ClipboardCheck,
  FilePlus2,
  Files,
  Gauge,
  History,
  MessageSquareText,
  MessageSquareWarning,
  Send,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requerirStaff } from "@/lib/auth";
import { type ControlDeclaracion, getControlDeclaracion, getDeclaracionVista, puedeControlar } from "@/lib/data/control";
import { ESTADO_DECLARACION, ESTADO_EMPRESA, TIPO_SERVICIO, etiqueta } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha, formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { GUIA_VERIFICACIONES, ICONO_VERIFICACION } from "../_components/verificacion";
import { PanelControl } from "./_components/panel-control";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const declaracion = await getDeclaracionVista(id);
  return { title: declaracion?.codigo ? `Control ${declaracion.codigo}` : "Control de planilla" };
}

export default async function ControlDeclaracionPage({ params }: Props) {
  const sesion = await requerirStaff();
  const { id } = await params;
  const datos = await getControlDeclaracion(id);
  if (!datos) notFound();

  const { declaracion: d, empresa, habilitada, certificados, resumen, antelacion } = datos;
  const estado = d.estado ?? "borrador";
  const tipo = d.tipo ?? "fumigacion";
  const codigo = d.codigo ?? "Planilla sin código";
  const controla = puedeControlar(sesion.perfil.rol);
  const editable = controla && estado === "presentada";
  const rechazable = controla && (estado === "presentada" || estado === "observada");
  const pctOk = resumen.verificacionesTotal > 0 ? Math.round((resumen.verificacionesOk / resumen.verificacionesTotal) * 100) : 0;

  return (
    <>
      <PageHeader
        title={`Planilla ${codigo}`}
        description={`Verificá cada certificado de la planilla contra el Anexo y el padrón antes del timbrado (Art. 10.º a, Ord. 2681/98).`}
        icon={ClipboardCheck}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Control de declaraciones", href: "/gestion/control" },
          { label: codigo },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/gestion/control">
                <ArrowLeft aria-hidden />
                Volver a la bandeja
              </Link>
            </Button>
            {d.empresa_id ? (
              <Button asChild variant="secondary">
                <Link href={`/gestion/certificados?empresa=${d.empresa_id}`}>
                  <Files aria-hidden />
                  Certificados de la empresa
                </Link>
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_DECLARACION} valor={estado} size="lg" pulse={estado === "presentada"} />
          <Badge tone={tipo === "tanque" ? "celeste" : "azul"} size="lg">
            {etiqueta(TIPO_SERVICIO, tipo).label}
          </Badge>
          <Badge variant="outline" size="lg">
            {certificados.length === 1 ? "1 certificado" : `${certificados.length} certificados`}
          </Badge>
          {d.presentada_at ? (
            <span className="text-sm text-muted-foreground">
              Presentada el {formatFechaHora(d.presentada_at)} · {formatRelativo(d.presentada_at)}
              {datos.presentadaPor ? ` · por ${datos.presentadaPor}` : ""}
            </span>
          ) : null}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <AvisoEstado datos={datos} controla={controla} />

        {habilitada === false && estado === "presentada" ? (
          <Alert tone="danger" title="La empresa no está habilitada">
            {empresa?.nombre_comercial ?? "La empresa"} no está habilitada para{" "}
            {tipo === "fumigacion" ? "servicios de fumigación" : "limpieza de tanques"}. Solo valen los certificados de empresas
            empadronadas y autorizadas: corresponde rechazar la planilla.
          </Alert>
        ) : null}

        {/* Antes del primer control, `observaciones` es la nota de la empresa. En una planilla observada y
            vuelta a presentar puede ser la observación del control anterior (o la nota que la empresa editó).
            Al controlar o rechazar, la base la reemplaza por las observaciones del área. */}
        {d.observaciones && (estado === "presentada" || estado === "borrador") ? (
          <Alert
            tone="info"
            title={d.controlada_at ? "Observaciones registradas en la planilla" : "Nota de la empresa"}
            icon={<MessageSquareText />}
          >
            <span className="whitespace-pre-line">{d.observaciones}</span>
            {d.controlada_at ? (
              <span className="mt-1 block text-[13px] text-muted-foreground">
                Vienen del control anterior ({formatFechaHora(d.controlada_at)}) o la empresa las actualizó al volver a
                presentarla.
              </span>
            ) : null}
            {editable ? (
              <span className="mt-1 block text-[13px] text-muted-foreground">
                Al resolver, este texto se reemplaza por las observaciones generales que cargues.
              </span>
            ) : null}
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard
            title={empresa?.nombre_comercial ?? d.empresa_nombre ?? "Empresa"}
            description={empresa?.cuit ? `CUIT ${empresa.cuit}` : undefined}
            icon={Building2}
            actions={
              d.empresa_id ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/gestion/empresas/${d.empresa_id}`}>
                    Ver legajo
                    <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
              ) : null
            }
          >
            <div className="flex flex-col gap-5">
              <EstadoHabilitacion datos={datos} />
              <KeyValue
                columns={2}
                items={[
                  {
                    label: "Estado en el padrón",
                    value:
                      empresa?.estado_efectivo || empresa?.estado ? (
                        <EstadoBadge mapa={ESTADO_EMPRESA} valor={empresa.estado_efectivo ?? empresa.estado} size="sm" />
                      ) : null,
                  },
                  {
                    label: "Habilitación hasta",
                    value: empresa?.vencimiento_habilitacion ? formatFecha(empresa.vencimiento_habilitacion) : "Sin vencimiento",
                  },
                  { label: "N.º de registro", value: empresa?.numero_registro ? `N.º ${empresa.numero_registro}` : null },
                  { label: "Resolución DSA", value: empresa?.resolucion_dsa },
                  { label: "Técnicos aprobados", value: empresa?.tecnicos_aprobados ?? null },
                  { label: "Productos aprobados", value: empresa?.productos_aprobados ?? null },
                ]}
              />
            </div>
          </SectionCard>

          <SectionCard
            className="xl:col-span-2"
            title="Resultado de las verificaciones automáticas"
            description="Calculadas en el servidor sobre cada certificado: rubro, fechas, vencimiento, firma, técnico, productos, antelación y establecimiento."
            icon={Gauge}
          >
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniDato icono={Files} tono="azul" valor={resumen.total} etiqueta="Certificados" />
                <MiniDato icono={CircleCheckBig} tono="verde" valor={resumen.sinFallas} etiqueta="Sin fallas" />
                <MiniDato icono={MessageSquareWarning} tono="rojo" valor={resumen.conFallas} etiqueta="Con fallas" />
                <MiniDato icono={TriangleAlert} tono="ambar" valor={resumen.conAvisos} etiqueta="Con avisos" />
              </div>
              {resumen.verificacionesTotal > 0 ? (
                <Progress
                  label={`Verificaciones superadas (${resumen.verificacionesOk} de ${resumen.verificacionesTotal})`}
                  value={pctOk}
                  showValue
                  tone={pctOk === 100 ? "verde" : pctOk >= 75 ? "ambar" : "rojo"}
                />
              ) : (
                <p className="text-sm text-muted-foreground">La planilla no tiene certificados para verificar.</p>
              )}
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p className="flex items-start gap-2 text-muted-foreground">
                  <CalendarRange className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                  <span>
                    {d.primer_servicio ? (
                      <>
                        Servicios entre el <strong className="text-foreground">{formatFechaHora(d.primer_servicio)}</strong> y el{" "}
                        <strong className="text-foreground">{formatFechaHora(d.ultimo_servicio ?? d.primer_servicio)}</strong>.
                      </>
                    ) : (
                      "La planilla no tiene servicios con fecha."
                    )}
                  </span>
                </p>
                <p className="flex items-start gap-2 text-muted-foreground">
                  <BookOpenCheck className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                  <span>
                    {tipo === "fumigacion"
                      ? `Antelación exigida: entre ${antelacion.min} y ${antelacion.max} h antes del servicio (Art. 9.º a).`
                      : "La limpieza de tanques se declara una vez realizada, con los análisis del agua (Ord. 2004/92)."}
                  </span>
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        <PanelControl
          declaracionId={d.id ?? id}
          codigo={codigo}
          editable={editable}
          rechazable={rechazable}
          empresaHabilitada={habilitada}
          certificados={certificados}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Historial de la planilla" icon={History}>
            <Timeline items={historial(datos)} />
          </SectionCard>
          <SectionCard
            title="Qué se verifica"
            description="Controles que el área aplica a cada certificado presentado."
            icon={BookOpenCheck}
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {GUIA_VERIFICACIONES.map((g) => {
                const Icono = ICONO_VERIFICACION[g.clave];
                return (
                  <li key={g.clave} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-azul-50 text-azul-600 ring-1 ring-azul-100"
                    >
                      <Icono className="size-4" strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground">{g.titulo}</p>
                      <p className="text-[13px] leading-snug text-muted-foreground">{g.descripcion}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------- */

function AvisoEstado({ datos, controla }: { datos: ControlDeclaracion; controla: boolean }) {
  const { declaracion: d, controladaPor } = datos;
  const cuando = d.controlada_at ? `el ${formatFechaHora(d.controlada_at)}` : "";
  const quien = controladaPor ? ` por ${controladaPor}` : "";

  switch (d.estado) {
    case "presentada":
      return controla ? null : (
        <Alert tone="info" title="Modo lectura">
          Podés consultar las verificaciones de esta planilla. El control lo resuelven Administración y Control de Empresas.
        </Alert>
      );
    case "borrador":
      return (
        <Alert tone="info" title="Planilla en carga">
          La empresa todavía no presentó esta planilla. Va a aparecer en la bandeja cuando la presente.
        </Alert>
      );
    case "controlada":
      return (
        <Alert tone="success" title={`Planilla controlada ${cuando}${quien}`}>
          Los certificados quedaron controlados y la empresa puede pagar el timbrado.
          {d.observaciones ? <span className="mt-1 block">Observaciones: {d.observaciones}</span> : null}
        </Alert>
      );
    case "observada":
      return (
        <Alert tone="warning" title={`Planilla observada ${cuando}${quien}`}>
          {d.observados
            ? `${d.observados === 1 ? "1 certificado volvió" : `${d.observados} certificados volvieron`} a la empresa para corregir. `
            : ""}
          Cuando la empresa vuelva a presentarla, aparecerá otra vez en la bandeja.
          {d.observaciones ? <span className="mt-1 block">Observaciones: {d.observaciones}</span> : null}
        </Alert>
      );
    case "rechazada":
      return (
        <Alert tone="danger" title={`Planilla rechazada ${cuando}${quien}`}>
          {d.observaciones ? `Motivo: ${d.observaciones}` : "Sus certificados sin pago asociado fueron anulados."}
        </Alert>
      );
    default:
      return null;
  }
}

function EstadoHabilitacion({ datos }: { datos: ControlDeclaracion }) {
  const { habilitada, empresa, declaracion } = datos;
  const esTanque = declaracion.tipo === "tanque";
  const servicio = esTanque ? "limpieza de tanques" : "fumigación";
  const vence = empresa?.vencimiento_habilitacion ?? null;
  const dias = diasHasta(vence);
  const sinHabilitacionDelServicio = !!empresa && !(esTanque ? empresa.habilita_tanques : empresa.habilita_fumigacion);

  if (habilitada === true) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-emerald-900">Habilitada para {servicio}</p>
          <p className="text-[13px] leading-snug text-emerald-900/80">
            {vence
              ? `Habilitación vigente hasta el ${formatFecha(vence)}${
                  dias !== null && dias <= 30
                    ? dias <= 0
                      ? " (vence hoy)"
                      : ` (vence en ${dias === 1 ? "1 día" : `${dias} días`})`
                    : ""
                }.`
              : "Sin vencimiento de habilitación registrado."}
          </p>
        </div>
      </div>
    );
  }
  if (habilitada === false) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
          <ShieldX className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-red-900">No habilitada para {servicio}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-[13px] leading-snug text-red-900/80">
            Estado en el padrón:
            <EstadoBadge mapa={ESTADO_EMPRESA} valor={empresa?.estado_efectivo ?? empresa?.estado} size="sm" />
            {vence ? (
              <span>
                · {dias !== null && dias < 0 ? "venció" : "vence"} el {formatFecha(vence)}
              </span>
            ) : null}
          </p>
          {sinHabilitacionDelServicio ? (
            <p className="mt-1 text-[13px] leading-snug text-red-900/80">
              No tiene habilitación específica para {servicio} en el padrón.
            </p>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-subtle p-4">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-noche-100 text-noche-600">
        <ShieldQuestion className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-foreground">No se pudo verificar la habilitación</p>
        <p className="text-[13px] leading-snug text-muted-foreground">Consultá el legajo de la empresa antes de resolver.</p>
      </div>
    </div>
  );
}

const TONOS_MINI = {
  azul: "bg-azul-50 text-azul-700 ring-azul-100",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rojo: "bg-red-50 text-red-700 ring-red-200",
  ambar: "bg-amber-50 text-amber-800 ring-amber-200",
} as const;

function MiniDato({
  icono: Icono,
  tono,
  valor,
  etiqueta: texto,
}: {
  icono: LucideIcon;
  tono: keyof typeof TONOS_MINI;
  valor: number;
  etiqueta: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", TONOS_MINI[tono])}>
        <Icono className="size-[18px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl leading-none font-semibold tabular-nums text-foreground">{valor}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{texto}</p>
      </div>
    </div>
  );
}

function historial({ declaracion: d, presentadaPor, controladaPor }: ControlDeclaracion): TimelineItem[] {
  const items: TimelineItem[] = [];
  // Solo una planilla observada puede volver a presentarse: si está presentada y tiene controlada_at,
  // ese control anterior la observó.
  if (d.controlada_at && d.estado === "presentada") {
    items.push({
      id: "observada-anterior",
      date: d.controlada_at,
      title: "Observada en un control anterior",
      description: controladaPor ? `Por ${controladaPor}. La empresa corrigió y volvió a presentarla.` : undefined,
      tone: "ambar",
      icon: MessageSquareWarning,
    });
  }
  if (d.controlada_at && (d.estado === "controlada" || d.estado === "observada" || d.estado === "rechazada")) {
    const resultado = {
      controlada: { titulo: "Planilla controlada", tono: "verde", icono: CircleCheckBig },
      observada: { titulo: "Planilla observada", tono: "ambar", icono: MessageSquareWarning },
      rechazada: { titulo: "Planilla rechazada", tono: "rojo", icono: Ban },
    } as const;
    const r = resultado[d.estado];
    items.push({
      id: "resolucion",
      date: d.controlada_at,
      title: r.titulo,
      description: [controladaPor ? `Por ${controladaPor}.` : null, d.observaciones].filter(Boolean).join(" ") || undefined,
      tone: r.tono,
      icon: r.icono,
    });
  }
  if (d.presentada_at) {
    items.push({
      id: "presentada",
      date: d.presentada_at,
      title:
        d.controlada_at && new Date(d.presentada_at) > new Date(d.controlada_at)
          ? "Presentada nuevamente por la empresa"
          : "Presentada por la empresa",
      description: presentadaPor ? `Por ${presentadaPor}.` : undefined,
      tone: "azul",
      icon: Send,
    });
  }
  if (d.created_at) {
    items.push({
      id: "creada",
      date: d.created_at,
      title: "Planilla creada",
      description: d.empresa_nombre ?? undefined,
      tone: "neutral",
      icon: FilePlus2,
    });
  }
  const tiempo = (item: TimelineItem) => new Date(item.date).getTime() || 0;
  return items.sort((a, b) => tiempo(b) - tiempo(a));
}
