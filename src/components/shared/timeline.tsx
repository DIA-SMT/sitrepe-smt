import type { LucideIcon } from "lucide-react";
import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";

export type TimelineTone = "azul" | "celeste" | "verde" | "ambar" | "rojo" | "violeta" | "neutral";

export type TimelineItem = {
  id?: string;
  /** Fecha (Date o ISO) o texto ya formateado. */
  date: Date | string;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: TimelineTone;
  icon?: LucideIcon;
};

const tonos: Record<TimelineTone, { dot: string; ring: string }> = {
  azul: { dot: "bg-azul-600 text-white", ring: "ring-azul-100" },
  celeste: { dot: "bg-celeste-500 text-white", ring: "ring-celeste-100" },
  verde: { dot: "bg-emerald-600 text-white", ring: "ring-emerald-100" },
  ambar: { dot: "bg-sol-400 text-noche-950", ring: "ring-sol-100" },
  rojo: { dot: "bg-red-600 text-white", ring: "ring-red-100" },
  violeta: { dot: "bg-violet-600 text-white", ring: "ring-violet-100" },
  neutral: { dot: "bg-noche-300 text-white", ring: "ring-noche-100" },
};

const fmtDia = (timeZone: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone });
const fmtDiaApp = fmtDia(APP.zonaHoraria);
const fmtDiaUtc = fmtDia("UTC");
const fmtHora = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: APP.zonaHoraria,
});

/** "26 oct 2026" (sin los "de" del formato largo). */
function dia(fmt: Intl.DateTimeFormat, d: Date) {
  const partes = fmt.formatToParts(d);
  const v = (t: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === t)?.value ?? "";
  return `${v("day")} ${v("month").replace(".", "")} ${v("year")}`;
}

const fmtFechaHora = { format: (d: Date) => `${dia(fmtDiaApp, d)} · ${fmtHora.format(d)}` };
const fmtFecha = { format: (d: Date) => dia(fmtDiaUtc, d) };

/** Formatea en la zona horaria de la app (Tucumán). Las fechas "AAAA-MM-DD" se muestran sin hora. */
function formatearFecha(date: Date | string) {
  if (date instanceof Date) return fmtFechaHora.format(date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return fmtFecha.format(new Date(date));
  if (/^\d{4}-\d{2}-\d{2}T/.test(date)) {
    const d = new Date(date);
    if (!Number.isNaN(d.getTime())) return fmtFechaHora.format(d);
  }
  return date;
}

/** Línea de tiempo vertical (historial de un trámite, certificado, inspección…). */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative flex flex-col", className)}>
      {items.map((item, i) => {
        const t = tonos[item.tone ?? "azul"];
        const Icon = item.icon;
        const last = i === items.length - 1;
        const iso = item.date instanceof Date ? item.date.toISOString() : /^\d{4}-\d{2}-\d{2}/.test(item.date) ? item.date : undefined;
        return (
          <li key={item.id ?? i} className="relative flex gap-4 pb-6 last:pb-0">
            {!last ? <span aria-hidden className="absolute top-8 bottom-0 left-[15px] w-px bg-linear-to-b from-border-strong to-border" /> : null}
            <span
              aria-hidden
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4",
                t.dot,
                t.ring,
              )}
            >
              {Icon ? <Icon className="size-4" strokeWidth={2} /> : <span className="size-2 rounded-full bg-current" />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <time dateTime={iso} className="text-xs text-muted-foreground nums-tabular">
                  {formatearFecha(item.date)}
                </time>
              </div>
              {item.description ? <div className="text-sm leading-relaxed text-muted-foreground">{item.description}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
