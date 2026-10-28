"use client";

import { useEffect, useState } from "react";
import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";

const formato = new Intl.DateTimeFormat("es-AR", {
  timeZone: APP.zonaHoraria,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * Fecha y hora de la consulta, actualizada cada segundo. Permite a un inspector distinguir una
 * verificación en vivo de una captura de pantalla.
 */
export function RelojConsulta({ className }: { className?: string }) {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <p className={cn("inline-flex items-center gap-2 text-xs font-medium", className)}>
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      <span>
        Consulta en vivo ·{" "}
        <time dateTime={ahora.toISOString()} suppressHydrationWarning className="nums-tabular">
          {formato.format(ahora)}
        </time>
      </span>
    </p>
  );
}
