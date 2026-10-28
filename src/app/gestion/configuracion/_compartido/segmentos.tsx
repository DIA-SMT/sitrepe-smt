import Link from "next/link";
import { cn } from "@/lib/utils";

export type SegmentoEnlace = {
  href: string;
  etiqueta: string;
  activo: boolean;
  icono?: React.ReactNode;
  contador?: number;
  /** Resalta el contador (pendientes). */
  alerta?: boolean;
};

/** Control segmentado de navegación: cada opción es un enlace (la URL guarda la vista). */
export function SegmentosEnlace({
  items,
  etiqueta,
  variante = "pastilla",
  className,
}: {
  items: SegmentoEnlace[];
  etiqueta: string;
  variante?: "pastilla" | "linea";
  className?: string;
}) {
  return (
    <nav aria-label={etiqueta} className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <ul
        className={cn(
          "inline-flex min-w-max items-center",
          variante === "pastilla" && "gap-1 rounded-xl bg-muted p-1",
          variante === "linea" && "w-full gap-5 shadow-[inset_0_-1px_0_var(--color-border)]",
        )}
      >
        {items.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              scroll={false}
              aria-current={s.activo ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap transition-all [&_svg]:size-4",
                variante === "pastilla" && "h-8 rounded-lg px-3",
                variante === "pastilla" &&
                  (s.activo
                    ? "bg-card text-azul-700 shadow-[0_1px_3px_rgb(10_26_63/0.14)]"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground"),
                variante === "linea" && "h-11 border-b-2",
                variante === "linea" &&
                  (s.activo
                    ? "border-primary text-azul-700"
                    : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"),
              )}
            >
              {s.icono}
              {s.etiqueta}
              {s.contador !== undefined ? (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold nums-tabular",
                    s.alerta && s.contador > 0
                      ? "bg-sol-400 text-noche-950"
                      : s.activo
                        ? "bg-azul-50 text-azul-700"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.contador > 999 ? "999+" : s.contador}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
