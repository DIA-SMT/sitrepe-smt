import "server-only";
import { mensajeError } from "@/lib/acciones";
import { hoyISO } from "@/lib/domain/formato";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

/**
 * Lecturas del módulo "legajo" del área de prestadores: legajo digital, asesores técnicos,
 * documentación, memoria técnica, envases vacíos, trámites y comunicaciones (Arts. 4.º a 8.º; SITREPE).
 * Todas las consultas filtran por la empresa de la sesión; la RLS de la base lo garantiza igual.
 */

type ErrorConsulta = Parameters<typeof mensajeError>[0];

function lanzar(error: ErrorConsulta): never {
  throw new Error(mensajeError(error, "No se pudieron cargar los datos."));
}

/** PostgREST responde 416 (PGRST103) si la página pedida queda fuera del total (p. ej. ?pagina=99 o un enlace viejo). */
const FUERA_DE_RANGO = "PGRST103";

/** Tipos de alerta de v_alertas que conciernen a la empresa (los mismos que cuenta la campana del layout). */
export const TIPOS_ALERTA_EMPRESA = [
  "declaracion_observada",
  "habilitacion_por_vencer",
  "documento_por_vencer",
  "notificacion_vencida",
] as const;

/* --------------------------------------------------------------------------
 * Empresa, técnicos y documentación
 * -------------------------------------------------------------------------- */

export async function getEmpresaLegajo(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_empresas").select("*").eq("id", empresaId).maybeSingle();
  if (error) lanzar(error);
  return data;
}

export async function getTecnicosEmpresa(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tecnicos")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("es_representante", { ascending: false })
    .order("apellido")
    .order("nombre");
  if (error) lanzar(error);
  return data;
}

export async function getDocumentosEmpresa(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_documentos")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false });
  if (error) lanzar(error);
  return data;
}

/* --------------------------------------------------------------------------
 * Trámites
 * -------------------------------------------------------------------------- */

/** Trámites en curso (presentados u observados): evitan solicitudes duplicadas. */
export async function getTramitesAbiertos(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tramites")
    .select("id, codigo, tipo, estado, datos, presentado_at, observaciones, updated_at")
    .eq("empresa_id", empresaId)
    .in("estado", ["presentado", "observado"])
    .order("created_at", { ascending: false });
  if (error) lanzar(error);
  return data;
}

/** Renovaciones anuales (DDJJ de categorización) presentadas por la empresa, de la más reciente a la más antigua. */
export async function getRenovaciones(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tramites")
    .select("id, codigo, estado, datos, presentado_at, resuelto_at, observaciones, resolucion, created_at, updated_at")
    .eq("empresa_id", empresaId)
    .eq("tipo", "renovacion")
    .neq("estado", "borrador")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) lanzar(error);
  return data;
}

export type FiltrosTramites = {
  tipo?: Enums<"tipo_tramite">;
  estado?: Enums<"estado_tramite">;
  desde: number;
  hasta: number;
};

/** Listado paginado de trámites propios (sin borradores internos). */
export async function getTramitesEmpresa(empresaId: string, filtros: FiltrosTramites) {
  const supabase = await createClient();
  const consulta = (soloConteo: boolean) => {
    let q = supabase
      .from("v_tramites")
      .select("*", { count: "exact", head: soloConteo })
      .eq("empresa_id", empresaId)
      .neq("estado", "borrador");
    if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
    if (filtros.estado) q = q.eq("estado", filtros.estado);
    return q;
  };
  const { data, error, count } = await consulta(false)
    .order("created_at", { ascending: false })
    .range(filtros.desde, filtros.hasta);
  if (error?.code === FUERA_DE_RANGO) {
    const { count: total, error: errorTotal } = await consulta(true);
    if (errorTotal) lanzar(errorTotal);
    return { filas: [], total: total ?? 0 };
  }
  if (error) lanzar(error);
  return { filas: data, total: count ?? 0 };
}

