import type {
  getDocumentosEmpresa,
  getEmpresaLegajo,
  getRenovaciones,
  getTecnicosEmpresa,
  getTramitesAbiertos,
  getTramitesCambioTecnico,
} from "@/lib/data/legajo";
import type { EstadoRequisito } from "../_lib/requisitos";

/** Tipos derivados de las lecturas del módulo (para las secciones del legajo). */
export type EmpresaLegajo = NonNullable<Awaited<ReturnType<typeof getEmpresaLegajo>>>;
export type TecnicoLegajo = Awaited<ReturnType<typeof getTecnicosEmpresa>>[number];
export type DocumentoLegajo = Awaited<ReturnType<typeof getDocumentosEmpresa>>[number];
export type TramiteAbierto = Awaited<ReturnType<typeof getTramitesAbiertos>>[number];
export type Renovacion = Awaited<ReturnType<typeof getRenovaciones>>[number];
/** Trámite de alta o reemplazo de asesor (cualquier estado salvo borrador), del más reciente al más antiguo. */
export type TramiteTecnico = Awaited<ReturnType<typeof getTramitesCambioTecnico>>[number];

export type RequisitoEvaluado = {
  tipo: DocumentoLegajo["tipo"] & string;
  detalle: string;
  norma: string;
  estado: EstadoRequisito;
  documento: DocumentoLegajo | null;
};

export type OpcionTecnico = { id: string; nombre: string };
