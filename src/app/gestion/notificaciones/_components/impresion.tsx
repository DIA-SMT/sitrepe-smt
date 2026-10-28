import Link from "next/link";
import { cn } from "@/lib/utils";

export type Ejemplar = "original" | "duplicado";
export type SeleccionEjemplar = Ejemplar | "ambos";

export const EJEMPLARES: readonly SeleccionEjemplar[] = ["ambos", "original", "duplicado"];

/** Ejemplares a imprimir según la selección. */
export function ejemplaresDe(seleccion: SeleccionEjemplar): Ejemplar[] {
  return seleccion === "ambos" ? ["original", "duplicado"] : [seleccion];
}

/** Selector de ejemplar (no se imprime): Ambos · Original · Duplicado. */
export function SelectorEjemplar({ ruta, actual }: { ruta: string; actual: SeleccionEjemplar }) {
  const opciones: { valor: SeleccionEjemplar; label: string }[] = [
    { valor: "ambos", label: "Ambos" },
    { valor: "original", label: "Original" },
    { valor: "duplicado", label: "Duplicado" },
  ];
  return (
    <nav aria-label="Ejemplar a imprimir" className="inline-flex gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-border">
      {opciones.map((o) => (
        <Link
          key={o.valor}
          href={o.valor === "ambos" ? ruta : `${ruta}?ejemplar=${o.valor}`}
          aria-current={actual === o.valor ? "page" : undefined}
          scroll={false}
          className={cn(
            "inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-medium transition-colors",
            actual === o.valor ? "bg-azul-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

/** Recuadro con el ejemplar (ORIGINAL / DUPLICADO) para el encabezado de la hoja. */
export function SelloEjemplar({ ejemplar, detalle }: { ejemplar: Ejemplar; detalle?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <span
        className={cn(
          "rounded-md border-2 px-3 py-1 font-display text-sm font-bold tracking-[0.18em]",
          ejemplar === "original" ? "border-azul-600 text-azul-700" : "border-noche-500 text-noche-700",
        )}
      >
        {ejemplar === "original" ? "ORIGINAL" : "DUPLICADO"}
      </span>
      {detalle ? <span className="text-[10.5px] leading-snug text-noche-500">{detalle}</span> : null}
    </div>
  );
}

/** Marca de agua diagonal (p. ej. "ANULADA"). */
export function MarcaDeAgua({ texto }: { texto: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <span className="-rotate-30 rounded-xl border-8 border-red-500/25 px-10 py-2 font-display text-[88px] font-black tracking-[0.2em] text-red-500/20">
        {texto}
      </span>
    </div>
  );
}

/** Renglón para completar a mano, con valor si ya se conoce. */
export function Renglon({ valor, className }: { valor?: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-block min-w-32 flex-1 border-b border-dotted border-noche-400 px-1 font-medium text-noche-950", className)}>
      {valor ?? " "}
    </span>
  );
}