/** Cantidad de trámites propios por estado (para indicadores). */
export async function getResumenTramites(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tramites")
    .select("estado")
    .eq("empresa_id", empresaId)
    .neq("estado", "borrador");
  if (error) lanzar(error);
  const resumen: Record<Enums<"estado_tramite">, number> = {
    borrador: 0,
    presentado: 0,
    observado: 0,
    aprobado: 0,
    rechazado: 0,
  };
  for (const t of data) resumen[t.estado] += 1;
  return resumen;
}

/** Trámite propio con sus documentos adjuntos. */
export async function getTramiteEmpresa(empresaId: string, id: string) {
  const supabase = await createClient();
  const [{ data: tramite, error }, { data: documentos, error: errorDocs }] = await Promise.all([
    supabase.from("v_tramites").select("*").eq("id", id).eq("empresa_id", empresaId).maybeSingle(),
    supabase
      .from("documentos")
      .select("*")
      .eq("tramite_id", id)
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: true }),
  ]);
  if (error) lanzar(error);
  if (errorDocs) lanzar(errorDocs);
  if (!tramite) return null;
  return { tramite, documentos };
}

export async function getTecnicoEmpresa(empresaId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tecnicos")
    .select("*")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (error) lanzar(error);
  return data;
}

/* --------------------------------------------------------------------------
 * Memoria técnica (productos por empresa)
 * -------------------------------------------------------------------------- */

export async function getMemoriaTecnica(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_memorias_tecnicas")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("producto_nombre");
  if (error) lanzar(error);
  return data;
}

export async function getItemMemoria(empresaId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_memorias_tecnicas")
    .select("*")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (error) lanzar(error);
  return data;
}

/**
 * Trámites presentados de un tipo (del más reciente al más antiguo), para vincular cada técnico o
 * propuesta de producto con su trámite y conocer su resolución (incluidos los rechazados).
 */
async function getTramitesDeTipo(empresaId: string, tipo: Enums<"tipo_tramite">) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tramites")
    .select("id, codigo, estado, datos, observaciones, created_at")
    .eq("empresa_id", empresaId)
    .eq("tipo", tipo)
    .neq("estado", "borrador")
    .order("created_at", { ascending: false });
  if (error) lanzar(error);
  return data;
}

/** Trámites de alta de producto (para vincular cada propuesta con su trámite). */
export async function getTramitesAltaProducto(empresaId: string) {
  return getTramitesDeTipo(empresaId, "alta_producto");
}

/** Trámites de alta o reemplazo de asesor técnico (para vincular cada asesor con su trámite). */
export async function getTramitesCambioTecnico(empresaId: string) {
  return getTramitesDeTipo(empresaId, "cambio_tecnico");
}

/* --------------------------------------------------------------------------
 * Envases vacíos (SITREPE, Art. 5.º)
 * -------------------------------------------------------------------------- */

export async function getEnvasesSaldo(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_envases_saldo")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("producto_nombre");
  if (error) lanzar(error);
  return data;
}

export type FiltrosEnvases = {
  tipo?: Enums<"movimiento_envase">;
  productoId?: string;
  desde: number;
  hasta: number;
};

export async function getMovimientosEnvases(empresaId: string, filtros: FiltrosEnvases) {
  const supabase = await createClient();
  let q = supabase
    .from("envases_movimientos")
    .select("*, producto:productos(nombre_comercial, organismo, registro_numero)", { count: "exact" })
    .eq("empresa_id", empresaId);
  if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
  if (filtros.productoId) q = q.eq("producto_id", filtros.productoId);
  const { data, error, count } = await q
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .range(filtros.desde, filtros.hasta);
  if (error?.code === FUERA_DE_RANGO) {
    let conteo = supabase.from("envases_movimientos").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId);
    if (filtros.tipo) conteo = conteo.eq("tipo", filtros.tipo);
    if (filtros.productoId) conteo = conteo.eq("producto_id", filtros.productoId);
    const { count: total, error: errorTotal } = await conteo;
    if (errorTotal) lanzar(errorTotal);
    return { filas: [], total: total ?? 0 };
  }
  if (error) lanzar(error);
  return { filas: data, total: count ?? 0 };
}

