import Link from "next/link";
import { CalendarDays, ExternalLink, EyeOff, Pencil, Send, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFecha, formatRelativo } from "@/lib/domain/formato";
import type { Noticia } from "@/lib/data/admin";
import { AccionConfirmada, BotonAccion } from "../../configuracion/_compartido/acciones-cliente";
import { cambiarPublicacion, eliminarNoticia } from "../actions";
import { estiloCategoria } from "./categorias";
import { PortadaNoticia } from "./portada";

/**
 * Tarjeta de una noticia en el listado de gestión, con acciones rápidas. Sin permiso de
 * edición (Inspección), la tarjeta abre la noticia en el portal y no muestra acciones.
 */
export function TarjetaNoticiaAdmin({ noticia, editable = true }: { noticia: Noticia; editable?: boolean }) {
  const estilo = estiloCategoria(noticia.categoria);
  const href = editable ? `/gestion/noticias/${noticia.id}` : `/noticias/${noticia.slug}`;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-azul-200 hover:shadow-elevated">
      <div className="relative">
        <PortadaNoticia imagenUrl={noticia.imagen_url} categoria={noticia.categoria} className="aspect-[16/9] w-full" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {noticia.publicada ? (
            <StatusBadge label="Publicada" tone="verde" className="bg-white/95 shadow-xs" />
          ) : (
            <StatusBadge label="Borrador" tone="neutral" className="bg-white/95 shadow-xs" />
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge tone={estilo.tono} size="sm">
            {noticia.categoria}
          </Badge>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden />
            {noticia.publicada && noticia.publicada_at
              ? `Publicada el ${formatFecha(noticia.publicada_at)}`
              : `Editada ${formatRelativo(noticia.updated_at)}`}
          </span>
        </div>
        <h3 className="font-display text-base leading-snug font-semibold text-foreground">
          <Link href={href} className="rounded-sm after:absolute after:inset-0 after:content-[''] hover:text-azul-700">
            {noticia.titulo}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{noticia.resumen}</p>
        <p className="truncate font-mono text-[11px] text-noche-400">/noticias/{noticia.slug}</p>
      </div>
      {editable ? null : (
        <div className="relative z-10 flex items-center border-t border-border bg-subtle/70 px-3 py-2.5">
          <Button asChild variant="ghost" size="sm">
            <Link href={href} target="_blank" rel="noopener">
              <ExternalLink aria-hidden />
              Ver en el portal
            </Link>
          </Button>
        </div>
      )}
      {editable ? (
        <div className="relative z-10 flex flex-wrap items-center gap-1.5 border-t border-border bg-subtle/70 px-3 py-2.5">
          <Button asChild variant="ghost" size="sm">
            <Link href={href}>
              <Pencil aria-hidden />
              Editar
            </Link>
          </Button>
          {noticia.publicada ? (
            <BotonAccion
              accion={cambiarPublicacion}
              campos={{ id: noticia.id, publicar: "0" }}
              variant="ghost"
              size="sm"
            >
              <EyeOff aria-hidden />
              Despublicar
            </BotonAccion>
          ) : (
            <BotonAccion
              accion={cambiarPublicacion}
              campos={{ id: noticia.id, publicar: "1" }}
              variant="ghost"
              size="sm"
              className="text-azul-700"
            >
              <Send aria-hidden />
              Publicar
            </BotonAccion>
          )}
          <div className="ml-auto flex items-center gap-1">
            {noticia.publicada ? (
              <Button asChild variant="ghost" size="icon-sm" aria-label={`Ver "${noticia.titulo}" en el portal`}>
                <Link href={`/noticias/${noticia.slug}`} target="_blank" rel="noopener">
                  <ExternalLink aria-hidden />
                </Link>
              </Button>
            ) : null}
            <AccionConfirmada
              accion={eliminarNoticia}
              campos={{ id: noticia.id }}
              titulo="¿Eliminar esta noticia?"
              descripcion={`"${noticia.titulo}" se quita del portal y se borra su imagen. Queda registrado en la auditoría.`}
              confirmar="Sí, eliminar"
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:bg-danger-soft hover:text-danger"
                  aria-label={`Eliminar "${noticia.titulo}"`}
                >
                  <Trash2 aria-hidden />
                </Button>
              }
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
