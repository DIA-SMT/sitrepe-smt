"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Building2, LoaderCircle, MapPin, RefreshCw, Search, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EntidadOpcion } from "@/lib/data/intimaciones";
import { cn } from "@/lib/utils";
import { buscarEntidades } from "../actions";

export type TipoEntidad = "establecimiento" | "empresa";

type BuscadorEntidadProps = {
  tipo: TipoEntidad;
  /** Nombre del input oculto que lleva el id elegido. */
  name: string;
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  valor: EntidadOpcion | null;
  onCambio: (opcion: EntidadOpcion | null) => void;
  required?: boolean;
  className?: string;
};

const TEXTOS: Record<TipoEntidad, { placeholder: string; vacio: string; icono: typeof Store }> = {
  establecimiento: {
    placeholder: "Buscá por nombre, domicilio o CUIT…",
    vacio: "No encontramos establecimientos con ese texto en el padrón.",
    icono: Store,
  },
  empresa: {
    placeholder: "Buscá por nombre comercial, titular o CUIT…",
    vacio: "No encontramos empresas con ese texto en el registro.",
    icono: Building2,
  },
};

/**
 * Combobox accesible para elegir un establecimiento del padrón o una empresa
 * del registro. Busca en el servidor (con demora) y deja el id en un input oculto.
 */
export function BuscadorEntidad({
  tipo,
  name,
  label,
  hint,
  error,
  valor,
  onCambio,
  required,
  className,
}: BuscadorEntidadProps) {
  const id = useId();
  const listaId = `${id}-lista`;
  const ayudaId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<EntidadOpcion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [activo, setActivo] = useState(-1);
  const consultaActual = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = TEXTOS[tipo];
  const Icono = t.icono;

  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) return;
    const numero = ++consultaActual.current;
    const temporizador = setTimeout(async () => {
      setBuscando(true);
      let r: Awaited<ReturnType<typeof buscarEntidades>>;
      try {
        r = await buscarEntidades(tipo, consulta);
      } catch {
        // Sin conexión o sesión vencida: se informa en la lista en lugar de dejar el buscador colgado.
        r = { ok: false, mensaje: "No se pudo completar la búsqueda. Revisá la conexión e intentá de nuevo." };
      }
      if (numero !== consultaActual.current) return;
      setBuscando(false);
      if (r.ok) {
        setResultados(r.datos ?? []);
        setFallo(null);
      } else {
        setResultados([]);
        setFallo(r.mensaje ?? "No se pudo completar la búsqueda.");
      }
      setActivo(-1);
    }, 300);
    return () => clearTimeout(temporizador);
  }, [texto, tipo]);

  const elegir = (opcion: EntidadOpcion) => {
    onCambio(opcion);
    setTexto("");
    setResultados([]);
    setAbierto(false);
  };

  const cambiarTexto = (nuevo: string) => {
    setTexto(nuevo);
    setAbierto(true);
    if (nuevo.trim().length < 2) {
      consultaActual.current++;
      setResultados([]);
      setBuscando(false);
      setFallo(null);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setActivo((i) => Math.min(resultados.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (abierto && activo >= 0 && resultados[activo]) {
        e.preventDefault();
        elegir(resultados[activo]);
      } else if (abierto) {
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  };

  const describedBy = [hint ? ayudaId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const mostrarLista = abierto && texto.trim().length >= 2;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={valor ? undefined : `${id}-input`} id={`${id}-label`} required={required}>
        {label}
      </Label>
      <input type="hidden" name={name} value={valor?.id ?? ""} />

      {valor ? (
        <div
          role="group"
          aria-labelledby={`${id}-label`}
          aria-describedby={describedBy}
          className={cn(
            "group relative flex items-start gap-3 overflow-hidden rounded-xl border border-azul-200 bg-gradient-brand-soft p-3.5 ring-1 ring-azul-100 animate-fade-in",
            error && "border-danger ring-danger/20",
          )}
        >
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
          >
            <Icono className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] leading-snug font-semibold text-foreground">{valor.nombre}</p>
            {valor.secundario ? <p className="text-[13px] text-muted-foreground">{valor.secundario}</p> : null}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-noche-600">
              {valor.domicilio ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {valor.domicilio}
                </span>
              ) : null}
              {valor.cuit ? <span className="nums-tabular">CUIT {valor.cuit}</span> : null}
              {valor.rubro ? <span>{valor.rubro}</span> : null}
            </p>
            {valor.detalle ? <p className="mt-0.5 text-xs text-muted-foreground">{valor.detalle}</p> : null}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Cambiar ${tipo}`}
              onClick={() => {
                onCambio(null);
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
            >
              <RefreshCw aria-hidden />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Quitar ${tipo}`} onClick={() => onCambio(null)}>
              <X aria-hidden />
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Input
            ref={inputRef}
            id={`${id}-input`}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={mostrarLista}
            aria-controls={listaId}
            aria-activedescendant={activo >= 0 ? `${id}-op-${activo}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            placeholder={t.placeholder}
            value={texto}
            onChange={(e) => cambiarTexto(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setAbierto(true)}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            leading={<Search aria-hidden />}
            trailing={buscando ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          />
          {mostrarLista ? (
            <ul
              id={listaId}
              role="listbox"
              aria-label={label}
              className="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-elevated animate-pop-in"
            >
              {resultados.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-muted-foreground" role="presentation">
                  {buscando ? "Buscando…" : (fallo ?? t.vacio)}
                </li>
              ) : (
                resultados.map((r, i) => (
                  <li
                    key={r.id}
                    id={`${id}-op-${i}`}
                    role="option"
                    aria-selected={i === activo}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => elegir(r)}
                    onMouseEnter={() => setActivo(i)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 transition-colors",
                      i === activo ? "bg-azul-50" : "hover:bg-muted",
                    )}
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-azul-50 text-azul-600 ring-1 ring-azul-100"
                    >
                      <Icono className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{r.nombre}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[r.domicilio, r.cuit ? `CUIT ${r.cuit}` : null, r.rubro].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      )}

      {hint && !error ? (
        <p id={ayudaId} className="text-[13px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] leading-snug font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
