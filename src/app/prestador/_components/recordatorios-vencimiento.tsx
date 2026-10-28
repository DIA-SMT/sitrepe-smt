import Link from "next/link";
import { AlarmClock, ArrowRight, CalendarCheck2, CalendarPlus, Droplets, MapPin, SprayCan } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { periodicidadTexto, type RecordatorioVencimiento } from "@/lib/data/certificados";
import { diasHasta, formatFecha } from "@/lib/domain/formato";
import { DIAS_ALERTA_VENCIMIENTO } from "@/lib/domain/vencimiento";
import { cn } from "@/lib/utils";

/**
 * Certificados de clientes que vencen pronto, para ofrecerles el próximo servicio
 * (beneficio para los prestadores previsto en el informe).
 */
export function RecordatoriosVencimiento({
  recordatorios,
  className,
}: {
  recordatorios: RecordatorioVencimiento[];
  className?: string;
}) {
  const pendientes = recordatorios.filter((r) => !r.programado).length;
  return (
    <SectionCard
      title="Recordatorios de vencimiento"
      description={`Certificados de tus clientes que vencen en los próximos ${DIAS_ALERTA_VENCIMIENTO} días`}
      icon={AlarmClock}
      flush
      className={className}
      footer={
        <Link
          href="/prestador/certificados?vigencia=por_vencer"
          className="inline-flex items-center gap-1.5 font-medium text-azul-700 hover:text-azul-800 hover:underline"
        >
          Ver todos los certificados por vencer <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      }
    >
      {recordatorios.length === 0 ? (
        <div className="p-5">
          <EmptyState
            compact
            icon={CalendarCheck2}
            title="Nada por vencer"
            description={`Ningún certificado de tus clientes vence en los próximos ${DIAS_ALERTA_VENCIMIENTO} días.`}
            className="border-none"
          />
        </div>
      ) : (
        <>
          {pendientes > 0 ? (
            <p className="border-b border-border bg-sol-50/60 px-5 py-2.5 text-[13px] text-amber-900 sm:px-6">
              <strong className="font-semibold">{pendientes}</strong>{" "}
              {pendientes === 1 ? "cliente necesita" : "clientes necesitan"} que programes el próximo servicio.
            </p>
          ) : null}
          <ul className="divide-y divide-border">
            {recordatorios.map((r) => {
              const dias = diasHasta(r.fecha_vencimiento);
              const TipoIcon = r.tipo === "tanque" ? Droplets : SprayCan;
              return (
                <li key={r.id} className={cn("flex items-start gap-3 px-5 py-3.5 sm:px-6", r.programado && "opacity-75")}>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
                      r.programado ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-sol-100 text-sol-800 ring-sol-300",
                    )}
                  >
                    <TipoIcon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={`/prestador/certificados/${r.id}`}
                      className="truncate text-sm font-semibold text-foreground hover:text-azul-700 hover:underline"
                    >
                      {r.cliente ?? "—"}
                    </Link>
                    <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{r.domicilio ?? "—"}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-noche-500">
                      <span>
                        Vence el <strong className="font-semibold text-foreground">{formatFecha(r.fecha_vencimiento)}</strong>
                      </span>
                      {dias !== null ? (
                        <Badge tone={dias <= 3 ? "rojo" : "ambar"} size="sm" dot>
                          {dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`}
                        </Badge>
                      ) : null}
                      <span className="text-noche-400">
                        {r.rubro_nombre ?? "—"} · {periodicidadTexto(r.tipo, r.rubro_periodicidad)}
                      </span>
                    </span>
                  </div>
                  <div className="shrink-0 self-center">
                    {r.programado ? (
                      <Badge tone="verde" size="sm" dot>
                        Ya programado
                      </Badge>
                    ) : (
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/prestador/declaraciones/nueva" aria-label={`Programar el próximo servicio de ${r.cliente ?? "este cliente"}`}>
                          <CalendarPlus aria-hidden />
                          <span className="hidden sm:inline">Programar</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
