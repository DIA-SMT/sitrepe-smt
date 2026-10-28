import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/acciones";
import { hoyISO, isoAFechaHoraLocal } from "@/lib/domain/formato";
import { Constants, type Enums, type Views } from "@/lib/supabase/database.types";

/**
 * Intimaciones: notificaciones con plazo (modelo vigente de la Dirección) y
 * actas de infracción (Art. 2.º Ord. 2681/98; Ord. 2004/92 t.o. 3098/01;
 * Código de Faltas, Ord. 758/82). Lecturas para el área de gestión.
 */

export type Notificacion = Views<"v_notificaciones">;
export type Acta = Views<"v_actas">;
export type InspeccionVista = Views<"v_inspecciones">;
export type EstablecimientoEstado = Views<"v_establecimientos_estado">;

export type TipoNotificacion = Enums<"tipo_notificacion">;
export type PlazoNotificacion = Enums<"plazo_notificacion">;
export type EstadoNotificacion = Enums<"estado_notificacion">;
export type EstadoEfectivoNotificacion = EstadoNotificacion | "vencida";
export type MotivoActa = Enums<"motivo_acta">;
export type EstadoActa = Enums<"estado_acta">;

export const TIPOS_NOTIFICACION = Constants.public.Enums.tipo_notificacion;
export const PLAZOS_NOTIFICACION = Constants.public.Enums.plazo_notificacion;
export const ESTADOS_EFECTIVOS_NOTIFICACION: readonly EstadoEfectivoNotificacion[] = [
  "emitida",
  "notificada",
  "vencida",
  "cumplida",
  "acta_labrada",
  "anulada",
];
export const MOTIVOS_ACTA = Constants.public.Enums.motivo_acta;
export const ESTADOS_ACTA = Constants.public.Enums.estado_acta;

/** Opción de los buscadores de destinatario/infractor. */
export type EntidadOpcion = {
  id: string;
  nombre: string;
  /** Nombre de fantasía o titular. */
  secundario: string | null;
  cuit: string | null;
  domicilio: string | null;
  rubro: string | null;
  /** Datos de contexto (barrio, N.º de registro, estado…). */
  detalle: string | null;
};

