import Link from "next/link";
import { BellRing, ChevronRight, CircleAlert, CircleCheckBig, Info, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import type { AlertaPrestador } from "@/lib/data/certificados";
import { formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

const ESTILO_NIVEL: Record<AlertaPrestador["nivel"], { icon: LucideIcon; chip: string; etiqueta: string }> = {
  urgente: { icon: CircleAlert, chip: "bg-red-50 text-red-600 ring-red-200", etiqueta: "Urgente" },
  alerta: { icon: TriangleAlert, chip: "bg-amber-50 text-amber-700 ring-amber-200", etiqueta: "Atención" },
  info: { icon: Info, chip: "bg-azul-50 text-azul-600 ring-azul-100", etiqueta: "Información" },
};

/** Alertas propias (vencimientos, observaciones y pendientes) en el inicio del prestador. */
export function ListaAlertas({ alertas, className }: { alertas: AlertaPrestador[]; className?: string }) {
  const urgentes = alertas.filter((a) => a.nivel === "urgente").length;
  return (
    <SectionCard
      id="alertas"
      title="Alertas"
      description={
        alertas.length === 0
          ? "Lo que requiere tu atención"
          : `${alertas.length} ${alertas.length === 1 ? "pendiente" : "pendientes"}${urgentes ? ` · ${urgentes} ${urgentes === 1 ? "urgente" : "urgentes"}` : ""}`
      }
      icon={BellRing}
      flush
      className={cn("scroll-mt-24", className)}
    >
      {alertas.length === 0 ? (
        <div className="p-5">
          <EmptyState
            compact
            icon={CircleCheckBig}
            title="Todo en orden"
            description="No tenés vencimientos ni observaciones pendientes."
            className="border-none"
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {alertas.map((a, i) => {
            const estilo = ESTILO_NIVEL[a.nivel];
            const Icon = estilo.icon;
            const contenido = (
              <>
                <span
                  aria-hidden
                  className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1", estilo.chip)}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm leading-snug font-semibold text-foreground">
                    <span className="sr-only">{estilo.etiqueta}: </span>
                    {a.titulo}
                  </span>
                  {a.detalle ? <span className="line-clamp-2 text-[13px] text-muted-foreground">{a.detalle}</span> : null}
                  {a.fecha ? <span className="text-xs text-noche-400">{formatRelativo(a.fecha)}</span> : null}
                </span>
                {a.href ? (
                  <ChevronRight
                    aria-hidden
                    className="mt-1.5 size-4 shrink-0 text-noche-300 transition-transform group-hover:translate-x-0.5 group-hover:text-azul-600"
                  />
                ) : null}
              </>
            );
            return (
              <li key={`${a.tipo}-${i}`}>
                {a.href ? (
                  <Link
                    href={a.href}
                    className="group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/50 focus-visible:bg-azul-50/60 focus-visible:outline-none sm:px-6"
                  >
                    {contenido}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-5 py-3.5 sm:px-6">{contenido}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
