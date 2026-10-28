import Link from "next/link";
import { ArrowRight, Building2, Globe, Megaphone } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { SectionCard } from "@/components/shared/section-card";
import type { AvisoReciente } from "@/lib/data/certificados";
import { NIVEL_AVISO } from "@/lib/domain/etiquetas";
import { formatFecha, formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

const BORDE_NIVEL: Record<AvisoReciente["nivel"], string> = {
  info: "before:bg-azul-500",
  alerta: "before:bg-amber-400",
  urgente: "before:bg-red-500",
};

/** Últimos avisos de la Dirección de Salud Ambiental. */
export function AvisosRecientes({ avisos, className }: { avisos: AvisoReciente[]; className?: string }) {
  const sinLeer = avisos.filter((a) => !a.leido).length;
  return (
    <SectionCard
      title="Avisos de la Dirección"
      description={sinLeer > 0 ? `${sinLeer} ${sinLeer === 1 ? "aviso sin leer" : "avisos sin leer"}` : "Comunicaciones recientes"}
      icon={Megaphone}
      className={className}
      actions={
        <Link
          href="/prestador/avisos"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-azul-700 transition-colors hover:bg-azul-50 hover:text-azul-800"
        >
          Ver todos <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      }
    >
      {avisos.length === 0 ? (
        <EmptyState
          compact
          icon={Megaphone}
          title="Sin avisos por ahora"
          description="Acá vas a ver las comunicaciones, novedades normativas y recordatorios de la Dirección."
          className="border-none"
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {avisos.map((a) => (
            <li key={a.id} className="flex">
              <Link
                href="/prestador/avisos"
                className={cn(
                  "group relative flex w-full flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card p-4 pl-5",
                  "before:absolute before:inset-y-0 before:left-0 before:w-1",
                  BORDE_NIVEL[a.nivel],
                  "transition-[box-shadow,border-color] hover:border-azul-200 hover:shadow-elevated",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <EstadoBadge mapa={NIVEL_AVISO} valor={a.nivel} size="sm" />
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    {a.general ? <Globe className="size-3" aria-hidden /> : <Building2 className="size-3" aria-hidden />}
                    {a.general ? "Para todas las empresas" : "Para tu empresa"}
                  </span>
                  {!a.leido ? (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-azul-700">
                      <span className="size-2 rounded-full bg-azul-600" aria-hidden />
                      Nuevo
                    </span>
                  ) : null}
                </span>
                <span className="text-sm leading-snug font-semibold text-foreground group-hover:text-azul-800">{a.titulo}</span>
                <span className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">{a.cuerpo}</span>
                <time dateTime={a.created_at} title={formatFecha(a.created_at)} className="mt-auto text-xs text-noche-400">
                  {formatRelativo(a.created_at)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
