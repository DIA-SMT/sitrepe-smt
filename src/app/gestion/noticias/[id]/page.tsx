import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ExternalLink, History, Newspaper } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { getNoticiaAdmin, resumenNoticias } from "@/lib/data/admin";
import { formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { EditorNoticia } from "../_components/editor-noticia";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const noticia = await getNoticiaAdmin(id);
  return { title: noticia ? `Editar: ${noticia.titulo}` : "Noticia no encontrada" };
}

export default async function EditarNoticiaPage({ params }: Props) {
  const sesion = await requerirStaff(["admin", "control"]);
  const { id } = await params;
  const [noticia, { categorias }] = await Promise.all([getNoticiaAdmin(id), resumenNoticias()]);
  if (!noticia) notFound();
  const esAdmin = sesion.perfil.rol === "admin";

  return (
    <>
      <PageHeader
        title="Editar noticia"
        description={noticia.titulo}
        icon={Newspaper}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Noticias", href: "/gestion/noticias" },
          { label: "Editar" },
        ]}
        actions={
          <>
            {esAdmin ? (
              <Button asChild variant="ghost">
                <Link href={`/gestion/auditoria?tabla=noticias&registro=${noticia.id}`}>
                  <History aria-hidden />
                  Historial
                </Link>
              </Button>
            ) : null}
            {noticia.publicada ? (
              <Button asChild variant="outline">
                <Link href={`/noticias/${noticia.slug}`} target="_blank" rel="noopener">
                  <ExternalLink aria-hidden />
                  Ver publicada
                </Link>
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
          {noticia.publicada ? (
            <StatusBadge label="Publicada" tone="verde" />
          ) : (
            <StatusBadge label="Borrador" tone="neutral" />
          )}
          {noticia.publicada_at ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4 text-azul-600" aria-hidden />
              Publicada el {formatFechaHora(noticia.publicada_at)}
            </span>
          ) : null}
          <span>
            Creada el {formatFechaHora(noticia.created_at)} · última edición {formatRelativo(noticia.updated_at)}
          </span>
        </div>
      </PageHeader>
      <EditorNoticia noticia={noticia} categorias={categorias} />
    </>
  );
}
