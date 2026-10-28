import Link from "next/link";
import { ArrowRight, CircleCheck, CircleDashed, CircleX } from "lucide-react";
import type { EstadoRequisito, Requisito } from "@/lib/data/empresas";
import { cn } from "@/lib/utils";

const ESTILO: Record<EstadoRequisito, { icono: typeof CircleCheck; clase: string; texto: string }> = {
  cumplido: { icono: CircleCheck, clase: "text-emerald-600", texto: "Cumplido" },
  pendiente: { icono: CircleDashed, clase: "text-amber-600", texto: "En revisión" },
  falta: { icono: CircleX, clase: "text-red-600", texto: "Falta" },
};

export function IconoRequisito({ estado, className }: { estado: EstadoRequisito; className?: string }) {
  const e = ESTILO[estado];
  const Icono = e.icono;
  return (
    <span className={cn("inline-flex shrink-0", e.clase, className)}>
      <Icono className="size-5" strokeWidth={2} aria-hidden />
      <span className="sr-only">{e.texto}:</span>
    </span>
  );
}

/** Barra de avance + lista de requisitos (checklist de habilitación / renovación / legajo). */
export function Checklist({ requisitos, className }: { requisitos: Requisito[]; className?: string }) {
  const cumplidos = requisitos.filter((r) => r.estado === "cumplido").length;
  const pct = requisitos.length > 0 ? Math.round((cumplidos / requisitos.length) * 100) : 100;
  const completo = cumplidos === requisitos.length;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="font-medium text-foreground">
            {cumplidos} de {requisitos.length} requisitos cumplidos
          </span>
          <span className={cn("font-semibold nums-tabular", completo ? "text-success" : "text-muted-foreground")}>{pct} %</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={requisitos.length}
          aria-valuenow={cumplidos}
          aria-label="Requisitos cumplidos"
          className={cn("h-2 w-full overflow-hidden rounded-full", completo ? "bg-emerald-100" : "bg-azul-100")}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              completo ? "bg-emerald-500" : "bg-linear-to-r from-azul-600 to-celeste-400",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {requisitos.map((r) => (
          <li key={r.clave} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <IconoRequisito estado={r.estado} className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-semibold text-foreground">{r.titulo}</p>
                {r.enlace ? (
                  <Link
                    href={r.enlace.href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-azul-700 transition-colors hover:text-azul-800"
                  >
                    {r.enlace.label}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                ) : null}
              </div>
              <p className="text-[13px] text-muted-foreground">{r.detalle}</p>
              {r.items && r.items.length > 0 ? (
                <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  {r.items.map((item) => (
                    <li key={item.label} className="flex items-start gap-2 rounded-lg bg-subtle px-2.5 py-2 text-[13px]">
                      <IconoRequisito estado={item.estado} className="[&_svg]:size-4" />
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.detalle}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
