import type { Enums } from "@/lib/supabase/database.types";
import type { Vigencia } from "./vencimiento";

/** Tonos de Badge/StatusBadge del sistema de diseño. */
export type Tono = "neutral" | "azul" | "celeste" | "verde" | "ambar" | "rojo" | "violeta";

export type Etiqueta = { label: string; tono: Tono; descripcion?: string };

type Mapa<E extends string> = Record<E, Etiqueta>;

export const ESTADO_EMPRESA: Mapa<Enums<"estado_empresa">> = {
  en_tramite: { label: "En trámite", tono: "celeste" },
  habilitada: { label: "Habilitada", tono: "verde" },
  observada: { label: "Observada", tono: "ambar" },
  suspendida: { label: "Suspendida", tono: "rojo" },
  vencida: { label: "Vencida", tono: "rojo" },
  baja: { label: "Baja", tono: "neutral" },
};

export const TIPO_SERVICIO: Mapa<Enums<"tipo_servicio">> = {
  fumigacion: { label: "Fumigación y desinfección", tono: "azul" },
  tanque: { label: "Limpieza de tanques", tono: "celeste" },
};

export const TIPO_SERVICIO_CORTO: Record<Enums<"tipo_servicio">, string> = {
  fumigacion: "Fumigación",
  tanque: "Tanques",
};

export const PERIODICIDAD: Mapa<Enums<"periodicidad">> = {
  mensual: { label: "Mensual", tono: "rojo" },
  bimestral: { label: "Bimestral", tono: "ambar" },
  trimestral: { label: "Trimestral", tono: "azul" },
  cuatrimestral: { label: "Cuatrimestral", tono: "azul" },
  semestral: { label: "Semestral", tono: "celeste" },
  anual: { label: "Anual", tono: "verde" },
  unica_vez: { label: "Única vez", tono: "violeta" },
};

export const ESTADO_TECNICO: Mapa<Enums<"estado_tecnico">> = {
  pendiente: { label: "Pendiente de aprobación", tono: "ambar" },
  aprobado: { label: "Aprobado", tono: "verde" },
  rechazado: { label: "Rechazado", tono: "rojo" },
  baja: { label: "Baja", tono: "neutral" },
};

export const ESTADO_MEMORIA: Mapa<Enums<"estado_memoria">> = {
  propuesto: { label: "Propuesto", tono: "ambar" },
  aprobado: { label: "Aprobado", tono: "verde" },
  rechazado: { label: "Rechazado", tono: "rojo" },
};

export const CLASE_PRODUCTO: Mapa<Enums<"clase_producto">> = {
  insecticida: { label: "Insecticida", tono: "azul" },
  rodenticida: { label: "Rodenticida", tono: "violeta" },
  desinfectante: { label: "Desinfectante", tono: "celeste" },
  larvicida: { label: "Larvicida", tono: "verde" },
  fungicida: { label: "Fungicida", tono: "ambar" },
  otro: { label: "Otro", tono: "neutral" },
};

export const ESTADO_DECLARACION: Mapa<Enums<"estado_declaracion">> = {
  borrador: { label: "Borrador", tono: "neutral", descripcion: "En carga por la empresa" },
  presentada: { label: "Presentada", tono: "azul", descripcion: "Pendiente de control por el área" },
  observada: { label: "Observada", tono: "ambar", descripcion: "Requiere correcciones de la empresa" },
  controlada: { label: "Controlada", tono: "verde", descripcion: "Verificada por Control de Empresas" },
  rechazada: { label: "Rechazada", tono: "rojo" },
};

export const ESTADO_CERTIFICADO: Mapa<Enums<"estado_certificado">> = {
  borrador: { label: "Borrador", tono: "neutral", descripcion: "En carga, sin presentar" },
  declarado: { label: "Declarado", tono: "azul", descripcion: "Presentado en la planilla, a controlar" },
  observado: { label: "Observado", tono: "ambar", descripcion: "Con observaciones del área" },
  controlado: { label: "Controlado", tono: "celeste", descripcion: "Listo para pagar el timbrado" },
  timbrado: { label: "Timbrado", tono: "verde", descripcion: "Pagado y sellado digitalmente: válido" },
  anulado: { label: "Anulado", tono: "rojo" },
};

export const VIGENCIA: Mapa<Vigencia> = {
  vigente: { label: "Vigente", tono: "verde" },
  por_vencer: { label: "Por vencer", tono: "ambar" },
  vencido: { label: "Vencido", tono: "rojo" },
  sin_timbrar: { label: "Sin timbrar", tono: "neutral" },
  anulado: { label: "Anulado", tono: "rojo" },
  sin_certificado: { label: "Sin certificado", tono: "violeta" },
};

