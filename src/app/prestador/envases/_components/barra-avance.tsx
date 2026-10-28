import { cn } from "@/lib/utils";

/** Barra de avance compacta con nombre accesible propio y porcentaje visible. */
export function BarraAvance({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(valor)));
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className={cn("h-2 w-full min-w-20 overflow-hidden rounded-full", pct >= 100 ? "bg-emerald-100" : "bg-azul-100")}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            pct >= 100 ? "bg-emerald-500" : "bg-linear-to-r from-azul-600 to-celeste-400",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-muted-foreground nums-tabular">{pct}%</span>
    </div>
  );
}
