import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/acciones";
import { hoyISO } from "@/lib/domain/formato";
import { Constants, type Enums, type Views } from "@/lib/supabase/database.types";

/**
 * Fiscalización en terreno (Art. 10.º b y d, Ord. 2681/98; Ord. 2004/92):
 * hoja de ruta, agenda de servicios para muestreo, inspecciones,
 * establecimientos y denuncias.
 */

export type FilaHojaRuta = Views<"v_hoja_ruta">;
export type FilaAgenda = Views<"v_agenda_servicios">;
export type FilaEstablecimiento = Views<"v_establecimientos_estado">;
export type FilaInspeccion = Views<"v_inspecciones">;

export type EstadoControl = "vencido" | "sin_certificado" | "por_vencer";
export type EstadoObligacion = EstadoControl | "vigente";
export type Obligacion = "fumigacion" | "tanque";

export const ESTADOS_CONTROL: readonly EstadoControl[] = ["vencido", "sin_certificado", "por_vencer"];
export const ESTADOS_OBLIGACION: readonly EstadoObligacion[] = ["vencido", "sin_certificado", "por_vencer", "vigente"];

/**
 * Tope de filas para el mapa y la impresión (la lista se pagina). Coincide con el
 * máximo de filas por respuesta de PostgREST en Supabase (`max_rows` = 1000).
 */
export const LIMITE_MAPA = 1000;

// ---------------------------------------------------------------------------
// Utilidades de filtros
// ---------------------------------------------------------------------------

type Param = string | string[] | undefined;

/** Primer valor de un searchParam, recortado. */
export function param(valor: Param): string | undefined {
  const v = Array.isArray(valor) ? valor[0] : valor;
  const limpio = v?.trim();
  return limpio ? limpio : undefined;
}

