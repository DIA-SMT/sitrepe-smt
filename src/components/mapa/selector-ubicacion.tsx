"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair, LoaderCircle, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CENTRO_SMT } from "./tipos";
import { useGeolocalizacion } from "./use-geolocalizacion";

const MapaLeaflet = dynamic(() => import("./mapa-leaflet").then((m) => m.MapaLeaflet), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-azul-50/70" />,
});

type SelectorUbicacionProps = {
  latInicial?: number | null;
  lngInicial?: number | null;
  nombreLat?: string;
  nombreLng?: string;
  errorLat?: string | null;
  errorLng?: string | null;
};

const aTexto = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "");

/**
 * Coordenadas opcionales: tocá el mapa, usá la ubicación del dispositivo o escribilas.
 * Deja los valores en inputs con `name` para el formulario que lo contiene.
 */
export function SelectorUbicacion({
  latInicial,
  lngInicial,
  nombreLat = "lat",
  nombreLng = "lng",
  errorLat,
  errorLng,
}: SelectorUbicacionProps) {
  const id = useId();
  const [lat, setLat] = useState(aTexto(latInicial));
  const [lng, setLng] = useState(aTexto(lngInicial));
  const { estado, obtener } = useGeolocalizacion();

  // Se acepta coma decimal, igual que en el servidor ("-26,8241").
  const aNumero = (v: string) => (v.trim() === "" ? Number.NaN : Number(v.trim().replace(",", ".")));
  const latNum = aNumero(lat);
  const lngNum = aNumero(lng);
  const valida = Number.isFinite(latNum) && Number.isFinite(lngNum) && Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180;

  const elegir = (la: number, ln: number) => {
    setLat(String(la));
    setLng(String(ln));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative isolate z-0 h-64 overflow-hidden rounded-xl border border-border shadow-xs sm:h-72">
        <MapaLeaflet
          puntos={valida ? [{ id: "seleccion", lat: latNum, lng: lngNum, titulo: "Ubicación elegida", estado: "info" }] : []}
          centro={valida ? [latNum, lngNum] : CENTRO_SMT}
          zoom={valida ? 16 : 13}
          ajustar={valida}
          alElegir={elegir}
        />
        <p className="pointer-events-none absolute inset-x-14 top-3 z-[500] mx-auto w-fit text-center rounded-full bg-card/95 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-card ring-1 ring-border">
          <MapPin className="mr-1 inline size-3 text-azul-600" aria-hidden />
          Tocá el mapa para marcar la ubicación
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field htmlFor={`${id}-lat`} label="Latitud" error={errorLat}>
          <Input
            id={`${id}-lat`}
            name={nombreLat}
            inputMode="decimal"
            placeholder="-26.8241"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
        </Field>
        <Field htmlFor={`${id}-lng`} label="Longitud" error={errorLng}>
          <Input
            id={`${id}-lng`}
            name={nombreLng}
            inputMode="decimal"
            placeholder="-65.2226"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => obtener((p) => elegir(p.lat, p.lng))}
            disabled={estado.tipo === "buscando"}
            className="flex-1 sm:flex-none"
          >
            {estado.tipo === "buscando" ? <LoaderCircle className="animate-spin" aria-hidden /> : <Crosshair aria-hidden />}
            Usar mi ubicación
          </Button>
          {lat || lng ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar coordenadas"
              onClick={() => {
                setLat("");
                setLng("");
              }}
            >
              <X aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
      <p aria-live="polite" className="text-[13px] text-muted-foreground empty:hidden">
        {estado.tipo === "error" ? <span className="text-danger">{estado.mensaje}</span> : null}
        {estado.tipo === "ok" && estado.posicion.precision !== null
          ? `Ubicación del dispositivo tomada (precisión aproximada ±${estado.posicion.precision} m).`
          : null}
      </p>
    </div>
  );
}
