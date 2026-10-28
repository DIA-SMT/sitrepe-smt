import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Newspaper, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP } from "@/lib/config";
import { getNoticia, getNoticias } from "@/lib/data/portal";
import { formatFecha, formatFechaLarga } from "@/lib/domain/formato";
import { CopiarTexto } from "../../_components/copiar-texto";
import { EncabezadoPortal } from "../../_components/encabezado-portal";
import { PortadaNoticia } from "../../_components/tarjeta-noticia";
import { estiloCategoria, parrafos } from "../../_lib/categorias";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const noticia = await getNoticia(slug);
  if (!noticia) return { title: "Noticia no encontrada", robots: { index: false } };
  return {
    title: noticia.titulo,
    description: noticia.resumen,
    openGraph: {
      type: "article",
      title: noticia.titulo,
      description: noticia.resumen,
      publishedTime: noticia.publicada_at ?? undefined,
      images: noticia.imagen_url ? [noticia.imagen_url] : undefined,
    },
  };
}

export default async function NoticiaPage({ params }: Props) {
  const { slug } = await params;
  const noticia = await getNoticia(slug);
  if (!noticia) notFound();

  const { noticias: recientes } = await getNoticias({ desde: 0, hasta: 3 });
  const otras = recientes.filter((n) => n.id !== noticia.id).slice(0, 3);
  const estilo = estiloCategoria(noticia.categoria);
  const fecha = noticia.publicada_at ?? noticia.created_at;
  const [entrada, ...resto] = parrafos(noticia.cuerpo);
  // Ruta relativa: CopiarTexto la completa con el dominio real desde el navegador.
  const enlace = `/noticias/${noticia.slug}`;

  return (
    <>
      <EncabezadoPortal
        antetitulo={noticia.categoria}
        titulo={noticia.titulo}
        descripcion={noticia.resumen}
        migas={[{ label: "Noticias", href: "/noticias" }, { label: noticia.titulo }]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={estilo.tono} dot size="lg">
            {noticia.categoria}
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden />
            <time dateTime={fecha}>{formatFechaLarga(fecha)}</time>
          </span>
          <CopiarTexto texto={enlace} etiqueta="Copiar enlace" descripcion="el enlace de la noticia" />
        </div>
      </EncabezadoPortal>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_20rem] lg:px-8">
        <article className="min-w-0">
          <PortadaNoticia noticia={noticia} prioridad grande className="aspect-[21/9] w-full rounded-panel shadow-card" />
          <div className="mx-auto mt-10 max-w-[68ch]">
            {entrada ? (
              <p className="text-lg leading-relaxed whitespace-pre-line text-foreground sm:text-xl sm:leading-relaxed">{entrada}</p>
            ) : null}
            {resto.map((p, i) => (
              <p key={i} className="mt-6 text-base leading-[1.8] whitespace-pre-line text-foreground/90">
                {p}
              </p>
            ))}
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">
                {APP.direccion} · {APP.municipio}
              </p>
              <Button asChild variant="outline">
                <Link href="/noticias">
                  <ArrowLeft aria-hidden />
                  Todas las noticias
                </Link>
              </Button>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          <section aria-labelledby="otras-noticias" className="rounded-card border border-border bg-card p-5 shadow-card">
            <h2 id="otras-noticias" className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <Newspaper className="size-4 text-azul-600" aria-hidden />
              Otras noticias
            </h2>
            {otras.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No hay otras noticias publicadas por ahora.</p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-border">
                {otras.map((n) => (
                  <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                    <Link href={`/noticias/${n.slug}`} className="group flex flex-col gap-1 rounded-sm">
                      <span className="text-xs text-muted-foreground">
                        {n.categoria} · {formatFecha(n.publicada_at ?? n.created_at)}
                      </span>
                      <span className="font-medium leading-snug text-foreground group-hover:text-azul-700">{n.titulo}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="relative overflow-hidden rounded-card bg-gradient-brand p-5 text-white shadow-brand">
            <QrCode className="size-6 text-sol-300" aria-hidden />
            <p className="mt-3 font-display text-lg font-semibold">¿Contrataste un servicio?</p>
            <p className="mt-1 text-sm text-white/90">Verificá que el certificado esté timbrado y vigente.</p>
            <Link
              href="/verificar"
              className="mt-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-white underline-offset-4 hover:underline"
            >
              Verificar certificado
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
