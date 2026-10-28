import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";

const fmtDia = new Intl.DateTimeFormat("es-AR", { timeZone: APP.zonaHoraria, day: "numeric" });
const fmtMes = new Intl.DateTimeFormat("es-AR", { timeZone: APP.zonaHoraria, month: "short" });
const fmtSemana = new Intl.DateTimeFormat("es-AR", { timeZone: APP.zonaHoraria, weekday: "short" });
const fmtLarga = new Intl.DateTimeFormat("es-AR", {
  timeZone: APP.zonaHoraria,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Bloque de fecha estilo calendario (día grande, mes y día de la semana). */
export function FechaChip({
  fecha,
  tono = "azul",
  className,
}: {
  fecha: string;
  tono?: "azul" | "neutral";
  className?: string;
}) {
  const d = new Date(fecha);
  return (
    <div
      className={cn(
        "flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-2xl text-center shadow-xs ring-1",
        tono === "azul" ? "bg-white ring-azul-100" : "bg-muted ring-border",
        className,
      )}
    >
      <time dateTime={fecha} className="sr-only">
        {fmtLarga.format(d)}
      </time>
      <span
        aria-hidden
        className={cn(
          "w-full py-1 text-[11px] font-semibold tracking-wide uppercase",
          tono === "azul" ? "bg-gradient-brand text-white" : "bg-noche-200 text-noche-700",
        )}
      >
        {fmtMes.format(d).replace(".", "")}
      </span>
      <span aria-hidden className="pt-1 font-display text-2xl leading-none font-bold text-foreground">
        {fmtDia.format(d)}
      </span>
      <span aria-hidden className="pt-0.5 pb-1.5 text-[11px] text-muted-foreground capitalize">
        {fmtSemana.format(d).replace(".", "")}
      </span>
    </div>
  );
}
