import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/acciones";
import type { Enums, Tables } from "@/lib/supabase/database.types";

/**
 * Lecturas del módulo "cuenta": perfil del usuario y estado de la inscripción
 * de la empresa en el registro (Ord. 2681/98, Arts. 4.º a 7.º; SITREPE Art. 6.º).
 */

export type TipoDocumento = Enums<"tipo_documento">;
export type EstadoDocumento = Enums<"estado_documento">;

/** Documentación que la Dirección exige para dar curso a la inscripción. */
export const DOCUMENTOS_INSCRIPCION: { tipo: TipoDocumento; base: string }[] = [
  { tipo: "constancia_cuit", base: "Art. 4.º · inscripción en DGI y CUIT" },
  { tipo: "dni_titular", base: "Art. 4.º · identificación del titular" },
  { tipo: "habilitacion_comercial", base: "Habilitación comercial N.º/SHN/año" },
  { tipo: "carnet_sanidad", base: "Art. 7.º · titular con carnet de sanidad" },
  { tipo: "titulo_tecnico", base: "Art. 5.º · título terciario o universitario autenticado" },
];

export type EmpresaInscripcion = Pick<
  Tables<"empresas">,
  | "id"
  | "numero_registro"
  | "nombre_comercial"
  | "titular"
  | "tipo_persona"
  | "cuit"
  | "email"
  | "telefono"
  | "domicilio_oficina"
  | "domicilio_deposito"
  | "habilitacion_comercial"
  | "resolucion_dsa"
  | "habilita_fumigacion"
  | "habilita_tanques"
  | "estado"
  | "fecha_habilitacion"
  | "vencimiento_habilitacion"
  | "ultima_inspeccion_deposito"
  | "created_at"
>;

export type TramiteInscripcion = Pick<
  Tables<"tramites">,
  "id" | "codigo" | "estado" | "presentado_at" | "resuelto_at" | "resolucion" | "observaciones" | "created_at" | "updated_at"
>;

export type ResumenTecnicos = {
  total: number;
  aprobados: number;
  pendientes: number;
  rechazados: number;
  /** Nombre del representante técnico (o del primero cargado). */
  representante: string | null;
};

export type ResumenProductos = { total: number; aprobados: number; propuestos: number; rechazados: number };

/** Última inspección realizada de oficina y depósito (de habilitación, anual o reinspección del local). */
export type InspeccionLocal = Pick<Tables<"inspecciones">, "tipo" | "resultado" | "realizada_at" | "observaciones">;

export type EstadoInscripcion = {
  empresa: EmpresaInscripcion;
  tramite: TramiteInscripcion | null;
  tecnicos: ResumenTecnicos;
  /** Mejor estado de cada tipo de documento cargado (aprobado > pendiente > rechazado). */
  documentos: Partial<Record<TipoDocumento, EstadoDocumento>>;
  productos: ResumenProductos;
  /** La RLS solo deja ver a la empresa las inspecciones ya realizadas. */
  inspeccion: InspeccionLocal | null;
};

const PRIORIDAD_DOCUMENTO: Record<EstadoDocumento, number> = { aprobado: 3, pendiente: 2, rechazado: 1 };

/**
 * Estado completo de la inscripción de una empresa: datos declarados, trámite de
 * inscripción más reciente y avance del legajo (técnicos, documentos, memoria técnica).
 * Devuelve null si la empresa no existe o la RLS no permite verla.
 */
