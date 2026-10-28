import Link from "next/link";
import { ArrowRight, Clock3, MapPin, MonitorPlay, UsersRound } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import type { CapacitacionConCupo } from "@/lib/data/admin";
import { ESTADO_CAPACITACION, MODALIDAD_CAPACITACION } from "@/lib/domain/etiquetas";
import { formatNumero } from "@/lib/domain/formato";
import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";
import { BarraCupo } from "./cupo";

const fmt = (opciones: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: APP.zonaHoraria, ...opciones });
const fmtDia = fmt({ day: "numeric" });
const fmtMes = fmt({ month: "short" });
const fmtSemana = fmt({ weekday: "long" });
const fmtHora = fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fmtAnio = fmt({ year: "numeric" });

/** Calendario compacto: día grande, mes y año. */
export function FechaCapacitacion({ fecha, apagada = false, className }: { fecha: string; apagada?: boolean; className?: string }) {
  const d = new Date(fecha);
  return (
    <div
      className={cn(
        "flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-xl text-center ring-1",
        apagada ? "bg-muted ring-border" : "bg-card ring-azul-100 shadow-xs",
        className,
      )}
    >
      <span
        className={cn(
          "w-full py-0.5 text-[11px] font-semibold tracking-wide uppercase",
          apagada ? "bg-noche-200 text-noche-700" : "bg-gradient-brand text-white",
        )}
      >
        {fmtMes.format(d).replace(".", "")}
      </span>
      <span className={cn("font-display text-2xl leading-tight font-bold", apagada ? "text-noche-500" : "text-foreground")}>
        {fmtDia.format(d)}
      </span>
      <span className="pb-1 text-[10px] text-muted-foreground">{fmtAnio.format(d)}</span>
    </div>
  );
}

export function horarioCapacitacion(fecha: string, duracion: number): string {
  const d = new Date(fecha);
  const semana = fmtSemana.format(d);
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)} · ${fmtHora.format(d)} h · ${formatNumero(duracion, 1)} ${
    duracion === 1 ? "hora" : "horas"
  }`;
}

/** Tarjeta de una capacitación en el listado de gestión. */
export function TarjetaCapacitacion({ capacitacion: c }: { capacitacion: CapacitacionConCupo }) {
  const apagada = c.estado === "cancelada" || c.estado === "finalizada";
  const IconoLugar = c.modalidad === "virtual" ? MonitorPlay : MapPin;
  return (
    <Link
      href={`/gestion/capacitaciones/${c.id}`}
      className={cn(
        "group relative flex h-full flex-col gap-4 overflow-hidden rounded-card border border-border bg-card p-5 shadow-card",
        "transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-azul-200 hover:shadow-elevated",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 size-32 rounded-full blur-2xl",
          apagada ? "bg-noche-100/60" : c.estado === "abierta" ? "bg-celeste-300/30" : "bg-sol-300/30",
        )}
      />
      <div className="relative flex items-start gap-4">
        <FechaCapacitacion fecha={c.fecha_inicio} apagada={apagada} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <EstadoBadge mapa={ESTADO_CAPACITACION} valor={c.estado} size="sm" pulse={c.estado === "abierta"} />
            <EstadoBadge mapa={MODALIDAD_CAPACITACION} valor={c.modalidad} size="sm" />
          </div>
          <h3 className="font-display text-base leading-snug font-semibold text-foreground group-hover:text-azul-700">
            {c.titulo}
          </h3>
        </div>
      </div>
      <ul className="relative flex flex-col gap-1.5 text-[13px] text-muted-foreground">
        <li className="flex items-center gap-2">
          <Clock3 className="size-3.5 shrink-0 text-azul-600" aria-hidden />
          {horarioCapacitacion(c.fecha_inicio, c.duracion_horas)}
        </li>
        {c.lugar ? (
          <li className="flex items-center gap-2">
            <IconoLugar className="size-3.5 shrink-0 text-azul-600" aria-hidden />
            <span className="truncate">{c.lugar}</span>
          </li>
        ) : null}
        {c.destinatarios ? (
          <li className="flex items-center gap-2">
            <UsersRound className="size-3.5 shrink-0 text-azul-600" aria-hidden />
            <span className="truncate">{c.destinatarios}</span>
          </li>
        ) : null}
      </ul>
      <div className="relative mt-auto flex flex-col gap-3 border-t border-border pt-4">
        <BarraCupo inscriptos={c.inscriptos} cupo={c.cupo} size="sm" />
        <p className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {c.asistentes > 0
              ? `${c.asistentes} ${c.asistentes === 1 ? "asistente certificado" : "asistentes certificados"}`
              : "Sin asistencia registrada"}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-azul-700">
            Inscriptos
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </p>
      </div>
    </Link>
  );
}