/** Valor de una lista cerrada (enum) o undefined. */
export function enLista<T extends string>(lista: readonly T[], valor: Param): T | undefined {
  const v = param(valor);
  return lista.find((x) => x === v);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function uuidValido(valor: Param): string | undefined {
  const v = param(valor);
  return v && UUID.test(v) ? v.toLowerCase() : undefined;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
export function fechaValida(valor: Param): string | undefined {
  const v = param(valor);
  return v && FECHA.test(v) ? v : undefined;
}

/** Quita los caracteres que rompen los filtros `or()` de PostgREST. */
function textoBusqueda(valor: string | undefined): string | undefined {
  const limpio = valor?.replace(/[,()"\\%*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return limpio ? limpio : undefined;
}

/** Suma días a una fecha 'YYYY-MM-DD'. */
export function sumarDiasISO(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

/** Inicio del día en Tucumán (UTC−3, sin horario de verano) como timestamptz. */
function inicioDia(fecha: string): string {
  return `${fecha}T00:00:00-03:00`;
}

/**
 * Con `count: "exact"`, PostgREST responde 416 (PGRST103) si la página pedida queda después
 * de la última (p. ej. un enlace viejo o `?pagina=99`). En ese caso se devuelve el total sin filas.
 */
const FUERA_DE_RANGO = "PGRST103";

/** Enlace a la primera página de un listado conservando los filtros (para páginas fuera de rango). */
export function hrefPrimeraPagina(ruta: string, sp: Record<string, Param>): string {
  const nuevos = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const valor = param(v);
    if (k !== "pagina" && valor) nuevos.set(k, valor);
  }
  return `${ruta}${nuevos.size ? `?${nuevos}` : ""}`;
}

/** Constructor de consultas al que se le pueden aplicar filtros genéricos. */
type Filtrable<Q> = {
  filter(columna: string, operador: string, valor: unknown): Q;
  or(filtros: string): Q;
};

// ---------------------------------------------------------------------------
// Hoja de ruta
// ---------------------------------------------------------------------------

export type FiltrosHojaRuta = {
  q?: string;
  zona?: string;
  barrio?: string;
  estado?: EstadoControl;
  obligacion?: Obligacion;
};

export function leerFiltrosHojaRuta(sp: Record<string, Param>): FiltrosHojaRuta {
  return {
    q: param(sp.q),
    zona: param(sp.zona),
    barrio: param(sp.barrio),
    estado: enLista(ESTADOS_CONTROL, sp.estado),
    obligacion: enLista<Obligacion>(["fumigacion", "tanque"], sp.obligacion),
  };
}

/** Querystring con los filtros (para la impresión y los enlaces). */
export function querystringHojaRuta(f: FiltrosHojaRuta): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) sp.set(k, v);
  return sp.size ? `?${sp}` : "";
}

function filtrarHojaRuta<Q extends Filtrable<Q>>(consulta: Q, f: FiltrosHojaRuta): Q {
  let q = consulta;
  if (f.zona) q = q.filter("zona", "eq", f.zona);
  if (f.barrio) q = q.filter("barrio", "eq", f.barrio);
  const estados = f.estado ? [f.estado] : ESTADOS_CONTROL;
  const lista = `(${estados.join(",")})`;
  if (f.obligacion === "fumigacion") q = q.filter("estado_fumigacion", "in", lista);
  else if (f.obligacion === "tanque") q = q.filter("estado_tanque", "in", lista);
  else if (f.estado) q = q.or(`estado_fumigacion.eq.${f.estado},estado_tanque.eq.${f.estado}`);
  const texto = textoBusqueda(f.q);
  if (texto) q = q.or(`nombre.ilike."%${texto}%",nombre_fantasia.ilike."%${texto}%",domicilio.ilike."%${texto}%"`);
  return q;
}

/** Establecimientos a controlar, por prioridad (vencidos, sin certificado, por vencer) y próximo vencimiento. */
export async function getHojaRuta(
  f: FiltrosHojaRuta,
  rango?: { desde: number; hasta: number },
): Promise<{ filas: FilaHojaRuta[]; total: number }> {
  const supabase = await createClient();
  const consulta = (head: boolean) =>
    filtrarHojaRuta(supabase.from("v_hoja_ruta").select("*", { count: "exact", head }), f);
  let q = consulta(false)
    .order("prioridad", { ascending: true })
    .order("proximo_vencimiento", { ascending: true })
    .order("nombre", { ascending: true })
    .order("id", { ascending: true });
  q = rango ? q.range(rango.desde, rango.hasta) : q.limit(LIMITE_MAPA);
  const { data, error, count } = await q;
  if (error?.code === FUERA_DE_RANGO) {
    const conteo = await consulta(true);
    if (conteo.error) throw new Error(mensajeError(conteo.error));
    return { filas: [], total: conteo.count ?? 0 };
  }
  if (error) throw new Error(mensajeError(error));
  return { filas: data ?? [], total: count ?? 0 };
}

/** Puntos para el mapa de la hoja de ruta (todas las filas filtradas, solo columnas livianas). */
export async function getPuntosHojaRuta(f: FiltrosHojaRuta) {
  const supabase = await createClient();
  const { data, error } = await filtrarHojaRuta(
    supabase
      .from("v_hoja_ruta")
      .select("id, nombre, domicilio, barrio, lat, lng, estado_fumigacion, estado_tanque, proximo_vencimiento"),
    f,
  ).limit(LIMITE_MAPA);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

/**
 * Contadores de la hoja de ruta y de la agenda de muestreo. Cada contador cuenta los
 * establecimientos con alguna obligación en ese estado (igual que el filtro `?estado=`).
 */
export async function getResumenHojaRuta() {
  const supabase = await createClient();
  const hoy = hoyISO();
  const cuenta = (estado: EstadoControl) =>
    supabase
      .from("v_hoja_ruta")
      .select("id", { count: "exact", head: true })
      .or(`estado_fumigacion.eq.${estado},estado_tanque.eq.${estado}`);
  const [vencidos, sinCertificado, porVencer, agenda] = await Promise.all([
    cuenta("vencido"),
    cuenta("sin_certificado"),
    cuenta("por_vencer"),
    supabase
      .from("v_agenda_servicios")
      .select("id", { count: "exact", head: true })
      .gte("fecha_servicio", inicioDia(hoy))
      .lt("fecha_servicio", inicioDia(sumarDiasISO(hoy, 2)))
      .eq("inspeccionado", false),
  ]);
  const error = vencidos.error ?? sinCertificado.error ?? porVencer.error ?? agenda.error;
  if (error) throw new Error(mensajeError(error));
  return {
    vencidos: vencidos.count ?? 0,
    sinCertificado: sinCertificado.count ?? 0,
    porVencer: porVencer.count ?? 0,
    agendaPendiente: agenda.count ?? 0,
  };
}

/** Servicios declarados para hoy y mañana (inspecciones por muestreo, Art. 10.º b). */
export async function getAgendaServicios(f: { zona?: string; barrio?: string } = {}) {
  const supabase = await createClient();
  const hoy = hoyISO();
  let q = supabase
    .from("v_agenda_servicios")
    .select("*")
    .gte("fecha_servicio", inicioDia(hoy))
    .lt("fecha_servicio", inicioDia(sumarDiasISO(hoy, 2)))
    .order("fecha_servicio", { ascending: true })
    .limit(500);
  if (f.zona) q = q.eq("zona", f.zona);
  if (f.barrio) q = q.eq("barrio", f.barrio);
  const { data, error } = await q;
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

export type InspeccionDeServicio = {
  id: string;
  estado: Enums<"estado_inspeccion">;
  resultado: Enums<"resultado_inspeccion"> | null;
  fecha: string;
};

/**
 * Inspección vigente de cada certificado de la agenda (la más reciente no cancelada; si solo hay
 * canceladas, la última). `v_agenda_servicios.inspeccionado` cuenta también las programadas y las
 * canceladas: con esto se distingue "programada", "realizada" y "cancelada" (que se puede reprogramar).
 */
export async function getInspeccionesPorCertificado(ids: string[]): Promise<Map<string, InspeccionDeServicio>> {
  const resultado = new Map<string, InspeccionDeServicio>();
  if (ids.length === 0) return resultado;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspecciones")
    .select("id, certificado_id, estado, resultado, fecha_programada, created_at")
    .in("certificado_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw new Error(mensajeError(error));
  for (const i of data ?? []) {
    if (!i.certificado_id) continue;
    const actual = resultado.get(i.certificado_id);
    if (!actual || (actual.estado === "cancelada" && i.estado !== "cancelada")) {
      resultado.set(i.certificado_id, { id: i.id, estado: i.estado, resultado: i.resultado, fecha: i.fecha_programada });
    }
  }
  return resultado;
}

/** Inspecciones programadas y notificaciones abiertas de un conjunto de establecimientos. */
export async function getActuacionesAbiertas(ids: string[]) {
  const programadas = new Map<string, { id: string; fecha: string }>();
  const notificadas = new Map<string, { id: string; numero: string | null; vence: string | null }>();
  if (ids.length === 0) return { programadas, notificadas };
  const supabase = await createClient();
  const [insp, notif] = await Promise.all([
    supabase
      .from("inspecciones")
      .select("id, establecimiento_id, fecha_programada")
      .eq("estado", "programada")
      .in("establecimiento_id", ids)
      .order("fecha_programada", { ascending: true }),
    supabase
      .from("notificaciones")
      .select("id, numero, establecimiento_id, vence_at")
      .in("estado", ["emitida", "notificada"])
      .in("establecimiento_id", ids)
      .order("created_at", { ascending: false }),
  ]);
  if (insp.error ?? notif.error) throw new Error(mensajeError(insp.error ?? notif.error));
  for (const i of insp.data ?? []) {
    if (i.establecimiento_id && !programadas.has(i.establecimiento_id)) {
      programadas.set(i.establecimiento_id, { id: i.id, fecha: i.fecha_programada });
    }
  }
  for (const n of notif.data ?? []) {
    if (n.establecimiento_id && !notificadas.has(n.establecimiento_id)) {
      notificadas.set(n.establecimiento_id, { id: n.id, numero: n.numero, vence: n.vence_at });
    }
  }
  return { programadas, notificadas };
}

// ---------------------------------------------------------------------------
// Territorio (zonas y barrios)
// ---------------------------------------------------------------------------

export const ZONAS = ["Centro", "Norte", "Sur", "Este", "Oeste"] as const;

/** Zonas y barrios cargados en el padrón de establecimientos. */
export async function getTerritorio() {
  const supabase = await createClient();
  const zonas = new Set<string>(ZONAS);
  const barrios = new Map<string, string | null>();
  // PostgREST devuelve como máximo LIMITE_MAPA filas por consulta: se recorre por páginas.
  for (let pagina = 0; pagina < 20; pagina++) {
    const { data, error } = await supabase
      .from("establecimientos")
      .select("zona, barrio")
      .eq("activo", true)
      .not("barrio", "is", null)
      .order("barrio")
      .order("id")
      .range(pagina * LIMITE_MAPA, (pagina + 1) * LIMITE_MAPA - 1);
    if (error) throw new Error(mensajeError(error));
    for (const e of data ?? []) {
      if (e.zona) zonas.add(e.zona);
      if (e.barrio && !barrios.has(e.barrio)) barrios.set(e.barrio, e.zona);
    }
    if (!data || data.length < LIMITE_MAPA) break;
  }
  return {
    zonas: [...zonas],
    barrios: [...barrios.entries()]
      .map(([barrio, zona]) => ({ barrio, zona }))
      .sort((a, b) => a.barrio.localeCompare(b.barrio, "es")),
  };
}

/**
 * Barrios para el filtro: los de la zona elegida y, siempre, el barrio ya filtrado (aunque sea de
 * otra zona o no esté en el padrón). Si no, el select mostraría "todos" con el filtro todavía activo.
 */
export function opcionesBarrio(
  barrios: { barrio: string; zona: string | null }[],
  zona: string | undefined,
  barrio: string | undefined,
): { valor: string; label: string }[] {
  const lista = barrios.filter((b) => !zona || b.zona === zona || b.barrio === barrio).map((b) => b.barrio);
  if (barrio && !lista.includes(barrio)) lista.unshift(barrio);
  return lista.map((b) => ({ valor: b, label: b }));
}

// ---------------------------------------------------------------------------
// Personas y empresas (para selects)
// ---------------------------------------------------------------------------

export type OpcionPersona = { id: string; nombre: string };

/** Perfiles con rol inspector (activos). */
export async function getInspectores(): Promise<OpcionPersona[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, apellido, email")
    .eq("rol", "inspector")
    .eq("activo", true)
    .order("apellido")
    .order("nombre");
  if (error) throw new Error(mensajeError(error));
  return (data ?? []).map((p) => ({
    id: p.id,
    nombre: `${p.nombre} ${p.apellido}`.trim() || p.email || "Inspector sin nombre",
  }));
}

export async function getEmpresasOpciones() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nombre_comercial, numero_registro, estado")
    .order("nombre_comercial");
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

export async function getEmpresaBasica(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_empresas")
    .select(
      "id, nombre_comercial, numero_registro, cuit, estado, estado_efectivo, domicilio_oficina, domicilio_deposito, telefono, vencimiento_habilitacion, ultima_inspeccion_deposito, habilita_fumigacion, habilita_tanques",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
}

// ---------------------------------------------------------------------------
// Inspecciones
// ---------------------------------------------------------------------------

export type FiltrosInspecciones = {
  q?: string;
  estado?: Enums<"estado_inspeccion">;
  tipo?: Enums<"tipo_inspeccion">;
  resultado?: Enums<"resultado_inspeccion">;
  inspector?: string;
  empresa?: string;
  establecimiento?: string;
  desde?: string;
  hasta?: string;
};

export function leerFiltrosInspecciones(sp: Record<string, Param>): FiltrosInspecciones {
  return {
    q: param(sp.q),
    estado: enLista(Constants.public.Enums.estado_inspeccion, sp.estado),
    tipo: enLista(Constants.public.Enums.tipo_inspeccion, sp.tipo),
    resultado: enLista(Constants.public.Enums.resultado_inspeccion, sp.resultado),
    inspector: uuidValido(sp.inspector),
    empresa: uuidValido(sp.empresa),
    establecimiento: uuidValido(sp.establecimiento),
    desde: fechaValida(sp.desde),
    hasta: fechaValida(sp.hasta),
  };
}

export async function getInspecciones(
  f: FiltrosInspecciones,
  rango: { desde: number; hasta: number },
): Promise<{ filas: FilaInspeccion[]; total: number }> {
  const supabase = await createClient();
  const consulta = (head: boolean) => {
    let q = supabase.from("v_inspecciones").select("*", { count: "exact", head });
    if (f.estado) q = q.eq("estado", f.estado);
    if (f.tipo) q = q.eq("tipo", f.tipo);
    if (f.resultado) q = q.eq("resultado", f.resultado);
    if (f.inspector) q = q.eq("inspector_id", f.inspector);
    if (f.empresa) q = q.eq("empresa_id", f.empresa);
    if (f.establecimiento) q = q.eq("establecimiento_id", f.establecimiento);
    if (f.desde) q = q.gte("fecha_programada", f.desde);
    if (f.hasta) q = q.lte("fecha_programada", f.hasta);
    const texto = textoBusqueda(f.q);
    if (texto) {
      q = q.or(
        `codigo.ilike."%${texto}%",establecimiento_nombre.ilike."%${texto}%",establecimiento_domicilio.ilike."%${texto}%",empresa_nombre.ilike."%${texto}%"`,
      );
    }
    return q;
  };
  const { data, error, count } = await consulta(false)
    .order("fecha_programada", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(rango.desde, rango.hasta);
  if (error?.code === FUERA_DE_RANGO) {
    const conteo = await consulta(true);
    if (conteo.error) throw new Error(mensajeError(conteo.error));
    return { filas: [], total: conteo.count ?? 0 };
  }
  if (error) throw new Error(mensajeError(error));
  return { filas: data ?? [], total: count ?? 0 };
}

/** Programadas para hoy o atrasadas (de un inspector, o de todos si `inspectorId` es null). */
export async function getInspeccionesDelDia(inspectorId: string | null) {
  const supabase = await createClient();
  let q = supabase
    .from("v_inspecciones")
    .select("*")
    .eq("estado", "programada")
    .lte("fecha_programada", hoyISO())
    .order("fecha_programada", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(30);
  if (inspectorId) q = q.eq("inspector_id", inspectorId);
  const { data, error } = await q;
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

export async function getResumenInspecciones() {
  const supabase = await createClient();
  const hoy = hoyISO();
  const inicioMes = `${hoy.slice(0, 8)}01`;
  const base = () => supabase.from("inspecciones").select("id", { count: "exact", head: true });
  const [programadas, atrasadas, realizadasMes, noConformesMes] = await Promise.all([
    base().eq("estado", "programada"),
    base().eq("estado", "programada").lt("fecha_programada", hoy),
    base().eq("estado", "realizada").gte("realizada_at", inicioDia(inicioMes)),
    base().eq("estado", "realizada").eq("resultado", "no_conforme").gte("realizada_at", inicioDia(inicioMes)),
  ]);
  const error = programadas.error ?? atrasadas.error ?? realizadasMes.error ?? noConformesMes.error;
  if (error) throw new Error(mensajeError(error));
  return {
    programadas: programadas.count ?? 0,
    atrasadas: atrasadas.count ?? 0,
    realizadasMes: realizadasMes.count ?? 0,
    noConformesMes: noConformesMes.count ?? 0,
  };
}

/** Memorizada por request: la usan `generateMetadata` y la página. */
export const getInspeccion = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_inspecciones").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
});

/** Datos vinculados a una inspección: establecimiento, certificado, empresa, denuncia y actas. */
export async function getContextoInspeccion(i: {
  id?: string | null;
  establecimiento_id: string | null;
  certificado_id: string | null;
  empresa_id: string | null;
  denuncia_id: string | null;
}) {
  const supabase = await createClient();
  const [establecimiento, certificado, empresa, denuncia, actas] = await Promise.all([
    i.establecimiento_id ? getEstablecimientoConEstado(i.establecimiento_id) : Promise.resolve(null),
    i.certificado_id
      ? supabase
          .from("v_certificados")
          .select(
            "id, numero, tipo, estado, cliente, domicilio, fecha_servicio, fecha_vencimiento, superficie_m2, capacidad_litros, rubro_nombre, tecnico_nombre, tecnico_titulo, empresa_id, empresa_nombre, establecimiento_id, productos, plazo_reingreso_horas, vigencia",
          )
          .eq("id", i.certificado_id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) throw new Error(mensajeError(error));
            return data;
          })
      : Promise.resolve(null),
    i.empresa_id ? getEmpresaBasica(i.empresa_id) : Promise.resolve(null),
    i.denuncia_id
      ? supabase
          .from("denuncias")
          .select(
            "id, codigo, tipo, estado, descripcion, domicilio, created_at, empresa_mencionada, empresa_id, establecimiento_id",
          )
          .eq("id", i.denuncia_id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) throw new Error(mensajeError(error));
            return data;
          })
      : Promise.resolve(null),
    i.id
      ? supabase
          .from("v_actas")
          .select("id, numero, motivo, estado, fecha")
          .eq("inspeccion_id", i.id)
          .order("fecha", { ascending: false })
          .then(({ data, error }) => {
            if (error) throw new Error(mensajeError(error));
            return data ?? [];
          })
      : Promise.resolve([]),
  ]);
  return { establecimiento, certificado, empresa, denuncia, actas };
}

// ---------------------------------------------------------------------------
// Establecimientos
// ---------------------------------------------------------------------------

export type FiltrosEstablecimientos = {
  q?: string;
  zona?: string;
  grupo?: string;
  estado?: EstadoObligacion;
  tanque?: "si" | "no";
};

export function leerFiltrosEstablecimientos(sp: Record<string, Param>): FiltrosEstablecimientos {
  return {
    q: param(sp.q),
    zona: param(sp.zona),
    grupo: param(sp.grupo),
    estado: enLista(ESTADOS_OBLIGACION, sp.estado),
    tanque: enLista<"si" | "no">(["si", "no"], sp.tanque),
  };
}

function filtrarEstablecimientos<Q extends Filtrable<Q>>(consulta: Q, f: FiltrosEstablecimientos): Q {
  let q = consulta;
  if (f.zona) q = q.filter("zona", "eq", f.zona);
  if (f.grupo) q = q.filter("rubro_grupo", "eq", f.grupo);
  if (f.tanque) q = q.filter("tiene_tanque", "eq", f.tanque === "si");
  if (f.estado === "vigente") {
    q = q.filter("estado_fumigacion", "eq", "vigente").filter("estado_tanque", "in", "(vigente,no_aplica)");
  } else if (f.estado) {
    q = q.or(`estado_fumigacion.eq.${f.estado},estado_tanque.eq.${f.estado}`);
  }
  const texto = textoBusqueda(f.q);
  if (texto) {
    q = q.or(
      `nombre.ilike."%${texto}%",nombre_fantasia.ilike."%${texto}%",domicilio.ilike."%${texto}%",cuit.ilike."%${texto}%",barrio.ilike."%${texto}%"`,
    );
  }
  return q;
}

export async function getEstablecimientos(
  f: FiltrosEstablecimientos,
  rango: { desde: number; hasta: number },
): Promise<{ filas: FilaEstablecimiento[]; total: number }> {
  const supabase = await createClient();
  const consulta = (head: boolean) =>
    filtrarEstablecimientos(supabase.from("v_establecimientos_estado").select("*", { count: "exact", head }), f);
  const { data, error, count } = await consulta(false)
    .order("nombre", { ascending: true })
    .order("id", { ascending: true })
    .range(rango.desde, rango.hasta);
  if (error?.code === FUERA_DE_RANGO) {
    const conteo = await consulta(true);
    if (conteo.error) throw new Error(mensajeError(conteo.error));
    return { filas: [], total: conteo.count ?? 0 };
  }
  if (error) throw new Error(mensajeError(error));
  return { filas: data ?? [], total: count ?? 0 };
}

export async function getPuntosEstablecimientos(f: FiltrosEstablecimientos) {
  const supabase = await createClient();
  const { data, error } = await filtrarEstablecimientos(
    supabase
      .from("v_establecimientos_estado")
      .select("id, nombre, domicilio, barrio, lat, lng, estado_fumigacion, estado_tanque, rubro_nombre"),
    f,
  ).limit(LIMITE_MAPA);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

export async function getResumenEstablecimientos() {
  const supabase = await createClient();
  const base = () => supabase.from("v_establecimientos_estado").select("id", { count: "exact", head: true });
  const [total, alDia, conTanque, enFalta] = await Promise.all([
    base(),
    base().eq("estado_fumigacion", "vigente").in("estado_tanque", ["vigente", "no_aplica"]),
    base().eq("tiene_tanque", true),
    base().or("estado_fumigacion.in.(vencido,sin_certificado),estado_tanque.in.(vencido,sin_certificado)"),
  ]);
  const error = total.error ?? alDia.error ?? conTanque.error ?? enFalta.error;
  if (error) throw new Error(mensajeError(error));
  return {
    total: total.count ?? 0,
    alDia: alDia.count ?? 0,
    conTanque: conTanque.count ?? 0,
    enFalta: enFalta.count ?? 0,
  };
}

/**
 * Establecimientos dados de baja (la vista de estado solo incluye los activos): para poder
 * encontrarlos y reactivarlos desde su ficha.
 */
export async function getEstablecimientosDeBaja(
  q: string | undefined,
  rango: { desde: number; hasta: number },
) {
  const supabase = await createClient();
  const consulta = (head: boolean) => {
    let c = supabase
      .from("establecimientos")
      .select("id, nombre, nombre_fantasia, domicilio, barrio, zona, updated_at, rubro:rubros(nombre)", {
        count: "exact",
        head,
      })
      .eq("activo", false);
    const texto = textoBusqueda(q);
    if (texto) {
      c = c.or(
        `nombre.ilike."%${texto}%",nombre_fantasia.ilike."%${texto}%",domicilio.ilike."%${texto}%",cuit.ilike."%${texto}%",barrio.ilike."%${texto}%"`,
      );
    }
    return c;
  };
  const { data, error, count } = await consulta(false)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .range(rango.desde, rango.hasta);
  if (error?.code === FUERA_DE_RANGO) {
    const conteo = await consulta(true);
    if (conteo.error) throw new Error(mensajeError(conteo.error));
    return { filas: [], total: conteo.count ?? 0 };
  }
  if (error) throw new Error(mensajeError(error));
  return { filas: data ?? [], total: count ?? 0 };
}

export async function contarEstablecimientosDeBaja(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("establecimientos")
    .select("id", { count: "exact", head: true })
    .eq("activo", false);
  if (error) throw new Error(mensajeError(error));
  return count ?? 0;
}

/** Grupos del Anexo (para filtros). */
export async function getGruposRubro() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rubros").select("grupo").eq("activo", true);
  if (error) throw new Error(mensajeError(error));
  return [...new Set((data ?? []).map((r) => r.grupo))].sort((a, b) => a.localeCompare(b, "es"));
}

/** Estado frente a las obligaciones (solo establecimientos activos). */
export async function getEstablecimientoConEstado(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_establecimientos_estado").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
}

/** Ficha base (incluye establecimientos dados de baja) con su rubro. Memorizada por request. */
export const getEstablecimiento = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("establecimientos")
    .select("*, rubro:rubros(id, nombre, grupo, periodicidad)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
});

/** Certificados, inspecciones, notificaciones y actas de un establecimiento. */
export async function getHistorialEstablecimiento(id: string) {
  const supabase = await createClient();
  const [certificados, inspecciones, notificaciones, actas] = await Promise.all([
    supabase
      .from("v_certificados")
      .select(
        "id, numero, tipo, estado, vigencia, fecha_servicio, fecha_vencimiento, empresa_id, empresa_nombre, rubro_nombre, sello_codigo",
      )
      .eq("establecimiento_id", id)
      .order("fecha_servicio", { ascending: false })
      .limit(60),
    supabase
      .from("v_inspecciones")
      .select("id, codigo, tipo, estado, resultado, fecha_programada, realizada_at, inspector_nombre, empresa_nombre")
      .eq("establecimiento_id", id)
      .order("fecha_programada", { ascending: false })
      .limit(60),
    supabase
      .from("v_notificaciones")
      .select("id, numero, tipo, estado, estado_efectivo, plazo, notificada_at, vence_at, created_at")
      .eq("establecimiento_id", id)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("v_actas")
      .select("id, numero, motivo, estado, fecha, inspector_nombre")
      .eq("establecimiento_id", id)
      .order("fecha", { ascending: false })
      .limit(60),
  ]);
  const error = certificados.error ?? inspecciones.error ?? notificaciones.error ?? actas.error;
  if (error) throw new Error(mensajeError(error));
  return {
    certificados: certificados.data ?? [],
    inspecciones: inspecciones.data ?? [],
    notificaciones: notificaciones.data ?? [],
    actas: actas.data ?? [],
  };
}

export type OpcionEstablecimiento = {
  id: string;
  nombre: string;
  domicilio: string;
  barrio: string | null;
};

/** Búsqueda rápida por nombre, nombre de fantasía, domicilio o CUIT. */
export async function buscarEstablecimientosPorTexto(texto: string): Promise<OpcionEstablecimiento[]> {
  const limpio = textoBusqueda(texto);
  if (!limpio || limpio.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("establecimientos")
    .select("id, nombre, nombre_fantasia, domicilio, barrio")
    .eq("activo", true)
    .or(
      `nombre.ilike."%${limpio}%",nombre_fantasia.ilike."%${limpio}%",domicilio.ilike."%${limpio}%",cuit.ilike."%${limpio}%"`,
    )
    .order("nombre")
    .limit(8);
  if (error) throw new Error(mensajeError(error));
  return (data ?? []).map((e) => ({
    id: e.id,
    nombre: e.nombre_fantasia ? `${e.nombre} (${e.nombre_fantasia})` : e.nombre,
    domicilio: e.domicilio,
    barrio: e.barrio,
  }));
}

export async function getOpcionEstablecimiento(id: string): Promise<OpcionEstablecimiento | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("establecimientos")
    .select("id, nombre, nombre_fantasia, domicilio, barrio")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error));
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre_fantasia ? `${data.nombre} (${data.nombre_fantasia})` : data.nombre,
    domicilio: data.domicilio,
    barrio: data.barrio,
  };
}

