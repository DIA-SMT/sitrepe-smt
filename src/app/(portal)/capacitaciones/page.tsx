import type { Metadata } from "next";
import {
  Award,
  CalendarClock,
  Clock,
  GraduationCap,
  History,
  MapPin,
  MonitorSmartphone,
  UsersRound,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type CapacitacionPortal, getCapacitacionesPortal } from "@/lib/data/portal";
import { ESTADO_CAPACITACION, MODALIDAD_CAPACITACION } from "@/lib/domain/etiquetas";
import { formatFechaLarga, formatHora, formatNumero } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { EncabezadoPortal, TituloSeccion } from "../_components/encabezado-portal";
import { FechaChip } from "../_components/fecha-chip";
import { InscripcionCapacitacion } from "./_components/inscripcion-capacitacion";

export const metadata: Metadata = {
  title: "Capacitaciones",
  description:
    "Capacitaciones de la Dirección de Salud Ambiental para empresas prestadoras, asesores técnicos, operarios y público en general. Inscribite en línea.",
};

function duracion(horas: number): string {
  if (!horas) return "Duración a confirmar";
  return `${formatNumero(horas, 1)} ${horas === 1 ? "hora" : "horas"}`;
}

export default async function CapacitacionesPage() {
  const { proximas, pasadas } = await getCapacitacionesPortal();
  const abiertas = proximas.filter((c) => c.admiteInscripcion).length;

  return (
    <>
      <EncabezadoPortal
        antetitulo="Formación"
        titulo="Capacitaciones"
        descripcion="Encuentros para empresas prestadoras, asesores técnicos, operarios y vecinos: uso de la plataforma, manejo seguro de productos, envases y control integrado de vectores."
        icono={GraduationCap}
        migas={[{ label: "Capacitaciones" }]}
        aside={
          <div className="grid grid-cols-2 gap-3 rounded-panel border border-white/70 bg-white/80 p-4 shadow-card backdrop-blur sm:p-5">
            <div className="flex flex-col gap-1 rounded-xl bg-azul-50/60 p-3 ring-1 ring-azul-100">
              <CalendarClock className="size-5 text-azul-600" aria-hidden />
              <span className="font-display text-2xl font-bold text-foreground nums-tabular">{proximas.length}</span>
              <span className="text-xs text-muted-foreground">próximas</span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-100">
              <UsersRound className="size-5 text-emerald-700" aria-hidden />
              <span className="font-display text-2xl font-bold text-foreground nums-tabular">{abiertas}</span>
              <span className="text-xs text-muted-foreground">con inscripción abierta</span>
            </div>
          </div>
        }
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <section aria-labelledby="proximas">
          <TituloSeccion id="proximas" antetitulo="Agenda" titulo="Próximas capacitaciones" />
          {proximas.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={CalendarClock}
              title="No hay capacitaciones programadas"
              description="Cuando la Dirección abra una nueva convocatoria la vas a encontrar acá, junto con el formulario de inscripción."
            />
          ) : (
            <ul className="mt-8 flex flex-col gap-5">
              {proximas.map((c) => (
                <li key={c.id} id={`capacitacion-${c.id}`} className="revelar scroll-mt-28">
                  <TarjetaCapacitacion c={c} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="anteriores">
          <TituloSeccion
            id="anteriores"
            antetitulo="Historial"
            titulo="Capacitaciones anteriores"
            descripcion="La Dirección registra la asistencia y emite los certificados de participación."
          />
          {pasadas.length === 0 ? (
            <EmptyState className="mt-8" compact icon={History} title="Todavía no hay capacitaciones realizadas" />
          ) : (
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {pasadas.map((c) => (
                <li
                  key={c.id}
                  id={`capacitacion-${c.id}`}
                  className="flex scroll-mt-28 gap-4 rounded-card border border-border bg-card p-4 shadow-card"
                >
                  <FechaChip fecha={c.fechaInicio} tono="neutral" />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone="neutral" size="sm" dot>
                        Realizada
                      </Badge>
                      <Badge tone={MODALIDAD_CAPACITACION[c.modalidad].tono} size="sm">
                        {MODALIDAD_CAPACITACION[c.modalidad].label}
                      </Badge>
                    </div>
                    <h3 className="font-display text-[15px] leading-snug font-semibold text-foreground">{c.titulo}</h3>
                    <p className="text-[13px] text-muted-foreground">
                      {formatFechaLarga(c.fechaInicio)} · {c.inscriptos} {c.inscriptos === 1 ? "inscripto" : "inscriptos"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function TarjetaCapacitacion({ c }: { c: CapacitacionPortal }) {
  const modalidad = MODALIDAD_CAPACITACION[c.modalidad];
  const estado = ESTADO_CAPACITACION[c.estado];
  const ocupacion = c.cupo ? Math.min(100, Math.round((c.inscriptos / c.cupo) * 100)) : null;
  const tonoCupo = ocupacion === null ? "azul" : ocupacion >= 90 ? "rojo" : ocupacion >= 70 ? "ambar" : "azul";
  const fechaTexto = `${formatFechaLarga(c.fechaInicio)} a las ${formatHora(c.fechaInicio)} h`;
  const motivoCerrada =
    c.estado !== "abierta" ? estado.label : c.vacantes === 0 ? "Sin vacantes" : "Inscripción no disponible";

  return (
    <article
      className={cn(
        "group relative grid gap-5 overflow-hidden rounded-card border bg-card p-5 shadow-card transition-[border-color,box-shadow] duration-200 hover:shadow-elevated sm:grid-cols-[auto_1fr] sm:p-6 lg:grid-cols-[auto_1fr_17rem]",
        c.admiteInscripcion ? "border-border hover:border-azul-200" : "border-border",
      )}
    >
      {c.admiteInscripcion ? (
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-azul-600 via-celeste-400 to-sol-400" />
      ) : null}
      <FechaChip fecha={c.fechaInicio} className="w-[4.5rem]" />

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={estado.tono} dot pulse={c.admiteInscripcion}>
            {c.vacantes === 0 && c.estado === "abierta" ? "Cupo completo" : estado.label}
          </Badge>
          <Badge tone={modalidad.tono}>
            <MonitorSmartphone aria-hidden />
            {modalidad.label}
          </Badge>
        </div>
        <h3 className="font-display text-xl leading-snug font-semibold text-foreground">{c.titulo}</h3>
        {c.descripcion ? <p className="text-sm leading-relaxed text-muted-foreground">{c.descripcion}</p> : null}
        <ul className="flex flex-col gap-1.5 text-[13px] text-foreground/85 sm:flex-row sm:flex-wrap sm:gap-x-5">
          <li className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4 text-azul-600" aria-hidden />
            {fechaTexto}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Clock className="size-4 text-azul-600" aria-hidden />
            {duracion(c.duracionHoras)}
          </li>
          {c.lugar ? (
            <li className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-azul-600" aria-hidden />
              {c.lugar}
            </li>
          ) : null}
          {c.destinatarios ? (
            <li className="inline-flex items-center gap-1.5">
              <Award className="size-4 text-azul-600" aria-hidden />
              {c.destinatarios}
            </li>
          ) : null}
        </ul>
      </div>

      <div className="flex flex-col justify-center gap-4 border-t border-border pt-4 sm:col-span-2 lg:col-span-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        {c.cupo ? (
          <Progress
            value={c.inscriptos}
            max={c.cupo}
            tone={tonoCupo}
            label={c.vacantes === 0 ? "Cupo completo" : `Quedan ${c.vacantes} ${c.vacantes === 1 ? "vacante" : "vacantes"}`}
            showValue
          />
        ) : (
          <p className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <UsersRound className="size-4" aria-hidden />
            Sin límite de cupo · {c.inscriptos} {c.inscriptos === 1 ? "inscripto" : "inscriptos"}
          </p>
        )}
        {c.cupo ? (
          <p className="text-xs text-muted-foreground nums-tabular">
            {c.inscriptos} de {c.cupo} lugares ocupados
          </p>
        ) : null}
        <InscripcionCapacitacion
          capacitacion={{ id: c.id, titulo: c.titulo, fecha: fechaTexto, lugar: c.lugar, modalidad: modalidad.label }}
          cerrada={c.admiteInscripcion ? null : motivoCerrada}
        />
      </div>
    </article>
  );
}
