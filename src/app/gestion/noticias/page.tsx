import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Eye, FilePenLine, ImageIcon, Newspaper, Plus, Radio, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { listarNoticias, resumenNoticias } from "@/lib/data/admin";
import { formatRelativo } from "@/lib/domain/formato";
import { CATEGORIAS_NOTICIA } from "./_components/categorias";
import { TarjetaNoticiaAdmin } from "./_components/tarjeta-noticia";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Noticias y novedades del portal público de SITREPE.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const TAMANIO = 12;

export default async function NoticiasGestionPage({ searchParams }: Props) {
  // Todo el personal ve el listado; redactan y publican Administración y Control (RLS: puede_controlar).
  // A Inspección la RLS le devuelve solo las publicadas.
  const sesion = await requerirStaff();
  const puedeEditar = sesion.perfil.rol === "admin" || sesion.perfil.rol === "control";
  const sp = await searchParams;

  const q = primero(sp.q)?.trim() || undefined;
  const estadoParam = primero(sp.estado);
  const estado = estadoParam === "publicada" || estadoParam === "borrador" ? estadoParam : undefined;
  const categoria = primero(sp.categoria)?.trim() || undefined;
  const { pagina, desde, hasta } = rangoPagina(sp.pagina, TAMANIO);

  const [{ filas, total }, resumen] = await Promise.all([
    listarNoticias({ q, estado, categoria, desde, hasta }),
    resumenNoticias(),
  ]);
  const hayFiltros = Boolean(q || estado || categoria);
  const categorias = [...new Set([...CATEGORIAS_NOTICIA, ...resumen.categorias])];
  const pctImagen = resumen.total ? Math.round((resumen.conImagen / resumen.total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Noticias del portal"
        description="Novedades, normativa, recomendaciones y campañas que se publican en el portal público de la Dirección."
        icon={Newspaper}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Comunidad" }, { label: "Noticias" }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/noticias" target="_blank" rel="noopener">
                <ExternalLink aria-hidden />
                Ver en el portal
              </Link>
            </Button>
            {puedeEditar ? (
              <Button asChild>
                <Link href="/gestion/noticias/nueva">
                  <Plus aria-hidden />
                  Nueva noticia
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {puedeEditar ? null : (
          <Alert role="status" tone="info" title="Modo consulta" icon={<Eye aria-hidden />}>
            Ves las noticias publicadas en el portal. Las redactan y publican Administración y Control.
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Publicadas"
            value={resumen.publicadas}
            icon={Radio}
            tone="verde"
            hint="Visibles en el portal"
            href="/gestion/noticias?estado=publicada"
          />
          <StatCard
            label="Borradores"
            value={resumen.borradores}
            icon={FilePenLine}
            tone="ambar"
            hint="Pendientes de publicar"
            href="/gestion/noticias?estado=borrador"
          />
          <StatCard
            label="Con imagen propia"
            value={resumen.conImagen}
            icon={ImageIcon}
            tone="celeste"
            hint={resumen.total ? `${pctImagen} % del total` : "Sin noticias cargadas"}
          />
          <StatCard
            label="Última publicación"
            value={resumen.ultimaPublicacion ? formatRelativo(resumen.ultimaPublicacion) : "—"}
            icon={Newspaper}
            tone="azul"
            hint={resumen.ultimaPublicacion ? "Mantené el portal al día" : "Todavía no se publicó ninguna"}
          />
        </div>

        <SectionCard
          title="Noticias"
          description={`${total.toLocaleString("es-AR")} de ${resumen.total.toLocaleString("es-AR")} noticias${hayFiltros ? " (filtrado)" : ""}`}
          icon={Newspaper}
          flush
          footer={
            total > 0 ? (
              <Paginacion
                pagina={pagina}
                total={total}
                tamanio={TAMANIO}
                params={sp}
                ruta="/gestion/noticias"
                className="w-full"
              />
            ) : undefined
          }
        >
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <FiltrosUrl
              campos={[
                {
                  tipo: "busqueda",
                  nombre: "q",
                  placeholder: "Buscá por título, resumen o dirección",
                },
                {
                  tipo: "select",
                  nombre: "estado",
                  etiqueta: "Estado",
                  opciones: [
                    { valor: "publicada", label: "Publicadas" },
                    { valor: "borrador", label: "Borradores" },
                  ],
                },
                {
                  tipo: "select",
                  nombre: "categoria",
                  etiqueta: "Categoría",
                  opciones: categorias.map((c) => ({ valor: c, label: c })),
                },
              ]}
            />
          </div>

          <div className="p-5 sm:p-6">
            {filas.length === 0 ? (
              <EmptyState
                compact
                icon={hayFiltros ? SearchX : Newspaper}
                title={hayFiltros ? "No hay noticias con esos filtros" : "Todavía no hay noticias"}
                description={
                  hayFiltros
                    ? "Probá con otras palabras o limpiá los filtros."
                    : "Contale a la comunidad las novedades de la Dirección: campañas, normativa, capacitaciones y recomendaciones."
                }
                action={
                  hayFiltros ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/gestion/noticias">Limpiar filtros</Link>
                    </Button>
                  ) : puedeEditar ? (
                    <Button asChild size="sm">
                      <Link href="/gestion/noticias/nueva">
                        <Plus aria-hidden />
                        Escribir la primera
                      </Link>
                    </Button>
                  ) : null
                }
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filas.map((n, i) => (
                  <li key={n.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                    <TarjetaNoticiaAdmin noticia={n} editable={puedeEditar} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
