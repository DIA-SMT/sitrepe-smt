"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type OpcionTarjeta<V extends string> = {
  valor: V;
  titulo: string;
  descripcion?: string;
  icono?: LucideIcon;
  /** Acento del ícono. */
  tono?: "azul" | "celeste" | "violeta" | "ambar" | "rojo" | "neutral" | "verde";
};

const TONOS: Record<NonNullable<OpcionTarjeta<string>["tono"]>, string> = {
  azul: "bg-azul-50 text-azul-600 ring-azul-100",
  celeste: "bg-celeste-50 text-celeste-700 ring-celeste-200",
  violeta: "bg-violet-50 text-violet-700 ring-violet-200",
  ambar: "bg-sol-100 text-sol-800 ring-sol-300",
  rojo: "bg-red-50 text-red-600 ring-red-200",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  neutral: "bg-noche-50 text-noche-700 ring-noche-200",
};

type GrupoOpcionesProps<V extends string> = {
  name: string;
  legend: string;
  opciones: OpcionTarjeta<V>[];
  valor: V;
  onCambio: (valor: V) => void;
  columnas?: 1 | 2 | 3 | 4;
  error?: string | null;
  required?: boolean;
  className?: string;
};

const COLUMNAS = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
} as const;

/** Grupo de radios presentado como tarjetas seleccionables (accesible con teclado). */
export function GrupoOpciones<V extends string>({
  name,
  legend,
  opciones,
  valor,
  onCambio,
  columnas = 2,
  error,
  required,
  className,
}: GrupoOpcionesProps<V>) {
  const errorId = `${useId()}-error`;
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-2", className)} aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 inline-flex items-center gap-1 text-sm leading-none font-medium text-foreground">
        {legend}
        {required ? (
          <span className="text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </legend>
      <div className={cn("grid gap-2.5", COLUMNAS[columnas])}>
        {opciones.map((o) => {
          const Icono = o.icono;
          const elegido = o.valor === valor;
          return (
            <label
              key={o.valor}
              className={cn(
                "group relative flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3.5 transition-[border-color,background-color,box-shadow,transform] duration-150",
                "hover:-translate-y-px hover:border-azul-300 hover:shadow-card",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                elegido ? "border-azul-500 bg-azul-50/60 shadow-card ring-1 ring-azul-500" : "border-border",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.valor}
                checked={elegido}
                onChange={() => onCambio(o.valor)}
                className="sr-only"
              />
              {Icono ? (
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors",
                    elegido ? "bg-gradient-brand text-white ring-transparent" : TONOS[o.tono ?? "azul"],
                  )}
                >
                  <Icono className="size-[18px]" strokeWidth={1.9} />
                </span>
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-5">
                <span className="text-sm leading-snug font-semibold text-foreground">{o.titulo}</span>
                {o.descripcion ? (
                  <span className="text-[13px] leading-snug text-muted-foreground">{o.descripcion}</span>
                ) : null}
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute top-3 right-3 flex size-5 items-center justify-center rounded-full border transition-all",
                  elegido ? "scale-100 border-primary bg-primary text-white" : "scale-90 border-border-strong bg-card text-transparent",
                )}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] leading-snug font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
