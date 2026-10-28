import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CalendarX2, CheckCircle2, Clock, MapPin, Printer, ShieldCheck, UserRound } from "lucide-react";
import { Mapa } from "@/components/mapa/mapa";
import { type PuntoMapa, tieneCoordenadas } from "@/components/mapa/tipos";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requerirStaff } from "@/lib/auth";
import {
  type FilaAgenda,
  getAgendaServicios,
  getInspeccionesPorCertificado,
  getTerritorio,
  type InspeccionDeServicio,
  opcionesBarrio,
  param,
  sumarDiasISO,
} from "@/lib/data/fiscalizacion";
import { ESTADO_CERTIFICADO, RESULTADO_INSPECCION, TIPO_SERVICIO } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaLarga, formatHora, formatSuperficie, hoyISO } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { VistaListaMapa } from "../_components/vista-lista-mapa";

export const metadata: Metadata = { title: "Agenda para muestreo" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Fecha local (Tucumán) de un timestamptz. */
const diaLocal = (iso: string) => hoyISO(new Date(iso));

export default async function AgendaMuestreoPage({ searchParams }: Props) {
  await requerirStaff();
  const sp = await searchParams;
  const zona = param(sp.zona);
  const barrio = param(sp.barrio);
  const [servicios, territorio] = await Promise.all([getAgendaServicios({ zona, barrio }), getTerritorio()]);
  const inspecciones = await getInspeccionesPorCertificado(servicios.flatMap((s) => (s.id ? [s.id] : [])));
  /** Inspección activa (programada o realizada) del servicio; las canceladas permiten volver a programar. */
  const activa = (s: FilaAgenda) => {
    const i = s.id ? inspecciones.get(s.id) : undefined;
    return i && i.estado !== "cancelada" ? i : undefined;
  };

  const hoy = hoyISO();
  const maniana = sumarDiasISO(hoy, 1);
  const grupos = [
    { fecha: hoy, titulo: "Hoy", items: servicios.filter((s) => s.fecha_servicio && diaLocal(s.fecha_servicio) === hoy) },
    {
      fecha: maniana,
      titulo: "Mañana",
      items: servicios.filter((s) => s.fecha_servicio && diaLocal(s.fecha_servicio) === maniana),
    },
  ];

  const puntos: PuntoMapa[] = servicios.filter(tieneCoordenadas).flatMap((s) => {
    if (!s.id) return [];
    const insp = activa(s);
    const hora = s.fecha_servicio ? `${diaLocal(s.fecha_servicio) === hoy ? "Hoy" : "Mañana"} ${formatHora(s.fecha_servicio)} h` : "";
    return [
      {
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        titulo: s.cliente ?? "Servicio declarado",
        subtitulo: s.domicilio,
        estado: insp?.estado === "realizada" ? ("vigente" as const) : ("info" as const),
        estadoTexto: insp
          ? insp.estado === "realizada"
            ? "Ya inspeccionado"
            : `Inspección programada · servicio ${hora}`
          : `Servicio ${hora}`,
        detalle: s.empresa_nombre,
        href: insp ? `/gestion/inspecciones/${insp.id}` : `/gestion/inspecciones/nueva?certificado=${s.id}&tipo=muestreo_servicio`,
        hrefTexto: insp ? "Ver inspección" : "Inspeccionar",
      },
    ];
  });
  const barrios = opcionesBarrio(territorio.barrios, zona, barrio);
  const qs = new URLSearchParams({ vista: "agenda", ...(zona ? { zona } : {}), ...(barrio ? { barrio } : {}) });
  const pendientes = servicios.filter((s) => !activa(s)).length;

  const lista = (
    <div className="flex flex-col gap-6">
      {grupos.map((g) => (
        <SectionCard
          key={g.fecha}
          title={`${g.titulo} · ${formatFechaLarga(g.fecha)}`}
          description={
            g.items.length === 0
              ? "Sin servicios declarados"
              : `${g.items.length} ${g.items.length === 1 ? "servicio declarado" : "servicios declarados"}`
          }
          icon={CalendarClock}
          flush
        >
          {g.items.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={CalendarX2}
                title={`No hay servicios declarados para ${g.titulo.toLowerCase()}`}
                description="Las empresas declaran sus servicios entre 24 y 48 horas antes (Art. 9.º a)."
              />
            </div>
          ) : (
            <ul role="list" className="divide-y divide-border">
              {g.items.map((s, i) => (
                <FilaServicio key={s.id ?? i} servicio={s} inspeccion={activa(s)} />
              ))}
            </ul>
          )}
        </SectionCard>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <FiltrosUrl
            campos={[
              {
                tipo: "select",
                nombre: "zona",
                etiqueta: "Zona",
                opciones: territorio.zonas.map((z) => ({ valor: z, label: z })),
                className: "sm:w-40",
              },
              {
                tipo: "select",
                nombre: "barrio",
                etiqueta: "Barrio",
                opciones: barrios,
                className: "sm:w-48",
              },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{pendientes}</span> sin inspeccionar de {servicios.length}
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href={`/imprimir/hoja-de-ruta?${qs}`}>
            <Printer aria-hidden />
            Imprimir agenda
          </Link>
        </Button>
      </Card>

      <VistaListaMapa
        cantidadMapa={puntos.length}
        lista={lista}
        mapa={
          <Mapa
            puntos={puntos}
            ajustar={puntos.length > 0}
            titulo="Mapa de servicios declarados"
            altoClassName="h-[62vh] min-h-80 xl:h-[calc(100dvh-12rem)]"
            vacio="No hay servicios con ubicación para estos días"
            sinUbicacion={servicios.length - puntos.length}
          />
        }
      />
    </div>
  );
}

function FilaServicio({ servicio: s, inspeccion }: { servicio: FilaAgenda; inspeccion?: InspeccionDeServicio }) {
  if (!s.id) return null;
  const realizada = inspeccion?.estado === "realizada";
  return (
    <li className={cn("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6", realizada && "bg-emerald-50/40")}>
      <div className="flex shrink-0 items-center gap-3 sm:w-20 sm:flex-col sm:items-start sm:gap-1">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-azul-50 px-2 py-1 font-display text-base font-semibold text-azul-700 ring-1 ring-azul-100 nums-tabular">
          <Clock className="size-4" aria-hidden />
          {s.fecha_servicio ? formatHora(s.fecha_servicio) : "—"}
        </span>
        {s.tipo ? (
          <Badge tone={TIPO_SERVICIO[s.tipo].tono} size="sm">
            {s.tipo === "tanque" ? "Tanques" : "Fumigación"}
          </Badge>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-display text-[15px] leading-snug font-semibold text-foreground">
          {s.cliente}
          <span className="ml-2 text-xs font-normal text-muted-foreground">Cert. N.º {s.numero}</span>
        </p>
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {s.domicilio}
            {s.barrio ? ` · ${s.barrio}` : ""}
            {s.zona ? ` · Zona ${s.zona}` : ""}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{s.empresa_nombre}</span>
          {s.rubro_nombre ? ` · ${s.rubro_nombre}` : ""}
          {s.superficie_m2 ? ` · ${formatSuperficie(s.superficie_m2)}` : ""}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserRound className="size-3.5" aria-hidden /> {s.tecnico_nombre ?? "Técnico sin informar"}
          <span aria-hidden>·</span>
          <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={s.estado} size="sm" />
        </p>
      </div>
      <div className="shrink-0">
        {inspeccion ? (
          <Link
            href={`/gestion/inspecciones/${inspeccion.id}`}
            className="flex flex-col items-start gap-1 rounded-lg sm:items-end"
            aria-label={realizada ? "Ver la inspección realizada" : "Ver la inspección programada"}
          >
            {realizada ? (
              <Badge tone="verde" size="lg">
                <CheckCircle2 aria-hidden /> Inspeccionado
              </Badge>
            ) : (
              <Badge tone="azul" size="lg">
                <CalendarClock aria-hidden /> Programada {formatFecha(inspeccion.fecha)}
              </Badge>
            )}
            {realizada && inspeccion.resultado ? (
              <EstadoBadge mapa={RESULTADO_INSPECCION} valor={inspeccion.resultado} size="sm" />
            ) : (
              <span className="text-xs font-medium text-azul-700 underline-offset-2 hover:underline">Ver inspección</span>
            )}
          </Link>
        ) : (
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href={`/gestion/inspecciones/nueva?certificado=${s.id}&tipo=muestreo_servicio`}>
              <ShieldCheck aria-hidden />
              Inspeccionar
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}
