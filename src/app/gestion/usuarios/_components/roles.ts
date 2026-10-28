import { Building2, ClipboardCheck, FlaskConical, type LucideIcon, ShieldCheck, Stamp } from "lucide-react";
import type { BadgeTone } from "@/components/ui/badge";
import type { Enums } from "@/lib/supabase/database.types";

export type Rol = Enums<"rol_usuario">;

/** Presentación de cada rol (las etiquetas vienen de ETIQUETA_ROL, en el servidor). */
export const ESTILO_ROL: Record<Rol, { icono: LucideIcon; tono: BadgeTone; descripcion: string; staff: boolean }> = {
  admin: {
    icono: ShieldCheck,
    tono: "azul",
    descripcion: "Dirección: configuración, usuarios, auditoría y todas las áreas de gestión.",
    staff: true,
  },
  control: {
    icono: Stamp,
    tono: "celeste",
    descripcion: "Control de declaraciones, certificados, trámites, pagos y timbrado.",
    staff: true,
  },
  inspector: {
    icono: ClipboardCheck,
    tono: "violeta",
    descripcion: "Fiscalización: hoja de ruta, inspecciones, notificaciones y actas.",
    staff: true,
  },
  empresa: {
    icono: Building2,
    tono: "verde",
    descripcion: "Administra una empresa prestadora: declaraciones, pagos y legajo.",
    staff: false,
  },
  tecnico: {
    icono: FlaskConical,
    tono: "ambar",
    descripcion: "Asesor técnico de una empresa: además firma los certificados.",
    staff: false,
  },
};

export const ORDEN_ROLES: Rol[] = ["admin", "control", "inspector", "empresa", "tecnico"];
