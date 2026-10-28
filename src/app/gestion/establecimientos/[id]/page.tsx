import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  BellRing,
  CalendarCheck,
  CalendarPlus,
  Droplets,
  FilePenLine,
  History,
  IdCard,
  MapPinned,
  Navigation,
  Pencil,
  ShieldCheck,
  SprayCan,
  Store,
  Users,
} from "lucide-react";
import { Mapa } from "@/components/mapa/mapa";
import { peorEstado } from "@/components/mapa/tipos";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requerirStaff } from "@/lib/auth";
import {
  getActuacionesAbiertas,
  getEstablecimiento,
  getEstablecimientoConEstado,
  getHistorialEstablecimiento,
  uuidValido,
} from "@/lib/data/fiscalizacion";
import {
  ESTADO_ACTA,
  ESTADO_CERTIFICADO,
  etiqueta,
  ESTADO_INSPECCION,
  ESTADO_NOTIFICACION,
  ESTADO_OBLIGACION,
  MOTIVO_ACTA,
  PERIODICIDAD,
  PLAZO_NOTIFICACION,
  RESULTADO_INSPECCION,
  TIPO_INSPECCION,
  TIPO_NOTIFICACION,
  TIPO_SERVICIO_CORTO,
  VIGENCIA,
} from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { textoVencimiento } from "../../hoja-de-ruta/_components/obligacion";
import { hrefComoLlegar } from "../../inspecciones/_components/contexto";
import { BotonEstadoActivo } from "../_components/estado-activo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const valido = uuidValido(id);
  const est = valido ? await getEstablecimiento(valido) : null;
  return { title: est?.nombre ?? "Establecimiento" };
}

