import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardPlus, Droplets, FileWarning, MapPin, SprayCan } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import type { ServicioProximo } from "@/lib/data/certificados";
import { ESTADO_CERTIFICADO } from "@/lib/domain/etiquetas";
import { diasHasta, formatHora, hoyISO } from "@/lib/domain/formato";
import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";

const fmtDiaSemana = new Intl.DateTimeFormat("es-AR", { timeZone: APP.zonaHoraria, weekday: "short", day: "numeric" });

/** "Hoy", "Mañana" o "jue 29" según la fecha local del servicio. */
function etiquetaDia(fechaServicio: string): string {
  const dias = diasHasta(hoyISO(new Date(fechaServicio)));
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return fmtDiaSemana.format(new Date(fechaServicio)).replace(".", "");
}

/** Agenda de servicios de las próximas 48 horas. */
export function ServiciosProximos({ servicios, className }: { servicios: ServicioProximo[]; className?: string }) {
  return (
    <SectionCard
      title="Próximas 48 horas"
      description={
        servicios.length === 0
          ? "Servicios programados"
          : `${servicios.length} ${servicios.length === 1 ? "servicio programado" : "servicios programados"}`
      }
      icon={CalendarClock}
      flush
      className={className}
      footer={
        <Link
          href={`/prestador/certificados?desde=${hoyISO()}`}
          className="inline-flex items-center gap-1.5 font-medium text-azul-700 hover:text-azul-800 hover:underline"
        >
          Ver todos los servicios desde hoy <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      }
    >
      {servicios.length === 0 ? (
        <div className="p-5">
          <EmptyState
            compact
            icon={CalendarClock}
            title="Sin servicios en las próximas 48 horas"
            description="Declará tus próximos servicios entre 24 y 48 horas antes de realizarlos."
            className="border-none"
            action={
              <Button asChild size="sm">
                <Link href="/prestador/declaraciones/nueva">
                  <ClipboardPlus aria-hidden /> Nueva declaración
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {servicios.map((s) => {
            const TipoIcon = s.tipo === "tanque" ? Droplets : SprayCan;
            const sinPresentar = s.estado === "borrador" || s.estado === "observado";
            return (
              <li key={s.id}>
                <Link
                  href={`/prestador/certificados/${s.id}`}
                  className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-azul-50/50 focus-visible:bg-azul-50/60 focus-visible:outline-none sm:px-6"
                >
                  <span
                    className={cn(
                      "flex w-16 shrink-0 flex-col items-center rounded-xl py-2 text-center ring-1",
                      sinPresentar ? "bg-sol-50 ring-sol-300" : "bg-azul-50 ring-azul-100",
                    )}
                  >
                    <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {s.fecha_servicio ? etiquetaDia(s.fecha_servicio) : "—"}
                    </span>
                    <span className="nums-tabular font-display text-lg leading-tight font-bold text-foreground">
                      {formatHora(s.fecha_servicio)}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <TipoIcon className="size-3.5 shrink-0 text-azul-600" aria-hidden />
                      <span className="truncate">{s.cliente ?? "—"}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{s.domicilio ?? "—"}</span>
                    </span>
                    <span className="truncate text-xs text-noche-400">
                      N.º {s.numero} · {s.rubro_nombre ?? "Sin rubro"}
                      {s.tecnico_nombre ? ` · ${s.tecnico_nombre}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={s.estado} size="sm" />
                    {sinPresentar ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                        <FileWarning className="size-3" aria-hidden />
                        {s.firma_hash ? "Sin presentar" : "Sin firma"}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
