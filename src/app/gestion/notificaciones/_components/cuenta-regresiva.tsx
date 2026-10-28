"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, Hourglass } from "lucide-react";
import { formatFechaHora } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

type CuentaRegresivaProps = {
  /** Momento en que se notificó (inicio del plazo). */
  desde: string | null;
  /** Vencimiento del plazo (calculado por la base en días hábiles). */
  hasta: string;
  /** Instante del servidor (ms) para que el primer render coincida con el HTML. */
  ahora: number;
};

const SEG = 1000;
const MIN = 60 * SEG;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

function partes(ms: number) {
  const r = Math.max(0, ms);
  return {
    dias: Math.floor(r / DIA),
    horas: Math.floor((r % DIA) / HORA),
    minutos: Math.floor((r % HORA) / MIN),
    segundos: Math.floor((r % MIN) / SEG),
  };
}

/** Cuenta regresiva hasta el vencimiento del plazo, con barra de avance. */
export function CuentaRegresiva({ desde, hasta, ahora: ahoraInicial }: CuentaRegresivaProps) {
  const router = useRouter();
  const [ahora, setAhora] = useState(ahoraInicial);
  const fin = new Date(hasta).getTime();
  // Si el plazo vence con la página abierta, se recarga desde el servidor para actualizar estado y acciones.
  const yaVencidoAlCargar = useRef(fin - ahoraInicial <= 0);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), SEG);
    return () => clearInterval(t);
  }, []);

  const inicio = desde ? new Date(desde).getTime() : null;
  const restante = fin - ahora;
  const vencido = restante <= 0;

  useEffect(() => {
    if (!vencido || yaVencidoAlCargar.current) return;
    yaVencidoAlCargar.current = true;
    router.refresh();
  }, [vencido, router]);
  const p = partes(restante);
  const avance = inicio && fin > inicio ? Math.min(100, Math.max(0, ((ahora - inicio) / (fin - inicio)) * 100)) : 0;
  const urgente = !vencido && restante < DIA;

  const unidades = [
    { valor: p.dias, etiqueta: p.dias === 1 ? "día" : "días" },
    { valor: p.horas, etiqueta: p.horas === 1 ? "hora" : "horas" },
    { valor: p.minutos, etiqueta: "min" },
    { valor: p.segundos, etiqueta: "seg" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        {vencido ? (
          <AlarmClock className="size-4 text-danger" aria-hidden />
        ) : (
          <Hourglass className={cn("size-4", urgente ? "text-warning" : "text-azul-600")} aria-hidden />
        )}
        <span className={cn(vencido ? "text-danger" : urgente ? "text-warning" : "text-foreground")}>
          {vencido ? "El plazo venció" : urgente ? "Vence en menos de 24 horas" : "Tiempo restante del plazo"}
        </span>
      </div>

      <div
        className="grid grid-cols-4 gap-2 sm:gap-3"
        role="timer"
        aria-live="off"
        aria-label={
          vencido
            ? `Plazo vencido el ${formatFechaHora(hasta)}`
            : `Restan ${p.dias} días, ${p.horas} horas y ${p.minutos} minutos`
        }
      >
        {unidades.map((u) => (
          <div
            key={u.etiqueta}
            className={cn(
              "flex flex-col items-center rounded-xl border px-2 py-3 text-center transition-colors",
              vencido
                ? "border-red-200 bg-danger-soft text-red-700"
                : urgente
                  ? "border-amber-200 bg-warning-soft text-amber-800"
                  : "border-azul-100 bg-azul-50/70 text-azul-800",
            )}
          >
            <span className="nums-tabular font-display text-2xl leading-none font-semibold sm:text-3xl">
              {String(u.valor).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[11px] font-medium tracking-wide uppercase opacity-80">{u.etiqueta}</span>
          </div>
        ))}
      </div>

      {inicio ? (
        <div className="flex flex-col gap-1.5">
          <div
            className={cn("relative h-2.5 w-full overflow-hidden rounded-full", vencido ? "bg-red-100" : "bg-azul-100")}
            role="progressbar"
            aria-label="Avance del plazo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(vencido ? 100 : avance)}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-1000 ease-linear",
                vencido ? "bg-red-500" : urgente ? "bg-amber-500" : "bg-linear-to-r from-azul-600 to-celeste-400",
              )}
              style={{ width: `${vencido ? 100 : avance}%` }}
            />
          </div>
          <div className="flex justify-between gap-3 text-xs text-muted-foreground">
            <span>Notificada {formatFechaHora(desde)}</span>
            <span className="text-right">Vence {formatFechaHora(hasta)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
