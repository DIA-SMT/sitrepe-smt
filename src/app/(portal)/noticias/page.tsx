import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { Button } from "@/components/ui/button";
import { getNoticias } from "@/lib/data/portal";
import { cn } from "@/lib/utils";
import { EncabezadoPortal } from "../_components/encabezado-portal";
import { TarjetaNoticia } from "../_components/tarjeta-noticia";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Novedades de la Dirección de Salud Ambiental sobre control de plagas urbanas, normativa, prevención y capacitaciones.",
};

const POR_PAGINA = 9;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NoticiasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { pagina, desde, hasta } = rangoPagina(sp.pagina, POR_PAGINA);
  const { noticias, total } = await getNoticias({ desde, hasta });
  const primeraPagina = pagina === 1;

  return (
    <>
      <EncabezadoPortal
        antetitulo="Novedades"
        titulo="Noticias"
        descripcion="Novedades, campañas y cambios normativos de la Dirección de Salud Ambiental."
        icono={Newspaper}
        migas={[{ label: "Noticias" }]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {noticias.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={primeraPagina || total === 0 ? "Todavía no hay noticias publicadas" : "No hay más noticias"}
            description={
              primeraPagina || total === 0
                ? "Las novedades de la Dirección de Salud Ambiental se publicarán acá."
                : "Esta página no existe. Volvé a la primera para ver las noticias más recientes."
            }
            action={
              primeraPagina || total === 0 ? undefined : (
                <Button asChild variant="outline">
                  <Link href="/noticias">
                    <ArrowLeft aria-hidden />
                    Ver las últimas noticias
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {noticias.map((n, i) => {
                const destacada = primeraPagina && i === 0;
                return (
                  <li key={n.id} className={cn("revelar", destacada && "sm:col-span-2 lg:col-span-3")}>
                    <TarjetaNoticia noticia={n} destacada={destacada} prioridad={i < 2} nivel="h2" className="h-full" />
                  </li>
                );
              })}
            </ul>
            {total > POR_PAGINA ? (
              <Paginacion className="mt-10" pagina={pagina} total={total} tamanio={POR_PAGINA} params={sp} ruta="/noticias" />
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
