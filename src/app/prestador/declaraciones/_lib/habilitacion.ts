import type { EmpresaSesion } from "@/lib/auth";
import { ESTADO_EMPRESA } from "@/lib/domain/etiquetas";
import { formatFecha, hoyISO } from "@/lib/domain/formato";
import type { TipoServicio } from "./reglas";

export type Habilitacion = { ok: boolean; titulo: string; detalle: string };

/**
 * Misma regla que public.empresa_habilitada(): estado habilitada, habilitación vigente
 * y habilitación específica para el tipo de servicio.
 */
export function habilitacionPara(empresa: EmpresaSesion, tipo: TipoServicio): Habilitacion {
  if (empresa.estado !== "habilitada") {
    return {
      ok: false,
      titulo: "Tu empresa no está habilitada",
      detalle: `Estado en el registro: ${ESTADO_EMPRESA[empresa.estado].label.toLowerCase()}. Podés cargar borradores, pero no presentarlos.`,
    };
  }
  if (empresa.vencimiento_habilitacion && empresa.vencimiento_habilitacion < hoyISO()) {
    return {
      ok: false,
      titulo: "La habilitación está vencida",
      detalle: `Venció el ${formatFecha(empresa.vencimiento_habilitacion)}. Renovala con la DDJJ anual desde Trámites para poder presentar.`,
    };
  }
  if (tipo === "tanque" && !empresa.habilita_tanques) {
    return {
      ok: false,
      titulo: "Sin habilitación para tanques",
      detalle: "La limpieza de tanques requiere una habilitación específica (Ord. 3098/01, Art. 4.º).",
    };
  }
  if (tipo === "fumigacion" && !empresa.habilita_fumigacion) {
    return { ok: false, titulo: "Sin habilitación para fumigación", detalle: "Consultá con la Dirección de Salud Ambiental." };
  }
  return {
    ok: true,
    titulo: "Empresa habilitada",
    detalle: empresa.vencimiento_habilitacion
      ? `Habilitación vigente hasta el ${formatFecha(empresa.vencimiento_habilitacion)}.`
      : "Habilitación vigente.",
  };
}
