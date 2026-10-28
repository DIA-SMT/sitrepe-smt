import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CircleCheck,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Gavel,
  History,
  ListChecks,
  MessageSquareReply,
  MessageSquareWarning,
  OctagonX,
  ScrollText,
  Send,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { calcularRequisitos, getContextoTramite, getUltimaResolucionDsa, respuestasTramite } from "@/lib/data/empresas";
import { ESTADO_DOCUMENTO, ESTADO_EMPRESA, ESTADO_TRAMITE, TIPO_DOCUMENTO, TIPO_TRAMITE } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatRelativo, hoyISO } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { AccionesDocumento } from "../../_components/acciones-revision";
import { Checklist } from "../../_components/checklist";
import { rutaDocumento, rutaLegajo } from "../../_components/rutas";
import { Actividades } from "../../empresas/_components/celdas";
import { AccionesTramite } from "../_components/acciones-tramite";
import { DatosTramite } from "../_components/datos-tramite";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ctx = await getContextoTramite(id).catch(() => null);
  if (!ctx) return { title: "Trámite" };
  const tipo = ctx.tramite.tipo ? TIPO_TRAMITE[ctx.tramite.tipo].label : "Trámite";
  return { title: `${ctx.tramite.codigo ?? "Trámite"} · ${tipo}` };
}

/** Tipos cuyo análisis involucra todo el legajo (y no solo los documentos adjuntos al trámite). */
const USA_LEGAJO_COMPLETO = new Set(["inscripcion", "renovacion"]);

