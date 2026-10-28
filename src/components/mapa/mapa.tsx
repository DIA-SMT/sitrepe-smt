"use client";

import dynamic from "next/dynamic";
import { MapPinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ESTADOS_PUNTO, ESTILO_PUNTO, type EstadoPunto, type PuntoMapa } from "./tipos";

const MapaLeaflet = dynamic(() => import("./mapa-leaflet").then((m) => m.MapaLeaflet), {
  ssr: false,
  loading: () => <CargandoMapa />,
});

function CargandoMapa() {
  return (
    <div className="flex size-full items-center justify-center bg-azul-50/60" role="status">
      <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden className="size-8 animate-spin rounded-full border-2 border-azul-200 border-t-azul-600" />
        Cargando mapa…
      </span>
    </div>
  );
}

export type MapaProps = {
  puntos: PuntoMapa[];
  /** Alto del mapa (clase de Tailwind). */
  altoClassName?: string;
  centro?: [number, number];
  zoom?: number;
  /** Encuadra los puntos al cargar. */
  ajustar?: boolean;
  /** Muestra la leyenda de colores con la cantidad por estado. */
  leyenda?: boolean;
  /** Etiqueta accesible del mapa. */
  titulo?: string;
  /** Texto cuando no hay puntos con coordenadas. */
  vacio?: string;
  /** Cantidad de registros sin coordenadas (se informa debajo). */
  sinUbicacion?: number;
  /** Aclaración debajo del mapa (p. ej. si se muestran solo los primeros resultados). */
  nota?: string | null;
  className?: string;
};

/**
 * Mapa de San Miguel de Tucumán con marcadores por estado (vencido, sin certificado,
 * por vencer, al día). Se puede usar desde Server Components: las props son serializables.
 */
export function Mapa({
  puntos,
  altoClassName = "h-[420px]",
  centro,
  zoom,
  ajustar = false,
  leyenda = true,
  titulo = "Mapa de establecimientos",
  vacio,
  sinUbicacion = 0,
  nota,
  className,
}: MapaProps) {
  const conteo = puntos.reduce<Partial<Record<EstadoPunto, number>>>((acc, p) => {
    acc[p.estado] = (acc[p.estado] ?? 0) + 1;
    return acc;
  }, {});
  const estados = ESTADOS_PUNTO.filter((e) => conteo[e]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="region"
        aria-label={titulo}
        className={cn(
          "relative isolate z-0 overflow-hidden rounded-card border border-border bg-azul-50/40 shadow-card",
          altoClassName,
        )}
      >
        <MapaLeaflet puntos={puntos} centro={centro} zoom={zoom} ajustar={ajustar} />
        {puntos.length === 0 && vacio ? (
          <div className="pointer-events-none absolute inset-x-14 top-3 z-[500] flex justify-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card ring-1 ring-border">
              <MapPinOff className="size-3.5" aria-hidden /> {vacio}
            </p>
          </div>
        ) : null}
      </div>
      {leyenda && (estados.length > 0 || sinUbicacion > 0 || nota) ? (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Referencias del mapa">
          {estados.map((e) => (
            <li key={e} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-3 rounded-full ring-2 ring-white"
                style={{ backgroundColor: ESTILO_PUNTO[e].relleno, boxShadow: `0 0 0 1px ${ESTILO_PUNTO[e].borde}` }}
              />
              <span className="font-medium text-foreground">{ESTILO_PUNTO[e].label}</span>
              <span className="nums-tabular">({conteo[e]})</span>
            </li>
          ))}
          {sinUbicacion > 0 ? (
            <li className="inline-flex items-center gap-1.5">
              <MapPinOff className="size-3.5" aria-hidden />
              {sinUbicacion} sin ubicación cargada
            </li>
          ) : null}
          {nota ? <li className="w-full text-muted-foreground">{nota}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
