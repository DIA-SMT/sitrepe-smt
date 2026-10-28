import "server-only";
import { cache } from "react";
import { mensajeError } from "@/lib/acciones";
import type { Rol } from "@/lib/auth";
import { getParametros, getRubros } from "@/lib/data/catalogos";
import { formatFecha, formatFechaHora, hoyISO } from "@/lib/domain/formato";
import { ESTADO_TECNICO, PERIODICIDAD, etiqueta } from "@/lib/domain/etiquetas";
import { calcularVencimiento } from "@/lib/domain/vencimiento";
import { urlFirmada } from "@/lib/storage";
import type { Enums, Json, Views } from "@/lib/supabase/database.types";
import { createClient, type SupabaseServer } from "@/lib/supabase/server";

/* =============================================================================
 * Control de Empresas (Art. 10.º a, Ord. 2681/98): bandeja de planillas,
 * verificación de certificados y buscador global de certificados.
 * ========================================================================== */

type EstadoDeclaracion = Enums<"estado_declaracion">;
type EstadoCertificado = Enums<"estado_certificado">;
type TipoServicio = Enums<"tipo_servicio">;
type Periodicidad = Enums<"periodicidad">;

/** Roles que pueden aprobar, observar o rechazar planillas y anular certificados. */
export const ROLES_CONTROL = ["admin", "control"] as const satisfies readonly Rol[];

export function puedeControlar(rol: Rol): boolean {
  return (ROLES_CONTROL as readonly Rol[]).includes(rol);
}

/* -----------------------------------------------------------------------------
 * Utilidades de parámetros de búsqueda
 * -------------------------------------------------------------------------- */

export type ParamsBusqueda = Record<string, string | string[] | undefined>;

/** Primer valor de un searchParam, recortado. */
export function primerValor(valor: string | string[] | undefined): string {
  return ((Array.isArray(valor) ? valor[0] : valor) ?? "").trim();
}

/** ¿El texto es uno de los valores permitidos? (type guard para enums). */
export function esValor<T extends string>(valores: readonly T[], valor: string | null | undefined): valor is T {
  return typeof valor === "string" && (valores as readonly string[]).includes(valor);
}

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && PATRON_UUID.test(valor);
}