export default async function TramitePage({ params }: Props) {
  const sesion = await requerirStaff();
  const { id } = await params;
  const contexto = await getContextoTramite(id);
  if (!contexto) notFound();

  const { tramite, empresa, documentos, personas } = contexto;
  const rol = sesion.perfil.rol;
  const puedeResolver = rol === "admin" || rol === "control";
  const pendiente = tramite.estado === "presentado" || tramite.estado === "observado";
  const tipo = tramite.tipo ?? "inscripcion";
  const requisitos = calcularRequisitos(contexto);
  const requisitosPendientes = requisitos.filter((r) => r.estado !== "cumplido").map((r) => r.titulo);
  const anio = Number(hoyISO().slice(0, 4));
  const ultimaResolucion = puedeResolver && pendiente && tipo === "inscripcion" ? await getUltimaResolucionDsa(anio) : null;

  const delTramite = documentos.filter((d) => d.tramite_id === tramite.id);
  const relacionados = USA_LEGAJO_COMPLETO.has(tipo)
    ? [...delTramite, ...documentos.filter((d) => d.tramite_id !== tramite.id)]
    : delTramite;
  const empresaNombre = empresa?.nombre_comercial ?? tramite.empresa_nombre ?? "Empresa";

  const seguimiento: TimelineItem[] = [];
  if (tramite.presentado_at ?? tramite.created_at) {
    seguimiento.push({
      id: "presentado",
      date: (tramite.presentado_at ?? tramite.created_at) as string,
      title: "Presentado por la empresa",
      description: personas.presentadoPor ? `Por ${personas.presentadoPor}` : undefined,
      tone: "azul",
      icon: Send,
    });
  }
  // Cada respuesta de la empresa implica una observación previa de la Dirección.
  respuestasTramite(contexto.datos).forEach((r, i) => {
    seguimiento.push({
      id: `respuesta-${i}`,
      date: r.fecha,
      title: "La empresa respondió las observaciones",
      description: r.observacion ? `Observación: ${r.observacion}` : undefined,
      tone: "celeste",
      icon: MessageSquareReply,
    });
  });
  if (tramite.estado === "observado") {
    seguimiento.push({
      id: "observado",
      date: (tramite.updated_at ?? tramite.created_at) as string,
      title: "Observado por la Dirección",
      description: [tramite.observaciones, personas.resueltoPor ? `Por ${personas.resueltoPor}` : null].filter(Boolean).join(" · "),
      tone: "ambar",
      icon: MessageSquareWarning,
    });
  }
  if (tramite.resuelto_at && (tramite.estado === "aprobado" || tramite.estado === "rechazado")) {
    seguimiento.push({
      id: "resuelto",
      date: tramite.resuelto_at,
      title: tramite.estado === "aprobado" ? "Aprobado" : "Rechazado",
      description: [
        tramite.resolucion ? `Res. ${tramite.resolucion}` : null,
        personas.resueltoPor ? `Por ${personas.resueltoPor}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      tone: tramite.estado === "aprobado" ? "verde" : "rojo",
      icon: tramite.estado === "aprobado" ? CircleCheck : OctagonX,
    });
  }
  // Lo más reciente primero.
  seguimiento.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <PageHeader
        title={TIPO_TRAMITE[tipo].label}
        description={`${tramite.codigo ?? "Trámite"} · ${empresaNombre}`}
        icon={ScrollText}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Trámites", href: "/gestion/tramites" },
          { label: tramite.codigo ?? "Trámite" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href={rutaLegajo(tramite.empresa_id)}>
              <Building2 aria-hidden />
              Ver legajo
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <EstadoBadge mapa={ESTADO_TRAMITE} valor={tramite.estado} size="lg" pulse={tramite.estado === "presentado"} />
          <span>
            Presentado el {formatFechaHora(tramite.presentado_at ?? tramite.created_at)} ({formatRelativo(tramite.presentado_at ?? tramite.created_at)})
          </span>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6">
        {tramite.estado === "observado" ? (
          <Alert tone="warning" title="Observado: esperando correcciones de la empresa">
            {tramite.observaciones ?? "Se enviaron observaciones a la empresa."} Igualmente podés resolverlo si ya cuenta con lo necesario.
          </Alert>
        ) : null}
        {tramite.estado === "aprobado" ? (
          <Alert tone="success" title={`Aprobado el ${formatFecha(tramite.resuelto_at)}${tramite.resolucion ? ` · Res. ${tramite.resolucion}` : ""}`}>
            {tramite.observaciones ?? "El trámite se aplicó al registro de la empresa."}
          </Alert>
        ) : null}
        {tramite.estado === "rechazado" ? (
          <Alert tone="danger" title={`Rechazado el ${formatFecha(tramite.resuelto_at)}`}>
            {tramite.observaciones ?? "Sin motivo registrado."}
          </Alert>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <SectionCard title="Datos presentados" description="Tal como los cargó la empresa en la plataforma" icon={ClipboardList}>
              <DatosTramite contexto={contexto} />
            </SectionCard>

            {requisitos.length > 0 ? (
              <SectionCard
                title={tipo === "inscripcion" ? "Requisitos de inscripción" : "Requisitos"}
                description={
                  tipo === "inscripcion"
                    ? "Técnico, documentación, memoria técnica e inspección (Arts. 4.º a 7.º)"
                    : "Verificaciones previas a la resolución"
                }
                icon={ListChecks}
              >
                <Checklist requisitos={requisitos} />
              </SectionCard>
            ) : null}

            <SectionCard
              title="Documentos relacionados"
              description={
                USA_LEGAJO_COMPLETO.has(tipo)
                  ? "Adjuntos al trámite y resto del legajo de la empresa"
                  : "Documentos adjuntos a este trámite"
              }
              icon={FolderOpen}
              flush
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link href={rutaLegajo(tramite.empresa_id, "documentos")}>
                    Legajo
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            >
              {relacionados.length === 0 ? (
                <div className="p-5 sm:p-6">
                  <EmptyState
                    compact
                    icon={FileText}
                    title="Sin documentos adjuntos"
                    description="La empresa no adjuntó documentos a este trámite."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {relacionados.map((d) => {
                    const etiquetaTipo = TIPO_DOCUMENTO[d.tipo ?? "otro"].label;
                    return (
                      <li
                        key={d.id}
                        className={cn(
                          "flex flex-col gap-3 px-5 py-4 sm:px-6 md:flex-row md:items-start md:justify-between",
                          d.estado === "pendiente" && "bg-sol-50/50",
                        )}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <FileText className="mt-0.5 size-5 shrink-0 text-azul-600" aria-hidden />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                              {etiquetaTipo}
                              {d.tramite_id === tramite.id ? (
                                <span className="rounded-full bg-azul-50 px-2 py-0.5 text-[11px] font-medium text-azul-700">
                                  Adjunto al trámite
                                </span>
                              ) : null}
                            </p>
                            {d.id ? (
                              <a
                                href={rutaDocumento(tramite.empresa_id, d.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-w-0 items-center gap-1.5 text-sm text-azul-700 hover:underline"
                              >
                                <span className="truncate">{d.nombre_archivo ?? "Ver archivo"}</span>
                                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                                <span className="sr-only">(se abre en una pestaña nueva)</span>
                              </a>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              Cargado el {formatFecha(d.created_at)}
                              {d.vence ? ` · vence el ${formatFecha(d.vence)}` : ""}
                              {d.tecnico_nombre ? ` · ${d.tecnico_nombre}` : ""}
                            </p>
                            {d.observaciones ? <p className="text-[13px] text-muted-foreground">{d.observaciones}</p> : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-2 pl-8 md:items-end md:pl-0">
                          <EstadoBadge mapa={ESTADO_DOCUMENTO} valor={d.estado} size="sm" />
                          {puedeResolver && d.id && d.estado ? (
                            <AccionesDocumento id={d.id} tipo={etiquetaTipo} estado={d.estado} vence={d.vence} />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            <SectionCard
              title="Resolución"
              description={pendiente ? "Aprobá, observá o rechazá el trámite" : "El trámite ya fue resuelto"}
              icon={Gavel}
              className={cn(pendiente && puedeResolver && "ring-gradient-brand")}
            >
              {pendiente && puedeResolver ? (
                <AccionesTramite
                  id={tramite.id}
                  tipo={tipo}
                  codigo={tramite.codigo ?? "el trámite"}
                  empresa={empresaNombre}
                  requisitosPendientes={requisitosPendientes}
                  ultimaResolucion={ultimaResolucion}
                  anio={anio}
                />
              ) : pendiente ? (
                <p className="text-sm text-muted-foreground">
                  Los trámites los resuelven Administración y Control de Empresas. Podés consultar el legajo y la documentación.
                </p>
              ) : (
                <KeyValue
                  columns={1}
                  items={[
                    { label: "Resultado", value: <EstadoBadge mapa={ESTADO_TRAMITE} valor={tramite.estado} size="sm" /> },
                    { label: "Fecha", value: tramite.resuelto_at ? formatFechaHora(tramite.resuelto_at) : null },
                    { label: "Resolución", value: tramite.resolucion },
                    { label: "Resolvió", value: personas.resueltoPor },
                    { label: "Observaciones", value: tramite.observaciones },
                  ]}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Empresa"
              icon={Building2}
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link href={rutaLegajo(tramite.empresa_id)}>
                    Legajo
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            >
              {empresa ? (
                <KeyValue
                  columns={1}
                  items={[
                    { label: "Nombre comercial", value: empresa.nombre_comercial },
                    { label: "CUIT", value: empresa.cuit },
                    { label: "N.º de registro", value: empresa.numero_registro ? `N.º ${empresa.numero_registro}` : "Sin asignar" },
                    { label: "Estado", value: <EstadoBadge mapa={ESTADO_EMPRESA} valor={empresa.estado_efectivo} size="sm" /> },
                    {
                      label: "Actividades",
                      value: <Actividades fumigacion={empresa.habilita_fumigacion} tanques={empresa.habilita_tanques} />,
                    },
                    {
                      label: "Vencimiento",
                      value: empresa.vencimiento_habilitacion ? formatFecha(empresa.vencimiento_habilitacion) : null,
                    },
                    { label: "Resolución DSA", value: empresa.resolucion_dsa },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No se pudieron obtener los datos de la empresa.</p>
              )}
            </SectionCard>

            <SectionCard title="Seguimiento" icon={History}>
              {seguimiento.length > 0 ? (
                <Timeline items={seguimiento} />
              ) : (
                <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </>
  );
}
