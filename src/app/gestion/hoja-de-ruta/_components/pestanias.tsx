"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const PESTANIAS = [
  { href: "/gestion/hoja-de-ruta", label: "Establecimientos a controlar", corto: "A controlar", icono: ListChecks },
  { href: "/gestion/hoja-de-ruta/agenda", label: "Agenda para muestreo", corto: "Muestreo", icono: CalendarClock },
] as const;

/** Pestañas de la hoja de ruta (cada una es una ruta: los filtros quedan en la URL). */
export function PestaniasHojaRuta({ agendaPendiente }: { agendaPendiente: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Vistas de la hoja de ruta" className="flex w-full max-w-full overflow-x-auto">
      <ul className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
        {PESTANIAS.map((p) => {
          const activa = pathname === p.href;
          const Icono = p.icono;
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-all",
                  activa
                    ? "bg-card text-azul-700 shadow-[0_1px_3px_rgb(10_26_63/0.14)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icono className="size-4" aria-hidden />
                <span className="sm:hidden">{p.corto}</span>
                <span className="hidden sm:inline">{p.label}</span>
                {p.href.endsWith("agenda") && agendaPendiente > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-azul-600 px-1.5 text-[11px] font-semibold text-white">
                    {agendaPendiente}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
