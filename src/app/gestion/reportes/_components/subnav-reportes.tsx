"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartPie, FileSpreadsheet, LayoutGrid, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const PESTANAS: { href: string; etiqueta: string; icono: LucideIcon; exacta?: boolean }[] = [
  { href: "/gestion/reportes", etiqueta: "Resumen", icono: LayoutGrid, exacta: true },
  { href: "/gestion/reportes/recaudacion", etiqueta: "Recaudación", icono: Landmark },
  { href: "/gestion/reportes/planilla-mensual", etiqueta: "Planilla mensual", icono: FileSpreadsheet },
  { href: "/gestion/reportes/estadisticas", etiqueta: "Estadísticas", icono: ChartPie },
];

/** Pestañas (enlaces) de la sección de reportes: la URL guarda la vista. */
export function SubnavReportes() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de reportes" className="no-print -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max items-center gap-1 shadow-[inset_0_-1px_0_var(--color-border)] sm:gap-4">
        {PESTANAS.map((p) => {
          const activa = p.exacta ? pathname === p.href : pathname === p.href || pathname.startsWith(`${p.href}/`);
          const Icono = p.icono;
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "group relative inline-flex h-11 items-center gap-2 px-2 text-sm font-medium whitespace-nowrap transition-colors",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  activa ? "text-azul-700" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg transition-colors",
                    activa ? "bg-azul-50 text-azul-600 ring-1 ring-azul-100" : "group-hover:bg-muted",
                  )}
                >
                  <Icono className="size-4" strokeWidth={1.9} />
                </span>
                {p.etiqueta}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-1 -bottom-px h-0.5 rounded-full transition-all duration-200",
                    activa ? "bg-linear-to-r from-azul-600 to-celeste-400 opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
