import Link from "next/link";
import { Ban, CircleCheck, CircleX, Hourglass, Inbox, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EstadoPago } from "@/lib/data/pagos";
import { cn } from "@/lib/utils";

type Valor = EstadoPago | "todos";

const PESTANIAS: { valor: Valor; label: string; icono: LucideIcon }[] = [
  { valor: "informado", label: "A verificar", icono: Inbox },
  { valor: "pendiente", label: "Sin pagar", icono: Hourglass },
  { valor: "verificado", label: "Verificados", icono: CircleCheck },
  { valor: "rechazado", label: "Rechazados", icono: CircleX },
  { valor: "anulado", label: "Anulados", icono: Ban },
  { valor: "todos", label: "Todos", icono: Layers },
];

/** Pestañas por estado de la bandeja de conciliación (conservan los demás filtros de la URL). */
export function PestaniasEstado({
  actual,
  predeterminada,
  conteos,
  params,
  ruta,
}: {
  actual: Valor;
  /** Pestaña que se muestra cuando la URL no trae `estado` (no se escribe en el enlace). */
  predeterminada: Valor;
  conteos: Record<EstadoPago, number>;
  params: Record<string, string | string[] | undefined>;
  ruta: string;
}) {
  const href = (valor: Valor) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "estado" || k === "pagina" || v === undefined) continue;
      sp.set(k, Array.isArray(v) ? v[0] : v);
    }
    if (valor !== predeterminada) sp.set("estado", valor);
    return `${ruta}${sp.size ? `?${sp}` : ""}`;
  };
  const total = Object.values(conteos).reduce((a, b) => a + b, 0);

  return (
    <nav aria-label="Estado de los pagos" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-card" role="list">
        {PESTANIAS.map((p) => {
          const activa = p.valor === actual;
          const n = p.valor === "todos" ? total : conteos[p.valor];
          const Icono = p.icono;
          const destacar = p.valor === "informado" && n > 0;
          return (
            <li key={p.valor}>
              <Link
                href={href(p.valor)}
                scroll={false}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                  activa
                    ? "bg-gradient-brand text-white shadow-brand"
                    : "text-noche-600 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icono className="size-4" aria-hidden />
                {p.label}
                <span
                  className={cn(
                    "min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold nums-tabular",
                    activa
                      ? "bg-white/20 text-white"
                      : destacar
                        ? "bg-sol-400 text-noche-950"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {n.toLocaleString("es-AR")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
