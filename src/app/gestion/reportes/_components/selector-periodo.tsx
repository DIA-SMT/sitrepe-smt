"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Periodo = { anio: number; mes: number };

export type SelectorPeriodoProps = {
  anio: number;
  mes: number;
  /** Años disponibles (del más reciente al más antiguo). */
  anios: number[];
  /** Nombres de los meses (enero…diciembre). */
  meses: string[];
  /** Último período seleccionable (el mes en curso). */
  maximo: Periodo;
  /** Parámetros que se descartan al cambiar el período (p. ej. la página). */
  descartar?: string[];
  className?: string;
};

const indice = (p: Periodo) => p.anio * 12 + p.mes - 1;
const desdeIndice = (i: number): Periodo => ({ anio: Math.floor(i / 12), mes: (i % 12) + 1 });

/** Selector de mes y año que escribe `?anio=&mes=` en la URL (conserva los demás filtros). */
export function SelectorPeriodo({ anio, mes, anios, meses, maximo, descartar = [], className }: SelectorPeriodoProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, startTransition] = useTransition();

  const minimo: Periodo = { anio: anios[anios.length - 1] ?? anio, mes: 1 };
  const actual = indice({ anio, mes });

  const ir = (p: Periodo) => {
    const i = Math.min(Math.max(indice(p), indice(minimo)), indice(maximo));
    const destino = desdeIndice(i);
    const nuevos = new URLSearchParams(params.toString());
    nuevos.set("anio", String(destino.anio));
    nuevos.set("mes", String(destino.mes));
    for (const d of descartar) nuevos.delete(d);
    startTransition(() => router.push(`${pathname}?${nuevos}`, { scroll: false }));
  };

  const hayAnterior = actual > indice(minimo);
  const haySiguiente = actual < indice(maximo);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-xs",
        pendiente && "opacity-75",
        className,
      )}
      aria-busy={pendiente}
      role="group"
      aria-label="Período del reporte"
    >
      <span
        aria-hidden
        className="hidden size-8 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100 sm:flex"
      >
        {pendiente ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => ir(desdeIndice(actual - 1))}
        disabled={!hayAnterior || pendiente}
        aria-label="Mes anterior"
      >
        <ChevronLeft aria-hidden />
      </Button>
      <Select
        size="sm"
        aria-label="Mes"
        value={String(mes)}
        onChange={(e) => ir({ anio, mes: Number(e.target.value) })}
        wrapperClassName="w-36"
        disabled={pendiente}
      >
        {meses.map((nombre, i) => {
          const fuera = indice({ anio, mes: i + 1 }) > indice(maximo);
          return (
            <option key={nombre} value={i + 1} disabled={fuera}>
              {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
            </option>
          );
        })}
      </Select>
      <Select
        size="sm"
        aria-label="Año"
        value={String(anio)}
        onChange={(e) => ir({ anio: Number(e.target.value), mes })}
        wrapperClassName="w-24"
        disabled={pendiente}
      >
        {anios.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => ir(desdeIndice(actual + 1))}
        disabled={!haySiguiente || pendiente}
        aria-label="Mes siguiente"
      >
        <ChevronRight aria-hidden />
      </Button>
      <span className="sr-only" aria-live="polite">
        {pendiente ? "Actualizando el reporte…" : ""}
      </span>
    </div>
  );
}
