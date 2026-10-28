import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { Badge } from "@/components/ui/badge";
import type { NoticiaResumen } from "@/lib/data/portal";
import { formatFechaLarga } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { estiloCategoria } from "../_lib/categorias";

/** Imagen de la noticia o, si no tiene, un recuadro ilustrado con el ícono de su categoría. */
export function PortadaNoticia({
  noticia,
  className,
  prioridad = false,
  grande = false,
}: {
  noticia: Pick<NoticiaResumen, "titulo" | "categoria" | "imagen_url">;
  className?: string;
  prioridad?: boolean;
  grande?: boolean;
}) {
  const estilo = estiloCategoria(noticia.categoria);
  const Icono = estilo.icono;
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {noticia.imagen_url ? (
        <Image
          src={noticia.imagen_url}
          alt=""
          fill
          // Las imágenes pueden venir de cualquier dominio cargado por administración: se sirven sin optimizar.
          unoptimized
          loading={prioridad ? "eager" : "lazy"}
          sizes={grande ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div aria-hidden className={cn("absolute inset-0 bg-linear-to-br", estilo.fondo)}>
          <div className="bg-grid mask-fade absolute inset-0 text-white opacity-30" />
          <PetalDecor variant="corner" tone="dark" className={cn("opacity-90", grande ? "h-72" : "h-48")} />
          <span
            className={cn(
              "absolute bottom-4 left-4 flex items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-1",
              grande ? "size-16" : "size-12",
            )}
          >
            <Icono className={grande ? "size-8" : "size-6"} strokeWidth={1.7} />
          </span>
        </div>
      )}
    </div>
  );
}

type TarjetaNoticiaProps = {
  noticia: NoticiaResumen;
  /** Diseño horizontal destacado (primera noticia). */
  destacada?: boolean;
  prioridad?: boolean;
  /** Nivel del título (h2 en listados, h3 dentro de secciones). */
  nivel?: "h2" | "h3";
  className?: string;
};

export function TarjetaNoticia({ noticia, destacada = false, prioridad = false, nivel = "h3", className }: TarjetaNoticiaProps) {
  const estilo = estiloCategoria(noticia.categoria);
  const Titulo = nivel;
  const fecha = noticia.publicada_at ?? noticia.created_at;
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-azul-200 hover:shadow-elevated",
        destacada && "md:grid md:grid-cols-[1.1fr_1fr]",
        className,
      )}
    >
      <PortadaNoticia
        noticia={noticia}
        prioridad={prioridad}
        grande={destacada}
        className={cn("aspect-[16/9] w-full", destacada && "md:aspect-auto md:min-h-72")}
      />
      <div className={cn("flex flex-1 flex-col gap-3 p-5 sm:p-6", destacada && "md:justify-center md:p-8")}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Badge tone={estilo.tono} dot>
            {noticia.categoria}
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            <time dateTime={fecha}>{formatFechaLarga(fecha)}</time>
          </span>
        </div>
        <Titulo
          className={cn(
            "font-display leading-snug font-semibold text-foreground",
            destacada ? "text-xl sm:text-2xl" : "text-lg",
          )}
        >
          <Link
            href={`/noticias/${noticia.slug}`}
            className="rounded-sm after:absolute after:inset-0 after:content-[''] hover:text-azul-700 focus-visible:outline-offset-4"
          >
            {noticia.titulo}
          </Link>
        </Titulo>
        <p className={cn("text-sm leading-relaxed text-muted-foreground", destacada ? "line-clamp-4" : "line-clamp-3")}>
          {noticia.resumen}
        </p>
        <span aria-hidden className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-azul-700">
          Leer nota
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </article>
  );
}