function esFechaISO(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

/** Quita los caracteres que rompen la sintaxis de `.or()` de PostgREST y comodines. */
function limpiarBusqueda(texto: string | null | undefined): string {
  return (texto ?? "")
    .replace(/[,()*%\\"':]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function unicos(valores: (string | null | undefined)[]): string[] {
  return [...new Set(valores.filter((v): v is string => typeof v === "string" && v.length > 0))];
}

/** Inicio del día de hoy en Tucumán (UTC-3) como ISO. */
function inicioDeHoyISO(): string {
  return new Date(`${hoyISO()}T00:00:00-03:00`).toISOString();
}

export const TIPOS_SERVICIO = ["fumigacion", "tanque"] as const satisfies readonly TipoServicio[];
export const ESTADOS_CERTIFICADO = [
  "borrador",
  "declarado",
  "observado",
  "controlado",
  "timbrado",
  "anulado",
] as const satisfies readonly EstadoCertificado[];
export const VIGENCIAS_FILTRO = ["vigente", "por_vencer", "vencido", "sin_timbrar", "anulado"] as const;
export type VigenciaFiltro = (typeof VIGENCIAS_FILTRO)[number];

/* -----------------------------------------------------------------------------
 * JSON de productos de v_certificados
 * -------------------------------------------------------------------------- */

export type ProductoAplicado = {
  producto_id: string;
  nombre: string;
  principio_activo: string;
  organismo: string;
  registro: string;
  cantidad: number;
  unidad: string;
};

type ObjetoJson = { [clave: string]: Json | undefined };

function esObjetoJson(valor: Json | undefined): valor is ObjetoJson {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function textoJson(valor: Json | undefined): string {
  if (typeof valor === "string") return valor;
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  return "";
}

/** Convierte la columna `productos` (jsonb) de v_certificados en una lista tipada. */
export function parsearProductos(json: Json | null): ProductoAplicado[] {
  if (!Array.isArray(json)) return [];
  return json.filter(esObjetoJson).map((p) => ({
    producto_id: textoJson(p.producto_id),
    nombre: textoJson(p.nombre),
    principio_activo: textoJson(p.principio_activo),
    organismo: textoJson(p.organismo),
    registro: textoJson(p.registro),
    cantidad: typeof p.cantidad === "number" ? p.cantidad : Number(textoJson(p.cantidad)) || 0,
    unidad: textoJson(p.unidad),
  }));
}

/* -----------------------------------------------------------------------------
 * Perfiles (nombres de quienes presentan, controlan, firman, timbran)
 * -------------------------------------------------------------------------- */

type PerfilMin = { nombre: string; tecnicoId: string | null };

async function getPerfiles(supabase: SupabaseServer, ids: (string | null | undefined)[]): Promise<Map<string, PerfilMin>> {
  const lista = unicos(ids);
  const mapa = new Map<string, PerfilMin>();
  if (lista.length === 0) return mapa;
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, apellido, email, tecnico_id")
    .in("id", lista);
  if (error) throw new Error(mensajeError(error));
  for (const p of data ?? []) {
    mapa.set(p.id, {
      nombre: `${p.nombre} ${p.apellido}`.trim() || p.email || "Usuario sin nombre",
      tecnicoId: p.tecnico_id,
    });
  }
  return mapa;
}

/* =============================================================================
 * Bandeja de control
 * ========================================================================== */

export const VISTAS_BANDEJA = ["presentadas", "observadas", "controladas", "rechazadas"] as const;
export type VistaBandeja = (typeof VISTAS_BANDEJA)[number];

export const ESTADO_POR_VISTA: Record<VistaBandeja, EstadoDeclaracion> = {
  presentadas: "presentada",
  observadas: "observada",
  controladas: "controlada",
  rechazadas: "rechazada",
};

/** Ventana de "controladas recientes". */
export const DIAS_CONTROLADAS_RECIENTES = 30;

function desdeControladasRecientesISO(): string {
  return new Date(Date.now() - DIAS_CONTROLADAS_RECIENTES * 86_400_000).toISOString();
}

export type DeclaracionBandeja = Views<"v_declaraciones">;

export async function getBandejaControl({
  vista,
  busqueda,
  tipo,
  desde,
  hasta,
}: {
  vista: VistaBandeja;
  busqueda?: string;
  tipo?: TipoServicio;
  desde: number;
  hasta: number;
}): Promise<{ filas: DeclaracionBandeja[]; total: number }> {
  const supabase = await createClient();
  let q = supabase.from("v_declaraciones").select("*", { count: "exact" }).eq("estado", ESTADO_POR_VISTA[vista]);
  if (vista === "controladas") q = q.gte("controlada_at", desdeControladasRecientesISO());
  if (tipo) q = q.eq("tipo", tipo);
  const b = limpiarBusqueda(busqueda);
  if (b) q = q.or(`codigo.ilike.%${b}%,empresa_nombre.ilike.%${b}%,empresa_cuit.ilike.%${b}%`);
  // Por controlar: primero las fumigaciones (el enum ordena 'fumigacion' antes que 'tanque'), por el
  // servicio más próximo. Las limpiezas de tanque se declaran ya realizadas: no tienen urgencia.
  q =
    vista === "presentadas"
      ? q
          .order("tipo", { ascending: true })
          .order("primer_servicio", { ascending: true, nullsFirst: false })
          .order("presentada_at", { ascending: true })
      : q.order("controlada_at", { ascending: false, nullsFirst: false });

  const { data, count, error } = await q.range(desde, hasta);
  if (error) throw new Error(mensajeError(error));
  return { filas: data ?? [], total: count ?? 0 };
}

export type ResumenControl = {
  conteos: Record<VistaBandeja, number>;
  /** Planillas de fumigación presentadas con algún servicio en menos de 24 h (o ya iniciado). */
  urgentes: number;
  /** Certificados en estado "declarado" (a verificar). */
  certificadosPorVerificar: number;
  /** Declaraciones resueltas hoy (controladas, observadas o rechazadas). */
  resueltasHoy: number;
};

export async function getResumenControl(): Promise<ResumenControl> {
  const supabase = await createClient();
  const en24h = new Date(Date.now() + 24 * 3_600_000).toISOString();
  const contar = (estado: EstadoDeclaracion) =>
    supabase.from("declaraciones").select("id", { count: "exact", head: true }).eq("estado", estado);

  const resultados = await Promise.all([
    contar("presentada"),
    contar("observada"),
    contar("controlada").gte("controlada_at", desdeControladasRecientesISO()),
    contar("rechazada"),
    // Solo fumigación: la limpieza de tanques se declara una vez realizada (su servicio siempre es pasado).
    supabase
      .from("v_declaraciones")
      .select("id", { count: "exact", head: true })
      .eq("estado", "presentada")
      .eq("tipo", "fumigacion")
      .lt("primer_servicio", en24h),
    supabase.from("certificados").select("id", { count: "exact", head: true }).eq("estado", "declarado"),
    supabase
      .from("declaraciones")
      .select("id", { count: "exact", head: true })
      .in("estado", ["controlada", "observada", "rechazada"])
      .gte("controlada_at", inicioDeHoyISO()),
  ]);
  const conError = resultados.find((r) => r.error);
  if (conError?.error) throw new Error(mensajeError(conError.error));
  const [presentadas, observadas, controladas, rechazadas, urgentes, certificados, hoy] = resultados.map((r) => r.count ?? 0);

  return {
    conteos: { presentadas, observadas, controladas, rechazadas },
    urgentes,
    certificadosPorVerificar: certificados,
    resueltasHoy: hoy,
  };
}

/* =============================================================================
 * Control de una declaración: verificaciones automáticas por certificado
 * ========================================================================== */

export type EstadoVerificacion = "ok" | "aviso" | "falla" | "na";
export type ClaveVerificacion =
  | "rubro"
  | "fecha"
  | "vencimiento"
  | "firma"
  | "tecnico"
  | "productos"
  | "antelacion"
  | "establecimiento";

export type Verificacion = {
  clave: ClaveVerificacion;
  titulo: string;
  estado: EstadoVerificacion;
  detalle: string;
};

export type CertificadoEnControl = {
  id: string;
  numero: string;
  tipo: TipoServicio;
  estado: EstadoCertificado;
  cliente: string;
  domicilio: string;
  rubro: string | null;
  periodicidad: Periodicidad | null;
  superficie_m2: number | null;
  capacidad_litros: number | null;
  fecha_servicio: string | null;
  fecha_vencimiento: string | null;
  tecnico_nombre: string | null;
  productos: ProductoAplicado[];
  observaciones: string | null;
  anulado_motivo: string | null;
  establecimiento_id: string | null;
  establecimiento_nombre: string | null;
  laboratorio: string | null;
  /** URLs firmadas (temporales) de los análisis del agua (solo tanques). */
  analisis: { bacteriologico: string | null; fisicoquimico: string | null };
  verificaciones: Verificacion[];
  /** Sugerencia automática: observar si alguna verificación falla. */
  sugerencia: "ok" | "observar";
  /** Motivo armado con las verificaciones que fallan (hasta LARGO_MAXIMO_MOTIVO caracteres). */
  motivoSugerido: string;
};

/** Largo máximo del motivo de observación de un certificado (lo valida la acción). */
export const LARGO_MAXIMO_MOTIVO = 1500;

function recortar(texto: string, maximo: number): string {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1).trimEnd()}…` : texto;
}

export type ResumenVerificacion = {
  total: number;
  sinFallas: number;
  conFallas: number;
  conAvisos: number;
  verificacionesOk: number;
  verificacionesTotal: number;
};

/** Declaración (v_declaraciones) memorizada por request: la usan la página y su metadata. */
export const getDeclaracionVista = cache(async (id: string): Promise<DeclaracionBandeja | null> => {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_declaraciones").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
});

type TecnicoMin = { nombre: string; estado: Enums<"estado_tecnico">; titulo: string; matricula: string | null };

async function getTecnicos(supabase: SupabaseServer, ids: string[]): Promise<Map<string, TecnicoMin>> {
  const mapa = new Map<string, TecnicoMin>();
  if (ids.length === 0) return mapa;
  const { data, error } = await supabase.from("tecnicos").select("id, nombre, apellido, estado, titulo, matricula").in("id", ids);
  if (error) throw new Error(mensajeError(error));
  for (const t of data ?? []) {
    mapa.set(t.id, { nombre: `${t.nombre} ${t.apellido}`.trim(), estado: t.estado, titulo: t.titulo, matricula: t.matricula });
  }
  return mapa;
}

async function getProductosAprobados(supabase: SupabaseServer, empresaId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("empresa_productos")
    .select("producto_id")
    .eq("empresa_id", empresaId)
    .eq("estado", "aprobado");
  if (error) throw new Error(mensajeError(error));
  return new Set((data ?? []).map((p) => p.producto_id));
}

type EstablecimientoMin = Pick<
  Views<"v_establecimientos_estado">,
  | "id"
  | "nombre"
  | "domicilio"
  | "rubro_id"
  | "rubro_nombre"
  | "fumigacion_certificado_id"
  | "fumigacion_numero"
  | "fumigacion_fecha"
  | "fumigacion_vencimiento"
  | "fumigacion_empresa"
  | "tanque_certificado_id"
  | "tanque_numero"
  | "tanque_fecha"
  | "tanque_vencimiento"
  | "tanque_empresa"
>;

async function getEstablecimientos(supabase: SupabaseServer, ids: string[]): Promise<Map<string, EstablecimientoMin>> {
  const mapa = new Map<string, EstablecimientoMin>();
  if (ids.length === 0) return mapa;
  const { data, error } = await supabase
    .from("v_establecimientos_estado")
    .select(
      "id, nombre, domicilio, rubro_id, rubro_nombre, fumigacion_certificado_id, fumigacion_numero, fumigacion_fecha, fumigacion_vencimiento, fumigacion_empresa, tanque_certificado_id, tanque_numero, tanque_fecha, tanque_vencimiento, tanque_empresa",
    )
    .in("id", ids);
  if (error) throw new Error(mensajeError(error));
  for (const e of data ?? []) if (e.id) mapa.set(e.id, e);
  return mapa;
}

/**
 * URLs firmadas de los análisis del agua en una sola llamada a Storage (respeta su RLS).
 * Si Storage falla, devuelve un mapa vacío: la página muestra "no se pudo generar el enlace".
 */
async function getUrlsAnalisis(supabase: SupabaseServer, paths: (string | null)[]): Promise<Map<string, string>> {
  const lista = unicos(paths);
  const mapa = new Map<string, string>();
  if (lista.length === 0) return mapa;
  const { data, error } = await supabase.storage.from("documentos").createSignedUrls(lista, 600);
  if (error) return mapa;
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) mapa.set(item.path, item.signedUrl);
  }
  return mapa;
}

function numeroParametro(valor: unknown, porDefecto: number): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) && n > 0 ? n : porDefecto;
}

function formatHoras(horas: number): string {
  const abs = Math.abs(horas);
  if (abs < 1) return `${Math.max(1, Math.round(abs * 60))} min`;
  if (abs < 72) return `${Math.round(abs)} h`;
  return `${Math.round(abs / 24)} días`;
}

/** Suma días a una fecha 'YYYY-MM-DD'. */
function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

type ContextoVerificacion = {
  presentadaAt: string | null;
  antelacion: { min: number; max: number };
  /** Vigencia del certificado de tanques (parámetro vencimiento_tanque_dias, Ord. 2004/92). */
  diasTanque: number;
  tecnicos: Map<string, TecnicoMin>;
  firmantes: Map<string, PerfilMin>;
  productosAprobados: Set<string>;
  establecimientos: Map<string, EstablecimientoMin>;
};

/**
 * Antelación del servicio respecto de la presentación de la planilla (Art. 9.º a).
 * `presentada_at` es la ÚLTIMA presentación: un certificado controlado (o timbrado) en una presentación
 * anterior de la misma planilla no puede compararse contra ella. Como presentar_declaracion() ya exigió el
 * plazo al presentarlo y sus fechas no pueden editarse después, una falla en ese caso no es real: se informa
 * como "no aplica". Lo mismo para los certificados anulados.
 */
function verificarAntelacion(c: Views<"v_certificados">, tipo: TipoServicio, ctx: ContextoVerificacion): Verificacion {
  const base = {
    clave: "antelacion",
    titulo: tipo === "fumigacion" ? `Antelación ${ctx.antelacion.min}–${ctx.antelacion.max} h` : "Servicio ya realizado",
  } as const;
  if (!ctx.presentadaAt || !c.fecha_servicio || c.estado === "borrador") {
    return { ...base, estado: "na", detalle: "La planilla todavía no fue presentada." };
  }
  if (c.estado === "anulado") {
    return { ...base, estado: "na", detalle: "Certificado anulado: no se evalúa la antelación." };
  }

  const horas = (new Date(c.fecha_servicio).getTime() - new Date(ctx.presentadaAt).getTime()) / 3_600_000;
  let resultado: Verificacion;
  if (tipo === "tanque") {
    resultado =
      horas <= 0
        ? { ...base, estado: "ok", detalle: `Limpieza realizada ${formatHoras(horas)} antes de la presentación.` }
        : {
            ...base,
            estado: "falla",
            detalle: "La limpieza de tanque se declara una vez realizada y esta es posterior a la presentación.",
          };
  } else if (horas < ctx.antelacion.min) {
    resultado = {
      ...base,
      estado: "falla",
      detalle:
        horas < 0
          ? "Fuera de plazo: el servicio es anterior a la presentación de la planilla."
          : `Fuera de plazo: se declaró con ${formatHoras(horas)} de antelación (mínimo ${ctx.antelacion.min} h).`,
    };
  } else if (horas > ctx.antelacion.max) {
    resultado = {
      ...base,
      estado: "falla",
      detalle: `Fuera de plazo: se declaró con ${formatHoras(horas)} de antelación (máximo ${ctx.antelacion.max} h).`,
    };
  } else {
    resultado = { ...base, estado: "ok", detalle: `Declarado con ${formatHoras(horas)} de antelación.` };
  }

  const presentadoEnEstaRonda = c.estado === "declarado" || c.estado === "observado";
  if (resultado.estado === "falla" && !presentadoEnEstaRonda) {
    return {
      ...base,
      estado: "na",
      detalle: "Controlado en una presentación anterior de la planilla: el plazo se verificó al presentarlo.",
    };
  }
  return resultado;
}

function verificarCertificado(c: Views<"v_certificados">, ctx: ContextoVerificacion): Verificacion[] {
  const tipo: TipoServicio = c.tipo ?? "fumigacion";
  const periodicidad = c.rubro_periodicidad;
  const unicaVez = tipo === "fumigacion" && periodicidad === "unica_vez";
  const est = c.establecimiento_id ? ctx.establecimientos.get(c.establecimiento_id) : undefined;
  const lista: Verificacion[] = [];

  // 1. Rubro informado (y coherente con el registrado para el establecimiento).
  if (!c.rubro_id || !c.rubro_nombre) {
    lista.push({
      clave: "rubro",
      titulo: "Rubro informado",
      estado: "falla",
      detalle: "Sin rubro: no se consigna la actividad del establecimiento y no puede verificarse el vencimiento.",
    });
  } else {
    const descripcion = `${c.rubro_grupo ?? "Anexo"} · ${c.rubro_nombre}${periodicidad ? ` (${etiqueta(PERIODICIDAD, periodicidad).label.toLowerCase()})` : ""}`;
    if (c.rubro_grupo === "No tipificada") {
      lista.push({
        clave: "rubro",
        titulo: "Rubro informado",
        estado: "aviso",
        detalle: `${descripcion}. Actividad no tipificada: verificá la periodicidad fijada por similitud.`,
      });
    } else if (est?.rubro_id && est.rubro_id !== c.rubro_id) {
      lista.push({
        clave: "rubro",
        titulo: "Rubro informado",
        estado: "aviso",
        detalle: `${descripcion}. El establecimiento figura registrado como "${est.rubro_nombre ?? "otro rubro"}".`,
      });
    } else {
      lista.push({ clave: "rubro", titulo: "Rubro informado", estado: "ok", detalle: descripcion });
    }
  }

  // 2. Fechas informadas (servicio y vencimiento).
  if (!c.fecha_servicio) {
    lista.push({ clave: "fecha", titulo: "Fechas informadas", estado: "falla", detalle: "Sin fecha: falta la fecha y hora del servicio." });
  } else if (!c.fecha_vencimiento && !unicaVez) {
    lista.push({
      clave: "fecha",
      titulo: "Fechas informadas",
      estado: "falla",
      detalle: `Servicio el ${formatFechaHora(c.fecha_servicio)}, pero falta la fecha de vencimiento.`,
    });
  } else {
    lista.push({
      clave: "fecha",
      titulo: "Fechas informadas",
      estado: "ok",
      detalle: `Servicio el ${formatFechaHora(c.fecha_servicio)}${c.fecha_vencimiento ? ` · vence el ${formatFecha(c.fecha_vencimiento)}` : ""}.`,
    });
  }

  // 3. Vencimiento correcto según la periodicidad del Anexo (o 180 días para tanques).
  if (!c.fecha_servicio || (tipo === "fumigacion" && !periodicidad)) {
    lista.push({
      clave: "vencimiento",
      titulo: "Vencimiento según Anexo",
      estado: "falla",
      detalle: "No puede calcularse el vencimiento: falta el rubro o la fecha del servicio.",
    });
  } else {
    const fechaLocal = hoyISO(new Date(c.fecha_servicio));
    // Misma regla que public.calcular_vencimiento(): tanques según el parámetro; fumigación según el Anexo.
    const esperado =
      tipo === "tanque" ? sumarDias(fechaLocal, ctx.diasTanque) : calcularVencimiento(tipo, periodicidad, fechaLocal);
    if (esperado === (c.fecha_vencimiento ?? null)) {
      lista.push({
        clave: "vencimiento",
        titulo: "Vencimiento según Anexo",
        estado: "ok",
        detalle: esperado
          ? `Vence el ${formatFecha(esperado)} (${tipo === "tanque" ? `${ctx.diasTanque} días, Ord. 2004/92` : etiqueta(PERIODICIDAD, periodicidad).label.toLowerCase()}).`
          : "Servicio por única vez: no tiene vencimiento.",
      });
    } else {
      lista.push({
        clave: "vencimiento",
        titulo: "Vencimiento según Anexo",
        estado: "falla",
        detalle: `Vencimiento incorrecto: figura ${c.fecha_vencimiento ? formatFecha(c.fecha_vencimiento) : "sin fecha"} y según el Anexo corresponde ${esperado ? formatFecha(esperado) : "sin vencimiento"}.`,
      });
    }
  }

  // 4. Firma digital del asesor técnico declarado (evita la "firma incorrecta").
  if (!c.firma_hash || !c.firmado_at) {
    lista.push({
      clave: "firma",
      titulo: "Firma del asesor técnico",
      estado: "falla",
      detalle: "Falta la firma digital del asesor técnico registrado en el padrón.",
    });
  } else {
    const firmante = c.firmado_por ? ctx.firmantes.get(c.firmado_por) : undefined;
    if (!firmante) {
      lista.push({
        clave: "firma",
        titulo: "Firma del asesor técnico",
        estado: "aviso",
        detalle: `Firmado el ${formatFechaHora(c.firmado_at)}; no se pudo identificar al firmante.`,
      });
    } else if (firmante.tecnicoId !== c.tecnico_id) {
      lista.push({
        clave: "firma",
        titulo: "Firma del asesor técnico",
        estado: "falla",
        detalle: `Firma incorrecta: firmó ${firmante.nombre}, que no es el asesor técnico declarado en el certificado.`,
      });
    } else {
      lista.push({
        clave: "firma",
        titulo: "Firma del asesor técnico",
        estado: "ok",
        detalle: `Firmado digitalmente por ${firmante.nombre} el ${formatFechaHora(c.firmado_at)}.`,
      });
    }
  }

  // 5. Técnico aprobado por la Dirección.
  const tecnico = c.tecnico_id ? ctx.tecnicos.get(c.tecnico_id) : undefined;
  if (!tecnico) {
    lista.push({ clave: "tecnico", titulo: "Técnico aprobado", estado: "falla", detalle: "El asesor técnico no figura en el padrón de la empresa." });
  } else if (tecnico.estado !== "aprobado") {
    lista.push({
      clave: "tecnico",
      titulo: "Técnico aprobado",
      estado: "falla",
      detalle: `${tecnico.nombre}: ${etiqueta(ESTADO_TECNICO, tecnico.estado).label.toLowerCase()} en el padrón.`,
    });
  } else {
    lista.push({
      clave: "tecnico",
      titulo: "Técnico aprobado",
      estado: "ok",
      detalle: `${tecnico.nombre} · ${tecnico.titulo}${tecnico.matricula ? ` · Mat. ${tecnico.matricula}` : ""}.`,
    });
  }

  // 6. Productos de la memoria técnica (fumigación) o análisis del agua (tanques).
  if (tipo === "fumigacion") {
    const productos = parsearProductos(c.productos);
    const noAprobados = productos.filter((p) => !ctx.productosAprobados.has(p.producto_id));
    if (productos.length === 0) {
      lista.push({ clave: "productos", titulo: "Productos de la memoria técnica", estado: "falla", detalle: "No se informaron productos aplicados." });
    } else if (noAprobados.length > 0) {
      lista.push({
        clave: "productos",
        titulo: "Productos de la memoria técnica",
        estado: "falla",
        detalle: `No figuran en la memoria técnica aprobada: ${noAprobados.map((p) => p.nombre).join(", ")}.`,
      });
    } else {
      lista.push({
        clave: "productos",
        titulo: "Productos de la memoria técnica",
        estado: "ok",
        detalle: `${productos.length === 1 ? "1 producto aprobado" : `${productos.length} productos aprobados`}: ${productos.map((p) => `${p.nombre} (${p.organismo} ${p.registro})`).join(", ")}.`,
      });
    }
  } else if (!c.analisis_bacteriologico_path || !c.analisis_fisicoquimico_path) {
    lista.push({
      clave: "productos",
      titulo: "Análisis del agua",
      estado: "falla",
      detalle: "Faltan los análisis bacteriológico y físico-químico del agua.",
    });
  } else {
    lista.push({
      clave: "productos",
      titulo: "Análisis del agua",
      estado: "ok",
      detalle: `Análisis bacteriológico y físico-químico adjuntos${c.laboratorio ? ` (${c.laboratorio})` : ""}.`,
    });
  }

  // 7. Antelación respecto de la presentación de la planilla.
  lista.push(verificarAntelacion(c, tipo, ctx));

  // 8. Establecimiento vinculado y su último certificado timbrado.
  if (!c.establecimiento_id) {
    lista.push({
      clave: "establecimiento",
      titulo: "Establecimiento",
      estado: "aviso",
      detalle: "Sin establecimiento vinculado: el vencimiento no se seguirá en la hoja de ruta.",
    });
  } else if (!est) {
    lista.push({
      clave: "establecimiento",
      titulo: "Establecimiento",
      estado: "aviso",
      detalle: "El establecimiento vinculado está dado de baja o no tiene datos disponibles.",
    });
  } else {
    const ultimoId = tipo === "fumigacion" ? est.fumigacion_certificado_id : est.tanque_certificado_id;
    const ultimoNumero = tipo === "fumigacion" ? est.fumigacion_numero : est.tanque_numero;
    const ultimoVence = tipo === "fumigacion" ? est.fumigacion_vencimiento : est.tanque_vencimiento;
    const ultimaEmpresa = tipo === "fumigacion" ? est.fumigacion_empresa : est.tanque_empresa;
    const ultimaFecha = tipo === "fumigacion" ? est.fumigacion_fecha : est.tanque_fecha;
    const nombre = `${est.nombre ?? "Establecimiento"}${est.domicilio ? ` · ${est.domicilio}` : ""}`;
    // Al consultar una planilla ya resuelta, el último timbrado del establecimiento puede ser POSTERIOR a este
    // servicio: no es un antecedente y no debe marcarse como posible duplicado.
    const esPosterior =
      !!ultimoId &&
      ultimoId !== c.id &&
      !!ultimaFecha &&
      !!c.fecha_servicio &&
      new Date(ultimaFecha).getTime() > new Date(c.fecha_servicio).getTime();
    if (!ultimoId || ultimoId === c.id) {
      lista.push({
        clave: "establecimiento",
        titulo: "Establecimiento",
        estado: "ok",
        detalle:
          ultimoId === c.id
            ? `${nombre}. Es el último certificado timbrado del establecimiento.`
            : `${nombre}. Sin certificados timbrados anteriores.`,
      });
    } else if (esPosterior) {
      lista.push({
        clave: "establecimiento",
        titulo: "Establecimiento",
        estado: "ok",
        detalle: `${nombre}. Tiene un certificado timbrado posterior a este servicio (N.º ${ultimoNumero ?? "—"}${
          ultimaEmpresa ? `, ${ultimaEmpresa}` : ""
        }).`,
      });
    } else {
      const fechaServicio = c.fecha_servicio ? hoyISO(new Date(c.fecha_servicio)) : null;
      const vigenteDeMas = !!(ultimoVence && fechaServicio && ultimoVence > sumarDias(fechaServicio, 15));
      lista.push({
        clave: "establecimiento",
        titulo: "Establecimiento",
        estado: vigenteDeMas ? "aviso" : "ok",
        detalle: `${nombre}. Último certificado N.º ${ultimoNumero ?? "—"}${ultimaEmpresa ? ` (${ultimaEmpresa})` : ""}${
          ultimoVence ? `, ${vigenteDeMas ? "vigente hasta" : "vence el"} ${formatFecha(ultimoVence)}` : ", sin vencimiento"
        }${vigenteDeMas ? ": verificá que no sea un servicio duplicado." : "."}`,
      });
    }
  }

  return lista;
}

export type ControlDeclaracion = {
  declaracion: DeclaracionBandeja;
  empresa: Views<"v_empresas"> | null;
  /** Resultado de rpc empresa_habilitada (null si no pudo consultarse). */
  habilitada: boolean | null;
  presentadaPor: string | null;
  controladaPor: string | null;
  antelacion: { min: number; max: number };
  certificados: CertificadoEnControl[];
  resumen: ResumenVerificacion;
};

export async function getControlDeclaracion(id: string): Promise<ControlDeclaracion | null> {
  const declaracion = await getDeclaracionVista(id);
  if (!declaracion?.id || !declaracion.empresa_id) return null;
  const empresaId = declaracion.empresa_id;
  const tipo: TipoServicio = declaracion.tipo ?? "fumigacion";
  const supabase = await createClient();

  const [empresaRes, habilitadaRes, certificadosRes, parametros, perfiles, productosAprobados] = await Promise.all([
    supabase.from("v_empresas").select("*").eq("id", empresaId).maybeSingle(),
    supabase.rpc("empresa_habilitada", { p_empresa: empresaId, p_tipo: tipo }),
    supabase
      .from("v_certificados")
      .select("*")
      .eq("declaracion_id", declaracion.id)
      .order("fecha_servicio", { ascending: true })
      .order("numero", { ascending: true }),
    getParametros(),
    getPerfiles(supabase, [declaracion.presentada_por, declaracion.controlada_por]),
    getProductosAprobados(supabase, empresaId),
  ]);
  if (empresaRes.error) throw new Error(mensajeError(empresaRes.error));
  if (certificadosRes.error) throw new Error(mensajeError(certificadosRes.error));

  const filas = (certificadosRes.data ?? []).filter((c) => !!c.id);
  const [tecnicos, firmantes, establecimientos, urlsAnalisis] = await Promise.all([
    getTecnicos(supabase, unicos(filas.map((c) => c.tecnico_id))),
    getPerfiles(supabase, filas.map((c) => c.firmado_por)),
    getEstablecimientos(supabase, unicos(filas.map((c) => c.establecimiento_id))),
    getUrlsAnalisis(
      supabase,
      filas.flatMap((c) => (c.tipo === "tanque" ? [c.analisis_bacteriologico_path, c.analisis_fisicoquimico_path] : [])),
    ),
  ]);
  const urlAnalisis = (path: string | null) => (path ? (urlsAnalisis.get(path) ?? null) : null);

  const antelacion = {
    min: numeroParametro(parametros.antelacion_min_horas, 24),
    max: numeroParametro(parametros.antelacion_max_horas, 48),
  };
  const ctx: ContextoVerificacion = {
    presentadaAt: declaracion.presentada_at,
    antelacion,
    diasTanque: numeroParametro(parametros.vencimiento_tanque_dias, 180),
    tecnicos,
    firmantes,
    productosAprobados,
    establecimientos,
  };

  const certificados: CertificadoEnControl[] = filas.map((c) => {
    const verificaciones = verificarCertificado(c, ctx);
    const fallas = verificaciones.filter((v) => v.estado === "falla");
    const est = c.establecimiento_id ? establecimientos.get(c.establecimiento_id) : undefined;
    return {
      id: c.id ?? "",
      numero: c.numero ?? "—",
      tipo: c.tipo ?? tipo,
      estado: c.estado ?? "borrador",
      cliente: c.cliente ?? "—",
      domicilio: c.domicilio ?? "—",
      rubro: c.rubro_nombre ? `${c.rubro_grupo ? `${c.rubro_grupo} · ` : ""}${c.rubro_nombre}` : null,
      periodicidad: c.rubro_periodicidad,
      superficie_m2: c.superficie_m2,
      capacidad_litros: c.capacidad_litros,
      fecha_servicio: c.fecha_servicio,
      fecha_vencimiento: c.fecha_vencimiento,
      tecnico_nombre: c.tecnico_nombre,
      productos: parsearProductos(c.productos),
      observaciones: c.observaciones,
      anulado_motivo: c.anulado_motivo,
      establecimiento_id: c.establecimiento_id,
      establecimiento_nombre: est?.nombre ?? null,
      laboratorio: c.laboratorio,
      analisis: {
        bacteriologico: urlAnalisis(c.analisis_bacteriologico_path),
        fisicoquimico: urlAnalisis(c.analisis_fisicoquimico_path),
      },
      verificaciones,
      sugerencia: fallas.length > 0 ? "observar" : "ok",
      motivoSugerido: recortar(fallas.map((f) => f.detalle).join(" "), LARGO_MAXIMO_MOTIVO),
    };
  });

  const todas = certificados.flatMap((c) => c.verificaciones).filter((v) => v.estado !== "na");
  const resumen: ResumenVerificacion = {
    total: certificados.length,
    sinFallas: certificados.filter((c) => c.sugerencia === "ok").length,
    conFallas: certificados.filter((c) => c.sugerencia === "observar").length,
    conAvisos: certificados.filter((c) => c.verificaciones.some((v) => v.estado === "aviso")).length,
    verificacionesOk: todas.filter((v) => v.estado === "ok").length,
    verificacionesTotal: todas.length,
  };

  return {
    declaracion,
    empresa: empresaRes.data,
    habilitada: habilitadaRes.error ? null : habilitadaRes.data,
    presentadaPor: declaracion.presentada_por ? (perfiles.get(declaracion.presentada_por)?.nombre ?? null) : null,
    controladaPor: declaracion.controlada_por ? (perfiles.get(declaracion.controlada_por)?.nombre ?? null) : null,
    antelacion,
    certificados,
    resumen,
  };
}

/* =============================================================================
 * Buscador global de certificados
 * ========================================================================== */

export type FiltrosCertificados = {
  busqueda?: string;
  empresa?: string;
  estado?: EstadoCertificado;
  tipo?: TipoServicio;
  vigencia?: VigenciaFiltro;
  grupo?: string;
  desde?: string;
  hasta?: string;
};

/** Lee y valida los filtros del buscador desde los searchParams. */
export function filtrosCertificadosDesdeParams(sp: ParamsBusqueda): FiltrosCertificados {
  const empresa = primerValor(sp.empresa);
  const estado = primerValor(sp.estado);
  const tipo = primerValor(sp.tipo);
  const vigencia = primerValor(sp.vigencia);
  const desde = primerValor(sp.desde);
  const hasta = primerValor(sp.hasta);
  return {
    busqueda: primerValor(sp.q) || undefined,
    empresa: esUuid(empresa) ? empresa : undefined,
    estado: esValor(ESTADOS_CERTIFICADO, estado) ? estado : undefined,
    tipo: esValor(TIPOS_SERVICIO, tipo) ? tipo : undefined,
    vigencia: esValor(VIGENCIAS_FILTRO, vigencia) ? vigencia : undefined,
    grupo: primerValor(sp.grupo).slice(0, 60) || undefined,
    desde: esFechaISO(desde) ? desde : undefined,
    hasta: esFechaISO(hasta) ? hasta : undefined,
  };
}

export type CertificadoListado = Pick<
  Views<"v_certificados">,
  | "id"
  | "numero"
  | "tipo"
  | "estado"
  | "vigencia"
  | "cliente"
  | "domicilio"
  | "rubro_nombre"
  | "rubro_grupo"
  | "fecha_servicio"
  | "fecha_vencimiento"
  | "empresa_id"
  | "empresa_nombre"
  | "sello_codigo"
  | "codigo_verificacion"
  | "declaracion_codigo"
>;

export async function buscarCertificados(
  f: FiltrosCertificados,
  rango: { desde: number; hasta: number },
): Promise<{ filas: CertificadoListado[]; total: number }> {
  const supabase = await createClient();
  let q = supabase
    .from("v_certificados")
    .select(
      "id, numero, tipo, estado, vigencia, cliente, domicilio, rubro_nombre, rubro_grupo, fecha_servicio, fecha_vencimiento, empresa_id, empresa_nombre, sello_codigo, codigo_verificacion, declaracion_codigo",
      { count: "exact" },
    );
  const b = limpiarBusqueda(f.busqueda);
  if (b) {
    q = q.or(
      `numero.ilike.%${b}%,cliente.ilike.%${b}%,domicilio.ilike.%${b}%,codigo_verificacion.ilike.%${b}%,sello_codigo.ilike.%${b}%`,
    );
  }
  if (f.empresa) q = q.eq("empresa_id", f.empresa);
  if (f.estado) q = q.eq("estado", f.estado);
  if (f.tipo) q = q.eq("tipo", f.tipo);
  if (f.vigencia) q = q.eq("vigencia", f.vigencia);
  if (f.grupo) q = q.eq("rubro_grupo", f.grupo);
  if (f.desde) q = q.gte("fecha_servicio", new Date(`${f.desde}T00:00:00-03:00`).toISOString());
  if (f.hasta) q = q.lte("fecha_servicio", new Date(`${f.hasta}T23:59:59.999-03:00`).toISOString());

  const { data, count, error } = await q
    .order("fecha_servicio", { ascending: false, nullsFirst: false })
    .order("numero", { ascending: false })
    .range(rango.desde, rango.hasta);
  if (error) throw new Error(mensajeError(error));
  return { filas: data ?? [], total: count ?? 0 };
}

export type ResumenCertificados = { vigentes: number; porVencer: number; vencidos: number; aControlar: number };

/** Indicadores del buscador (globales o de una empresa). */
export async function getResumenCertificados(empresa?: string): Promise<ResumenCertificados> {
  const supabase = await createClient();
  const base = () => {
    const q = supabase.from("v_certificados").select("id", { count: "exact", head: true });
    return empresa ? q.eq("empresa_id", empresa) : q;
  };
  const resultados = await Promise.all([
    base().eq("vigencia", "vigente"),
    base().eq("vigencia", "por_vencer"),
    base().eq("vigencia", "vencido"),
    base().eq("estado", "declarado"),
  ]);
  const conError = resultados.find((r) => r.error);
  if (conError?.error) throw new Error(mensajeError(conError.error));
  const [vigentes, porVencer, vencidos, aControlar] = resultados.map((r) => r.count ?? 0);
  return { vigentes, porVencer, vencidos, aControlar };
}

/** Opciones de los filtros del buscador: empresas del padrón y grupos del Anexo. */
export async function getOpcionesFiltroCertificados(): Promise<{
  empresas: { id: string; nombre: string }[];
  grupos: string[];
}> {
  const supabase = await createClient();
  const [empresasRes, rubros] = await Promise.all([
    supabase.from("empresas").select("id, nombre_comercial").order("nombre_comercial"),
    getRubros({ soloActivos: false }),
  ]);
  if (empresasRes.error) throw new Error(mensajeError(empresasRes.error));
  return {
    empresas: (empresasRes.data ?? []).map((e) => ({ id: e.id, nombre: e.nombre_comercial })),
    grupos: [...new Set((rubros ?? []).map((r) => r.grupo))].sort((a, b) => a.localeCompare(b, "es")),
  };
}

/* =============================================================================
 * Detalle de un certificado
 * ========================================================================== */

export type CertificadoVista = Views<"v_certificados">;

/** Certificado (v_certificados) memorizado por request: lo usan la página y su metadata. */
export const getCertificadoVista = cache(async (id: string): Promise<CertificadoVista | null> => {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_certificados").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
});

export type CambioAuditoria = { campo: string; antes: string; despues: string };
export type TrazaAuditoria = {
  id: number;
  accion: string;
  fecha: string;
  usuario: string | null;
  cambios: CambioAuditoria[];
};

const CAMPOS_AUDITORIA: Record<string, string> = {
  estado: "Estado",
  observaciones: "Observaciones",
  anulado_motivo: "Motivo de anulación",
  numero: "Número",
  cliente: "Cliente",
  cliente_cuit: "CUIT del cliente",
  domicilio: "Domicilio",
  rubro_id: "Rubro",
  superficie_m2: "Superficie (m²)",
  capacidad_litros: "Capacidad (L)",
  fecha_servicio: "Fecha del servicio",
  fecha_vencimiento: "Vencimiento",
  tecnico_id: "Asesor técnico",
  establecimiento_id: "Establecimiento",
  plazo_reingreso_horas: "Plazo de reingreso (h)",
  firmado_at: "Firmado",
  firmado_por: "Firmante",
  firma_hash: "Firma digital",
  pago_id: "Liquidación",
  timbrado_at: "Timbrado",
  timbrado_por: "Timbrado por",
  sello_codigo: "Sello",
  laboratorio: "Laboratorio",
  analisis_bacteriologico_path: "Análisis bacteriológico",
  analisis_fisicoquimico_path: "Análisis físico-químico",
};

const CAMPOS_AUDITORIA_OMITIDOS = new Set(["updated_at"]);

function valorAuditoria(valor: Json | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const texto = typeof valor === "string" ? valor : typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  return texto.length > 90 ? `${texto.slice(0, 87)}…` : texto;
}

function diferenciasAuditoria(antes: Json | null, despues: Json | null): CambioAuditoria[] {
  if (!esObjetoJson(antes) || !esObjetoJson(despues)) return [];
  const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);
  const cambios: CambioAuditoria[] = [];
  for (const clave of claves) {
    if (CAMPOS_AUDITORIA_OMITIDOS.has(clave)) continue;
    if (JSON.stringify(antes[clave] ?? null) === JSON.stringify(despues[clave] ?? null)) continue;
    cambios.push({
      campo: CAMPOS_AUDITORIA[clave] ?? clave.replace(/_/g, " "),
      antes: valorAuditoria(antes[clave]),
      despues: valorAuditoria(despues[clave]),
    });
  }
  return cambios;
}

export type DetalleCertificado = {
  certificado: CertificadoVista & { id: string };
  productos: ProductoAplicado[];
  declaracion: {
    id: string;
    codigo: string | null;
    estado: EstadoDeclaracion;
    presentada_at: string | null;
    controlada_at: string | null;
    observaciones: string | null;
  } | null;
  pago: Pick<
    Views<"v_pagos">,
    | "id"
    | "codigo"
    | "estado"
    | "importe_total"
    | "cantidad"
    | "created_at"
    | "informado_at"
    | "verificado_at"
    | "fecha_pago"
    | "cuenta_codigo"
    | "arancel_concepto"
  > | null;
  establecimiento: Pick<
    Views<"v_establecimientos_estado">,
    "id" | "nombre" | "domicilio" | "barrio" | "zona" | "estado_fumigacion" | "estado_tanque" | "tiene_tanque"
  > | null;
  inspecciones: Pick<
    Views<"v_inspecciones">,
    "id" | "codigo" | "tipo" | "estado" | "fecha_programada" | "resultado" | "inspector_nombre"
  >[];
  firmante: string | null;
  timbradoPor: string | null;
  cargadoPor: string | null;
  analisis: { bacteriologico: string | null; fisicoquimico: string | null };
  /** Solo para administración (la RLS de auditoría también lo restringe). */
  auditoria: TrazaAuditoria[] | null;
};

export async function getCertificadoDetalle(id: string, opciones: { conAuditoria: boolean }): Promise<DetalleCertificado | null> {
  const c = await getCertificadoVista(id);
  if (!c?.id) return null;
  const certificadoId = c.id;
  const supabase = await createClient();

  const [declaracionRes, pagoRes, establecimientoRes, inspeccionesRes, auditoriaRes] = await Promise.all([
    c.declaracion_id
      ? supabase
          .from("declaraciones")
          .select("id, codigo, estado, presentada_at, controlada_at, observaciones")
          .eq("id", c.declaracion_id)
          .maybeSingle()
      : null,
    c.pago_id
      ? supabase
          .from("v_pagos")
          .select(
            "id, codigo, estado, importe_total, cantidad, created_at, informado_at, verificado_at, fecha_pago, cuenta_codigo, arancel_concepto",
          )
          .eq("id", c.pago_id)
          .maybeSingle()
      : null,
    c.establecimiento_id
      ? supabase
          .from("v_establecimientos_estado")
          .select("id, nombre, domicilio, barrio, zona, estado_fumigacion, estado_tanque, tiene_tanque")
          .eq("id", c.establecimiento_id)
          .maybeSingle()
      : null,
    supabase
      .from("v_inspecciones")
      .select("id, codigo, tipo, estado, fecha_programada, resultado, inspector_nombre")
      .eq("certificado_id", certificadoId)
      .order("fecha_programada", { ascending: false }),
    opciones.conAuditoria
      ? supabase
          .from("auditoria")
          .select("id, accion, usuario_id, datos_anteriores, datos_nuevos, created_at")
          .eq("tabla", "certificados")
          .eq("registro_id", certificadoId)
          .order("created_at", { ascending: false })
          .limit(50)
      : null,
  ]);

  for (const r of [declaracionRes, pagoRes, establecimientoRes, inspeccionesRes, auditoriaRes]) {
    if (r?.error) throw new Error(mensajeError(r.error));
  }

  const trazas = auditoriaRes?.data ?? [];
  const [perfiles, bacteriologico, fisicoquimico] = await Promise.all([
    getPerfiles(supabase, [c.firmado_por, c.timbrado_por, c.created_by, ...trazas.map((t) => t.usuario_id)]),
    urlFirmada("documentos", c.analisis_bacteriologico_path),
    urlFirmada("documentos", c.analisis_fisicoquimico_path),
  ]);
  const nombre = (perfilId: string | null) => (perfilId ? (perfiles.get(perfilId)?.nombre ?? null) : null);

  return {
    certificado: { ...c, id: certificadoId },
    productos: parsearProductos(c.productos),
    declaracion: declaracionRes?.data ?? null,
    pago: pagoRes?.data ?? null,
    establecimiento: establecimientoRes?.data ?? null,
    inspecciones: (inspeccionesRes.data ?? []).filter((i) => !!i.id),
    firmante: nombre(c.firmado_por),
    timbradoPor: nombre(c.timbrado_por),
    cargadoPor: nombre(c.created_by),
    analisis: { bacteriologico, fisicoquimico },
    auditoria: auditoriaRes
      ? trazas.map((t) => ({
          id: t.id,
          accion: t.accion,
          fecha: t.created_at,
          usuario: nombre(t.usuario_id),
          cambios: t.accion === "UPDATE" ? diferenciasAuditoria(t.datos_anteriores, t.datos_nuevos) : [],
        }))
      : null,
  };
}
