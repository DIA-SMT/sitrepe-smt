import { formatFecha, formatFechaHora } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";

/**
 * Plantillas sugeridas para redactar los hechos constatados y la normativa
 * infringida según el motivo del acta. El inspector siempre puede editarlas.
 */

type Motivo = Enums<"motivo_acta">;

export type ContextoPlantilla = {
  establecimiento?: { nombre: string; domicilio: string | null; rubro: string | null } | null;
  empresa?: { nombre: string; cuit: string | null } | null;
  /** Vencimiento del último certificado de fumigación timbrado del establecimiento. */
  vencimientoFumigacion?: string | null;
  notificacion?: {
    numero: string | null;
    tipo: Enums<"tipo_notificacion"> | null;
    notificada_at: string | null;
    vence_at: string | null;
    persona_notificada: string | null;
    dni_notificado: string | null;
  } | null;
};

export const NORMATIVA_FALTAS = "Código de Faltas, Ord. N.º 758/82, Título III, Cap. 1";

/** Normativa sugerida por motivo. */
export function normativaSugerida(motivo: Motivo, ctx: ContextoPlantilla = {}): string {
  switch (motivo) {
    case "certificado_vencido":
      return `Ord. N.º 2681/98 (t.o. Ord. N.º 3737/06), Arts. 1.º y 2.º y Anexo; ${NORMATIVA_FALTAS}`;
    case "sin_certificado":
      return `Ord. N.º 2681/98 (t.o. Ord. N.º 3737/06), Arts. 1.º y 2.º; ${NORMATIVA_FALTAS}`;
    case "empresa_no_habilitada":
      return `Ord. N.º 2681/98 (t.o. Ord. N.º 3737/06), Art. 4.º; Ord. N.º 3098/01, Art. 4.º; ${NORMATIVA_FALTAS}`;
    case "incumplimiento_notificacion":
      return ctx.notificacion?.tipo === "fumigacion"
        ? `Ord. N.º 2681/98 (t.o. Ord. N.º 3737/06), Arts. 1.º y 2.º; ${NORMATIVA_FALTAS}`
        : `Ord. N.º 2004/92 (t.o. Ord. N.º 3098/01); ${NORMATIVA_FALTAS}`;
    case "tanque_sin_limpieza":
      return `Ord. N.º 2004/92 (t.o. Ord. N.º 3098/01): limpieza cada 180 días; Ord. N.º 3098/01, Art. 4.º; ${NORMATIVA_FALTAS}`;
    case "servicio_irregular":
      return `Ord. N.º 2681/98 (t.o. Ord. N.º 3737/06), Arts. 9.º y 10.º; ${NORMATIVA_FALTAS}`;
    case "otro":
      return NORMATIVA_FALTAS;
  }
}

function lugar(ctx: ContextoPlantilla): string {
  const e = ctx.establecimiento;
  if (!e) return "En el lugar de la inspección";
  const rubro = e.rubro ? ` (rubro: ${e.rubro})` : "";
  return `En el establecimiento «${e.nombre}»${rubro}${e.domicilio ? `, sito en ${e.domicilio}` : ""}`;
}

/** Descripción sugerida de los hechos constatados. */
export function descripcionSugerida(motivo: Motivo, ctx: ContextoPlantilla = {}): string {
  const donde = lugar(ctx);
  const empresa = ctx.empresa ? `«${ctx.empresa.nombre}»${ctx.empresa.cuit ? ` (CUIT ${ctx.empresa.cuit})` : ""}` : "[empresa]";
  switch (motivo) {
    case "certificado_vencido":
      return `${donde}, se constató que el certificado de fumigación (desratización, desinsectación y desinfección) exhibido se encuentra VENCIDO desde el ${ctx.vencimientoFumigacion ? formatFecha(ctx.vencimientoFumigacion) : "[fecha]"}, sin haberse renovado el servicio con la periodicidad que fija el Anexo de la Ord. N.º 2681/98 para el rubro.`;
    case "sin_certificado":
      return `${donde}, requerido el certificado de fumigación vigente extendido por empresa inscripta en el Registro Municipal, el responsable NO lo exhibió ni acreditó la realización del servicio.`;
    case "empresa_no_habilitada":
      return `${donde}, se constató que el servicio de control de plagas fue prestado por ${empresa}, que NO se encuentra inscripta ni habilitada en el Registro Municipal de Empresas de Fumigaciones para la actividad realizada.`;
    case "incumplimiento_notificacion": {
      const n = ctx.notificacion;
      const numero = n?.numero ? `N.º ${n.numero}` : "N.º [número]";
      const cuando = n?.notificada_at ? `, notificada el ${formatFechaHora(n.notificada_at)}` : "";
      const quien = n?.persona_notificada
        ? ` a ${n.persona_notificada}${n.dni_notificado ? ` (DNI ${n.dni_notificado})` : ""}`
        : "";
      const vence = n?.vence_at ? ` con vencimiento el ${formatFecha(n.vence_at)}` : "";
      const que =
        n?.tipo === "fumigacion"
          ? "el certificado de fumigación vigente"
          : n?.tipo === "tanques" || !n?.tipo
            ? "el certificado de limpieza y desinfección de tanques de reserva y cisternas y el análisis bacteriológico y físico-químico del agua"
            : "la documentación requerida";
      return `${donde}, vencido el plazo otorgado mediante la Notificación ${numero}${cuando}${quien}${vence}, se constató que NO se presentó ante la Dirección de Salud Ambiental ${que}.`;
    }
    case "tanque_sin_limpieza":
      return `${donde}, con afluencia de público, se constató que los tanques de reserva y cisternas NO cuentan con certificado de limpieza y desinfección vigente (obligatoria cada 180 días) extendido por empresa empadronada, ni con el análisis bacteriológico y físico-químico del agua posterior a la limpieza.`;
    case "servicio_irregular":
      return `${donde}, durante el control del servicio prestado por ${empresa}, se constataron las siguientes irregularidades: [detallar: productos no declarados, falta de equipo de protección, técnico ausente, plazo de reingreso no informado, etc.].`;
    case "otro":
      return `${donde}, se constató: [detallar los hechos].`;
  }
}