export default async function EstablecimientoPage({ params }: Props) {
  await requerirStaff();
  const { id: idParam } = await params;
  const id = uuidValido(idParam);
  if (!id) notFound();
  const est = await getEstablecimiento(id);
  if (!est) notFound();

  const [estado, historial, abiertas] = await Promise.all([
    getEstablecimientoConEstado(id),
    getHistorialEstablecimiento(id),
    getActuacionesAbiertas([id]),
  ]);
  const programada = abiertas.programadas.get(id);
  const notificada = abiertas.notificadas.get(id);
  const llegar = hrefComoLlegar(est);
  const enFalta =
    ["vencido", "sin_certificado"].includes(estado?.estado_fumigacion ?? "") ||
    ["vencido", "sin_certificado"].includes(estado?.estado_tanque ?? "");

  const actividad: TimelineItem[] = [
    ...historial.certificados.flatMap((c): TimelineItem[] =>
      c.fecha_servicio
        ? [
            {
              id: `c-${c.id}`,
              date: c.fecha_servicio,
              title: `Servicio de ${c.tipo === "tanque" ? "limpieza de tanques" : "fumigación"} · N.º ${c.numero ?? ""}`,
              description: c.empresa_nombre,
              tone: c.tipo === "tanque" ? "celeste" : "azul",
              icon: c.tipo === "tanque" ? Droplets : SprayCan,
            },
          ]
        : [],
    ),
    ...historial.inspecciones.flatMap((i): TimelineItem[] => {
      const fecha = i.realizada_at ?? i.fecha_programada;
      if (!fecha) return [];
      return [
        {
          id: `i-${i.id}`,
          date: fecha,
          title: `${i.tipo ? TIPO_INSPECCION[i.tipo].label : "Inspección"}${i.resultado ? `: ${RESULTADO_INSPECCION[i.resultado].label.toLowerCase()}` : i.estado ? ` (${ESTADO_INSPECCION[i.estado].label.toLowerCase()})` : ""}`,
          description: i.inspector_nombre,
          tone:
            i.resultado === "no_conforme"
              ? "rojo"
              : i.resultado === "conforme"
                ? "verde"
                : "neutral",
          icon: ShieldCheck,
        },
      ];
    }),
    ...historial.notificaciones.flatMap((n): TimelineItem[] =>
      n.created_at
        ? [
            {
              id: `n-${n.id}`,
              date: n.notificada_at ?? n.created_at,
              title: `Notificación ${n.numero ?? ""}`,
              description: n.estado_efectivo
                ? etiqueta(ESTADO_NOTIFICACION, n.estado_efectivo).label
                : null,
              tone: "violeta",
              icon: BellRing,
            },
          ]
        : [],
    ),
    ...historial.actas.flatMap((a): TimelineItem[] =>
      a.fecha
        ? [
            {
              id: `a-${a.id}`,
              date: a.fecha,
              title: `Acta ${a.numero ?? ""}`,
              description: a.motivo ? MOTIVO_ACTA[a.motivo].label : null,
              tone: "rojo",
              icon: FilePenLine,
            },
          ]
        : [],
    ),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title={est.nombre}
        description={[est.nombre_fantasia, est.domicilio]
          .filter(Boolean)
          .join(" · ")}
        icon={Store}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Establecimientos", href: "/gestion/establecimientos" },
          { label: est.nombre },
        ]}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href={`/gestion/establecimientos/${est.id}/editar`}>
                <Pencil aria-hidden /> Editar
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={`/gestion/notificaciones/nueva?establecimiento=${est.id}`}
              >
                <BellRing aria-hidden /> Notificar
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/gestion/actas/nueva?establecimiento=${est.id}`}>
                <FilePenLine aria-hidden /> Labrar acta
              </Link>
            </Button>
            <Button asChild>
              <Link
                href={`/gestion/inspecciones/nueva?establecimiento=${est.id}&tipo=control_vencimiento`}
              >
                <CalendarPlus aria-hidden /> Programar inspección
              </Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {!est.activo ? (
            <Badge tone="neutral" variant="solid">
              Dado de baja
            </Badge>
          ) : null}
          {est.rubro ? (
            <Badge tone="azul">{est.rubro.grupo}</Badge>
          ) : (
            <Badge tone="ambar">Sin rubro</Badge>
          )}
          {est.rubro ? (
            <EstadoBadge mapa={PERIODICIDAD} valor={est.rubro.periodicidad} />
          ) : null}
          {est.tiene_tanque ? (
            <Badge tone="celeste">
              <Droplets aria-hidden /> Tanque de reserva
            </Badge>
          ) : null}
          {est.afluencia_publico ? (
            <Badge tone="neutral">
              <Users aria-hidden /> Afluencia de público
            </Badge>
          ) : null}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6">
        {!est.activo ? (
          <Alert
            tone="warning"
            title="Establecimiento dado de baja"
            action={
              <BotonEstadoActivo
                establecimientoId={est.id}
                activo={false}
                nombre={est.nombre}
              />
            }
          >
            No figura en la hoja de ruta ni en el padrón activo. Su historial se
            conserva.
          </Alert>
        ) : enFalta && !programada ? (
          <Alert
            tone="danger"
            title="Tiene obligaciones vencidas o sin presentar"
            action={
              <Button asChild size="sm" variant="sol">
                <Link
                  href={`/gestion/inspecciones/nueva?establecimiento=${est.id}&tipo=control_vencimiento`}
                >
                  <CalendarPlus aria-hidden /> Programar control
                </Link>
              </Button>
            }
          >
            Programá una inspección de control o notificá al responsable para
            que presente la documentación.
          </Alert>
        ) : null}

        {programada || notificada ? (
          <div className="flex flex-wrap gap-2">
            {programada ? (
              <Link href={`/gestion/inspecciones/${programada.id}`}>
                <Badge tone="azul" size="lg" className="hover:ring-azul-400">
                  <CalendarCheck aria-hidden /> Inspección programada para el{" "}
                  {formatFecha(programada.fecha)}
                </Badge>
              </Link>
            ) : null}
            {notificada ? (
              <Link href={`/gestion/notificaciones/${notificada.id}`}>
                <Badge
                  tone="violeta"
                  size="lg"
                  className="hover:ring-violet-400"
                >
                  <BellRing aria-hidden /> Notificación{" "}
                  {notificada.numero ?? ""} abierta
                  {notificada.vence
                    ? ` · vence ${formatFecha(notificada.vence)}`
                    : ""}
                </Badge>
              </Link>
            ) : null}
          </div>
        ) : null}

        {/* La vista de estado solo incluye establecimientos activos: dado de baja, no hay estado que mostrar. */}
        {estado ? (
          <div className="grid gap-4 md:grid-cols-2">
            <TarjetaObligacion
              tipo="fumigacion"
              estado={estado?.estado_fumigacion ?? null}
              certificadoId={estado?.fumigacion_certificado_id ?? null}
              numero={estado?.fumigacion_numero ?? null}
              fecha={estado?.fumigacion_fecha ?? null}
              vencimiento={estado?.fumigacion_vencimiento ?? null}
              empresa={estado?.fumigacion_empresa ?? null}
              periodicidad={
                est.rubro ? PERIODICIDAD[est.rubro.periodicidad].label : null
              }
            />
            <TarjetaObligacion
              tipo="tanque"
              estado={
                estado?.estado_tanque ?? (est.tiene_tanque ? null : "no_aplica")
              }
              certificadoId={estado?.tanque_certificado_id ?? null}
              numero={estado?.tanque_numero ?? null}
              fecha={estado?.tanque_fecha ?? null}
              vencimiento={estado?.tanque_vencimiento ?? null}
              empresa={estado?.tanque_empresa ?? null}
              periodicidad="Cada 180 días"
            />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <SectionCard
            title="Antecedentes"
            description="Certificados, inspecciones, notificaciones y actas"
            icon={History}
          >
            <Tabs defaultValue="certificados">
              <TabsList variant="line" className="w-full">
                <TabsTrigger value="certificados">
                  Certificados ({historial.certificados.length})
                </TabsTrigger>
                <TabsTrigger value="inspecciones">
                  Inspecciones ({historial.inspecciones.length})
                </TabsTrigger>
                <TabsTrigger value="notificaciones">
                  Notificaciones ({historial.notificaciones.length})
                </TabsTrigger>
                <TabsTrigger value="actas">
                  Actas ({historial.actas.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="certificados">
                {historial.certificados.length === 0 ? (
                  <EmptyState
                    compact
                    icon={BadgeCheck}
                    title="Sin certificados"
                    description="Ninguna empresa declaró servicios en este establecimiento."
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {historial.certificados.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/gestion/certificados/${c.id}`}
                            className="font-medium text-foreground hover:text-azul-700"
                          >
                            {c.tipo
                              ? TIPO_SERVICIO_CORTO[c.tipo]
                              : "Certificado"}{" "}
                            · N.º {c.numero}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {c.empresa_nombre} · Servicio{" "}
                            {formatFecha(c.fecha_servicio)}
                            {c.fecha_vencimiento
                              ? ` · Vence ${formatFecha(c.fecha_vencimiento)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          {c.estado === "timbrado" ? (
                            <EstadoBadge
                              mapa={VIGENCIA}
                              valor={c.vigencia}
                              size="sm"
                            />
                          ) : (
                            <EstadoBadge
                              mapa={ESTADO_CERTIFICADO}
                              valor={c.estado}
                              size="sm"
                            />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="inspecciones">
                {historial.inspecciones.length === 0 ? (
                  <EmptyState
                    compact
                    icon={ShieldCheck}
                    title="Sin inspecciones"
                    action={
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/gestion/inspecciones/nueva?establecimiento=${est.id}&tipo=control_vencimiento`}
                        >
                          Programar la primera
                        </Link>
                      </Button>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {historial.inspecciones.map((i) => (
                      <li
                        key={i.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/gestion/inspecciones/${i.id}`}
                            className="font-medium text-foreground hover:text-azul-700"
                          >
                            {i.codigo} ·{" "}
                            {i.tipo
                              ? TIPO_INSPECCION[i.tipo].label
                              : "Inspección"}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {i.realizada_at
                              ? `Realizada ${formatFechaHora(i.realizada_at)}`
                              : `Programada ${formatFecha(i.fecha_programada)}`}
                            {i.inspector_nombre
                              ? ` · ${i.inspector_nombre}`
                              : ""}
                          </p>
                        </div>
                        {i.resultado ? (
                          <EstadoBadge
                            mapa={RESULTADO_INSPECCION}
                            valor={i.resultado}
                            size="sm"
                          />
                        ) : (
                          <EstadoBadge
                            mapa={ESTADO_INSPECCION}
                            valor={i.estado}
                            size="sm"
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="notificaciones">
                {historial.notificaciones.length === 0 ? (
                  <EmptyState
                    compact
                    icon={BellRing}
                    title="Sin notificaciones"
                    action={
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/gestion/notificaciones/nueva?establecimiento=${est.id}`}
                        >
                          Notificar
                        </Link>
                      </Button>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {historial.notificaciones.map((n) => (
                      <li
                        key={n.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/gestion/notificaciones/${n.id}`}
                            className="font-medium text-foreground hover:text-azul-700"
                          >
                            N.º {n.numero} ·{" "}
                            {n.tipo
                              ? TIPO_NOTIFICACION[n.tipo].label
                              : "Notificación"}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {n.notificada_at
                              ? `Notificada ${formatFecha(n.notificada_at)}`
                              : `Emitida ${formatFecha(n.created_at)}`}
                            {n.plazo
                              ? ` · ${PLAZO_NOTIFICACION[n.plazo].label}`
                              : ""}
                            {n.vence_at
                              ? ` · Vence ${formatFecha(n.vence_at)}`
                              : ""}
                          </p>
                        </div>
                        <EstadoBadge
                          mapa={ESTADO_NOTIFICACION}
                          valor={n.estado_efectivo}
                          size="sm"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="actas">
                {historial.actas.length === 0 ? (
                  <EmptyState
                    compact
                    icon={FilePenLine}
                    title="Sin actas labradas"
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {historial.actas.map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/gestion/actas/${a.id}`}
                            className="font-medium text-foreground hover:text-azul-700"
                          >
                            Acta {a.numero}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {a.motivo ? MOTIVO_ACTA[a.motivo].label : "—"} ·{" "}
                            {formatFecha(a.fecha)}
                            {a.inspector_nombre
                              ? ` · ${a.inspector_nombre}`
                              : ""}
                          </p>
                        </div>
                        <EstadoBadge
                          mapa={ESTADO_ACTA}
                          valor={a.estado}
                          size="sm"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </SectionCard>

          <aside
            className="flex flex-col gap-6"
            aria-label="Datos del establecimiento"
          >
            <SectionCard title="Ubicación" icon={MapPinned}>
              <div className="flex flex-col gap-3">
                {typeof est.lat === "number" && typeof est.lng === "number" ? (
                  <Mapa
                    puntos={[
                      {
                        id: est.id,
                        lat: est.lat,
                        lng: est.lng,
                        titulo: est.nombre,
                        subtitulo: est.domicilio,
                        estado: estado
                          ? peorEstado(
                              estado.estado_fumigacion,
                              estado.estado_tanque,
                            )
                          : "info",
                      },
                    ]}
                    centro={[est.lat, est.lng]}
                    zoom={16}
                    leyenda={false}
                    altoClassName="h-56"
                    titulo={`Ubicación de ${est.nombre}`}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
                    Sin coordenadas cargadas.{" "}
                    <Link
                      href={`/gestion/establecimientos/${est.id}/editar`}
                      className="font-medium text-azul-700 hover:underline"
                    >
                      Marcalo en el mapa
                    </Link>{" "}
                    para verlo en la hoja de ruta.
                  </p>
                )}
                {llegar ? (
                  <Button asChild variant="outline" className="w-full">
                    <a href={llegar} target="_blank" rel="noreferrer">
                      <Navigation aria-hidden /> Cómo llegar
                    </a>
                  </Button>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Datos" icon={IdCard}>
              <KeyValue
                columns={1}
                items={[
                  { label: "CUIT", value: est.cuit },
                  { label: "Rubro", value: est.rubro?.nombre ?? null },
                  { label: "Domicilio", value: est.domicilio },
                  {
                    label: "Barrio · zona",
                    value: [est.barrio, est.zona ? `Zona ${est.zona}` : null]
                      .filter(Boolean)
                      .join(" · "),
                  },
                  {
                    label: "Teléfono",
                    value: est.telefono ? (
                      <a
                        href={`tel:${est.telefono.replace(/\s/g, "")}`}
                        className="text-azul-700 hover:underline"
                      >
                        {est.telefono}
                      </a>
                    ) : null,
                  },
                  {
                    label: "Correo",
                    value: est.email ? (
                      <a
                        href={`mailto:${est.email}`}
                        className="text-azul-700 hover:underline"
                      >
                        {est.email}
                      </a>
                    ) : null,
                  },
                  {
                    label: "Alta en el padrón",
                    value: formatFecha(est.created_at),
                  },
                ]}
              />
              {est.activo ? (
                <div className="mt-5 border-t border-border pt-4">
                  <BotonEstadoActivo
                    establecimientoId={est.id}
                    activo
                    nombre={est.nombre}
                  />
                </div>
              ) : null}
            </SectionCard>

            {actividad.length > 0 ? (
              <SectionCard title="Actividad reciente" icon={History}>
                <Timeline items={actividad} />
              </SectionCard>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  );
}

function TarjetaObligacion({
  tipo,
  estado,
  certificadoId,
  numero,
  fecha,
  vencimiento,
  empresa,
  periodicidad,
}: {
  tipo: "fumigacion" | "tanque";
  estado: string | null;
  certificadoId: string | null;
  numero: string | null;
  fecha: string | null;
  vencimiento: string | null;
  empresa: string | null;
  periodicidad: string | null;
}) {
  const Icono = tipo === "fumigacion" ? SprayCan : Droplets;
  const titulo =
    tipo === "fumigacion" ? "Fumigación y desinfección" : "Limpieza de tanques";
  const valor = estado ?? "sin_certificado";
  const acento: Record<string, string> = {
    vencido: "from-red-500/15",
    sin_certificado: "from-violet-500/15",
    por_vencer: "from-amber-400/20",
    vigente: "from-emerald-500/15",
    no_aplica: "from-noche-200/30",
  };
  const venc = textoVencimiento(vencimiento);

  return (
    <Card className="overflow-hidden">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-linear-to-br to-transparent",
          acento[valor] ?? acento.no_aplica,
        )}
      />
      <div className="relative flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "flex size-11 items-center justify-center rounded-xl ring-1",
                tipo === "fumigacion"
                  ? "bg-azul-50 text-azul-600 ring-azul-100"
                  : "bg-celeste-50 text-celeste-700 ring-celeste-200",
              )}
            >
              <Icono className="size-5" />
            </span>
            <div>
              <p className="font-display font-semibold text-foreground">
                {titulo}
              </p>
              {periodicidad ? (
                <p className="text-xs text-muted-foreground">{periodicidad}</p>
              ) : null}
            </div>
          </div>
          <EstadoBadge
            mapa={ESTADO_OBLIGACION}
            valor={valor}
            size="lg"
            pulse={valor === "vencido"}
          />
        </div>
        {valor === "no_aplica" ? (
          <p className="text-sm text-muted-foreground">
            No declara tanque de reserva ni cisterna.
          </p>
        ) : certificadoId ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">
                Último certificado
              </dt>
              <dd>
                <Link
                  href={`/gestion/certificados/${certificadoId}`}
                  className="font-semibold text-azul-700 hover:underline"
                >
                  N.º {numero}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Servicio</dt>
              <dd className="font-medium">{formatFecha(fecha)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Vencimiento</dt>
              <dd
                className={cn(
                  "font-medium",
                  valor === "vencido" && "text-danger",
                )}
              >
                {vencimiento ? formatFecha(vencimiento) : "Única vez"}
                {venc ? (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {venc}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Empresa</dt>
              <dd className="font-medium">{empresa ?? "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay certificados timbrados para este establecimiento. Puede
            notificarse para que presente la documentación.
          </p>
        )}
      </div>
    </Card>
  );
}
