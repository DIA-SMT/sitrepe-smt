import type { Enums } from "@/lib/supabase/database.types";
import type { Unidad } from "./reglas";

/** Formas serializables que viajan del servidor al formulario de la planilla. */

export type RubroOpcion = {
  id: number;
  nombre: string;
  grupo: string;
  periodicidad: Enums<"periodicidad">;
};

export type TecnicoOpcion = {
  id: string;
  nombre: string;
  /** Título y matrícula. */
  detalle: string | null;
  esRepresentante: boolean;
};

export type ProductoOpcion = {
  id: string;
  nombre: string;
  principioActivo: string | null;
  clase: Enums<"clase_producto"> | null;
  organismo: Enums<"organismo_registro"> | null;
  registro: string | null;
  plazoReingresoHoras: number | null;
  dosis: string | null;
};

export type EstablecimientoOpcion = {
  id: string;
  /** Nombre o razón social (es lo que se copia como cliente). */
  nombre: string;
  nombreFantasia: string | null;
  domicilio: string;
  barrio: string | null;
  cuit: string | null;
  rubroId: number | null;
  tieneTanque: boolean;
};

export type ProductoCargado = {
  productoId: string;
  cantidad: string;
  unidad: Unidad;
  /** Nombre del producto ya cargado (para mostrarlo aunque haya salido de la memoria técnica aprobada). */
  nombre?: string;
};

/** Valores de un servicio para editarlo en el formulario. */
export type ServicioEditable = {
  id: string;
  numero: string;
  establecimiento: { id: string; nombre: string; domicilio: string } | null;
  cliente: string;
  clienteCuit: string;
  domicilio: string;
  rubroId: string;
  /** Nombre del rubro cargado (por si ya no figura entre los rubros vigentes del Anexo). */
  rubroNombre: string | null;
  superficie: string;
  capacidad: string;
  /** Valor para <input type="datetime-local"> en hora de Tucumán. */
  fechaLocal: string;
  tecnicoId: string;
  /** Nombre del asesor asignado (por si ya no figura entre los aprobados). */
  tecnicoNombre: string | null;
  laboratorio: string;
  analisisBacteriologico: string | null;
  analisisFisicoquimico: string | null;
  productos: ProductoCargado[];
  /** Si ya tiene la firma del asesor (editar datos sustantivos la anula). */
  firmado: boolean;
  /** Observación del área de Control (certificados observados). */
  observacion: string | null;
};
