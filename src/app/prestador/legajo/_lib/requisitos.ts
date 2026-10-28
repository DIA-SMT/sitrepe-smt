import type { Etiqueta } from "@/lib/domain/etiquetas";
import { diasHasta } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";

/** Documentación obligatoria del legajo digital (Ord. 2681/98, Arts. 4.º a 8.º). */
export const REQUISITOS_LEGAJO: { tipo: Enums<"tipo_documento">; detalle: string; norma: string }[] = [
  { tipo: "constancia_cuit", detalle: "Inscripción en ARCA (ex AFIP/DGI) con CUIT activo.", norma: "Art. 4.º" },
  { tipo: "dni_titular", detalle: "Documento del titular o del representante legal.", norma: "Art. 4.º" },
  {
    tipo: "titulo_tecnico",
    detalle: "Título terciario o universitario autenticado del asesor técnico.",
    norma: "Art. 5.º",
  },
  { tipo: "carnet_sanidad", detalle: "Carnet de sanidad vigente del titular.", norma: "Art. 7.º" },
  {
    tipo: "memoria_tecnica",
    detalle: "Productos, concentraciones, dosis, precauciones, protección, toxicidad y antídotos.",
    norma: "Art. 5.º",
  },
  { tipo: "habilitacion_comercial", detalle: "Habilitación comercial municipal (N.º/SHN/año).", norma: "Art. 4.º" },
  { tipo: "plano_local", detalle: "Oficina y depósito de químicos con espacio exclusivo.", norma: "Art. 6.º" },
  { tipo: "ddjj_anual", detalle: "Declaración Jurada Anual de Categorización.", norma: "Art. 8.º" },
  { tipo: "libre_deuda", detalle: "Libre deuda municipal (renovación y cambio de domicilio).", norma: "Arts. 6.º y 8.º" },
];

/** Días de anticipación con que un documento aprobado figura "por vencer" (igual que v_alertas). */
export const DIAS_AVISO_DOCUMENTO = 30;

export type EstadoRequisito = "cumplido" | "por_vencer" | "vencido" | "en_revision" | "rechazado" | "faltante";

export const ESTADO_REQUISITO: Record<EstadoRequisito, Etiqueta> = {
  cumplido: { label: "Aprobado", tono: "verde" },
  por_vencer: { label: "Por vencer", tono: "ambar" },
  vencido: { label: "Vencido", tono: "rojo" },
  en_revision: { label: "En revisión", tono: "azul" },
  rechazado: { label: "Rechazado", tono: "rojo" },
  faltante: { label: "Falta presentar", tono: "neutral" },
};

type DocumentoEvaluable = {
  estado: Enums<"estado_documento"> | null;
  vence: string | null;
};

/**
 * Estado de un requisito a partir de los documentos de ese tipo (ordenados del más reciente
 * al más antiguo): prioriza un aprobado vigente, luego uno en revisión, luego un aprobado vencido.
 */
export function evaluarRequisito<D extends DocumentoEvaluable>(
  documentos: D[],
  hoy: string,
): { estado: EstadoRequisito; documento: D | null } {
  const vigente = (d: D) => !d.vence || d.vence >= hoy;
  const aprobado = documentos.find((d) => d.estado === "aprobado" && vigente(d));
  if (aprobado) {
    const dias = diasHasta(aprobado.vence, hoy);
    return { estado: dias !== null && dias <= DIAS_AVISO_DOCUMENTO ? "por_vencer" : "cumplido", documento: aprobado };
  }
  const pendiente = documentos.find((d) => d.estado === "pendiente");
  if (pendiente) return { estado: "en_revision", documento: pendiente };
  const vencido = documentos.find((d) => d.estado === "aprobado");
  if (vencido) return { estado: "vencido", documento: vencido };
  const rechazado = documentos.find((d) => d.estado === "rechazado");
  if (rechazado) return { estado: "rechazado", documento: rechazado };
  return { estado: "faltante", documento: null };
}