// ---------------------------------------------------------------------------
// Denuncias
// ---------------------------------------------------------------------------

export type FiltrosDenuncias = {
  q?: string;
  estado?: Enums<"estado_denuncia">;
  tipo?: Enums<"tipo_denuncia">;
  asignada?: string;
};

export function leerFiltrosDenuncias(sp: Record<string, Param>): FiltrosDenuncias {
  return {
    q: param(sp.q),
    estado: enLista(Constants.public.Enums.estado_denuncia, sp.estado),
    tipo: enLista(Constants.public.Enums.tipo_denuncia, sp.tipo),
    asignada: uuidValido(sp.asignada),
  };
}

const SELECT_DENUNCIA =
  "*, asignada:perfiles!denuncias_asignada_a_fkey(id, nombre, apellido), empresa:empresas(id, nombre_comercial, numero_registro), establecimiento:establecimientos(id, nombre, domicilio, barrio)";

export async function getDenuncias(f: FiltrosDenuncias, rango: { desde: number; hasta: number }) {
  const supabase = await createClient();
  const consulta = (head: boolean) => {
    let q = supabase.from("denuncias").select(SELECT_DENUNCIA, { count: "exact", head });
    if (f.estado) q = q.eq("estado", f.estado);
    if (f.tipo) q = q.eq("tipo", f.tipo);
    if (f.asignada) q = q.eq("asignada_a", f.asignada);
    const texto = textoBusqueda(f.q);
    if (texto) {
      q = q.or(
        `codigo.ilike."%${texto}%",domicilio.ilike."%${texto}%",descripcion.ilike."%${texto}%",empresa_mencionada.ilike."%${texto}%"`,
      );
    }
    return q;
  };
  const { data, error, count } = await consulta(false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(rango.desde, rango.hasta);
  if (error?.code === FUERA_DE_RANGO) {
    const conteo = await consulta(true);
    if (conteo.error) throw new Error(mensajeError(conteo.error));
    return { filas: [], total: conteo.count ?? 0 };
  }
  if (error) throw new Error(mensajeError(error));
  return { filas: data ?? [], total: count ?? 0 };
}

export async function getResumenDenuncias() {
  const supabase = await createClient();
  const cuenta = (estado: Enums<"estado_denuncia">) =>
    supabase.from("denuncias").select("id", { count: "exact", head: true }).eq("estado", estado);
  const [recibidas, enCurso, programadas, cerradas] = await Promise.all([
    cuenta("recibida"),
    cuenta("en_curso"),
    cuenta("inspeccion_programada"),
    cuenta("cerrada"),
  ]);
  const error = recibidas.error ?? enCurso.error ?? programadas.error ?? cerradas.error;
  if (error) throw new Error(mensajeError(error));
  return {
    recibidas: recibidas.count ?? 0,
    enCurso: enCurso.count ?? 0,
    programadas: programadas.count ?? 0,
    cerradas: cerradas.count ?? 0,
  };
}

/** Memorizada por request: la usan `generateMetadata` y la página. */
export const getDenuncia = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("denuncias").select(SELECT_DENUNCIA).eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
});

export async function getInspeccionesDeDenuncia(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_inspecciones")
    .select("id, codigo, tipo, estado, resultado, fecha_programada, realizada_at, inspector_nombre, observaciones")
    .eq("denuncia_id", id)
    .order("fecha_programada", { ascending: false });
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}