export const ESTADO_OBLIGACION: Mapa<"vigente" | "por_vencer" | "vencido" | "sin_certificado" | "no_aplica"> = {
  vigente: { label: "Al día", tono: "verde" },
  por_vencer: { label: "Por vencer", tono: "ambar" },
  vencido: { label: "Vencido", tono: "rojo" },
  sin_certificado: { label: "Sin certificado", tono: "violeta" },
  no_aplica: { label: "No aplica", tono: "neutral" },
};

export const MEDIO_PAGO: Mapa<Enums<"medio_pago">> = {
  transferencia: { label: "Transferencia bancaria", tono: "azul" },
  boleta: { label: "Boleta de Rentas", tono: "celeste" },
  plataforma_electronica: { label: "Plataforma electrónica", tono: "violeta" },
};

export const ESTADO_PAGO: Mapa<Enums<"estado_pago">> = {
  pendiente: { label: "Pendiente de pago", tono: "ambar" },
  informado: { label: "Informado", tono: "azul", descripcion: "Comprobante enviado, a verificar" },
  verificado: { label: "Verificado", tono: "verde", descripcion: "Acreditado y conciliado" },
  rechazado: { label: "Rechazado", tono: "rojo" },
  anulado: { label: "Anulado", tono: "neutral" },
};

export const TIPO_TRAMITE: Mapa<Enums<"tipo_tramite">> = {
  inscripcion: { label: "Inscripción en el registro", tono: "azul" },
  renovacion: { label: "Renovación anual (DDJJ)", tono: "celeste" },
  cambio_tecnico: { label: "Cambio de asesor técnico", tono: "violeta" },
  cambio_domicilio: { label: "Cambio de domicilio", tono: "ambar" },
  alta_producto: { label: "Alta de producto", tono: "verde" },
  baja: { label: "Baja del registro", tono: "neutral" },
};

export const ESTADO_TRAMITE: Mapa<Enums<"estado_tramite">> = {
  borrador: { label: "Borrador", tono: "neutral" },
  presentado: { label: "Presentado", tono: "azul" },
  observado: { label: "Observado", tono: "ambar" },
  aprobado: { label: "Aprobado", tono: "verde" },
  rechazado: { label: "Rechazado", tono: "rojo" },
};

export const TIPO_DOCUMENTO: Mapa<Enums<"tipo_documento">> = {
  constancia_cuit: { label: "Constancia de CUIT (AFIP/ARCA)", tono: "neutral" },
  dni_titular: { label: "DNI del titular", tono: "neutral" },
  titulo_tecnico: { label: "Título del asesor técnico (autenticado)", tono: "violeta" },
  carnet_sanidad: { label: "Carnet de sanidad", tono: "verde" },
  memoria_tecnica: { label: "Memoria técnica", tono: "azul" },
  habilitacion_comercial: { label: "Habilitación comercial", tono: "celeste" },
  plano_local: { label: "Plano de oficina y depósito", tono: "neutral" },
  ddjj_anual: { label: "DDJJ anual de categorización", tono: "azul" },
  libre_deuda: { label: "Libre deuda", tono: "verde" },
  seguro: { label: "Seguro", tono: "neutral" },
  analisis_agua: { label: "Análisis de agua", tono: "celeste" },
  otro: { label: "Otro", tono: "neutral" },
};

export const ESTADO_DOCUMENTO: Mapa<Enums<"estado_documento">> = {
  pendiente: { label: "Pendiente de revisión", tono: "ambar" },
  aprobado: { label: "Aprobado", tono: "verde" },
  rechazado: { label: "Rechazado", tono: "rojo" },
};

export const TIPO_INSPECCION: Mapa<Enums<"tipo_inspeccion">> = {
  muestreo_servicio: { label: "Muestreo en servicio", tono: "azul" },
  control_vencimiento: { label: "Control de vencimiento", tono: "ambar" },
  deposito_anual: { label: "Inspección anual de depósito", tono: "violeta" },
  habilitacion: { label: "Inspección de habilitación", tono: "celeste" },
  denuncia: { label: "Por denuncia", tono: "rojo" },
  reinspeccion: { label: "Reinspección", tono: "neutral" },
};

export const ESTADO_INSPECCION: Mapa<Enums<"estado_inspeccion">> = {
  programada: { label: "Programada", tono: "azul" },
  realizada: { label: "Realizada", tono: "verde" },
  cancelada: { label: "Cancelada", tono: "neutral" },
};

export const RESULTADO_INSPECCION: Mapa<Enums<"resultado_inspeccion">> = {
  conforme: { label: "Conforme", tono: "verde" },
  no_conforme: { label: "No conforme", tono: "rojo" },
  ausente: { label: "Ausente / cerrado", tono: "ambar" },
};

