import { Check, ClipboardPen, Send, ShieldCheck, Stamp, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import type { Antelacion, TipoServicio } from "../../_lib/reglas";

type EstadoEtapa = "completa" | "actual" | "pendiente" | "alerta" | "error";

type Etapa = { titulo: string; detalle: string; estado: EstadoEtapa; icon: LucideIcon };

const estilos: Record<EstadoEtapa, { caja: string; icono: string; texto: string }> = {
  completa: { caja: "border-emerald-200 bg-emerald-50/60", icono: "bg-emerald-600 text-white", texto: "text-emerald-800" },
  actual: { caja: "border-azul-300 bg-azul-50 ring-2 ring-azul-100", icono: "bg-gradient-brand text-white shadow-brand", texto: "text-azul-800" },
  pendiente: { caja: "border-border bg-card", icono: "bg-noche-50 text-noche-400 ring-1 ring-noche-200", texto: "text-muted-foreground" },
  alerta: { caja: "border-amber-300 bg-warning-soft ring-2 ring-amber-100", icono: "bg-sol-400 text-noche-950", texto: "text-amber-900" },
  error: { caja: "border-red-200 bg-danger-soft", icono: "bg-red-600 text-white", texto: "text-red-800" },
};

const leyenda: Record<EstadoEtapa, string> = {
  completa: "Completada",
  actual: "En curso",
  pendiente: "Pendiente",
  alerta: "Requiere atención",
  error: "Rechazada",
};

/** Recorrido de la planilla: carga y firma → presentación → control → timbrado. */
export function EtapasDeclaracion({
  estado,
  tipo,
  antelacion,
  certificados,
  timbrados,
}: {
  estado: Enums<"estado_declaracion">;
  tipo: TipoServicio;
  antelacion: Antelacion;
  certificados: number;
  timbrados: number;
}) {
  const todoTimbrado = certificados > 0 && timbrados >= certificados;
  const etapas: Etapa[] = [
    {
      titulo: "Carga y firma",
      detalle: estado === "observada" ? "Corregí lo observado" : estado === "borrador" ? "Servicios y firma del asesor" : "Planilla completa",
      estado: estado === "borrador" ? "actual" : estado === "observada" ? "alerta" : "completa",
      icon: ClipboardPen,
    },
    {
      titulo: "Presentación",
      detalle:
        estado === "observada"
          ? "Volvé a presentarla corregida"
          : tipo === "tanque"
            ? "Una vez realizada la limpieza"
            : `${antelacion.minHoras} a ${antelacion.maxHoras} h antes del servicio`,
      estado: estado === "borrador" || estado === "observada" ? "pendiente" : "completa",
      icon: Send,
    },
    {
      titulo: "Control del área",
      detalle:
        estado === "presentada"
          ? "En revisión"
          : estado === "observada"
            ? "Con observaciones"
            : estado === "rechazada"
              ? "Rechazada"
              : estado === "controlada"
                ? "Verificada"
                : "Control de Empresas",
      estado:
        estado === "presentada"
          ? "actual"
          : estado === "observada"
            ? "alerta"
            : estado === "rechazada"
              ? "error"
              : estado === "controlada"
                ? "completa"
                : "pendiente",
      icon: ShieldCheck,
    },
    {
      titulo: "Timbrado",
      detalle: todoTimbrado ? "Certificados válidos" : estado === "controlada" ? `${timbrados} de ${certificados} timbrados` : "Pago y sellado digital",
      estado: estado !== "controlada" ? "pendiente" : todoTimbrado ? "completa" : "actual",
      icon: Stamp,
    },
  ];

  return (
    <ol aria-label="Etapas de la declaración" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {etapas.map((e, i) => {
        const s = estilos[e.estado];
        const Icono = e.estado === "completa" ? Check : e.estado === "error" ? X : e.icon;
        return (
          <li
            key={e.titulo}
            aria-current={e.estado === "actual" || e.estado === "alerta" ? "step" : undefined}
            className={cn("relative flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors", s.caja)}
          >
            <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", s.icono)}>
              <Icono className="size-4" strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Paso {i + 1}</span>
              <span className="block truncate text-sm font-semibold text-foreground">{e.titulo}</span>
              <span className={cn("block truncate text-xs", s.texto)}>
                <span className="sr-only">{leyenda[e.estado]}: </span>
                {e.detalle}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
