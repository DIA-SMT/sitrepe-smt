import Link from "next/link";
import { AlarmClock, CalendarX2, Hourglass, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ConteoVigencias } from "@/lib/data/certificados";
import { cn } from "@/lib/utils";

type Atajo = {
  valor: keyof ConteoVigencias;
  label: string;
  descripcion: string;
  icon: LucideIcon;
  icono: string;
  activo: string;
};

const ATAJOS: Atajo[] = [
  {
    valor: "vigente",
    label: "Vigentes",
    descripcion: "Timbrados y al día",
    icon: ShieldCheck,
    icono: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    activo: "border-emerald-300 ring-2 ring-emerald-200",
  },
  {
    valor: "por_vencer",
    label: "Por vencer",
    descripcion: "En los próximos 15 días",
    icon: AlarmClock,
    icono: "bg-sol-100 text-sol-800 ring-sol-300",
    activo: "border-sol-400 ring-2 ring-sol-200",
  },
  {
    valor: "vencido",
    label: "Vencidos",
    descripcion: "Requieren nuevo servicio",
    icon: CalendarX2,
    icono: "bg-red-50 text-red-600 ring-red-200",
    activo: "border-red-300 ring-2 ring-red-200",
  },
  {
    valor: "sin_timbrar",
    label: "Sin timbrar",
    descripcion: "En carga, control o pago",
    icon: Hourglass,
    icono: "bg-noche-50 text-noche-700 ring-noche-200",
    activo: "border-noche-300 ring-2 ring-noche-200",
  },
];

/** Atajos por vigencia (con totales) que aplican o quitan el filtro `vigencia`. */
export function AtajosVigencia({
  conteo,
  params,
  actual,
}: {
  conteo: ConteoVigencias;
  params: Record<string, string | string[] | undefined>;
  actual: string | undefined;
}) {
  const href = (valor: string) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "pagina" || k === "vigencia" || v === undefined) continue;
      sp.set(k, Array.isArray(v) ? v[0] : v);
    }
    if (actual !== valor) sp.set("vigencia", valor);
    return `/prestador/certificados${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <nav aria-label="Filtrar por vigencia" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ATAJOS.map((a) => {
        const Icon = a.icon;
        const activo = actual === a.valor;
        return (
          <Link
            key={a.valor}
            href={href(a.valor)}
            scroll={false}
            aria-current={activo ? "true" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-card border border-border bg-card p-3.5 shadow-card sm:p-4",
              "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-azul-200 hover:shadow-elevated",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              activo && a.activo,
            )}
          >
            <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1", a.icono)}>
              <Icon className="size-5" strokeWidth={1.9} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="flex items-baseline gap-2">
                <span className="nums-tabular font-display text-xl leading-none font-semibold text-foreground">
                  {conteo[a.valor].toLocaleString("es-AR")}
                </span>
                <span className="truncate text-sm font-medium text-foreground">{a.label}</span>
              </span>
              <span className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">
                {activo ? "Filtro aplicado · tocá para quitarlo" : a.descripcion}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
