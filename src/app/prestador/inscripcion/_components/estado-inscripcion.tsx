import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Circle,
  CircleCheck,
  ClipboardList,
  Clock,
  FileCheck2,
  FileText,
  FlaskConical,
  Hourglass,
  IdCard,
  MessageSquareWarning,
  PartyPopper,
  RefreshCw,
  ScrollText,
  Send,
  ShieldAlert,
  TriangleAlert,
  UserCheck,
  Warehouse,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { SectionCard } from "@/components/shared/section-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { APP } from "@/lib/config";
import { DOCUMENTOS_INSCRIPCION, type EstadoInscripcion } from "@/lib/data/cuenta";
import { ESTADO_EMPRESA, ESTADO_TRAMITE, TIPO_DOCUMENTO } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha, formatFechaLarga, hoyISO } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

type EstadoPaso = "hecho" | "revision" | "pendiente" | "problema";

type PasoChecklist = {
  id: string;
  titulo: string;
  descripcion: React.ReactNode;
  estado: EstadoPaso;
  icon: LucideIcon;
  /** Responsable del paso. */
  quien: "Tu empresa" | "La Dirección";
  accion?: { href: string; label: string };
  extra?: React.ReactNode;
};

const ESTILO_PASO: Record<EstadoPaso, { icono: LucideIcon; clase: string; badge: { label: string; tone: BadgeTone } }> = {
  hecho: { icono: CircleCheck, clase: "bg-emerald-500 text-white ring-emerald-100", badge: { label: "Listo", tone: "verde" } },
  revision: { icono: Clock, clase: "bg-sol-400 text-noche-950 ring-sol-100", badge: { label: "En revisión", tone: "ambar" } },
  pendiente: { icono: Circle, clase: "bg-card text-noche-400 ring-muted", badge: { label: "Pendiente", tone: "neutral" } },
  problema: { icono: TriangleAlert, clase: "bg-red-500 text-white ring-red-100", badge: { label: "A corregir", tone: "rojo" } },
};

const TONO_DOCUMENTO: Record<"aprobado" | "pendiente" | "rechazado" | "falta", BadgeTone> = {
  aprobado: "verde",
  pendiente: "ambar",
  rechazado: "rojo",
  falta: "neutral",
};

/**
 * La empresa ya figura en el padrón (tiene número de registro o el trámite de inscripción se aprobó),
 * aunque hoy esté vencida, observada o suspendida. Las empresas cargadas por la Dirección no tienen trámite.
 */
function estaInscripta({ empresa, tramite }: EstadoInscripcion): boolean {
  return empresa.numero_registro !== null || empresa.estado === "habilitada" || tramite?.estado === "aprobado";
}

/** Habilitación vencida: por estado o porque pasó la fecha y todavía no se actualizó el estado. */
function estaVencida({ empresa }: EstadoInscripcion): boolean {
  return (
    empresa.estado === "vencida" ||
    (empresa.estado === "habilitada" && empresa.vencimiento_habilitacion !== null && empresa.vencimiento_habilitacion < hoyISO())
  );
}

function pasoInspeccion(datos: EstadoInscripcion, inscripta: boolean): Pick<PasoChecklist, "estado" | "descripcion" | "extra"> {
  const { empresa, inspeccion } = datos;
  if (inspeccion?.realizada_at) {
    const fecha = formatFechaLarga(inspeccion.realizada_at);
    if (inspeccion.resultado === "no_conforme")
      return {
        estado: "problema",
        descripcion: `La inspección del ${fecha} resultó no conforme. Corregí lo observado: la Dirección va a volver a inspeccionar.`,
        extra: inspeccion.observaciones ? (
          <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line text-foreground/85">
            {inspeccion.observaciones}
          </p>
        ) : undefined,
      };
    if (inspeccion.resultado === "ausente")
      return {
        estado: "revision",
        descripcion: `El ${fecha} el inspector no encontró a nadie en el domicilio. La Dirección va a coordinar una nueva visita.`,
      };
    return { estado: "hecho", descripcion: `Realizada el ${fecha}: resultado conforme.` };
  }
  if (empresa.ultima_inspeccion_deposito)
    return { estado: "hecho", descripcion: `Última inspección conforme: ${formatFechaLarga(empresa.ultima_inspeccion_deposito)}.` };
  if (inscripta) return { estado: "hecho", descripcion: "Inspección de habilitación aprobada." };
  return {
    estado: "pendiente",
    descripcion: "Un inspector va a visitar la oficina y el depósito dentro de los 15 días de presentada la solicitud (Art. 4.º).",
  };
}

