import Image from "next/image";
import { PetalDecor } from "@/components/brand/petal-decor";
import { cn } from "@/lib/utils";
import { estiloCategoria } from "./categorias";

/**
 * Portada de una noticia: la imagen cargada o, si no tiene, un recuadro ilustrado con el
 * ícono y el degradé de su categoría (igual que en el portal). Sirve en Server y Client Components.
 */
export function PortadaNoticia({
  imagenUrl,
  categoria,
  grande = false,
  className,
}: {
  imagenUrl: string | null | undefined;
  categoria: string;
  grande?: boolean;
  className?: string;
}) {
  const estilo = estiloCategoria(categoria);
  const Icono = estilo.icono;
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {imagenUrl ? (
        <Image
          src={imagenUrl}
          alt=""
          fill
          // Imágenes del bucket público de Storage: se sirven tal cual (sin optimizar), como en el portal.
          unoptimized
          sizes={grande ? "(min-width: 1024px) 40vw, 100vw" : "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div aria-hidden className={cn("absolute inset-0 bg-linear-to-br", estilo.fondo)}>
          <div className="bg-grid mask-fade absolute inset-0 text-white opacity-30" />
          <PetalDecor variant="corner" tone="dark" className={cn("opacity-90", grande ? "h-64" : "h-40")} />
          <span
            className={cn(
              "absolute bottom-4 left-4 flex items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-1",
              grande ? "size-16" : "size-11",
            )}
          >
            <Icono className={grande ? "size-8" : "size-5"} strokeWidth={1.7} />
          </span>
        </div>
      )}
    </div>
  );
}
