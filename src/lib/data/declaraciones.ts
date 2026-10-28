import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/acciones";
import { getParametros } from "@/lib/data/catalogos";
import type { Enums, Json, Views } from "@/lib/supabase/database.types";

/**
 * Lecturas del módulo de declaraciones (planilla Art. 9.º a) y firmas del asesor
 * técnico. Todas filtran por la empresa de la sesión además de la RLS.
 */

type EstadoDeclaracion = Enums<"estado_declaracion">;
type EstadoCertificado = Enums<"estado_certificado">;
type TipoServicio = Enums<"tipo_servicio">;

export type DeclaracionVista = Views<"v_declaraciones">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && UUID.test(valor);
}

/**
 * Convierte un texto de búsqueda en un patrón ilike seguro para PostgREST: quita los
 * caracteres con significado en los filtros y une las palabras con comodines
 * ("av mate luna" → "%av%mate%luna%"). Devuelve null si queda vacío.
 */
export function patronBusqueda(texto: string): string | null {
  const palabras = texto
    .slice(0, 80)
    .replace(/[%_*\\,()"'.:;]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return palabras.length ? `%${palabras.join("%")}%` : null;
}

// -----------------------------------------------------------------------------
// Parámetros
// -----------------------------------------------------------------------------

function entero(valor: unknown, defecto: number): number {
  const n = typeof valor === "number" ? valor : typeof valor === "string" ? Number(valor) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : defecto;
}

/** Parámetros leídos una sola vez por request (antelación y vigencia de tanques). */
const parametros = cache(getParametros);

/** Antelación exigida para declarar servicios de fumigación (parámetros editables). */
export const getAntelacion = cache(async (): Promise<{ minHoras: number; maxHoras: number }> => {
  const p = await parametros();
  return {
    minHoras: entero(p.antelacion_min_horas, 24),
    maxHoras: entero(p.antelacion_max_horas, 48),
  };
});

/**
 * Vigencia del certificado de limpieza de tanques en días (parámetro
 * vencimiento_tanque_dias: el mismo que usa public.calcular_vencimiento()).
 */
export const getVencimientoTanqueDias = cache(async (): Promise<number> => {
  const p = await parametros();
  const dias = entero(p.vencimiento_tanque_dias, 180);
  return dias > 0 ? dias : 180;
});

// -----------------------------------------------------------------------------
// Declaraciones
// -----------------------------------------------------------------------------

export type FiltrosDeclaraciones = {
  estado?: EstadoDeclaracion;
  tipo?: TipoServicio;
  codigo?: string;
  desde: number;
  hasta: number;
};

export async function getDeclaraciones(empresaId: string, filtros: FiltrosDeclaraciones) {
  const supabase = await createClient();
  let q = supabase.from("v_declaraciones").select("*", { count: "exact" }).eq("empresa_id", empresaId);
  if (filtros.estado) q = q.eq("estado", filtros.estado);
  if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
  const patron = filtros.codigo ? patronBusqueda(filtros.codigo) : null;
  if (patron) q = q.ilike("codigo", patron);
  const { data, error, count } = await q.order("created_at", { ascending: false }).range(filtros.desde, filtros.hasta);
  if (error) throw new Error(mensajeError(error));
  return { filas: (data ?? []).filter((d): d is DeclaracionVista & { id: string } => d.id !== null), total: count ?? 0 };
}

/** Cantidad de declaraciones de la empresa por estado. */
export async function getResumenDeclaraciones(empresaId: string): Promise<Record<EstadoDeclaracion, number>> {
  const supabase = await createClient();
  const estados: EstadoDeclaracion[] = ["borrador", "presentada", "observada", "controlada", "rechazada"];
  const resultados = await Promise.all(
    estados.map((estado) =>
      supabase
        .from("declaraciones")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresaId)
        .eq("estado", estado),
    ),
  );
  const error = resultados.find((r) => r.error)?.error;
  if (error) throw new Error(mensajeError(error));
  return Object.fromEntries(estados.map((e, i) => [e, resultados[i].count ?? 0])) as Record<EstadoDeclaracion, number>;
}

export const getDeclaracion = cache(async (empresaId: string, id: string): Promise<DeclaracionVista | null> => {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_declaraciones")
    .select("*")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
});

// -----------------------------------------------------------------------------
// Certificados de una declaración
// -----------------------------------------------------------------------------

export type ProductoAplicado = {
  productoId: string;
  nombre: string;
  principioActivo: string | null;
  organismo: string | null;
  registro: string | null;
  cantidad: number;
  unidad: string;
};

function esObjeto(valor: Json | undefined): valor is { [clave: string]: Json | undefined } {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function texto(valor: Json | undefined): string | null {
  return typeof valor === "string" && valor !== "" ? valor : null;
}

/** Productos agregados por v_certificados (jsonb) → lista tipada. */
export function parsearProductos(valor: Json | null): ProductoAplicado[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((item) => {
    if (!esObjeto(item) || typeof item.producto_id !== "string") return [];
    const cantidad = typeof item.cantidad === "number" ? item.cantidad : Number(item.cantidad ?? 0);
    return [
      {
        productoId: item.producto_id,
        nombre: texto(item.nombre) ?? "Producto",
        principioActivo: texto(item.principio_activo),
        organismo: texto(item.organismo),
        registro: texto(item.registro),
        cantidad: Number.isFinite(cantidad) ? cantidad : 0,
        unidad: texto(item.unidad) ?? "ml",
      },
    ];
  });
}

export type CertificadoPlanilla = {
  id: string;
  numero: string;
  tipo: TipoServicio;
  estado: EstadoCertificado;
  declaracionId: string | null;
  declaracionCodigo: string | null;
  declaracionEstado: EstadoDeclaracion | null;
  establecimientoId: string | null;
  barrio: string | null;
  cliente: string;
  clienteCuit: string | null;
  domicilio: string;
  rubroId: number | null;
  rubroNombre: string | null;
  rubroGrupo: string | null;
  rubroPeriodicidad: Enums<"periodicidad"> | null;
  superficieM2: number | null;
  capacidadLitros: number | null;
  fechaServicio: string | null;
  fechaVencimiento: string | null;
  tecnicoId: string | null;
  tecnicoNombre: string | null;
  tecnicoTitulo: string | null;
  laboratorio: string | null;
  analisisBacteriologico: string | null;
  analisisFisicoquimico: string | null;
  firmado: boolean;
  firmadoAt: string | null;
  plazoReingresoHoras: number | null;
  observaciones: string | null;
  anuladoMotivo: string | null;
  selloCodigo: string | null;
  pagoCodigo: string | null;
  vigencia: string | null;
  productos: ProductoAplicado[];
};

function aPlanilla(c: Views<"v_certificados">): CertificadoPlanilla | null {
  if (!c.id) return null;
  return {
    id: c.id,
    numero: c.numero ?? "—",
    tipo: c.tipo ?? "fumigacion",
    estado: c.estado ?? "borrador",
    declaracionId: c.declaracion_id,
    declaracionCodigo: c.declaracion_codigo,
    declaracionEstado: c.declaracion_estado,
    establecimientoId: c.establecimiento_id,
    barrio: c.establecimiento_barrio,
    cliente: c.cliente ?? "—",
    clienteCuit: c.cliente_cuit,
    domicilio: c.domicilio ?? "—",
    rubroId: c.rubro_id,
    rubroNombre: c.rubro_nombre,
    rubroGrupo: c.rubro_grupo,
    rubroPeriodicidad: c.rubro_periodicidad,
    superficieM2: c.superficie_m2,
    capacidadLitros: c.capacidad_litros,
    fechaServicio: c.fecha_servicio,
    fechaVencimiento: c.fecha_vencimiento,
    tecnicoId: c.tecnico_id,
    tecnicoNombre: c.tecnico_nombre,
    tecnicoTitulo: c.tecnico_titulo,
    laboratorio: c.laboratorio,
    analisisBacteriologico: c.analisis_bacteriologico_path,
    analisisFisicoquimico: c.analisis_fisicoquimico_path,
    firmado: c.firma_hash !== null,
    firmadoAt: c.firmado_at,
    plazoReingresoHoras: c.plazo_reingreso_horas,
    observaciones: c.observaciones,
    anuladoMotivo: c.anulado_motivo,
    selloCodigo: c.sello_codigo,
    pagoCodigo: c.pago_codigo,
    vigencia: c.vigencia,
    productos: parsearProductos(c.productos),
  };
}

function filas(data: Views<"v_certificados">[] | null): CertificadoPlanilla[] {
  return (data ?? []).map(aPlanilla).filter((c): c is CertificadoPlanilla => c !== null);
}

export async function getCertificadosDeDeclaracion(empresaId: string, declaracionId: string): Promise<CertificadoPlanilla[]> {
  if (!esUuid(declaracionId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_certificados")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("declaracion_id", declaracionId)
    .order("fecha_servicio", { ascending: true })
    .order("numero", { ascending: true });
  if (error) throw new Error(mensajeError(error));
  return filas(data);
}

/**
 * Sugerencia para el próximo N.º de certificado: el mayor número puramente numérico
 * usado recientemente por la empresa en ese tipo de servicio, más uno (conserva los
 * ceros a la izquierda si la empresa los usa).
 */
export async function getSiguienteNumeroCertificado(empresaId: string, tipo: TipoServicio): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificados")
    .select("numero")
    .eq("empresa_id", empresaId)
    .eq("tipo", tipo)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(mensajeError(error));
  let mayor = 0;
  let ancho = 0;
  for (const { numero } of data ?? []) {
    const limpio = numero.trim();
    if (!/^\d{1,12}$/.test(limpio)) continue;
    const n = Number(limpio);
    if (n > mayor) {
      mayor = n;
      ancho = limpio.startsWith("0") ? limpio.length : 0;
    }
  }
  const siguiente = String(mayor + 1);
  return ancho > siguiente.length ? siguiente.padStart(ancho, "0") : siguiente;
}

// -----------------------------------------------------------------------------
// Catálogos propios de la empresa
// -----------------------------------------------------------------------------

/** Asesores técnicos aprobados por la Dirección (los únicos que pueden firmar). */
export async function getTecnicosAprobados(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tecnicos")
    .select("id, nombre, apellido, titulo, matricula, es_representante")
    .eq("empresa_id", empresaId)
    .eq("estado", "aprobado")
    .order("es_representante", { ascending: false })
    .order("apellido");
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

/** Productos de la memoria técnica aprobada (los únicos que pueden aplicarse). */
export async function getProductosAprobados(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_memorias_tecnicas")
    .select("producto_id, producto_nombre, principio_activo, clase, organismo, registro_numero, plazo_reingreso_horas, dosis")
    .eq("empresa_id", empresaId)
    .eq("estado", "aprobado")
    .order("producto_nombre");
  if (error) throw new Error(mensajeError(error));
  return (data ?? []).flatMap((p) => (p.producto_id ? [{ ...p, producto_id: p.producto_id }] : []));
}

// -----------------------------------------------------------------------------
// Establecimientos (búsqueda al cargar un servicio)
// -----------------------------------------------------------------------------

const COLUMNAS_ESTABLECIMIENTO = "id, nombre, nombre_fantasia, domicilio, barrio, cuit, rubro_id, tiene_tanque" as const;

export async function buscarEstablecimientos(textoBuscado: string, limite = 8) {
  const patron = patronBusqueda(textoBuscado);
  if (!patron || patron.length < 4) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("establecimientos")
    .select(COLUMNAS_ESTABLECIMIENTO)
    .eq("activo", true)
    .or(`nombre.ilike.${patron},nombre_fantasia.ilike.${patron},domicilio.ilike.${patron}`)
    .order("nombre")
    .limit(limite);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

export async function getEstablecimientosPorIds(ids: string[]) {
  const validos = [...new Set(ids.filter(esUuid))];
  if (validos.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("establecimientos").select(COLUMNAS_ESTABLECIMIENTO).in("id", validos);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

// -----------------------------------------------------------------------------
// Firmas del asesor técnico
// -----------------------------------------------------------------------------

export async function getTecnico(empresaId: string, tecnicoId: string) {
  if (!esUuid(tecnicoId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tecnicos")
    .select("id, nombre, apellido, titulo, matricula, estado, es_representante")
    .eq("id", tecnicoId)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
}

/** Certificados asignados al técnico, sin firma y todavía editables. */
export async function getFirmasPendientes(empresaId: string, tecnicoId: string): Promise<CertificadoPlanilla[]> {
  if (!esUuid(tecnicoId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_certificados")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("tecnico_id", tecnicoId)
    .is("firma_hash", null)
    .in("estado", ["borrador", "observado"])
    .order("fecha_servicio", { ascending: true })
    .limit(300);
  if (error) throw new Error(mensajeError(error));
  return filas(data);
}

/** Últimos certificados firmados por el técnico. */
export async function getFirmadosRecientes(empresaId: string, tecnicoId: string, limite = 10): Promise<CertificadoPlanilla[]> {
  if (!esUuid(tecnicoId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_certificados")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("tecnico_id", tecnicoId)
    .not("firmado_at", "is", null)
    .order("firmado_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(mensajeError(error));
  return filas(data);
}
