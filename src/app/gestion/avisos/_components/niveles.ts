import { Info, Siren, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Enums } from "@/lib/supabase/database.types";

export type NivelAviso = Enums<"nivel_aviso">;

/** Presentación de cada nivel de aviso (ícono, colores y ayuda para elegirlo). */
export const ESTILO_NIVEL: Record<
  NivelAviso,
  { etiqueta: string; ayuda: string; icono: LucideIcon; icon: string; borde: string; fondo: string; acento: string }
> = {
  info: {
    etiqueta: "Información",
    ayuda: "Novedades, recordatorios y comunicaciones generales.",
    icono: Info,
    icon: "bg-azul-50 text-azul-600 ring-azul-200",
    borde: "border-azul-200",
    fondo: "bg-azul-50/60",
    acento: "bg-azul-600",
  },
  alerta: {
    etiqueta: "Atención",
    ayuda: "Plazos próximos, cambios de procedimiento o campañas.",
    icono: TriangleAlert,
    icon: "bg-amber-50 text-amber-700 ring-amber-200",
    borde: "border-amber-200",
    fondo: "bg-amber-50/60",
    acento: "bg-amber-500",
  },
  urgente: {
    etiqueta: "Urgente",
    ayuda: "Requiere acción inmediata (suspensiones, emergencias sanitarias).",
    icono: Siren,
    icon: "bg-red-50 text-red-600 ring-red-200",
    borde: "border-red-200",
    fondo: "bg-red-50/60",
    acento: "bg-red-500",
  },
};