export type Inspector = { id: string; nombre: string; rol: Enums<"rol_usuario"> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ¿El texto es un UUID? (evita errores de tipo en la base con ids mal formados). */
export function esUuid(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && UUID.test(valor);
}

/** Toma un valor de searchParams y lo devuelve solo si está entre los permitidos. */
export function valorPermitido<T extends string>(
  valor: string | string[] | undefined,
  permitidos: readonly T[],
): T | undefined {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v && (permitidos as readonly string[]).includes(v) ? (v as T) : undefined;
}

/** Primer valor de un searchParam como texto. */
export function textoParam(valor: string | string[] | undefined): string | undefined {
  const v = (Array.isArray(valor) ? valor[0] : valor)?.trim();
  return v ? v : undefined;
}

/** Fecha 'YYYY-MM-DD' válida o undefined. */
export function fechaParam(valor: string | string[] | undefined): string | undefined {
  const v = textoParam(valor);
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  // Descarta fechas inexistentes (p. ej. 2026-02-30), que la base rechazaría con un error.
  const [a, m, d] = v.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d ? v : undefined;
}

/** Limpia el texto de búsqueda para usarlo dentro de un filtro `or` de PostgREST. */
function patronBusqueda(texto: string): string {
  const limpio = texto.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `%${limpio}%`;
}

/** Instante actual (en un helper para no llamar a Date en el cuerpo de los componentes). */
export function instanteActual(): number {
  return Date.now();
}

/** Fecha y hora actual en Tucumán como valor de <input type="datetime-local">. */
export function fechaHoraLocalActual(): string {
  return isoAFechaHoraLocal(new Date());
}

/** Suma (o resta) días a una fecha 'YYYY-MM-DD'. */
export function desplazarFecha(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Inicio del mes en curso en hora de Tucumán (ISO con zona). */
function inicioDeMes(): string {
  const [anio, mes] = hoyISO().split("-");
  return `${anio}-${mes}-01T00:00:00-03:00`;
}

// -----------------------------------------------------------------------------
// Notificaciones
// -----------------------------------------------------------------------------

export type FiltrosNotificaciones = {
  estado?: EstadoEfectivoNotificacion;
  tipo?: TipoNotificacion;
  q?: string;
  establecimiento?: string;
  empresa?: string;
};

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>;

/** PostgREST responde 416 (PGRST103) si la página pedida queda fuera del total (p. ej. un enlace viejo). */
const FUERA_DE_RANGO = "PGRST103";

function consultaNotificaciones(supabase: ClienteSupabase, filtros: FiltrosNotificaciones, soloConteo: boolean) {
  let consulta = supabase.from("v_notificaciones").select("*", { count: "exact", head: soloConteo });
  if (filtros.estado) consulta = consulta.eq("estado_efectivo", filtros.estado);
  if (filtros.tipo) consulta = consulta.eq("tipo", filtros.tipo);
  if (esUuid(filtros.establecimiento)) consulta = consulta.eq("establecimiento_id", filtros.establecimiento);
  if (esUuid(filtros.empresa)) consulta = consulta.eq("empresa_id", filtros.empresa);
  if (filtros.q) {
    const p = patronBusqueda(filtros.q);
    consulta = consulta.or(
      `numero.ilike.${p},razon_social.ilike.${p},domicilio.ilike.${p},cuit.ilike.${p},orden_trabajo.ilike.${p},persona_notificada.ilike.${p}`,
    );
  }
  return consulta;
}

export async function listarNotificaciones(filtros: FiltrosNotificaciones, rango: { desde: number; hasta: number }) {
  const supabase = await createClient();
  const { data, count, error } = await consultaNotificaciones(supabase, filtros, false)
    .order("created_at", { ascending: false })
    .order("talonario", { ascending: false })
    .range(rango.desde, rango.hasta);
  if (error?.code === FUERA_DE_RANGO) {
    const total = await consultaNotificaciones(supabase, filtros, true);
    if (total.error) throw new Error(mensajeError(total.error, "No se pudieron cargar las notificaciones."));
    return { filas: [], total: total.count ?? 0 };
  }
  if (error) throw new Error(mensajeError(error, "No se pudieron cargar las notificaciones."));
  return { filas: data ?? [], total: count ?? 0 };
}

export type KpisNotificaciones = {
  emitidas: number;
  enPlazo: number;
  vencidas: number;
  cumplidas: number;
  conActa: number;
};

export async function kpisNotificaciones(): Promise<KpisNotificaciones> {
  const supabase = await createClient();
  const contar = (estado: EstadoEfectivoNotificacion) =>
    supabase.from("v_notificaciones").select("id", { count: "exact", head: true }).eq("estado_efectivo", estado);
  const [emitidas, enPlazo, vencidas, cumplidas, conActa] = await Promise.all([
    contar("emitida"),
    contar("notificada"),
    contar("vencida"),
    contar("cumplida"),
    contar("acta_labrada"),
  ]);
  const error = emitidas.error ?? enPlazo.error ?? vencidas.error ?? cumplidas.error ?? conActa.error;
  if (error) throw new Error(mensajeError(error, "No se pudieron calcular los indicadores."));
  return {
    emitidas: emitidas.count ?? 0,
    enPlazo: enPlazo.count ?? 0,
    vencidas: vencidas.count ?? 0,
    cumplidas: cumplidas.count ?? 0,
    conActa: conActa.count ?? 0,
  };
}

/** Notificaciones con plazo vencido (las más antiguas primero): candidatas a acta. */
export async function notificacionesVencidas(limite = 6) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_notificaciones")
    .select("*")
    .eq("estado_efectivo", "vencida")
    .order("vence_at", { ascending: true })
    .limit(limite);
  if (error) throw new Error(mensajeError(error, "No se pudieron cargar las notificaciones vencidas."));
  return data ?? [];
}

/** Notificación con sus actas, el establecimiento y la empresa (memorizada por request). */
export const obtenerNotificacion = cache(async (id: string) => {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data: notificacion, error } = await supabase.from("v_notificaciones").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error, "No se pudo cargar la notificación."));
  if (!notificacion) return null;

  const [actas, establecimiento, empresa] = await Promise.all([
    supabase.from("v_actas").select("*").eq("notificacion_id", id).order("fecha", { ascending: false }),
    notificacion.establecimiento_id
      ? supabase.from("v_establecimientos_estado").select("*").eq("id", notificacion.establecimiento_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    notificacion.empresa_id
      ? supabase
          .from("empresas")
          .select("id, nombre_comercial, cuit, numero_registro, estado")
          .eq("id", notificacion.empresa_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const errorRelacionado = actas.error ?? establecimiento.error ?? empresa.error;
  if (errorRelacionado) throw new Error(mensajeError(errorRelacionado, "No se pudo cargar la notificación."));

  return {
    notificacion,
    actas: actas.data ?? [],
    establecimiento: establecimiento.data,
    empresa: empresa.data,
  };
});

/** Situación del establecimiento frente a sus obligaciones (fumigación y tanques). */
export async function situacionEstablecimiento(id: string | null | undefined) {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_establecimientos_estado")
    .select(
      "id, nombre, estado_fumigacion, fumigacion_vencimiento, fumigacion_empresa, estado_tanque, tanque_vencimiento, tanque_empresa, tiene_tanque",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
}

/** Notificaciones abiertas (emitidas o notificadas) de un establecimiento. */
export async function notificacionesAbiertasDe(establecimientoId: string) {
  if (!esUuid(establecimientoId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_notificaciones")
    .select("*")
    .eq("establecimiento_id", establecimientoId)
    .in("estado", ["emitida", "notificada"])
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

// -----------------------------------------------------------------------------
// Establecimientos, empresas e inspectores (formularios)
// -----------------------------------------------------------------------------

type FilaEstablecimiento = {
  id: string;
  nombre: string;
  nombre_fantasia: string | null;
  cuit: string | null;
  domicilio: string;
  barrio: string | null;
  zona: string | null;
  tiene_tanque: boolean;
  rubros: { nombre: string } | null;
};

function establecimientoAOpcion(e: FilaEstablecimiento): EntidadOpcion {
  const detalle = [e.barrio, e.zona ? `Zona ${e.zona}` : null, e.tiene_tanque ? "Con tanque de reserva" : null]
    .filter(Boolean)
    .join(" · ");
  return {
    id: e.id,
    nombre: e.nombre,
    secundario: e.nombre_fantasia,
    cuit: e.cuit,
    domicilio: e.domicilio,
    rubro: e.rubros?.nombre ?? null,
    detalle: detalle || null,
  };
}

const COLUMNAS_ESTABLECIMIENTO = "id, nombre, nombre_fantasia, cuit, domicilio, barrio, zona, tiene_tanque, rubros(nombre)";

export async function buscarEstablecimientos(texto: string, limite = 8): Promise<EntidadOpcion[]> {
  const supabase = await createClient();
  const p = patronBusqueda(texto);
  const { data, error } = await supabase
    .from("establecimientos")
    .select(COLUMNAS_ESTABLECIMIENTO)
    .eq("activo", true)
    .or(`nombre.ilike.${p},nombre_fantasia.ilike.${p},domicilio.ilike.${p},cuit.ilike.${p}`)
    .order("nombre")
    .limit(limite);
  if (error) throw new Error(mensajeError(error, "No se pudo buscar el establecimiento."));
  return (data ?? []).map(establecimientoAOpcion);
}

export async function obtenerEstablecimientoOpcion(id: string | undefined): Promise<EntidadOpcion | null> {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("establecimientos").select(COLUMNAS_ESTABLECIMIENTO).eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data ? establecimientoAOpcion(data) : null;
}

type FilaEmpresa = {
  id: string;
  nombre_comercial: string;
  titular: string | null;
  cuit: string;
  domicilio_oficina: string | null;
  numero_registro: number | null;
  estado: Enums<"estado_empresa">;
};

function empresaAOpcion(e: FilaEmpresa): EntidadOpcion {
  return {
    id: e.id,
    nombre: e.nombre_comercial,
    secundario: e.titular,
    cuit: e.cuit,
    domicilio: e.domicilio_oficina,
    rubro: "Empresa de control de plagas",
    detalle: [e.numero_registro ? `Registro N.º ${e.numero_registro}` : "Sin N.º de registro", e.estado.replace(/_/g, " ")].join(" · "),
  };
}

const COLUMNAS_EMPRESA = "id, nombre_comercial, titular, cuit, domicilio_oficina, numero_registro, estado";

export async function buscarEmpresas(texto: string, limite = 8): Promise<EntidadOpcion[]> {
  const supabase = await createClient();
  const p = patronBusqueda(texto);
  const { data, error } = await supabase
    .from("empresas")
    .select(COLUMNAS_EMPRESA)
    .or(`nombre_comercial.ilike.${p},titular.ilike.${p},cuit.ilike.${p}`)
    .order("nombre_comercial")
    .limit(limite);
  if (error) throw new Error(mensajeError(error, "No se pudo buscar la empresa."));
  return (data ?? []).map(empresaAOpcion);
}

export async function obtenerEmpresaOpcion(id: string | null | undefined): Promise<EntidadOpcion | null> {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("empresas").select(COLUMNAS_EMPRESA).eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data ? empresaAOpcion(data) : null;
}

/** Personal que puede firmar notificaciones y actas (inspección, control y administración). */
export async function listarInspectores(): Promise<Inspector[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, apellido, email, rol")
    .in("rol", ["inspector", "control", "admin"])
    .eq("activo", true)
    .order("apellido")
    .order("nombre");
  if (error) throw new Error(mensajeError(error, "No se pudo cargar el personal de inspección."));
  return (data ?? [])
    .map((p) => ({ id: p.id, nombre: `${p.nombre} ${p.apellido}`.trim() || p.email || "Sin nombre", rol: p.rol }))
    .sort((a, b) => (a.rol === "inspector" ? 0 : 1) - (b.rol === "inspector" ? 0 : 1));
}

/** ¿El perfil existe, está activo y puede firmar notificaciones y actas? (valida el inspector elegido). */
export async function esPersonalDeInspeccion(id: string): Promise<boolean> {
  if (!esUuid(id)) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select("id")
    .eq("id", id)
    .in("rol", ["inspector", "control", "admin"])
    .eq("activo", true)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error, "No se pudo verificar el inspector."));
  return Boolean(data);
}

/** Feriados entre dos fechas ('YYYY-MM-DD'), para el cómputo de días hábiles en pantalla. */
export async function feriadosEntre(desde: string, hasta: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("feriados").select("fecha").gte("fecha", desde).lte("fecha", hasta).order("fecha");
  if (error) throw new Error(mensajeError(error));
  return (data ?? []).map((f) => f.fecha);
}

// -----------------------------------------------------------------------------
// Actas
// -----------------------------------------------------------------------------

export type FiltrosActas = {
  estado?: EstadoActa;
  motivo?: MotivoActa;
  desde?: string;
  hasta?: string;
  q?: string;
  establecimiento?: string;
  empresa?: string;
};

function consultaActas(supabase: ClienteSupabase, filtros: FiltrosActas, soloConteo: boolean) {
  let consulta = supabase.from("v_actas").select("*", { count: "exact", head: soloConteo });
  if (filtros.estado) consulta = consulta.eq("estado", filtros.estado);
  if (filtros.motivo) consulta = consulta.eq("motivo", filtros.motivo);
  if (filtros.desde) consulta = consulta.gte("fecha", `${filtros.desde}T00:00:00-03:00`);
  if (filtros.hasta) consulta = consulta.lte("fecha", `${filtros.hasta}T23:59:59.999-03:00`);
  if (esUuid(filtros.establecimiento)) consulta = consulta.eq("establecimiento_id", filtros.establecimiento);
  if (esUuid(filtros.empresa)) consulta = consulta.eq("empresa_id", filtros.empresa);
  if (filtros.q) {
    const p = patronBusqueda(filtros.q);
    consulta = consulta.or(
      `numero.ilike.${p},establecimiento_nombre.ilike.${p},establecimiento_domicilio.ilike.${p},empresa_nombre.ilike.${p},notificacion_numero.ilike.${p}`,
    );
  }
  return consulta;
}

export async function listarActas(filtros: FiltrosActas, rango: { desde: number; hasta: number }) {
  const supabase = await createClient();
  const { data, count, error } = await consultaActas(supabase, filtros, false)
    .order("fecha", { ascending: false })
    .order("numero", { ascending: false })
    .range(rango.desde, rango.hasta);
  if (error?.code === FUERA_DE_RANGO) {
    const total = await consultaActas(supabase, filtros, true);
    if (total.error) throw new Error(mensajeError(total.error, "No se pudieron cargar las actas."));
    return { filas: [], total: total.count ?? 0 };
  }
  if (error) throw new Error(mensajeError(error, "No se pudieron cargar las actas."));
  return { filas: data ?? [], total: count ?? 0 };
}

export type KpisActas = { labradas: number; elevadas: number; resueltas: number; delMes: number };

export async function kpisActas(): Promise<KpisActas> {
  const supabase = await createClient();
  const contar = (estado: EstadoActa) =>
    supabase.from("actas").select("id", { count: "exact", head: true }).eq("estado", estado);
  const [labradas, elevadas, resueltas, delMes] = await Promise.all([
    contar("labrada"),
    contar("elevada"),
    contar("resuelta"),
    supabase.from("actas").select("id", { count: "exact", head: true }).gte("fecha", inicioDeMes()).neq("estado", "anulada"),
  ]);
  const error = labradas.error ?? elevadas.error ?? resueltas.error ?? delMes.error;
  if (error) throw new Error(mensajeError(error, "No se pudieron calcular los indicadores."));
  return {
    labradas: labradas.count ?? 0,
    elevadas: elevadas.count ?? 0,
    resueltas: resueltas.count ?? 0,
    delMes: delMes.count ?? 0,
  };
}

/** Actas no anuladas por motivo (de mayor a menor). */
export async function distribucionMotivosActas(): Promise<{ motivo: MotivoActa; cantidad: number }[]> {
  const supabase = await createClient();
  const resultados = await Promise.all(
    MOTIVOS_ACTA.map((motivo) =>
      supabase.from("actas").select("id", { count: "exact", head: true }).eq("motivo", motivo).neq("estado", "anulada"),
    ),
  );
  const error = resultados.find((r) => r.error)?.error;
  if (error) throw new Error(mensajeError(error));
  return MOTIVOS_ACTA.map((motivo, i) => ({ motivo, cantidad: resultados[i].count ?? 0 }))
    .filter((m) => m.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad);
}

/** Datos del infractor para el detalle y la impresión del acta. */
export type DatosInfractor = {
  establecimiento: {
    id: string;
    nombre: string;
    nombre_fantasia: string | null;
    cuit: string | null;
    domicilio: string;
    barrio: string | null;
    rubro: string | null;
    telefono: string | null;
  } | null;
  empresa: {
    id: string;
    nombre_comercial: string;
    titular: string | null;
    cuit: string;
    domicilio_oficina: string | null;
    numero_registro: number | null;
    estado: Enums<"estado_empresa">;
  } | null;
};

/** Acta con el infractor y las actuaciones vinculadas (memorizada por request). */
export const obtenerActa = cache(async (id: string) => {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data: acta, error } = await supabase.from("v_actas").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error, "No se pudo cargar el acta."));
  if (!acta) return null;

  const [establecimiento, empresa, notificacion, inspeccion] = await Promise.all([
    acta.establecimiento_id
      ? supabase
          .from("establecimientos")
          .select("id, nombre, nombre_fantasia, cuit, domicilio, barrio, telefono, rubros(nombre)")
          .eq("id", acta.establecimiento_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    acta.empresa_id
      ? supabase
          .from("empresas")
          .select("id, nombre_comercial, titular, cuit, domicilio_oficina, numero_registro, estado")
          .eq("id", acta.empresa_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    acta.notificacion_id
      ? supabase.from("v_notificaciones").select("*").eq("id", acta.notificacion_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    acta.inspeccion_id
      ? supabase.from("v_inspecciones").select("*").eq("id", acta.inspeccion_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const errorRelacionado = establecimiento.error ?? empresa.error ?? notificacion.error ?? inspeccion.error;
  if (errorRelacionado) throw new Error(mensajeError(errorRelacionado, "No se pudo cargar el acta."));

  const est = establecimiento.data;
  const infractor: DatosInfractor = {
    establecimiento: est
      ? {
          id: est.id,
          nombre: est.nombre,
          nombre_fantasia: est.nombre_fantasia,
          cuit: est.cuit,
          domicilio: est.domicilio,
          barrio: est.barrio,
          rubro: est.rubros?.nombre ?? null,
          telefono: est.telefono,
        }
      : null,
    empresa: empresa.data,
  };

  return { acta, infractor, notificacion: notificacion.data, inspeccion: inspeccion.data };
});

/** Datos para precargar el formulario de nueva acta desde la URL. */
export async function datosParaNuevaActa(params: {
  establecimiento?: string;
  empresa?: string;
  inspeccion?: string;
  notificacion?: string;
}) {
  const supabase = await createClient();
  const [notificacion, inspeccion] = await Promise.all([
    esUuid(params.notificacion)
      ? supabase.from("v_notificaciones").select("*").eq("id", params.notificacion).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    esUuid(params.inspeccion)
      ? supabase.from("v_inspecciones").select("*").eq("id", params.inspeccion).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const error = notificacion.error ?? inspeccion.error;
  if (error) throw new Error(mensajeError(error));

  // Un id inválido en la URL no debe impedir tomar el de la notificación o la inspección vinculada.
  const establecimientoId =
    (esUuid(params.establecimiento) ? params.establecimiento : null) ??
    notificacion.data?.establecimiento_id ??
    inspeccion.data?.establecimiento_id ??
    undefined;
  const empresaId =
    (esUuid(params.empresa) ? params.empresa : null) ??
    notificacion.data?.empresa_id ??
    inspeccion.data?.empresa_id ??
    undefined;

  const [establecimiento, empresa] = await Promise.all([
    obtenerEstablecimientoOpcion(establecimientoId),
    obtenerEmpresaOpcion(empresaId),
  ]);

  return {
    notificacion: notificacion.data,
    inspeccion: inspeccion.data,
    establecimiento,
    empresa,
  };
}

/** Actas previas del mismo infractor (antecedentes). */
export async function antecedentesActas(params: { establecimientoId?: string | null; empresaId?: string | null; excluir?: string }) {
  const filtros: string[] = [];
  if (esUuid(params.establecimientoId)) filtros.push(`establecimiento_id.eq.${params.establecimientoId}`);
  if (esUuid(params.empresaId)) filtros.push(`empresa_id.eq.${params.empresaId}`);
  if (filtros.length === 0) return [];
  const supabase = await createClient();
  let consulta = supabase.from("v_actas").select("*").or(filtros.join(","));
  if (esUuid(params.excluir)) consulta = consulta.neq("id", params.excluir);
  const { data, error } = await consulta.order("fecha", { ascending: false }).limit(5);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}