export async function getEstadoInscripcion(empresaId: string): Promise<EstadoInscripcion | null> {
  const supabase = await createClient();
  const [empresaRes, tramiteRes, tecnicosRes, documentosRes, productosRes, inspeccionRes] = await Promise.all([
    supabase
      .from("empresas")
      .select(
        "id, numero_registro, nombre_comercial, titular, tipo_persona, cuit, email, telefono, domicilio_oficina, domicilio_deposito, habilitacion_comercial, resolucion_dsa, habilita_fumigacion, habilita_tanques, estado, fecha_habilitacion, vencimiento_habilitacion, ultima_inspeccion_deposito, created_at",
      )
      .eq("id", empresaId)
      .maybeSingle(),
    supabase
      .from("tramites")
      .select("id, codigo, estado, presentado_at, resuelto_at, resolucion, observaciones, created_at, updated_at")
      .eq("empresa_id", empresaId)
      .eq("tipo", "inscripcion")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tecnicos")
      .select("nombre, apellido, estado, es_representante")
      .eq("empresa_id", empresaId)
      .neq("estado", "baja"),
    supabase.from("documentos").select("tipo, estado").eq("empresa_id", empresaId),
    supabase.from("empresa_productos").select("estado").eq("empresa_id", empresaId),
    supabase
      .from("inspecciones")
      .select("tipo, resultado, realizada_at, fecha_programada, observaciones")
      .eq("empresa_id", empresaId)
      .eq("estado", "realizada")
      // Habilitación, inspección anual del depósito o reinspección del local (sin establecimiento: no es de un servicio).
      .or("tipo.in.(habilitacion,deposito_anual),and(tipo.eq.reinspeccion,establecimiento_id.is.null)")
      .order("realizada_at", { ascending: false, nullsFirst: false })
      .order("fecha_programada", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const error =
    empresaRes.error ??
    tramiteRes.error ??
    tecnicosRes.error ??
    documentosRes.error ??
    productosRes.error ??
    inspeccionRes.error;
  if (error) throw new Error(mensajeError(error, "No se pudo consultar el estado de la inscripción."));
  if (!empresaRes.data) return null;

  const tecnicos = tecnicosRes.data ?? [];
  // Preferir al representante aprobado (la vista dice "X está aprobado" cuando hay alguno aprobado).
  const representante =
    tecnicos.find((t) => t.es_representante && t.estado === "aprobado") ??
    tecnicos.find((t) => t.estado === "aprobado") ??
    tecnicos.find((t) => t.es_representante) ??
    tecnicos[0] ??
    null;

  const documentos: Partial<Record<TipoDocumento, EstadoDocumento>> = {};
  for (const d of documentosRes.data ?? []) {
    const actual = documentos[d.tipo];
    if (!actual || PRIORIDAD_DOCUMENTO[d.estado] > PRIORIDAD_DOCUMENTO[actual]) documentos[d.tipo] = d.estado;
  }

  const productos = productosRes.data ?? [];

  return {
    empresa: empresaRes.data,
    tramite: tramiteRes.data ?? null,
    tecnicos: {
      total: tecnicos.length,
      aprobados: tecnicos.filter((t) => t.estado === "aprobado").length,
      pendientes: tecnicos.filter((t) => t.estado === "pendiente").length,
      rechazados: tecnicos.filter((t) => t.estado === "rechazado").length,
      representante: representante ? `${representante.nombre} ${representante.apellido}`.trim() : null,
    },
    documentos,
    productos: {
      total: productos.length,
      aprobados: productos.filter((p) => p.estado === "aprobado").length,
      propuestos: productos.filter((p) => p.estado === "propuesto").length,
      rechazados: productos.filter((p) => p.estado === "rechazado").length,
    },
    inspeccion: inspeccionRes.data
      ? {
          tipo: inspeccionRes.data.tipo,
          resultado: inspeccionRes.data.resultado,
          // Una inspección "realizada" siempre tiene resultado, pero la fecha real puede faltar: usar la programada.
          realizada_at: inspeccionRes.data.realizada_at ?? inspeccionRes.data.fecha_programada,
          observaciones: inspeccionRes.data.observaciones,
        }
      : null,
  };
}

export type TecnicoVinculado = Pick<
  Tables<"tecnicos">,
  "id" | "nombre" | "apellido" | "titulo" | "institucion" | "matricula" | "estado" | "es_representante"
>;

/** Asesor técnico del padrón vinculado a la cuenta (rol técnico). */
export async function getTecnicoVinculado(tecnicoId: string): Promise<TecnicoVinculado | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tecnicos")
    .select("id, nombre, apellido, titulo, institucion, matricula, estado, es_representante")
    .eq("id", tecnicoId)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error, "No se pudo consultar el asesor técnico vinculado."));
  return data;
}
