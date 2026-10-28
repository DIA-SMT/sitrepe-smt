"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, MapPin, Plus, Search, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OpcionEstablecimiento } from "@/lib/data/fiscalizacion";
import { cn } from "@/lib/utils";
import { buscarEstablecimientos } from "../actions";

type SelectorEstablecimientoProps = {
  /** Nombre del input oculto con el id elegido. */
  name?: string;
  inicial?: OpcionEstablecimiento | null;
  /** Id del label externo (para `aria-labelledby`). */
  labelId?: string;
  invalido?: boolean;
  /** Muestra el enlace para cargar un establecimiento nuevo. */
  permitirAlta?: boolean;
};

/**
 * Buscador de establecimientos del padrón (nombre, domicilio o CUIT).
 * Deja el id elegido en un input oculto.
 */
export function SelectorEstablecimiento({
  name = "establecimiento_id",
  inicial = null,
  labelId,
  invalido = false,
  permitirAlta = true,
}: SelectorEstablecimientoProps) {
  const id = useId();
  const [elegido, setElegido] = useState<OpcionEstablecimiento | null>(inicial);
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<OpcionEstablecimiento[]>([]);
  const [buscado, setBuscado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);
  /** Última búsqueda enviada: descarta respuestas viejas que lleguen tarde. */
  const ultima = useRef("");

  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) return;
    const t = setTimeout(() => {
      ultima.current = consulta;
      startTransition(async () => {
        try {
          const r = await buscarEstablecimientos(consulta);
          if (ultima.current !== consulta) return;
          setResultados(r);
          setError(null);
        } catch {
          setResultados([]);
          setError("No pudimos buscar. Revisá tu conexión e intentá de nuevo.");
        }
        setBuscado(true);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [texto]);

  if (elegido) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-azul-50/50 p-3",
          invalido ? "border-danger" : "border-azul-200",
        )}
      >
        <input type="hidden" name={name} value={elegido.id} />
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-azul-600 ring-1 ring-azul-100">
          <Store className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{elegido.nombre}</p>
          <p className="truncate text-xs text-muted-foreground">
            {elegido.domicilio}
            {elegido.barrio ? ` · ${elegido.barrio}` : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setElegido(null);
            setTexto("");
            setResultados([]);
            setBuscado(false);
            requestAnimationFrame(() => entrada.current?.focus());
          }}
        >
          <X aria-hidden /> Cambiar
        </Button>
      </div>
    );
  }

  const listaId = `${id}-resultados`;
  const consultaValida = texto.trim().length >= 2;
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value="" />
      <Input
        ref={entrada}
        type="search"
        role="combobox"
        aria-expanded={consultaValida && buscado}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-labelledby={labelId}
        aria-invalid={invalido || undefined}
        placeholder="Buscá por nombre, domicilio o CUIT…"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          if (e.target.value.trim().length < 2) {
            setResultados([]);
            setBuscado(false);
          }
        }}
        leading={<Search aria-hidden />}
        trailing={pendiente ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
      />
      {consultaValida && buscado ? (
        <ul
          id={listaId}
          role="listbox"
          aria-label="Establecimientos encontrados"
          className="flex max-h-72 flex-col overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-card"
        >
          {resultados.map((r) => (
            <li key={r.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => setElegido(r)}
                className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-azul-50 focus-visible:bg-azul-50 focus-visible:outline-none"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{r.nombre}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.domicilio}
                    {r.barrio ? ` · ${r.barrio}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {resultados.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground" role="option" aria-selected={false} aria-disabled>
              {error ?? "No encontramos establecimientos con ese dato."}
            </li>
          ) : null}
        </ul>
      ) : null}
      {permitirAlta ? (
        <p className="text-[13px] text-muted-foreground">
          ¿No está en el padrón?{" "}
          <Link
            href="/gestion/establecimientos/nuevo"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-azul-700 hover:underline">
            <Plus className="size-3.5" aria-hidden /> Cargá el establecimiento (se abre en otra pestaña)
          </Link>
        </p>
      ) : null}
    </div>
  );
}
