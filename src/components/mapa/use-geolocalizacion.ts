"use client";

import { useCallback, useState } from "react";

export type Posicion = { lat: number; lng: number; precision: number | null };

type EstadoGeo =
  | { tipo: "inactivo" }
  | { tipo: "buscando" }
  | { tipo: "ok"; posicion: Posicion }
  | { tipo: "error"; mensaje: string };

const MENSAJES: Record<number, string> = {
  1: "Permití el acceso a la ubicación en el navegador para registrarla.",
  2: "No pudimos determinar tu ubicación. Probá al aire libre o con el GPS activado.",
  3: "La ubicación tardó demasiado. Intentá de nuevo.",
};

/** Ubicación actual del dispositivo (GPS del celular del inspector). */
export function useGeolocalizacion() {
  const [estado, setEstado] = useState<EstadoGeo>({ tipo: "inactivo" });

  const obtener = useCallback((alObtener?: (p: Posicion) => void) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setEstado({ tipo: "error", mensaje: "Este dispositivo no permite obtener la ubicación." });
      return;
    }
    setEstado({ tipo: "buscando" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const posicion: Posicion = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          precision: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null,
        };
        setEstado({ tipo: "ok", posicion });
        alObtener?.(posicion);
      },
      (err) => setEstado({ tipo: "error", mensaje: MENSAJES[err.code] ?? "No pudimos obtener la ubicación." }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, []);

  const limpiar = useCallback(() => setEstado({ tipo: "inactivo" }), []);

  return { estado, obtener, limpiar };
}
