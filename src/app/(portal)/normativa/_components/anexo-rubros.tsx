"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import {
  Briefcase,
  Bus,
  CircleHelp,
  Drama,
  Hospital,
  House,
  School,
  Search,
  SearchX,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PERIODICIDAD } from "@/lib/domain/etiquetas";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export type RubroAnexo = {
  id: number;
  grupo: string;
  nombre: string;
  periodicidad: Enums<"periodicidad">;
  validado: boolean;
  descripcion: string | null;
};

const ICONOS: Record<string, LucideIcon> = {
  Comercio: Store,
  "Cultura y esparcimiento": Drama,
  Educación: School,
  Residencia: House,
  Sanidad: Hospital,
  Servicios: Briefcase,
  Transporte: Bus,
  "No tipificada": CircleHelp,
};

const ORDEN_GRUPOS = ["Comercio", "Cultura y esparcimiento", "Educación", "Residencia", "Sanidad", "Servicios", "Transporte", "No tipificada"];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Anexo de la Ord. 2681/98 agrupado, con buscador y periodicidad de cada rubro. */
export function AnexoRubros({ rubros }: { rubros: RubroAnexo[] }) {
  const id = useId();
  const [busqueda, setBusqueda] = useState("");
  const consulta = useDeferredValue(busqueda);

  const grupos = useMemo(() => {
    const q = normalizar(consulta.trim());
    const mapa = new Map<string, RubroAnexo[]>();
    for (const r of rubros) {
      if (q && !normalizar(`${r.grupo} ${r.nombre}`).includes(q)) continue;
      const lista = mapa.get(r.grupo) ?? [];
      lista.push(r);
      mapa.set(r.grupo, lista);
    }
    return [...mapa.entries()].sort(
      ([a], [b]) =>
        (ORDEN_GRUPOS.indexOf(a) === -1 ? 99 : ORDEN_GRUPOS.indexOf(a)) -
        (ORDEN_GRUPOS.indexOf(b) === -1 ? 99 : ORDEN_GRUPOS.indexOf(b)),
    );
  }, [rubros, consulta]);

  const total = grupos.reduce((acc, [, lista]) => acc + lista.length, 0);
  const hayProvisorios = rubros.some((r) => !r.validado);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-96">
          <label htmlFor={id} className="sr-only">
            Buscar un rubro
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id={id}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscá tu actividad (p. ej. panadería, escuela)"
            autoComplete="off"
            className="h-11 w-full rounded-control border border-input bg-card pr-10 pl-9 text-sm shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground hover:border-noche-500 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {busqueda ? (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label="Borrar búsqueda"
              className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {total === rubros.length ? `${rubros.length} actividades` : `${total} de ${rubros.length} actividades`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Periodicidades:</span>
        {Object.entries(PERIODICIDAD).map(([clave, p]) => (
          <Badge key={clave} tone={p.tono} size="sm" dot>
            {p.label}
          </Badge>
        ))}
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border-strong bg-card px-6 py-10 text-center">
          <SearchX className="size-6 text-azul-600" aria-hidden />
          <p className="font-medium text-foreground">No encontramos esa actividad en el Anexo</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Toda actividad no tipificada se declara ante la Dirección, que fija su periodicidad por similitud con las del Anexo.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {grupos.map(([grupo, lista]) => {
            const Icono = ICONOS[grupo] ?? CircleHelp;
            return (
              <section key={grupo} aria-label={grupo} className="overflow-hidden rounded-card border border-border bg-card shadow-card">
                <header className="flex items-center gap-3 border-b border-border bg-subtle/70 px-4 py-3">
                  <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-azul-50 text-azul-600 ring-1 ring-azul-100">
                    <Icono className="size-4" />
                  </span>
                  <h3 className="font-display text-[15px] font-semibold text-foreground">{grupo}</h3>
                  <span className="ml-auto text-xs text-muted-foreground">{lista.length}</span>
                </header>
                <ul className="divide-y divide-border">
                  {lista.map((r) => {
                    const p = PERIODICIDAD[r.periodicidad];
                    return (
                      <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="text-foreground">
                          {r.nombre}
                          {!r.validado ? (
                            <sup
                              className="ml-0.5 cursor-help text-muted-foreground"
                              title="Periodicidad provisoria: pendiente de validación contra el texto original del Anexo"
                            >
                              *<span className="sr-only"> (periodicidad provisoria, pendiente de validación)</span>
                            </sup>
                          ) : null}
                        </span>
                        <Badge tone={p.tono} size="sm" className={cn("shrink-0", !r.validado && "opacity-90")}>
                          {p.label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {hayProvisorios ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          * Periodicidad provisoria: el rubro está pendiente de validación contra el texto original del Anexo de la Ord. 2681/98.
          Ante dudas, consultá en la Dirección de Salud Ambiental.
        </p>
      ) : null}
    </div>
  );
}