function armarPasos(datos: EstadoInscripcion): PasoChecklist[] {
  const { empresa, tramite, tecnicos, documentos, productos } = datos;
  const inscripta = estaInscripta(datos);

  const docs = DOCUMENTOS_INSCRIPCION.map((d) => ({ ...d, estado: documentos[d.tipo] ?? ("falta" as const) }));
  const docsCargados = docs.filter((d) => d.estado !== "falta").length;
  const docsAprobados = docs.filter((d) => d.estado === "aprobado").length;
  const docsRechazados = docs.filter((d) => d.estado === "rechazado").length;

  const estadoTramite: EstadoPaso = !tramite
    ? inscripta
      ? "hecho"
      : "pendiente"
    : tramite.estado === "aprobado"
      ? "hecho"
      : tramite.estado === "observado" || tramite.estado === "rechazado"
        ? "problema"
        : tramite.estado === "borrador"
          ? "pendiente"
          : "hecho";

  return [
    {
      id: "solicitud",
      titulo: "Solicitud de inscripción",
      icon: Send,
      quien: "Tu empresa",
      estado: estadoTramite,
      descripcion: !tramite
        ? inscripta
          ? `Tu empresa figura en el padrón${empresa.numero_registro ? ` con el Registro N.º ${empresa.numero_registro}` : ""}.`
          : "No encontramos el trámite de inscripción. Comunicate con la Dirección."
        : tramite.estado === "observado"
          ? "La Dirección hizo observaciones. Revisalas y respondé desde Trámites."
          : tramite.estado === "rechazado"
            ? "La solicitud fue rechazada. Revisá el motivo y comunicate con la Dirección."
            : tramite.estado === "borrador"
              ? "La solicitud quedó en borrador: terminá de completarla y presentala desde Trámites."
              : `Presentada el ${formatFechaLarga(tramite.presentado_at ?? tramite.created_at)}.`,
      accion:
        tramite && (tramite.estado === "observado" || tramite.estado === "borrador")
          ? { href: "/prestador/tramites", label: "Ir a trámites" }
          : undefined,
    },
    {
      id: "tecnico",
      titulo: "Representante técnico",
      icon: UserCheck,
      quien: "Tu empresa",
      estado:
        tecnicos.aprobados > 0 ? "hecho" : tecnicos.pendientes > 0 ? "revision" : tecnicos.rechazados > 0 ? "problema" : "pendiente",
      descripcion:
        tecnicos.aprobados > 0
          ? `${tecnicos.representante ?? "Asesor técnico"} está aprobado en el padrón.`
          : tecnicos.pendientes > 0
            ? `Cargaste a ${tecnicos.representante ?? "tu asesor técnico"}: la Dirección está verificando su título.`
            : tecnicos.rechazados > 0
              ? "El asesor técnico cargado fue rechazado. Cargá otro o corregí sus datos."
              : "Cargá los datos y el título terciario o universitario autenticado de tu asesor técnico (Art. 5.º).",
      accion: tecnicos.aprobados > 0 ? undefined : { href: "/prestador/legajo", label: "Cargar asesor técnico" },
    },
    {
      id: "documentos",
      titulo: "Documentación obligatoria",
      icon: FileText,
      quien: "Tu empresa",
      estado:
        docsAprobados === docs.length
          ? "hecho"
          : docsRechazados > 0
            ? "problema"
            : docsCargados === docs.length
              ? "revision"
              : "pendiente",
      descripcion: `${docsCargados} de ${docs.length} documentos cargados · ${docsAprobados} aprobados.`,
      accion: docsAprobados === docs.length ? undefined : { href: "/prestador/legajo", label: "Subir documentación" },
      extra: (
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Estado de cada documento">
          {docs.map((d) => (
            <li key={d.tipo}>
              <Badge tone={TONO_DOCUMENTO[d.estado]} size="sm" dot title={d.base}>
                {TIPO_DOCUMENTO[d.tipo].label}
                <span className="sr-only">
                  :{" "}
                  {d.estado === "falta"
                    ? "sin cargar"
                    : d.estado === "aprobado"
                      ? "aprobado"
                      : d.estado === "pendiente"
                        ? "en revisión"
                        : "rechazado"}
                </span>
              </Badge>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "memoria",
      titulo: "Memoria técnica de productos",
      icon: FlaskConical,
      quien: "Tu empresa",
      estado:
        productos.aprobados > 0
          ? "hecho"
          : productos.propuestos > 0
            ? "revision"
            : productos.rechazados > 0
              ? "problema"
              : "pendiente",
      descripcion:
        productos.total === 0
          ? "Indicá los productos que vas a usar, con dosis, concentración y precauciones (Art. 5.º)."
          : `${productos.total} producto${productos.total === 1 ? "" : "s"} declarado${productos.total === 1 ? "" : "s"} · ${productos.aprobados} aprobado${productos.aprobados === 1 ? "" : "s"}.`,
      accion: { href: "/prestador/productos", label: productos.total === 0 ? "Cargar productos" : "Ver productos" },
    },
    {
      id: "inspeccion",
      titulo: "Inspección de oficina y depósito",
      icon: Warehouse,
      quien: "La Dirección",
      ...pasoInspeccion(datos, inscripta),
    },
    {
      id: "resolucion",
      titulo: "Resolución y Certificado de Inscripción",
      icon: BadgeCheck,
      quien: "La Dirección",
      estado: inscripta ? "hecho" : tramite?.estado === "rechazado" ? "problema" : "pendiente",
      descripcion: inscripta
        ? [
            empresa.resolucion_dsa ? `Res. N.º ${empresa.resolucion_dsa}` : null,
            empresa.numero_registro ? `Registro N.º ${empresa.numero_registro}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Inscripción aprobada por la Dirección."
        : "Con todo aprobado, la Dirección dicta la resolución de autorización y te asigna el número de registro.",
    },
  ];
}

function encabezado(datos: EstadoInscripcion) {
  const { empresa, tramite } = datos;

  if (estaVencida(datos))
    return {
      tono: "rojo" as const,
      icon: ShieldAlert,
      titulo: "Tu habilitación está vencida",
      texto: empresa.vencimiento_habilitacion
        ? `Venció el ${formatFechaLarga(empresa.vencimiento_habilitacion)}. Presentá la Declaración Jurada Anual de Categorización y el libre deuda para renovarla (Art. 8.º).`
        : "Presentá la Declaración Jurada Anual de Categorización y el libre deuda para renovarla (Art. 8.º).",
    };
  if (empresa.estado === "habilitada")
    return {
      tono: "verde" as const,
      icon: PartyPopper,
      titulo: "¡Tu empresa está habilitada!",
      texto: empresa.vencimiento_habilitacion
        ? `Ya podés declarar servicios y emitir certificados. La habilitación vence el ${formatFechaLarga(empresa.vencimiento_habilitacion)} y se renueva cada año (Art. 8.º).`
        : "Ya podés declarar servicios y emitir certificados. La habilitación se renueva cada año (Art. 8.º).",
    };
  if (empresa.estado === "suspendida")
    return {
      tono: "rojo" as const,
      icon: ShieldAlert,
      titulo: "Tu empresa está suspendida",
      texto: "No podés declarar servicios mientras dure la suspensión. Comunicate con la Dirección de Salud Ambiental.",
    };
  if (empresa.estado === "baja")
    return {
      tono: "neutral" as const,
      icon: XCircle,
      titulo: "Tu empresa está dada de baja",
      texto: "La empresa ya no figura en el registro. Si querés volver a operar, comunicate con la Dirección.",
    };
  if (tramite?.estado === "rechazado")
    return {
      tono: "rojo" as const,
      icon: XCircle,
      titulo: "La solicitud de inscripción fue rechazada",
      texto: "Revisá el motivo más abajo. Para volver a presentarla, comunicate con la Dirección.",
    };
  if (tramite?.estado === "observado")
    return {
      tono: "ambar" as const,
      icon: MessageSquareWarning,
      titulo: "Tu solicitud tiene observaciones",
      texto: "Corregí lo que te pide la Dirección para seguir con el trámite.",
    };
  if (empresa.estado === "observada")
    return {
      tono: "ambar" as const,
      icon: MessageSquareWarning,
      titulo: "Tu empresa tiene observaciones de la Dirección",
      texto: "Revisá los avisos y los trámites pendientes y corregí lo observado para seguir operando con normalidad.",
    };
  return {
    tono: "azul" as const,
    icon: Hourglass,
    titulo: "Tu solicitud está en revisión",
    texto: "Mientras la Dirección la revisa, completá el legajo: asesor técnico, documentación y memoria técnica de productos.",
  };
}

const FONDOS_HERO = {
  azul: "bg-noche text-white",
  verde: "bg-linear-to-br from-emerald-700 via-emerald-600 to-celeste-600 text-white",
  ambar: "bg-linear-to-br from-sol-300 via-sol-200 to-white text-noche-950",
  rojo: "bg-linear-to-br from-red-700 via-red-600 to-noche-800 text-white",
  neutral: "bg-linear-to-br from-noche-700 to-noche-900 text-white",
} as const;

export function EstadoInscripcionVista({
  datos,
  creadaCuenta,
}: {
  datos: EstadoInscripcion;
  /** Fecha de alta de la cuenta (para el seguimiento). */
  creadaCuenta: string;
}) {
  const { empresa, tramite, inspeccion } = datos;
  const pasos = armarPasos(datos);
  const hechos = pasos.filter((p) => p.estado === "hecho").length;
  const hero = encabezado(datos);
  const HeroIcon = hero.icon;
  const vencida = estaVencida(datos);
  const inscripta = estaInscripta(datos);
  // Habilitada y vigente: puede declarar servicios.
  const habilitada = empresa.estado === "habilitada" && !vencida;
  const claro = hero.tono === "ambar";
  const diasVence = diasHasta(empresa.vencimiento_habilitacion);

  const seguimiento: TimelineItem[] = [{ id: "cuenta", date: creadaCuenta, title: "Cuenta creada", tone: "neutral", icon: IdCard }];
  if (tramite) {
    seguimiento.push({
      id: "presentada",
      date: tramite.presentado_at ?? tramite.created_at,
      title: "Solicitud presentada",
      description: tramite.codigo ? `Trámite ${tramite.codigo}` : undefined,
      tone: "azul",
      icon: Send,
    });
    if (tramite.estado === "observado") {
      seguimiento.push({
        id: "observada",
        date: tramite.updated_at,
        title: "Observada por la Dirección",
        description: tramite.observaciones ?? undefined,
        tone: "ambar",
        icon: MessageSquareWarning,
      });
    }
    if (tramite.estado === "rechazado") {
      seguimiento.push({
        id: "rechazada",
        date: tramite.resuelto_at ?? tramite.updated_at,
        title: "Solicitud rechazada",
        description: tramite.observaciones ?? undefined,
        tone: "rojo",
        icon: XCircle,
      });
    }
    if (tramite.estado === "aprobado") {
      seguimiento.push({
        id: "aprobada",
        date: tramite.resuelto_at ?? tramite.updated_at,
        title: "Inscripción aprobada",
        description: tramite.resolucion ? `Res. N.º ${tramite.resolucion}` : undefined,
        tone: "verde",
        icon: FileCheck2,
      });
    }
  }
  if (inspeccion?.realizada_at) {
    seguimiento.push({
      id: "inspeccion",
      date: inspeccion.realizada_at,
      title: "Inspección de oficina y depósito",
      description:
        inspeccion.resultado === "no_conforme"
          ? "Resultado: no conforme."
          : inspeccion.resultado === "ausente"
            ? "No se encontró a nadie en el domicilio."
            : "Resultado: conforme.",
      tone: inspeccion.resultado === "no_conforme" ? "rojo" : inspeccion.resultado === "ausente" ? "ambar" : "violeta",
      icon: Warehouse,
    });
  } else if (empresa.ultima_inspeccion_deposito) {
    seguimiento.push({
      id: "inspeccion",
      date: empresa.ultima_inspeccion_deposito,
      title: "Inspección de oficina y depósito",
      description: "Resultado: conforme.",
      tone: "violeta",
      icon: Warehouse,
    });
  }
  // Mezcla fechas (AAAA-MM-DD) y timestamps: ordenar por instante, no por texto.
  const instante = (fecha: TimelineItem["date"]) =>
    fecha instanceof Date ? fecha.getTime() : new Date(/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T12:00:00-03:00` : fecha).getTime();
  seguimiento.sort((a, b) => instante(a.date) - instante(b.date));

  return (
    <div className="flex flex-col gap-6">
      {/* Estado general */}
      <section
        aria-labelledby="estado-inscripcion-titulo"
        className={cn("relative overflow-hidden rounded-panel p-5 shadow-elevated sm:p-7 animate-fade-up", FONDOS_HERO[hero.tono])}
      >
        {hero.tono === "azul" ? (
          <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-30" />
        ) : null}
        <PetalDecor variant="corner" tone={claro ? "light" : "dark"} className="h-52 opacity-90" animated={habilitada} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-2xl ring-1",
                claro ? "bg-white text-sol-800 ring-sol-300" : "bg-white/10 text-white ring-white/20",
              )}
            >
              <HeroIcon className="size-7" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Si la habilitación venció por fecha pero el estado todavía no se actualizó, mostrar "Vencida". */}
                <EstadoBadge
                  mapa={ESTADO_EMPRESA}
                  valor={vencida ? "vencida" : empresa.estado}
                  pulse={empresa.estado === "en_tramite"}
                />
                {tramite?.codigo ? (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 font-mono text-xs font-medium",
                      claro ? "bg-white/80 text-noche-700" : "bg-white/10 text-white/90",
                    )}
                  >
                    {tramite.codigo}
                  </span>
                ) : null}
              </div>
              <h2 id="estado-inscripcion-titulo" className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {hero.titulo}
              </h2>
              <p className={cn("mt-1 max-w-2xl text-sm leading-relaxed sm:text-[15px]", claro ? "text-noche-700" : "text-white/85")}>
                {hero.texto}
              </p>
            </div>
          </div>
          {habilitada ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="sol">
                <Link href="/prestador/declaraciones/nueva">
                  <ClipboardList aria-hidden />
                  Nueva declaración
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:border-white/50 hover:bg-white/20 hover:text-white">
                <Link href="/prestador">
                  Ir al inicio
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          ) : vencida ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="sol">
                <Link href="/prestador/tramites">
                  <RefreshCw aria-hidden />
                  Renovar la habilitación
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:border-white/50 hover:bg-white/20 hover:text-white">
                <Link href="/prestador/legajo">
                  Ver legajo
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "flex shrink-0 flex-col gap-2 rounded-2xl p-4 lg:w-64",
                claro ? "bg-white/70 ring-1 ring-sol-300" : "bg-white/[0.07] ring-1 ring-white/15",
              )}
            >
              <p className={cn("text-xs font-semibold tracking-wide uppercase", claro ? "text-noche-600" : "text-white/70")}>
                Avance del legajo
              </p>
              <p className="font-display text-3xl leading-none font-semibold">
                {hechos}
                <span className={cn("text-base font-medium", claro ? "text-noche-500" : "text-white/60")}> / {pasos.length}</span>
              </p>
              <Progress value={hechos} max={pasos.length} tone="sol" size="sm" />
            </div>
          )}
        </div>
      </section>

      {tramite?.estado === "observado" && tramite.observaciones ? (
        <div className="rounded-card border border-amber-200 bg-warning-soft p-4 sm:p-5">
          <p className="flex items-center gap-2 font-display text-sm font-semibold text-amber-900">
            <MessageSquareWarning className="size-4" aria-hidden />
            Observaciones de la Dirección
          </p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-foreground/85">{tramite.observaciones}</p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href="/prestador/tramites">
              Responder desde Trámites
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      ) : tramite?.estado === "rechazado" && tramite.observaciones ? (
        <div className="rounded-card border border-red-200 bg-danger-soft p-4 sm:p-5">
          <p className="flex items-center gap-2 font-display text-sm font-semibold text-red-900">
            <XCircle className="size-4" aria-hidden />
            Motivo del rechazo
          </p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-foreground/85">{tramite.observaciones}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Próximos pasos */}
        <SectionCard
          title={inscripta ? "Requisitos del registro" : "Próximos pasos"}
          description={
            inscripta
              ? "Mantené el legajo al día para renovar la habilitación sin demoras."
              : "Completá lo que depende de tu empresa para que la Dirección pueda resolver la inscripción."
          }
          icon={ClipboardList}
          actions={
            <Badge tone={hechos === pasos.length ? "verde" : "azul"} size="lg">
              {hechos} de {pasos.length} listos
            </Badge>
          }
          flush
        >
          <ol className="divide-y divide-border">
            {pasos.map((p, i) => {
              const e = ESTILO_PASO[p.estado];
              const IconoEstado = e.icono;
              const Icono = p.icon;
              return (
                <li key={p.id} className="flex gap-4 px-5 py-4 transition-colors hover:bg-subtle/60 sm:px-6">
                  <span
                    className={cn("relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ring-4", e.clase)}
                    aria-hidden
                  >
                    <IconoEstado className="size-[18px]" strokeWidth={2.2} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-foreground">
                        <span className="sr-only">Paso {i + 1}: </span>
                        <Icono className="size-4 text-azul-600" aria-hidden />
                        {p.titulo}
                      </h3>
                      <Badge tone={e.badge.tone} size="sm" dot>
                        {e.badge.label}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{p.descripcion}</p>
                    {p.extra}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="text-xs text-noche-400">Responsable: {p.quien}</span>
                      {p.accion ? (
                        <Button asChild size="sm" variant={p.estado === "problema" ? "primary" : "secondary"}>
                          <Link href={p.accion.href}>
                            {p.accion.label}
                            <ArrowRight aria-hidden />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </SectionCard>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Seguimiento" description="Historial de tu inscripción." icon={CalendarClock}>
            <Timeline items={seguimiento} />
          </SectionCard>

          <SectionCard
            title="Datos declarados"
            icon={Building2}
            description={tramite ? <EstadoBadge mapa={ESTADO_TRAMITE} valor={tramite.estado} size="sm" /> : undefined}
          >
            <KeyValue
              columns={1}
              items={[
                { label: "Nombre comercial", value: empresa.nombre_comercial },
                {
                  label: empresa.tipo_persona === "juridica" ? "Razón social" : "Titular",
                  value: empresa.titular,
                },
                { label: "CUIT", value: <span className="nums-tabular">{empresa.cuit}</span> },
                { label: "Oficina", value: empresa.domicilio_oficina },
                { label: "Depósito de químicos", value: empresa.domicilio_deposito },
                {
                  label: "Habilitación comercial",
                  value: empresa.habilitacion_comercial ? <span className="font-mono">{empresa.habilitacion_comercial}</span> : null,
                },
                {
                  label: "Servicios",
                  value: (
                    <span className="flex flex-wrap gap-1.5">
                      {empresa.habilita_fumigacion ? (
                        <Badge tone="azul" size="sm">
                          Fumigación
                        </Badge>
                      ) : null}
                      {empresa.habilita_tanques ? (
                        <Badge tone="celeste" size="sm">
                          Limpieza de tanques
                        </Badge>
                      ) : null}
                    </span>
                  ),
                },
                ...(empresa.numero_registro
                  ? [{ label: "N.º de registro", value: <span className="nums-tabular">{empresa.numero_registro}</span> }]
                  : []),
                ...(inscripta && empresa.vencimiento_habilitacion
                  ? [
                      {
                        label: vencida ? "Habilitación vencida el" : "Habilitación vigente hasta",
                        value: (
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            {formatFecha(empresa.vencimiento_habilitacion)}
                            {vencida ? (
                              <Badge tone="rojo" size="sm">
                                Vencida
                              </Badge>
                            ) : diasVence !== null && diasVence >= 0 && diasVence <= 30 ? (
                              <Badge tone="ambar" size="sm">
                                Vence en {diasVence} {diasVence === 1 ? "día" : "días"}
                              </Badge>
                            ) : null}
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
            <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
              <ScrollText className="mt-0.5 size-3.5 shrink-0 text-azul-600" aria-hidden />
              Para cambiar el domicilio o el asesor técnico, iniciá el trámite que corresponda desde{" "}
              <Link href="/prestador/tramites" className="font-medium text-azul-700 underline-offset-2 hover:underline">
                Trámites
              </Link>
              .
            </p>
          </SectionCard>

          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            ¿Dudas sobre tu inscripción? Escribí a{" "}
            <a href={`mailto:${APP.contacto.email}`} className="font-medium text-azul-700 underline-offset-2 hover:underline">
              {APP.contacto.email}
            </a>{" "}
            o acercate a {APP.contacto.domicilio} ({APP.contacto.horario}).
          </p>
        </div>
      </div>
    </div>
  );
}
