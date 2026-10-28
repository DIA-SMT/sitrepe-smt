import { formatPesos } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

export type ParteCuenta = { codigo: string; nombre: string; total: number };

const COLORES: Record<string, { barra: string; punto: string }> = {
  "505": { barra: "bg-linear-to-r from-azul-600 to-celeste-400", punto: "bg-azul-600" },
  "091": { barra: "bg-sol-400", punto: "bg-sol-400" },
};
const OTRO = { barra: "bg-violet-400", punto: "bg-violet-400" };

/** Barra de composición del total por cuenta recaudadora (505 / 091) con leyenda accesible. */
export function ComposicionCuentas({
  partes,
  tono = "claro",
  className,
}: {
  partes: ParteCuenta[];
  tono?: "claro" | "oscuro";
  className?: string;
}) {
  const total = partes.reduce((acc, p) => acc + p.total, 0);
  const oscuro = tono === "oscuro";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        aria-hidden
        className={cn("flex h-2.5 w-full overflow-hidden rounded-full", oscuro ? "bg-white/10" : "bg-muted")}
      >
        {total > 0
          ? partes.map((p) => (
              <div
                key={p.codigo}
                className={cn("h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full", (COLORES[p.codigo] ?? OTRO).barra)}
                style={{ width: `${(p.total / total) * 100}%` }}
              />
            ))
          : null}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {partes.map((p) => {
          const pct = total > 0 ? Math.round((p.total / total) * 1000) / 10 : 0;
          return (
            <li key={p.codigo} className="flex min-w-0 items-start gap-2.5">
              <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-[3px]", (COLORES[p.codigo] ?? OTRO).punto)} />
              <span className="flex min-w-0 flex-col">
                <span className={cn("text-sm font-semibold", oscuro ? "text-white" : "text-foreground")}>
                  Cuenta {p.codigo}{" "}
                  <span className={cn("font-normal nums-tabular", oscuro ? "text-noche-200" : "text-muted-foreground")}>
                    · {pct.toLocaleString("es-AR")} %
                  </span>
                </span>
                <span className={cn("truncate text-xs", oscuro ? "text-noche-200" : "text-muted-foreground")}>{p.nombre}</span>
                <span className={cn("text-[15px] font-semibold nums-tabular", oscuro ? "text-white" : "text-foreground")}>
                  {formatPesos(p.total)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