/* --------------------------------------------------------------------------
 * Avisos, alertas y comunicaciones formales
 * -------------------------------------------------------------------------- */

export type FiltrosAvisos = { soloNoLeidos: boolean; desde: number; hasta: number };

/**
 * Avisos visibles para la empresa (generales y propios) con su estado de lectura
 * para el usuario actual. La RLS limita las lecturas a las del propio perfil.
 */
export async function getAvisosEmpresa(filtros: FiltrosAvisos) {
  const supabase = await createClient();
  const [{ data: lecturas, error: errorLecturas }, { count: totalAvisos, error: errorTotal }] = await Promise.all([
    supabase.from("avisos_lecturas").select("aviso_id, leido_at"),
    supabase.from("avisos").select("id", { count: "exact", head: true }),
  ]);
  if (errorLecturas) lanzar(errorLecturas);
  if (errorTotal) lanzar(errorTotal);

  const leidos = new Map(lecturas.map((l) => [l.aviso_id, l.leido_at]));
  const noLeidos = Math.max(0, (totalAvisos ?? 0) - leidos.size);

  if (filtros.soloNoLeidos) {
    // Los avisos son pocos: se filtran en memoria (evita un `not.in` con cientos de ids en la URL).
    const { data, error } = await supabase
      .from("avisos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) lanzar(error);
    const pendientes = data.filter((a) => !leidos.has(a.id));
    return {
      filas: pendientes.slice(filtros.desde, filtros.hasta + 1).map((a) => ({ ...a, leido_at: null })),
      total: pendientes.length,
      noLeidos,
    };
  }

  const { data, error, count } = await supabase
    .from("avisos")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(filtros.desde, filtros.hasta);
  if (error?.code === FUERA_DE_RANGO) return { filas: [], total: totalAvisos ?? 0, noLeidos };
  if (error) lanzar(error);
  return {
    filas: data.map((a) => ({ ...a, leido_at: leidos.get(a.id) ?? null })),
    total: count ?? 0,
    noLeidos,
  };
}

/**
 * Alertas propias de v_alertas. Las de "documento por vencer" se descartan cuando el documento ya fue
 * reemplazado: la vista sigue informando el documento viejo (vencido) aunque la empresa haya cargado
 * uno nuevo del mismo tipo (y del mismo asesor) que no vence en los próximos 30 días.
 */
export async function getAlertasEmpresa(empresaId: string) {
  const supabase = await createClient();
  const [{ data, error }, { data: documentos, error: errorDocs }] = await Promise.all([
    supabase
      .from("v_alertas")
      .select("*")
      .eq("empresa_id", empresaId)
      .in("tipo", [...TIPOS_ALERTA_EMPRESA])
      .order("fecha", { ascending: true, nullsFirst: false }),
    supabase
      .from("documentos")
      .select("id, tipo, tecnico_id, estado, vence, created_at")
      .eq("empresa_id", empresaId)
      .neq("estado", "rechazado"),
  ]);
  if (error) lanzar(error);
  if (errorDocs) lanzar(errorDocs);

  const limite = sumarDiasISO(hoyISO(), 30);
  const reemplazado = (documentoId: string | null) => {
    const doc = documentos.find((d) => d.id === documentoId);
    if (!doc) return false;
    return documentos.some(
      (otro) =>
        otro.id !== doc.id &&
        otro.tipo === doc.tipo &&
        otro.tecnico_id === doc.tecnico_id &&
        otro.created_at > doc.created_at &&
        (otro.vence === null || otro.vence > limite),
    );
  };
  return data.filter((a) => a.tipo !== "documento_por_vencer" || !reemplazado(a.referencia_id));
}

/** 'AAAA-MM-DD' + n días (calendario, sin zona horaria). */
function sumarDiasISO(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

export async function getNotificacionesEmpresa(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_notificaciones")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) lanzar(error);
  return data;
}

export async function getActasEmpresa(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_actas")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("fecha", { ascending: false })
    .limit(100);
  if (error) lanzar(error);
  return data;
}
