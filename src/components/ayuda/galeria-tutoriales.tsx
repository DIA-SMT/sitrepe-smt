"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { CirclePlay, Clock, Subtitles } from "lucide-react";
import { cn } from "@/lib/utils";

export type TutorialVista = {
  clave: string;
  titulo: string;
  perfil: string;
  descripcion: string;
  duracion: string;
  video: string;
  subtitulos: string;
  portada: string;
};

/** Reproductor destacado + lista de videos. Al elegir uno de la lista, se carga arriba y empieza a reproducirse. */
export function GaleriaTutoriales({ tutoriales, inicial }: { tutoriales: TutorialVista[]; inicial?: string }) {
  const [actual, setActual] = useState(() => tutoriales.find((t) => t.clave === inicial) ?? tutoriales[0]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reproductorRef = useRef<HTMLDivElement>(null);

  function elegir(t: TutorialVista) {
    setActual(t);
    reproductorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // El elemento <video> se vuelve a montar con la key: se reproduce en cuanto está listo.
    requestAnimationFrame(() => void videoRef.current?.play().catch(() => undefined));
  }

  if (!actual) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <div ref={reproductorRef} className="flex scroll-mt-28 flex-col gap-4">
        <div className="overflow-hidden rounded-panel bg-noche shadow-elevated ring-1 ring-noche-800">
          <video
            key={actual.clave}
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            poster={actual.portada}
            crossOrigin="anonymous"
            className="aspect-video w-full bg-noche"
          >
            <source src={actual.video} type="video/mp4" />
            <track kind="subtitles" src={actual.subtitulos} srcLang="es" label="Español" />
            Tu navegador no puede reproducir este video.
          </video>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-azul-700 uppercase">{actual.perfil}</p>
          <h3 className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl">{actual.titulo}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{actual.descripcion}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Subtitles className="size-4 text-azul-600" aria-hidden />
            Tiene subtítulos: activalos desde el botón de opciones del reproductor.
          </p>
        </div>
      </div>

      <ol className="flex flex-col gap-2.5" aria-label="Videos disponibles">
        {tutoriales.map((t) => {
          const activo = t.clave === actual.clave;
          return (
            <li key={t.clave}>
              <button
                type="button"
                onClick={() => elegir(t)}
                aria-current={activo ? "true" : undefined}
                className={cn(
                  "group grid w-full grid-cols-[7.5rem_minmax(0,1fr)] gap-3 rounded-card border p-2.5 text-left transition",
                  activo
                    ? "border-primary/40 bg-primary-soft shadow-card"
                    : "border-border bg-card hover:border-primary/30 hover:bg-azul-50/50",
                )}
              >
                <span className="relative aspect-video overflow-hidden rounded-lg bg-noche">
                  <Image src={t.portada} alt="" fill sizes="120px" className="object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-noche-950/25 transition group-hover:bg-noche-950/10">
                    <CirclePlay className="size-7 text-white drop-shadow" aria-hidden />
                  </span>
                </span>
                <span className="min-w-0 py-0.5">
                  <span className="block text-[11px] font-semibold tracking-wide text-azul-700 uppercase">{t.perfil}</span>
                  <span className="block truncate font-display text-sm font-semibold text-foreground">{t.titulo}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden />
                    {t.duracion} min
                    {activo ? <span className="ml-1.5 font-semibold text-primary">· Reproduciendo</span> : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
