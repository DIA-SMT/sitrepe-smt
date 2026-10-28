import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";

export type Chequeo = {
  resultado: "ok" | "alerta" | "error";
  titulo: string;
  detalle?: React.ReactNode;
};

const ESTILOS = {
  ok: { icono: CircleCheck, clase: "text-success", fondo: "bg-success-soft", sr: "Correcto" },
  alerta: { icono: CircleAlert, clase: "text-warning", fondo: "bg-warning-soft", sr: "Revisar" },
  error: { icono: CircleX, clase: "text-danger", fondo: "bg-danger-soft", sr: "Problema" },
} as const;

/** Lista de controles automáticos de la conciliación (no reemplazan el criterio del agente). */
export function Chequeos({ items }: { items: Chequeo[] }) {
  return (
    <ul className="flex flex-col gap-2" role="list">
      {items.map((c) => {
        const e = ESTILOS[c.resultado];
        const Icono = e.icono;
        return (
          <li key={c.titulo} className={cn("flex items-start gap-3 rounded-xl px-3 py-2.5", e.fondo)}>
            <Icono className={cn("mt-0.5 size-4 shrink-0", e.clase)} aria-hidden />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-medium text-foreground">
                <span className="sr-only">{e.sr}: </span>
                {c.titulo}
              </p>
              {c.detalle ? <div className="text-[13px] leading-snug text-muted-foreground">{c.detalle}</div> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
