import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  FilePenLine,
  Info,
  Megaphone,
  Siren,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requerirEmpresa } from "@/lib/auth";
import { getActasEmpresa, getAlertasEmpresa, getAvisosEmpresa, getNotificacionesEmpresa } from "@/lib/data/legajo";
import {
  ESTADO_ACTA,
  ESTADO_NOTIFICACION,
  MOTIVO_ACTA,
  NIVEL_AVISO,
  PLAZO_NOTIFICACION,
  TIPO_NOTIFICACION,
  etiqueta,
} from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { BotonAccion } from "../legajo/_components/boton-accion";
import { marcarAvisoLeido, marcarTodosLeidos } from "./actions";

export const metadata: Metadata = {
  title: "Avisos y comunicaciones",
  description: "Avisos de la Dirección, alertas de vencimiento, notificaciones y actas de la empresa.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const NIVEL_ESTILO: Record<Enums<"nivel_aviso">, { icono: LucideIcon; barra: string; chip: string }> = {
  info: { icono: Info, barra: "bg-azul-500", chip: "bg-azul-50 text-azul-600 ring-azul-100" },
  alerta: { icono: TriangleAlert, barra: "bg-sol-400", chip: "bg-sol-100 text-sol-800 ring-sol-300" },
  urgente: { icono: Siren, barra: "bg-red-500", chip: "bg-red-50 text-red-600 ring-red-200" },
};

type Alerta = Awaited<ReturnType<typeof getAlertasEmpresa>>[number];

function destinoAlerta(a: Alerta): { href: string; accion: string } | null {
  switch (a.tipo) {
    case "habilitacion_por_vencer":
      return { href: "/prestador/legajo?tab=renovacion", accion: "Renovar" };
    case "documento_por_vencer":
      return { href: "/prestador/legajo?tab=documentacion", accion: "Actualizar" };
    case "declaracion_observada":
      return a.referencia_id ? { href: `/prestador/declaraciones/${a.referencia_id}`, accion: "Corregir" } : null;
    case "notificacion_vencida":
      return { href: "#notificaciones", accion: "Ver" };
    default:
      return null;
  }
}

function nivelAlerta(nivel: string | null): Enums<"nivel_aviso"> {
  return nivel === "urgente" || nivel === "alerta" ? nivel : "info";
}

