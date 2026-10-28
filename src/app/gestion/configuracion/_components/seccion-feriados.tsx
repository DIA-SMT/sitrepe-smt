import { CalendarDays, CalendarOff, CalendarPlus, Info, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Feriado } from "@/lib/data/admin";
import { formatFechaLarga } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { AccionConfirmada } from "../_compartido/acciones-cliente";
import { SegmentosEnlace } from "../_compartido/segmentos";
import { eliminarFeriado } from "../actions";
import { FormFeriado } from "./form-feriado";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const diaSemana = new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: "UTC" });

function fechaUTC(fecha: string): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12));
}

type Props = {
  feriados: Feriado[];
  anio: number;
  anios: number[];
  hoy: string;
  editable: boolean;
};

export function SeccionFeriados({ feriados, anio, anios, hoy, editable }: Props) {
  const anioActual = Number(hoy.slice(0, 4));
  const opciones = [...new Set([...anios, anioActual, anioActual + 1, anio])].sort((a, b) => a - b);
  const proximo = feriados.find((f) => f.fecha >= hoy);
  const porMes = MESES.map((nombre, i) => ({
    nombre,
    feriados: feriados.filter((f) => Number(f.fecha.slice(5, 7)) === i + 1),
  })).filter((m) => m.feriados.length > 0);
  const enDiaHabil = feriados.filter((f) => {
    const d = fechaUTC(f.fecha).getUTCDay();
    return d !== 0 && d !== 6;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <SegmentosEnlace
        etiqueta="Año"
        items={opciones.map((a) => ({
          href: `/gestion/configuracion?pestana=feriados&anio=${a}`,
          etiqueta: String(a),
          activo: a === anio,
        }))}
      />

      <div className={cn("grid items-start gap-6", editable && "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]")}>
        <SectionCard
          title={`Feriados ${anio}`}
          description={
            feriados.length
              ? `${feriados.length} cargados · ${enDiaHabil} caen en día hábil`
              : "Sin feriados cargados para este año"
          }
          icon={CalendarDays}
          flush
        >
          {feriados.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={CalendarOff}
                title={`No hay feriados cargados para ${anio}`}
                description="Cargalos según el calendario oficial: los plazos en días hábiles de las notificaciones los descuentan."
              />
            </div>
          ) : (
            <div className="flex flex-col">
              {porMes.map((mes) => (
                <section key={mes.nombre} aria-label={mes.nombre} className="border-b border-border last:border-0">
                  <h3 className="bg-subtle px-5 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:px-6">
                    {mes.nombre}
                  </h3>
                  <ul className="divide-y divide-border">
                    {mes.feriados.map((f) => {
                      const fecha = fechaUTC(f.fecha);
                      const finDeSemana = fecha.getUTCDay() === 0 || fecha.getUTCDay() === 6;
                      const pasado = f.fecha < hoy;
                      const esProximo = proximo?.fecha === f.fecha;
                      return (
                        <li
                          key={f.fecha}
                          className={cn(
                            "group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-azul-50/40 sm:px-6",
                            pasado && "opacity-65",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none",
                              esProximo ? "bg-gradient-brand text-white shadow-brand" : "bg-azul-50 text-azul-700 ring-1 ring-azul-100",
                            )}
                          >
                            <span className="font-display text-base font-semibold">{fecha.getUTCDate()}</span>
                            <span className="text-[10px] uppercase">{mes.nombre.slice(0, 3)}</span>
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="text-sm font-medium text-foreground">{f.descripcion}</span>
                            <span className="text-[13px] text-muted-foreground first-letter:uppercase">
                              {diaSemana.format(fecha)}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {esProximo ? (
                              <Badge tone="azul" size="sm" dot pulse>
                                Próximo
                              </Badge>
                            ) : null}
                            {finDeSemana ? (
                              <Badge tone="neutral" size="sm">
                                Fin de semana
                              </Badge>
                            ) : null}
                            {editable ? (
                              <AccionConfirmada
                                accion={eliminarFeriado}
                                campos={{ fecha: f.fecha }}
                                titulo="¿Quitar este feriado?"
                                descripcion={`${f.descripcion} (${formatFechaLarga(f.fecha)}) vuelve a contar como día hábil para los plazos de las notificaciones.`}
                                confirmar="Quitar feriado"
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-muted-foreground opacity-70 hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                                    aria-label={`Quitar el feriado ${f.descripcion}`}
                                  >
                                    <Trash2 aria-hidden />
                                  </Button>
                                }
                              />
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </SectionCard>

        {editable ? (
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <SectionCard title="Agregar feriado" description={`Para el año ${anio}`} icon={CalendarPlus}>
              <FormFeriado key={anio} anio={anio} />
            </SectionCard>
            <p className="flex gap-2 rounded-xl border border-border bg-card p-4 text-[13px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
              Los feriados se usan para calcular los plazos de cinco días hábiles y de cuarenta y ocho horas hábiles de
              las notificaciones. Revisá el calendario cada año: los feriados trasladables cambian de fecha.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