export const MOTIVO_ACTA: Mapa<Enums<"motivo_acta">> = {
  certificado_vencido: { label: "Certificado vencido", tono: "rojo" },
  sin_certificado: { label: "Sin certificado", tono: "rojo" },
  empresa_no_habilitada: { label: "Empresa no habilitada", tono: "rojo" },
  incumplimiento_notificacion: { label: "Incumplimiento de notificación", tono: "ambar" },
  tanque_sin_limpieza: { label: "Tanque sin limpieza", tono: "celeste" },
  servicio_irregular: { label: "Servicio irregular", tono: "ambar" },
  otro: { label: "Otro", tono: "neutral" },
};

export const ESTADO_ACTA: Mapa<Enums<"estado_acta">> = {
  labrada: { label: "Labrada", tono: "ambar" },
  elevada: { label: "Elevada al Tribunal de Faltas", tono: "violeta" },
  resuelta: { label: "Resuelta", tono: "verde" },
  anulada: { label: "Anulada", tono: "neutral" },
};

export const TIPO_NOTIFICACION: Mapa<Enums<"tipo_notificacion">> = {
  tanques: { label: "Limpieza de tanques", tono: "celeste" },
  fumigacion: { label: "Fumigación", tono: "azul" },
  documentacion: { label: "Documentación", tono: "violeta" },
  general: { label: "General", tono: "neutral" },
};

export const PLAZO_NOTIFICACION: Mapa<Enums<"plazo_notificacion">> = {
  cinco_dias_habiles: { label: "5 días hábiles", tono: "azul", descripcion: "Para presentar certificado, análisis y notificación" },
  cuarenta_ocho_horas_habiles: {
    label: "48 horas hábiles",
    tono: "ambar",
    descripcion: "Si el servicio se hizo pero no se registró ante la Dirección",
  },
};

export const ESTADO_NOTIFICACION: Mapa<Enums<"estado_notificacion"> | "vencida"> = {
  emitida: { label: "Emitida", tono: "neutral" },
  notificada: { label: "Notificada", tono: "azul" },
  vencida: { label: "Plazo vencido", tono: "rojo" },
  cumplida: { label: "Cumplida", tono: "verde" },
  acta_labrada: { label: "Acta labrada", tono: "violeta" },
  anulada: { label: "Anulada", tono: "neutral" },
};

export const TIPO_DENUNCIA: Mapa<Enums<"tipo_denuncia">> = {
  empresa_no_habilitada: { label: "Empresa sin habilitación", tono: "rojo" },
  servicio_mal_realizado: { label: "Servicio mal realizado", tono: "ambar" },
  establecimiento_sin_certificado: { label: "Establecimiento sin certificado", tono: "violeta" },
  envases_descartados: { label: "Envases descartados", tono: "ambar" },
  tanque_sin_limpieza: { label: "Tanque sin limpieza", tono: "celeste" },
  otro: { label: "Otro", tono: "neutral" },
};

export const ESTADO_DENUNCIA: Mapa<Enums<"estado_denuncia">> = {
  recibida: { label: "Recibida", tono: "azul" },
  en_curso: { label: "En curso", tono: "ambar" },
  inspeccion_programada: { label: "Inspección programada", tono: "violeta" },
  cerrada: { label: "Cerrada", tono: "verde" },
  desestimada: { label: "Desestimada", tono: "neutral" },
};

export const ESTADO_CAPACITACION: Mapa<Enums<"estado_capacitacion">> = {
  abierta: { label: "Inscripción abierta", tono: "verde" },
  cerrada: { label: "Inscripción cerrada", tono: "ambar" },
  finalizada: { label: "Finalizada", tono: "neutral" },
  cancelada: { label: "Cancelada", tono: "rojo" },
};

export const MODALIDAD_CAPACITACION: Mapa<Enums<"modalidad_capacitacion">> = {
  presencial: { label: "Presencial", tono: "azul" },
  virtual: { label: "Virtual", tono: "celeste" },
  mixta: { label: "Mixta", tono: "violeta" },
};

export const NIVEL_AVISO: Mapa<Enums<"nivel_aviso">> = {
  info: { label: "Información", tono: "azul" },
  alerta: { label: "Atención", tono: "ambar" },
  urgente: { label: "Urgente", tono: "rojo" },
};

export const MOVIMIENTO_ENVASE: Mapa<Enums<"movimiento_envase">> = {
  generado: { label: "Envases vacíos generados", tono: "ambar" },
  entregado: { label: "Entregados a operador", tono: "verde" },
};

export const ORGANISMO: Mapa<Enums<"organismo_registro">> = {
  ANMAT: { label: "ANMAT", tono: "azul" },
  SENASA: { label: "SENASA", tono: "verde" },
};

/** Devuelve la etiqueta o una genérica si el valor no está mapeado. */
export function etiqueta<E extends string>(mapa: Record<E, Etiqueta>, valor: string | null | undefined): Etiqueta {
  if (!valor) return { label: "—", tono: "neutral" };
  return (mapa as Record<string, Etiqueta>)[valor] ?? { label: valor.replace(/_/g, " "), tono: "neutral" };
}
