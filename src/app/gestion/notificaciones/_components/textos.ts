import { APP } from "@/lib/config";
import type { Enums } from "@/lib/supabase/database.types";

/**
 * Textos del modelo vigente de notificación de la Dirección de Salud Ambiental
 * (limpieza y desinfección de tanques), adaptados a fumigación, documentación
 * y casos generales. Los usa la vista previa del formulario, el detalle y la
 * hoja de impresión, así que el texto es siempre el mismo.
 */

type Tipo = Enums<"tipo_notificacion">;
type Plazo = Enums<"plazo_notificacion">;

export const PLAZO_EN_LETRAS: Record<Plazo, string> = {
  cinco_dias_habiles: "CINCO (5) días hábiles",
  cuarenta_ocho_horas_habiles: "CUARENTA Y OCHO (48) horas hábiles",
};

export const DIAS_HABILES_PLAZO: Record<Plazo, number> = {
  cinco_dias_habiles: 5,
  cuarenta_ocho_horas_habiles: 2,
};

/** Explicación de cada plazo para el formulario. */
export const EXPLICACION_PLAZO: Record<Plazo, string> = {
  cinco_dias_habiles:
    "Plazo general: para presentar el certificado, los análisis y la notificación. Corre desde que se notifica.",
  cuarenta_ocho_horas_habiles:
    "Cuando el servicio se realizó pero no se registró ante la Dirección: alcanza con regularizar la presentación.",
};

export const DESCRIPCION_TIPO: Record<Tipo, string> = {
  tanques: "Tanques de reserva y cisternas (Ord. 2004/92 t.o. Ord. 3098/01).",
  fumigacion: "Certificado de fumigación vigente (Ord. 2681/98 t.o. Ord. 3737/06).",
  documentacion: "Documentación pendiente detallada en observaciones.",
  general: "Regularizar la situación detallada en observaciones.",
};

export type TextoIntimacion = {
  /** Párrafo principal ("deberá presentar en el plazo de…"). */
  intimacion: string;
  /** Documentación a presentar (lista numerada). */
  documentos: string[];
  /** Normativa citada al pie. */
  normativa: string[];
  /** Advertencia final. */
  apercibimiento: string;
};

const NORMATIVA_FALTAS =
  "Ordenanza N.º 758/82 (Código de Faltas), Título III, Capítulo 1: el incumplimiento será sancionado mediante acta de infracción elevada al Tribunal Municipal de Faltas.";

const NORMATIVA: Record<Tipo, string[]> = {
  tanques: [
    "Ordenanza N.º 2004/92 (t.o. s/ Ord. N.º 3098/01): limpieza y desinfección obligatoria de tanques de reserva y cisternas cada CIENTO OCHENTA (180) días en inmuebles, locales y edificios con afluencia de público.",
    "Ordenanza N.º 3098/01, Art. 4.º: el servicio solo puede ser realizado por empresas empadronadas y autorizadas por el Municipio; no se aceptan certificados de empresas no registradas.",
    NORMATIVA_FALTAS,
  ],
  fumigacion: [
    "Ordenanza N.º 2681/98 (t.o. Ord. N.º 3737/06), Art. 1.º: fumigación obligatoria (desratización, desinsectación y desinfección) de inmuebles de uso público, con la periodicidad que fija el Anexo según la actividad.",
    "Ordenanza N.º 2681/98, Art. 4.º: el servicio solo puede ser realizado por empresas inscriptas en el Registro Municipal de Empresas de Fumigaciones.",
    "Ordenanza N.º 2681/98, Art. 2.º: las infracciones son sancionadas por el Tribunal Municipal de Faltas.",
    NORMATIVA_FALTAS,
  ],
  documentacion: [
    "Ordenanza N.º 2681/98 (t.o. Ord. N.º 3737/06) y Ordenanza N.º 2004/92 (t.o. Ord. N.º 3098/01), según corresponda.",
    NORMATIVA_FALTAS,
  ],
  general: ["Normativa municipal de salud ambiental vigente.", NORMATIVA_FALTAS],
};

/** Texto de la intimación según el tipo y el plazo elegidos. */
export function textoIntimacion(tipo: Tipo, plazo: Plazo): TextoIntimacion {
  const enPlazo = `en el plazo de ${PLAZO_EN_LETRAS[plazo]} a partir de la fecha de la presente`;
  const servicioNoRegistrado = plazo === "cuarenta_ocho_horas_habiles";
  const lugar = `ante la ${APP.direccion}`;

  switch (tipo) {
    case "tanques":
      return {
        intimacion: servicioNoRegistrado
          ? `Por la presente se NOTIFICA al responsable del establecimiento que, habiéndose realizado el servicio de limpieza y desinfección de tanques de reserva y cisternas sin registrarlo ${lugar}, deberá presentar ${enPlazo}:`
          : `Por la presente se NOTIFICA al responsable del establecimiento que deberá presentar ${lugar}, ${enPlazo}:`,
        documentos: [
          "Certificado de limpieza y desinfección de tanques de reserva y cisternas, extendido por empresa empadronada en el Registro Municipal.",
          "Análisis bacteriológico y físico-químico del agua, tomado después de la limpieza.",
          "La presente notificación.",
        ],
        normativa: NORMATIVA.tanques,
        apercibimiento:
          "Vencido el plazo sin dar cumplimiento a lo requerido, se labrará el acta de infracción correspondiente, sin perjuicio de las demás medidas que pudieran corresponder.",
      };
    case "fumigacion":
      return {
        intimacion: servicioNoRegistrado
          ? `Por la presente se NOTIFICA al responsable del establecimiento que, habiéndose realizado el servicio de fumigación sin declararlo ni registrarlo ${lugar}, deberá presentar ${enPlazo}:`
          : `Por la presente se NOTIFICA al responsable del establecimiento que deberá presentar ${lugar}, ${enPlazo}:`,
        documentos: [
          "Certificado de fumigación (desratización, desinsectación y desinfección) vigente, extendido por empresa inscripta en el Registro Municipal y con el timbrado correspondiente.",
          "La presente notificación.",
        ],
        normativa: NORMATIVA.fumigacion,
        apercibimiento:
          "Vencido el plazo sin dar cumplimiento a lo requerido, se labrará el acta de infracción correspondiente, sin perjuicio de las demás medidas que pudieran corresponder.",
      };
    case "documentacion":
      return {
        intimacion: `Por la presente se NOTIFICA al destinatario que deberá presentar ${lugar}, ${enPlazo}:`,
        documentos: ["La documentación que se detalla en el apartado de observaciones.", "La presente notificación."],
        normativa: NORMATIVA.documentacion,
        apercibimiento:
          "Vencido el plazo sin dar cumplimiento a lo requerido, se labrará el acta de infracción correspondiente.",
      };
    case "general":
      return {
        intimacion: `Por la presente se NOTIFICA al destinatario que deberá presentarse ${lugar}, ${enPlazo}, a fin de regularizar la situación que se detalla en el apartado de observaciones, munido de:`,
        documentos: ["La documentación respaldatoria que corresponda.", "La presente notificación."],
        normativa: NORMATIVA.general,
        apercibimiento:
          "Vencido el plazo sin dar cumplimiento a lo requerido, se labrará el acta de infracción correspondiente.",
      };
  }
}

/** Lugar y horario de presentación (modelo vigente). */
export const LUGAR_PRESENTACION = `${APP.direccion}, ${APP.contacto.domicilio.replace(", San Miguel de Tucumán", "")}, ${APP.contacto.horario.toLowerCase()}.`;
