import Link from "next/link";
import { BellRing, CalendarCheck, Droplets, MapPinned, PartyPopper, Printer, Route } from "lucide-react";
import { Mapa } from "@/components/mapa/mapa";
import { peorEstado, type PuntoMapa, tieneCoordenadas } from "@/components/mapa/tipos";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requerirStaff } from "@/lib/auth";
import {
  type FilaHojaRuta,
  getActuacionesAbiertas,
  getHojaRuta,
  getPuntosHojaRuta,
  getTerritorio,
  LIMITE_MAPA,
  leerFiltrosHojaRuta,
  opcionesBarrio,
  querystringHojaRuta,
} from "@/lib/data/fiscalizacion";
import { ESTADO_OBLIGACION, PERIODICIDAD } from "@/lib/domain/etiquetas";
import { formatFecha } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { AccionesEstablecimiento } from "./_components/acciones-establecimiento";
import { colorPrioridad, ETIQUETA_PRIORIDAD, Obligacion, textoVencimiento } from "./_components/obligacion";
import { VistaListaMapa } from "./_components/vista-lista-mapa";

const TAMANIO = 25;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HojaDeRutaPage({ searchParams }: Props) {
  await requerirStaff();
  const sp = await searchParams;
  const filtros = leerFiltrosHojaRuta(sp);
  const { pagina, desde, hasta } = rangoPagina(sp.pagina, TAMANIO);

  const [{ filas, total }, puntosRaw, territorio] = await Promise.all([
    getHojaRuta(filtros, { desde, hasta }),
    getPuntosHojaRuta(filtros),
    getTerritorio(),
  ]);
  const ids = filas.flatMap((f) => (f.id ? [f.id] : []));
  const { programadas, notificadas } = await getActuacionesAbiertas(ids);

  const puntos: PuntoMapa[] = puntosRaw.filter(tieneCoordenadas).flatMap((p) => {
    if (!p.id) return [];
    const estado = peorEstado(p.estado_fumigacion, p.estado_tanque);
    const venc = textoVencimiento(p.proximo_vencimiento);
    return [
      {
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        titulo: p.nombre ?? "Establecimiento",
        subtitulo: [p.domicilio, p.barrio].filter(Boolean).join(" · "),
        estado,
        detalle: venc ? `Próximo vencimiento: ${venc}` : null,
        href: `/gestion/establecimientos/${p.id}`,
      },
    ];
  });
  const sinUbicacion = puntosRaw.length - puntos.length;

  const barrios = opcionesBarrio(territorio.barrios, filtros.zona, filtros.barrio);
  const hayFiltros = Object.values(filtros).some(Boolean);
  const qs = querystringHojaRuta(filtros);

  const lista = (
    <SectionCard
      title="Establecimientos a controlar"
      description={
        total === 0
          ? "Sin resultados"
          : `${total.toLocaleString("es-AR")} ${total === 1 ? "establecimiento" : "establecimientos"} · por prioridad y próximo vencimiento`
      }
      icon={Route}
      flush
      footer={total > TAMANIO ? <Paginacion pagina={pagina} total={total} tamanio={TAMANIO} params={sp} ruta="/gestion/hoja-de-ruta" className="w-full" /> : undefined}
    >
      {filas.length === 0 ? (
        <div className="p-5 sm:p-6">
          {hayFiltros ? (
            <EmptyState
              compact
              icon={MapPinned}
              title="No hay establecimientos con esos filtros"
              description="Probá con otra zona, barrio o estado."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/gestion/hoja-de-ruta">Ver toda la hoja de ruta</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              compact
              icon={PartyPopper}
              title="¡Todo al día!"
              description="No hay establecimientos con certificados vencidos, por vencer ni sin presentar."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/gestion/hoja-de-ruta/agenda">Ver agenda para muestreo</Link>
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <ul role="list" className="divide-y divide-border">
          {filas.map((f, i) => (
            <FilaControl
              key={f.id ?? i}
              fila={f}
              programada={f.id ? programadas.get(f.id) : undefined}
              notificada={f.id ? notificadas.get(f.id) : undefined}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <FiltrosUrl
          campos={[
            { tipo: "busqueda", nombre: "q", placeholder: "Buscá por nombre o domicilio…", className: "sm:w-64" },
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
            {
              tipo: "select",
              nombre: "estado",
              etiqueta: "Estado",
              opciones: [
                { valor: "vencido", label: ESTADO_OBLIGACION.vencido.label },
                { valor: "sin_certificado", label: ESTADO_OBLIGACION.sin_certificado.label },
                { valor: "por_vencer", label: ESTADO_OBLIGACION.por_vencer.label },
              ],
              className: "sm:w-44",
            },
            {
              tipo: "select",
              nombre: "obligacion",
              etiqueta: "Obligación",
              opciones: [
                { valor: "fumigacion", label: "Fumigación" },
                { valor: "tanque", label: "Limpieza de tanques" },
              ],
              className: "sm:w-48",
            },
          ]}
        />
        <Button asChild variant="outline" className="shrink-0">
          <Link href={`/imprimir/hoja-de-ruta${qs}`}>
            <Printer aria-hidden />
            Imprimir hoja de ruta
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
            titulo="Mapa de la hoja de ruta"
            altoClassName="h-[62vh] min-h-80 xl:h-[calc(100dvh-12rem)]"
            vacio="No hay establecimientos con ubicación para estos filtros"
            sinUbicacion={sinUbicacion}
            nota={
              total > LIMITE_MAPA
                ? `El mapa muestra los primeros ${LIMITE_MAPA.toLocaleString("es-AR")} resultados: filtrá por zona o barrio para ver el resto.`
                : null
            }
          />
        }
      />
    </div>
  );
}

function FilaControl({
  fila: f,
  programada,
  notificada,
}: {
  fila: FilaHojaRuta;
  programada?: { id: string; fecha: string };
  notificada?: { id: string; numero: string | null; vence: string | null };
}) {
  if (!f.id) return null;
  const tipoInspeccion = "control_vencimiento";
  return (
    <li className="group relative flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-azul-50/40 sm:px-6 2xl:flex-row 2xl:items-center">
      <span
        aria-hidden
        className={cn("absolute inset-y-3 left-0 w-1 rounded-r-full", colorPrioridad(f.prioridad))}
        title={f.prioridad ? ETIQUETA_PRIORIDAD[f.prioridad] : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/gestion/establecimientos/${f.id}`}
            className="font-display text-[15px] leading-snug font-semibold text-foreground after:absolute after:inset-0 hover:text-azul-700"
          >
            {f.nombre}
          </Link>
          {f.tiene_tanque ? (
            <Droplets className="size-4 text-celeste-600" aria-label="Tiene tanque de reserva" />
          ) : null}
          {f.prioridad ? <span className="sr-only">{ETIQUETA_PRIORIDAD[f.prioridad]}</span> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {f.domicilio}
          {f.barrio ? ` · ${f.barrio}` : ""}
          {f.zona ? ` · Zona ${f.zona}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {f.rubro_nombre ?? "Sin rubro asignado"}
          {f.rubro_periodicidad ? ` · ${PERIODICIDAD[f.rubro_periodicidad].label}` : ""}
        </p>
        {programada || notificada ? (
          <div className="relative z-10 mt-1 flex flex-wrap gap-1.5">
            {programada ? (
              <Link href={`/gestion/inspecciones/${programada.id}`} className="rounded-full">
                <Badge tone="azul" size="sm" className="hover:ring-azul-400">
                  <CalendarCheck aria-hidden /> Inspección programada {formatFecha(programada.fecha)}
                </Badge>
              </Link>
            ) : null}
            {notificada ? (
              <Link href={`/gestion/notificaciones/${notificada.id}`} className="rounded-full">
                <Badge tone="violeta" size="sm" className="hover:ring-violet-400">
                  <BellRing aria-hidden /> Notificación {notificada.numero ?? ""}
                  {notificada.vence ? ` · vence ${formatFecha(notificada.vence)}` : ""}
                </Badge>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 2xl:w-[340px] 2xl:shrink-0">
        <Obligacion
          tipo="fumigacion"
          estado={f.estado_fumigacion}
          vencimiento={f.fumigacion_vencimiento}
          empresa={f.fumigacion_empresa}
          compacta
        />
        <Obligacion
          tipo="tanque"
          estado={f.estado_tanque}
          vencimiento={f.tanque_vencimiento}
          empresa={f.tanque_empresa}
          compacta
        />
      </div>

      <div className="relative z-10 2xl:shrink-0">
        <AccionesEstablecimiento
          establecimientoId={f.id}
          nombre={f.nombre ?? "Establecimiento"}
          sinProgramar={Boolean(programada)}
          tipoInspeccion={tipoInspeccion}
        />
      </div>
    </li>
  );
}
