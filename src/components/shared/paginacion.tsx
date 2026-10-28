import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const TAMANIO_PAGINA = 20;

/** Lee `?pagina=` y devuelve el rango para `.range(desde, hasta)` de Supabase. */
export function rangoPagina(pagina: string | string[] | undefined, tamanio = TAMANIO_PAGINA) {
  const n = Math.max(1, Number.parseInt(Array.isArray(pagina) ? pagina[0] : (pagina ?? "1"), 10) || 1);
  return { pagina: n, desde: (n - 1) * tamanio, hasta: n * tamanio - 1, tamanio };
}

type PaginacionProps = {
  pagina: number;
  total: number;
  tamanio?: number;
  /** searchParams actuales (para conservar los filtros). */
  params: Record<string, string | string[] | undefined>;
  ruta: string;
  className?: string;
};

/** Paginación por URL (`?pagina=N`) que conserva los demás filtros. */
export function Paginacion({ pagina, total, tamanio = TAMANIO_PAGINA, params, ruta, className }: PaginacionProps) {
  const paginas = Math.max(1, Math.ceil(total / tamanio));
  const href = (n: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "pagina" || v === undefined) continue;
      sp.set(k, Array.isArray(v) ? v[0] : v);
    }
    if (n > 1) sp.set("pagina", String(n));
    return `${ruta}${sp.size ? `?${sp}` : ""}`;
  };
  const desde = total === 0 ? 0 : (pagina - 1) * tamanio + 1;
  const hasta = Math.min(total, pagina * tamanio);

  return (
    <nav aria-label="Paginación" className={cn("flex items-center justify-between gap-3 text-sm", className)}>
      <p className="text-muted-foreground">
        {total === 0 ? "Sin resultados" : `${desde}–${hasta} de ${total.toLocaleString("es-AR")}`}
      </p>
      <div className="flex items-center gap-1">
        <EnlacePagina href={href(pagina - 1)} deshabilitado={pagina <= 1} etiqueta="Página anterior">
          <ChevronLeft className="size-4" aria-hidden />
        </EnlacePagina>
        <span className="px-2 tabular-nums text-muted-foreground">
          {pagina} / {paginas}
        </span>
        <EnlacePagina href={href(pagina + 1)} deshabilitado={pagina >= paginas} etiqueta="Página siguiente">
          <ChevronRight className="size-4" aria-hidden />
        </EnlacePagina>
      </div>
    </nav>
  );
}

function EnlacePagina({
  href,
  deshabilitado,
  etiqueta,
  children,
}: {
  href: string;
  deshabilitado: boolean;
  etiqueta: string;
  children: React.ReactNode;
}) {
  const clases = "inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card transition-colors";
  if (deshabilitado) {
    return (
      <span aria-disabled className={cn(clases, "opacity-40")} aria-label={etiqueta}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(clases, "hover:border-azul-300 hover:bg-azul-50")} aria-label={etiqueta} scroll={false}>
      {children}
    </Link>
  );
}