export default async function AvisosPage({ searchParams }: Props) {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const sp = await searchParams;
  const soloNoLeidos = sp.ver === "no-leidos";
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina, 10);

  const [avisos, alertas, notificaciones, actas] = await Promise.all([
    getAvisosEmpresa({ soloNoLeidos, desde, hasta }),
    getAlertasEmpresa(empresaId),
    getNotificacionesEmpresa(empresaId),
    getActasEmpresa(empresaId),
  ]);

  const notificacionesAbiertas = notificaciones.filter((n) =>
    ["emitida", "notificada", "vencida"].includes(n.estado_efectivo ?? ""),
  ).length;
  const actasVigentes = actas.filter((a) => a.estado !== "anulada" && a.estado !== "resuelta").length;

  return (
    <>
      <PageHeader
        title="Avisos y comunicaciones"
        description="Novedades de la Dirección de Salud Ambiental, alertas de vencimiento y comunicaciones formales dirigidas a tu empresa."
        icon={Megaphone}
        breadcrumb={[{ label: "Prestadores", href: "/prestador" }, { label: "Avisos" }]}
        actions={
          avisos.noLeidos > 0 ? (
            <BotonAccion accion={marcarTodosLeidos} variant="outline" size="md">
              <CheckCheck aria-hidden />
              Marcar todos como leídos
            </BotonAccion>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Avisos sin leer"
          value={avisos.noLeidos}
          icon={Bell}
          tone={avisos.noLeidos > 0 ? "azul" : "neutral"}
          href={avisos.noLeidos > 0 ? "/prestador/avisos?ver=no-leidos" : undefined}
        />
        <StatCard
          label="Alertas activas"
          value={alertas.length}
          icon={TriangleAlert}
          tone={alertas.some((a) => a.nivel === "urgente") ? "rojo" : alertas.length > 0 ? "ambar" : "neutral"}
          hint={alertas.length > 0 ? "Requieren tu atención" : "Todo en orden"}
        />
        <StatCard
          label="Notificaciones abiertas"
          value={notificacionesAbiertas}
          icon={BellRing}
          tone={notificacionesAbiertas > 0 ? "violeta" : "neutral"}
          hint={`${notificaciones.length} en total`}
        />
        <StatCard
          label="Actas en curso"
          value={actasVigentes}
          icon={FilePenLine}
          tone={actasVigentes > 0 ? "rojo" : "neutral"}
          hint={`${actas.length} en total`}
        />
      </div>

      {alertas.length > 0 ? (
        <SectionCard className="mt-6" title="Alertas de tu empresa" description="Vencimientos y pendientes detectados por la plataforma" icon={Siren} flush>
          <ul className="divide-y divide-border">
            {alertas.map((a, i) => {
              const nivel = nivelAlerta(a.nivel);
              const estilo = NIVEL_ESTILO[nivel];
              const Icono = estilo.icono;
              const destino = destinoAlerta(a);
              return (
                <li key={`${a.tipo}-${a.referencia_id ?? i}`} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1", estilo.chip)}>
                    <Icono className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {a.titulo}
                      <span className="sr-only"> ({NIVEL_AVISO[nivel].label})</span>
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">{a.detalle}</p>
                  </div>
                  {destino ? (
                    <Button asChild variant="ghost" size="sm" className="shrink-0">
                      <Link href={destino.href}>
                        {destino.accion}
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-3"
          title="Avisos de la Dirección"
          description={soloNoLeidos ? "Solo los avisos sin leer" : "Comunicados generales y para tu empresa"}
          icon={Megaphone}
          flush
          actions={
            <nav aria-label="Filtrar avisos" className="flex gap-1 rounded-xl bg-muted p-1">
              {[
                { href: "/prestador/avisos", label: "Todos", activo: !soloNoLeidos },
                { href: "/prestador/avisos?ver=no-leidos", label: `Sin leer (${avisos.noLeidos})`, activo: soloNoLeidos },
              ].map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  scroll={false}
                  aria-current={f.activo ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1 text-[13px] font-medium transition-colors",
                    f.activo ? "bg-card text-azul-700 shadow-[0_1px_3px_rgb(10_26_63/0.14)]" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          }
          footer={
            avisos.total > tamanio ? (
              <Paginacion pagina={pagina} total={avisos.total} tamanio={tamanio} params={sp} ruta="/prestador/avisos" className="w-full" />
            ) : undefined
          }
        >
          {avisos.filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={soloNoLeidos ? CheckCheck : Megaphone}
                title={soloNoLeidos ? "Estás al día" : "Todavía no hay avisos"}
                description={
                  soloNoLeidos
                    ? "Leíste todos los avisos de la Dirección."
                    : "Los comunicados de la Dirección de Salud Ambiental van a aparecer acá."
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {avisos.filas.map((a) => {
                const estilo = NIVEL_ESTILO[a.nivel];
                const Icono = estilo.icono;
                const leido = Boolean(a.leido_at);
                return (
                  <li key={a.id} className={cn("relative flex gap-4 px-5 py-5 sm:px-6", !leido && "bg-azul-50/40")}>
                    <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", leido ? "bg-transparent" : estilo.barra)} />
                    <span aria-hidden className={cn("hidden size-10 shrink-0 items-center justify-center rounded-xl ring-1 sm:flex", estilo.chip)}>
                      <Icono className="size-5" />
                    </span>
                    <article className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn("font-display text-[15px] leading-snug", leido ? "font-medium" : "font-semibold")}>{a.titulo}</h3>
                        {!leido ? (
                          <Badge tone="azul" variant="solid" size="sm">
                            Nuevo
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <EstadoBadge mapa={NIVEL_AVISO} valor={a.nivel} size="sm" />
                        <span>{a.empresa_id ? "Para tu empresa" : "Para todas las empresas"}</span>
                        <span aria-hidden>·</span>
                        <time dateTime={a.created_at} title={formatFechaHora(a.created_at)}>
                          {formatRelativo(a.created_at)}
                        </time>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-foreground/85">{a.cuerpo}</p>
                      <div className="mt-3">
                        {leido ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCheck className="size-3.5 text-success" aria-hidden />
                            Leído {formatRelativo(a.leido_at)}
                          </span>
                        ) : (
                          <BotonAccion accion={marcarAvisoLeido} campos={{ id: a.id }} silenciarExito aria-label={`Marcar "${a.titulo}" como leído`}>
                            <Check aria-hidden />
                            Marcar como leído
                          </BotonAccion>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <div className="flex flex-col gap-6 xl:col-span-2">
          <SectionCard
            id="notificaciones"
            className="scroll-mt-24"
            title="Notificaciones"
            description="Intimaciones con plazo emitidas por la Dirección"
            icon={BellRing}
            flush
          >
            {notificaciones.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState compact icon={BellRing} title="Sin notificaciones" description="Tu empresa no tiene notificaciones formales." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notificaciones.map((n) => {
                  const vencida = n.estado_efectivo === "vencida";
                  return (
                    <li key={n.id ?? n.numero} className="flex flex-col gap-2 px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[13px] font-semibold">N.º {n.numero ?? "—"}</p>
                          <p className="text-sm font-medium break-words">{n.razon_social}</p>
                          <p className="text-xs break-words text-muted-foreground">{n.domicilio}</p>
                        </div>
                        <EstadoBadge mapa={ESTADO_NOTIFICACION} valor={n.estado_efectivo} size="sm" pulse={vencida} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {n.tipo ? (
                          <Badge size="sm" tone={TIPO_NOTIFICACION[n.tipo].tono}>
                            {TIPO_NOTIFICACION[n.tipo].label}
                          </Badge>
                        ) : null}
                        {n.plazo ? (
                          <Badge size="sm" tone="neutral" variant="outline">
                            Plazo: {PLAZO_NOTIFICACION[n.plazo].label}
                          </Badge>
                        ) : null}
                      </div>
                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Notificada</dt>
                          <dd className="font-medium">{n.notificada_at ? formatFecha(n.notificada_at) : "Pendiente"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Vence</dt>
                          <dd className={cn("font-medium", vencida && "text-danger")}>{n.vence_at ? formatFechaHora(n.vence_at) : "—"}</dd>
                        </div>
                      </dl>
                      <Detalle titulo={`Ver la notificación N.º ${n.numero ?? ""}`.trim()}>
                        <DatoDetalle rotulo="Orden de trabajo" valor={n.orden_trabajo} completo />
                        <DatoDetalle rotulo="Rubro" valor={n.rubro} />
                        <DatoDetalle rotulo="CUIT" valor={n.cuit} />
                        <DatoDetalle
                          rotulo="Recibió"
                          valor={
                            n.persona_notificada
                              ? `${n.persona_notificada}${n.dni_notificado ? ` (DNI ${n.dni_notificado})` : ""}`
                              : null
                          }
                        />
                        <DatoDetalle rotulo="Cumplida" valor={n.cumplida_at ? formatFechaHora(n.cumplida_at) : null} />
                        <DatoDetalle rotulo="Inspector" valor={n.inspector_nombre} />
                        <DatoDetalle rotulo="Emitida" valor={n.created_at ? formatFecha(n.created_at) : null} />
                        <DatoDetalle rotulo="Observaciones" valor={n.observaciones} completo />
                      </Detalle>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            id="actas"
            className="scroll-mt-24"
            title="Actas de infracción"
            description="Labradas por inspección (Código de Faltas, Ord. 758/82)"
            icon={FilePenLine}
            flush
          >
            {actas.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState compact icon={FilePenLine} title="Sin actas" description="No hay actas de infracción labradas a tu empresa." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {actas.map((a) => {
                  const motivo = etiqueta(MOTIVO_ACTA, a.motivo);
                  return (
                    <li key={a.id ?? a.numero} className="flex flex-col gap-2 px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[13px] font-semibold">{a.numero ?? "Acta"}</p>
                          <p className="text-xs text-muted-foreground">{formatFechaHora(a.fecha)}</p>
                        </div>
                        <EstadoBadge mapa={ESTADO_ACTA} valor={a.estado} size="sm" />
                      </div>
                      <Badge size="sm" tone={motivo.tono}>
                        {motivo.label}
                      </Badge>
                      {a.establecimiento_nombre ? (
                        <p className="text-[13px]">
                          <span className="font-medium">{a.establecimiento_nombre}</span>
                          {a.establecimiento_domicilio ? <span className="text-muted-foreground"> · {a.establecimiento_domicilio}</span> : null}
                        </p>
                      ) : null}
                      <Detalle titulo={`Ver el acta ${a.numero ?? ""}`.trim()}>
                        <DatoDetalle rotulo="Descripción de los hechos" valor={a.descripcion} completo />
                        <DatoDetalle rotulo="Normativa infringida" valor={a.normativa} completo />
                        <DatoDetalle rotulo="Notificación previa" valor={a.notificacion_numero ? `N.º ${a.notificacion_numero}` : null} />
                        <DatoDetalle rotulo="Inspección" valor={a.inspeccion_codigo} />
                        <DatoDetalle rotulo="Inspector" valor={a.inspector_nombre} />
                      </Detalle>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

/**
 * Detalle desplegable de una comunicación formal. Se muestra en la misma página: las vistas de
 * impresión de notificaciones y actas (/imprimir/*) son exclusivas del personal municipal.
 */
function Detalle({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-border bg-subtle/50 open:bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-azul-700 outline-none select-none hover:bg-azul-50/60 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {titulo}
        <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border px-3 py-3 text-xs">{children}</dl>
    </details>
  );
}

function DatoDetalle({ rotulo, valor, completo = false }: { rotulo: string; valor: string | null; completo?: boolean }) {
  if (!valor) return null;
  return (
    <div className={cn("min-w-0", completo && "col-span-2")}>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium break-words whitespace-pre-line">{valor}</dd>
    </div>
  );
}
