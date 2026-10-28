"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { latLngBounds } from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { CENTRO_SMT, ESTILO_PUNTO, type PuntoMapa, ZOOM_SMT } from "./tipos";

export type MapaLeafletProps = {
  puntos: PuntoMapa[];
  centro?: [number, number];
  zoom?: number;
  /** Encuadra todos los puntos (si hay más de uno) al cargar o al cambiar. */
  ajustar?: boolean;
  /** Permite hacer zoom con la rueda del mouse (desactivado por defecto para no "atrapar" el scroll). */
  zoomConRueda?: boolean;
  /** Modo selector: un clic en el mapa elige la ubicación. */
  alElegir?: (lat: number, lng: number) => void;
  className?: string;
};

const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/**
 * Mapa Leaflet con teselas de OpenStreetMap y marcadores circulares coloreados
 * por estado. Se carga solo en el navegador (ver `mapa.tsx`).
 */
export function MapaLeaflet({
  puntos,
  centro = CENTRO_SMT,
  zoom = ZOOM_SMT,
  ajustar = false,
  zoomConRueda = false,
  alElegir,
  className,
}: MapaLeafletProps) {
  return (
    <MapContainer
      center={centro}
      zoom={zoom}
      scrollWheelZoom={zoomConRueda}
      className={className}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer attribution={ATRIBUCION} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      <AutoTamanio />
      {ajustar ? <Encuadre puntos={puntos} /> : null}
      {alElegir ? <Seleccion alElegir={alElegir} /> : null}
      {puntos.map((p) => {
        const estilo = ESTILO_PUNTO[p.estado];
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={alElegir ? 10 : 8}
            pathOptions={{ color: estilo.borde, weight: 2, fillColor: estilo.relleno, fillOpacity: 0.88 }}
          >
            {alElegir ? null : (
              <Popup minWidth={210} maxWidth={280}>
                <div className="flex flex-col gap-1.5 font-sans">
                  <p className="m-0! font-display text-sm leading-snug font-semibold text-noche-900">{p.titulo}</p>
                  {p.subtitulo ? <p className="m-0! text-xs leading-snug text-noche-600">{p.subtitulo}</p> : null}
                  <p className="m-0! flex items-center gap-1.5 text-xs font-semibold" style={{ color: estilo.borde }}>
                    <span
                      aria-hidden
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: estilo.relleno }}
                    />
                    {p.estadoTexto ?? estilo.label}
                  </p>
                  {p.detalle ? <p className="m-0! text-xs leading-snug text-noche-600">{p.detalle}</p> : null}
                  {p.href ? (
                    <Link
                      href={p.href}
                      className="mt-1 inline-flex w-fit items-center rounded-lg bg-azul-600 px-2.5 py-1 text-xs font-semibold no-underline"
                      style={{ color: "#fff" }}
                    >
                      {p.hrefTexto ?? "Ver ficha"} →
                    </Link>
                  ) : null}
                </div>
              </Popup>
            )}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

/** Recalcula el tamaño cuando el contenedor cambia (pestañas, vista lista/mapa, cajones). */
function AutoTamanio() {
  const map = useMap();
  useEffect(() => {
    const contenedor = map.getContainer();
    const observador = new ResizeObserver(() => map.invalidateSize());
    observador.observe(contenedor);
    return () => observador.disconnect();
  }, [map]);
  return null;
}

/** Encuadra los puntos. `clave` resume las coordenadas: solo reencuadra si cambian. */
function Encuadre({ puntos }: { puntos: PuntoMapa[] }) {
  const map = useMap();
  const clave = useMemo(() => puntos.map((p) => `${p.lat},${p.lng}`).join("|"), [puntos]);
  useEffect(() => {
    if (!clave) return;
    const coordenadas = clave.split("|").map((par): [number, number] => {
      const [lat, lng] = par.split(",").map(Number);
      return [lat, lng];
    });
    const encuadrar = () => {
      if (coordenadas.length === 1) {
        map.setView(coordenadas[0], Math.max(map.getZoom(), 16));
        return;
      }
      map.fitBounds(latLngBounds(coordenadas), { padding: [28, 28], maxZoom: 16 });
    };
    // Si el mapa arranca oculto (vista "Lista" en el celular) mide 0×0 y fitBounds calcularía un
    // zoom inválido: se espera a que tenga tamaño (AutoTamanio llama a invalidateSize → "resize").
    const tamanio = map.getSize();
    if (tamanio.x > 0 && tamanio.y > 0) {
      encuadrar();
      return;
    }
    const alRedimensionar = () => {
      const t = map.getSize();
      if (t.x === 0 || t.y === 0) return;
      map.off("resize", alRedimensionar);
      encuadrar();
    };
    map.on("resize", alRedimensionar);
    return () => {
      map.off("resize", alRedimensionar);
    };
  }, [map, clave]);
  return null;
}

function Seleccion({ alElegir }: { alElegir: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      alElegir(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}
