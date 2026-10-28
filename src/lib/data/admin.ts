import "server-only";
import type { PostgrestError, User } from "@supabase/supabase-js";
import { mensajeError } from "@/lib/acciones";
import { hoyISO } from "@/lib/domain/formato";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums, Json, Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/* -----------------------------------------------------------------------------
 * Administración y contenidos: noticias, capacitaciones, avisos a empresas,
 * configuración (aranceles, rubros, parámetros, feriados, cuentas), usuarios y
 * auditoría. Lecturas con la sesión del usuario: la RLS decide qué se devuelve.
 * -------------------------------------------------------------------------- */

type Respuesta<T> = { data: T[] | null; error: PostgrestError | null };

function filas<T>(r: Respuesta<T>, que: string): T[] {
  if (r.error) throw new Error(mensajeError(r.error, `No se pudo obtener ${que}.`));
  return r.data ?? [];
}

/** Quita los caracteres reservados de PostgREST de un texto de búsqueda. */
function limpiarBusqueda(texto: string | undefined): string {
  return (texto ?? "")
    .replace(/[(),"\\%*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const ilike = (columna: string, texto: string) => `${columna}.ilike."%${texto}%"`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida un id antes de consultarlo (un uuid mal formado haría fallar la consulta). */
export function esUuid(valor: string | null | undefined): valor is string {
  return Boolean(valor && UUID.test(valor));
}

/** Inicio del día (hora de Tucumán) como ISO con zona, para filtrar columnas timestamptz. */
function inicioDelDia(fecha: string): string {
  return `${fecha}T00:00:00-03:00`;
}

function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias, 12));
  return f.toISOString().slice(0, 10);
}

/* =============================================================================
 * Noticias del portal
 * ========================================================================== */

export type Noticia = Tables<"noticias">;

export type FiltrosNoticias = {
  q?: string;
  estado?: "publicada" | "borrador";
  categoria?: string;
  desde: number;
  hasta: number;
};

export async function listarNoticias(f: FiltrosNoticias): Promise<{ filas: Noticia[]; total: number }> {
  const supabase = await createClient();
  let consulta = supabase.from("noticias").select("*", { count: "exact" });
  const t = limpiarBusqueda(f.q);
  if (t) consulta = consulta.or([ilike("titulo", t), ilike("resumen", t), ilike("slug", t)].join(","));
  if (f.estado === "publicada") consulta = consulta.eq("publicada", true);
  if (f.estado === "borrador") consulta = consulta.eq("publicada", false);
  if (f.categoria) consulta = consulta.eq("categoria", f.categoria);
  const { data, error, count } = await consulta
    .order("publicada", { ascending: true })
    .order("updated_at", { ascending: false })
    .range(f.desde, f.hasta);
  if (error) throw new Error(mensajeError(error, "No se pudieron obtener las noticias."));
  return { filas: data ?? [], total: count ?? 0 };
}

export type ResumenNoticias = {
  total: number;
  publicadas: number;
  borradores: number;
  conImagen: number;
  categorias: string[];
  ultimaPublicacion: string | null;
};

export async function resumenNoticias(): Promise<ResumenNoticias> {
  const supabase = await createClient();
  const datos = filas(
    await supabase.from("noticias").select("publicada, publicada_at, categoria, imagen_url"),
    "el resumen de noticias",
  );
  const publicadas = datos.filter((n) => n.publicada);
  const ultima = publicadas
    .map((n) => n.publicada_at)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);
  return {
    total: datos.length,
    publicadas: publicadas.length,
    borradores: datos.length - publicadas.length,
    conImagen: datos.filter((n) => n.imagen_url).length,
    categorias: [...new Set(datos.map((n) => n.categoria))].sort((a, b) => a.localeCompare(b, "es")),
    ultimaPublicacion: ultima ?? null,
  };
}

export async function getNoticiaAdmin(id: string): Promise<Noticia | null> {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("noticias").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error, "No se pudo obtener la noticia."));
  return data;
}

/* =============================================================================
 * Capacitaciones
 * ========================================================================== */

export type Capacitacion = Tables<"capacitaciones">;
export type CapacitacionConCupo = Capacitacion & {
  inscriptos: number;
  asistentes: number;
};
export type EstadoCapacitacion = Enums<"estado_capacitacion">;

export type FiltrosCapacitaciones = {
  q?: string;
  estado?: EstadoCapacitacion;
  /** "proximas" (desde hoy) o "pasadas". */
  cuando?: "proximas" | "pasadas";
  desde: number;
  hasta: number;
};

export async function listarCapacitaciones(
  f: FiltrosCapacitaciones,
): Promise<{ filas: CapacitacionConCupo[]; total: number }> {
  const supabase = await createClient();
  let consulta = supabase.from("capacitaciones").select("*", { count: "exact" });
  const t = limpiarBusqueda(f.q);
  if (t) consulta = consulta.or([ilike("titulo", t), ilike("descripcion", t), ilike("lugar", t)].join(","));
  if (f.estado) consulta = consulta.eq("estado", f.estado);
  const hoy = inicioDelDia(hoyISO());
  if (f.cuando === "proximas") consulta = consulta.gte("fecha_inicio", hoy);
  if (f.cuando === "pasadas") consulta = consulta.lt("fecha_inicio", hoy);
  const { data, error, count } = await consulta
    .order("fecha_inicio", { ascending: f.cuando === "proximas" })
    .range(f.desde, f.hasta);
  if (error) throw new Error(mensajeError(error, "No se pudieron obtener las capacitaciones."));
  const lista = data ?? [];

  const conteos = new Map<string, { inscriptos: number; asistentes: number }>();
  if (lista.length > 0) {
    const inscripciones = filas(
      await supabase
        .from("capacitacion_inscripciones")
        .select("capacitacion_id, asistio")
        .in(
          "capacitacion_id",
          lista.map((c) => c.id),
        ),
      "las inscripciones",
    );
    for (const i of inscripciones) {
      const c = conteos.get(i.capacitacion_id) ?? {
        inscriptos: 0,
        asistentes: 0,
      };
      c.inscriptos += 1;
      if (i.asistio) c.asistentes += 1;
      conteos.set(i.capacitacion_id, c);
    }
  }
  return {
    filas: lista.map((c) => ({
      ...c,
      ...(conteos.get(c.id) ?? { inscriptos: 0, asistentes: 0 }),
    })),
    total: count ?? 0,
  };
}

export type ResumenCapacitaciones = {
  abiertas: number;
  proximas: number;
  inscriptos: number;
  asistentes: number;
  finalizadas: number;
};

export async function resumenCapacitaciones(): Promise<ResumenCapacitaciones> {
  const supabase = await createClient();
  const hoy = inicioDelDia(hoyISO());
  const [caps, inscriptos, asistentes] = await Promise.all([
    supabase.from("capacitaciones").select("estado, fecha_inicio"),
    supabase.from("capacitacion_inscripciones").select("id", { count: "exact", head: true }),
    supabase.from("capacitacion_inscripciones").select("id", { count: "exact", head: true }).eq("asistio", true),
  ]);
  const lista = filas(caps, "el resumen de capacitaciones");
  if (inscriptos.error || asistentes.error) {
    throw new Error(mensajeError(inscriptos.error ?? asistentes.error, "No se pudieron contar las inscripciones."));
  }
  const ahora = new Date(hoy).getTime();
  return {
    abiertas: lista.filter((c) => c.estado === "abierta").length,
    proximas: lista.filter((c) => c.estado !== "cancelada" && new Date(c.fecha_inicio).getTime() >= ahora).length,
    inscriptos: inscriptos.count ?? 0,
    asistentes: asistentes.count ?? 0,
    finalizadas: lista.filter((c) => c.estado === "finalizada").length,
  };
}

export async function getCapacitacion(id: string): Promise<Capacitacion | null> {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("capacitaciones").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error, "No se pudo obtener la capacitación."));
  return data;
}

export type Inscripcion = Tables<"capacitacion_inscripciones"> & {
  empresa: {
    id: string;
    nombre_comercial: string;
    numero_registro: number | null;
  } | null;
};

export async function listarInscripciones(capacitacionId: string): Promise<Inscripcion[]> {
  if (!esUuid(capacitacionId)) return [];
  const supabase = await createClient();
  return filas(
    await supabase
      .from("capacitacion_inscripciones")
      .select("*, empresa:empresas(id, nombre_comercial, numero_registro)")
      .eq("capacitacion_id", capacitacionId)
      .order("nombre", { ascending: true }),
    "los inscriptos",
  );
}

/* =============================================================================
 * Avisos a empresas
 * ========================================================================== */

export type NivelAviso = Enums<"nivel_aviso">;

export type AvisoListado = Tables<"avisos"> & {
  empresa: {
    id: string;
    nombre_comercial: string;
    numero_registro: number | null;
  } | null;
  autor: { nombre: string; apellido: string; email: string | null } | null;
};

export type FiltrosAvisos = {
  nivel?: NivelAviso;
  destino?: "todas" | "empresa";
  empresa?: string;
  q?: string;
  desde: number;
  hasta: number;
};

export async function listarAvisos(f: FiltrosAvisos): Promise<{ filas: AvisoListado[]; total: number }> {
  const supabase = await createClient();
  let consulta = supabase
    .from("avisos")
    .select(
      "*, empresa:empresas(id, nombre_comercial, numero_registro), autor:perfiles!avisos_created_by_fkey(nombre, apellido, email)",
      { count: "exact" },
    );
  const t = limpiarBusqueda(f.q);
  if (t) consulta = consulta.or([ilike("titulo", t), ilike("cuerpo", t)].join(","));
  if (f.nivel) consulta = consulta.eq("nivel", f.nivel);
  if (f.destino === "todas") consulta = consulta.is("empresa_id", null);
  if (f.destino === "empresa") consulta = consulta.not("empresa_id", "is", null);
  if (esUuid(f.empresa)) consulta = consulta.eq("empresa_id", f.empresa);
  const { data, error, count } = await consulta.order("created_at", { ascending: false }).range(f.desde, f.hasta);
  if (error) throw new Error(mensajeError(error, "No se pudieron obtener los avisos."));
  return { filas: data ?? [], total: count ?? 0 };
}

export type ResumenAvisos = {
  total: number;
  generales: number;
  dirigidos: number;
  urgentes30: number;
};

export async function resumenAvisos(): Promise<ResumenAvisos> {
  const supabase = await createClient();
  const hace30 = inicioDelDia(sumarDias(hoyISO(), -30));
  const [total, generales, urgentes] = await Promise.all([
    supabase.from("avisos").select("id", { count: "exact", head: true }),
    supabase.from("avisos").select("id", { count: "exact", head: true }).is("empresa_id", null),
    supabase
      .from("avisos")
      .select("id", { count: "exact", head: true })
      .eq("nivel", "urgente")
      .gte("created_at", hace30),
  ]);
  const error = total.error ?? generales.error ?? urgentes.error;
  if (error) throw new Error(mensajeError(error, "No se pudo obtener el resumen de avisos."));
  return {
    total: total.count ?? 0,
    generales: generales.count ?? 0,
    dirigidos: (total.count ?? 0) - (generales.count ?? 0),
    urgentes30: urgentes.count ?? 0,
  };
}

export type OpcionEmpresa = Pick<Tables<"empresas">, "id" | "nombre_comercial" | "numero_registro" | "estado" | "cuit">;

/** Empresas del padrón para los selectores (destinatario de avisos, vínculo de usuarios). */
export async function opcionesEmpresas(): Promise<OpcionEmpresa[]> {
  const supabase = await createClient();
  return filas(
    await supabase
      .from("empresas")
      .select("id, nombre_comercial, numero_registro, estado, cuit")
      .order("numero_registro", { ascending: true, nullsFirst: false })
      .order("nombre_comercial", { ascending: true }),
    "el padrón de empresas",
  );
}

/* =============================================================================
 * Configuración: aranceles, rubros, parámetros, feriados y cuentas
 * ========================================================================== */

export type Arancel = Tables<"aranceles">;
export type CuentaRecaudadora = Tables<"cuentas_recaudadoras">;

export type ConceptoArancel = {
  codigo: string;
  concepto: string;
  unidad: string;
  cuenta: CuentaRecaudadora | null;
  activo: boolean;
  /** Versión vigente hoy (si hay). */
  vigente: Arancel | null;
  /** Versión con vigencia futura ya cargada (si hay). */
  proxima: Arancel | null;
  /** Todas las versiones, de la más nueva a la más vieja. */
  versiones: Arancel[];
};

/** Aranceles agrupados por concepto con todas sus versiones (historial de Ordenanzas Tarifarias). */
export async function listarConceptosArancel(): Promise<{
  conceptos: ConceptoArancel[];
  cuentas: CuentaRecaudadora[];
}> {
  const supabase = await createClient();
  const [aranceles, cuentas] = await Promise.all([
    supabase.from("aranceles").select("*").order("codigo").order("vigente_desde", { ascending: false }),
    supabase.from("cuentas_recaudadoras").select("*").order("codigo", { ascending: false }),
  ]);
  const listaCuentas = filas(cuentas, "las cuentas recaudadoras");
  const lista = filas(aranceles, "los aranceles");
  const hoy = hoyISO();
  const porCodigo = new Map<string, Arancel[]>();
  for (const a of lista) porCodigo.set(a.codigo, [...(porCodigo.get(a.codigo) ?? []), a]);

  const conceptos: ConceptoArancel[] = [...porCodigo.entries()].map(([codigo, versiones]) => {
    const vigente =
      versiones.find((v) => v.vigente_desde <= hoy && (!v.vigente_hasta || v.vigente_hasta >= hoy)) ?? null;
    const proxima = [...versiones].reverse().find((v) => v.vigente_desde > hoy) ?? null;
    const referencia = vigente ?? versiones[0];
    return {
      codigo,
      concepto: referencia.concepto,
      unidad: referencia.unidad,
      cuenta: listaCuentas.find((c) => c.id === referencia.cuenta_id) ?? null,
      activo: versiones.some((v) => v.activo),
      vigente,
      proxima,
      versiones,
    };
  });
  // Primero los de la cuenta 505 (timbrado), luego por concepto.
  conceptos.sort(
    (a, b) =>
      (b.cuenta?.codigo ?? "").localeCompare(a.cuenta?.codigo ?? "") ||
      Number(b.activo) - Number(a.activo) ||
      a.concepto.localeCompare(b.concepto, "es"),
  );
  return { conceptos, cuentas: listaCuentas };
}

export type Rubro = Tables<"rubros">;

/** Anexo de rubros completo (activos e inactivos), por grupo y nombre. */
export async function listarRubrosAdmin(): Promise<Rubro[]> {
  const supabase = await createClient();
  return filas(await supabase.from("rubros").select("*").order("grupo").order("nombre"), "el Anexo de rubros");
}

export type Parametro = Tables<"parametros">;

export async function listarParametros(): Promise<Parametro[]> {
  const supabase = await createClient();
  return filas(await supabase.from("parametros").select("*").order("clave"), "los parámetros");
}

export type Feriado = Tables<"feriados">;

export async function listarFeriados(anio: number): Promise<{ feriados: Feriado[]; anios: number[] }> {
  const supabase = await createClient();
  const [delAnio, todos] = await Promise.all([
    supabase.from("feriados").select("*").gte("fecha", `${anio}-01-01`).lte("fecha", `${anio}-12-31`).order("fecha"),
    supabase.from("feriados").select("fecha"),
  ]);
  const anios = new Set(filas(todos, "los feriados").map((f) => Number(f.fecha.slice(0, 4))));
  return {
    feriados: filas(delAnio, "los feriados"),
    anios: [...anios].sort((a, b) => a - b),
  };
}

/* =============================================================================
 * Usuarios
 * ========================================================================== */

export type Rol = Enums<"rol_usuario">;

export type UsuarioListado = Tables<"perfiles"> & {
  empresa: {
    id: string;
    nombre_comercial: string;
    numero_registro: number | null;
  } | null;
  tecnico: {
    id: string;
    nombre: string;
    apellido: string;
    titulo: string;
  } | null;
};

export type FiltrosUsuarios = {
  q?: string;
  rol?: Rol;
  activo?: boolean;
  /** Solo cuentas de empresa o técnico sin empresa vinculada. */
  sinEmpresa?: boolean;
  desde: number;
  hasta: number;
};

export async function listarUsuarios(f: FiltrosUsuarios): Promise<{ filas: UsuarioListado[]; total: number }> {
  const supabase = await createClient();
  let consulta = supabase
    .from("perfiles")
    .select(
      "*, empresa:empresas!perfiles_empresa_id_fkey(id, nombre_comercial, numero_registro), tecnico:tecnicos!perfiles_tecnico_id_fkey(id, nombre, apellido, titulo)",
      { count: "exact" },
    );
  const t = limpiarBusqueda(f.q);
  if (t) {
    consulta = consulta.or([ilike("nombre", t), ilike("apellido", t), ilike("email", t), ilike("dni", t)].join(","));
  }
  if (f.rol) consulta = consulta.eq("rol", f.rol);
  if (f.activo !== undefined) consulta = consulta.eq("activo", f.activo);
  if (f.sinEmpresa) consulta = consulta.in("rol", ["empresa", "tecnico"]).is("empresa_id", null);
  const { data, error, count } = await consulta
    .order("activo", { ascending: false })
    .order("apellido", { ascending: true })
    .order("nombre", { ascending: true })
    .range(f.desde, f.hasta);
  if (error) throw new Error(mensajeError(error, "No se pudieron obtener los usuarios."));
  return { filas: data ?? [], total: count ?? 0 };
}

export type ResumenUsuarios = {
  total: number;
  activos: number;
  inactivos: number;
  porRol: Record<Rol, number>;
  /** Cuentas de empresa o técnico sin empresa vinculada (registradas, sin inscripción aprobada). */
  sinEmpresa: number;
};

export async function resumenUsuarios(): Promise<ResumenUsuarios> {
  const supabase = await createClient();
  const datos = filas(await supabase.from("perfiles").select("rol, activo, empresa_id"), "el resumen de usuarios");
  const porRol: Record<Rol, number> = {
    admin: 0,
    control: 0,
    inspector: 0,
    empresa: 0,
    tecnico: 0,
  };
  for (const p of datos) if (p.activo) porRol[p.rol] += 1;
  const activos = datos.filter((p) => p.activo).length;
  return {
    total: datos.length,
    activos,
    inactivos: datos.length - activos,
    porRol,
    sinEmpresa: datos.filter((p) => p.activo && (p.rol === "empresa" || p.rol === "tecnico") && !p.empresa_id).length,
  };
}

export type OpcionTecnico = Pick<Tables<"tecnicos">, "id" | "nombre" | "apellido" | "empresa_id" | "estado" | "titulo">;

/**
 * Asesores técnicos para vincular usuarios con rol técnico. Incluye los dados de baja o
 * rechazados para poder mostrar el vínculo actual de una cuenta; el formulario solo ofrece
 * esos estados cuando ya son el vínculo vigente.
 */
export async function opcionesTecnicos(): Promise<OpcionTecnico[]> {
  const supabase = await createClient();
  return filas(
    await supabase
      .from("tecnicos")
      .select("id, nombre, apellido, empresa_id, estado, titulo")
      .order("apellido")
      .order("nombre"),
    "los asesores técnicos",
  );
}

export type EstadoCuenta = {
  invitadoAt: string | null;
  confirmadoAt: string | null;
  ultimoAcceso: string | null;
};

/**
 * Estado de las cuentas de Auth (invitación pendiente, último acceso). Usa la clave de
 * servicio: llamar SOLO después de verificar que el usuario es administrador. Si la
 * clave no está configurada, devuelve null y la interfaz omite esos datos.
 */
export async function estadoCuentasAuth(): Promise<Map<string, EstadoCuenta> | null> {
  try {
    const admin = createAdminClient();
    const mapa = new Map<string, EstadoCuenta>();
    const porPagina = 1000;
    for (let pagina = 1; pagina <= 10; pagina++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page: pagina,
        perPage: porPagina,
      });
      if (error) return null;
      const usuarios: User[] = data.users;
      for (const u of usuarios) {
        mapa.set(u.id, {
          invitadoAt: u.invited_at ?? null,
          confirmadoAt: u.email_confirmed_at ?? u.confirmed_at ?? null,
          ultimoAcceso: u.last_sign_in_at ?? null,
        });
      }
      if (usuarios.length < porPagina) break;
    }
    return mapa;
  } catch {
    return null;
  }
}

/* =============================================================================
 * Auditoría
 * ========================================================================== */

/** Tablas con trigger de auditoría (migración 2) y su nombre para la interfaz. */
export const TABLAS_AUDITADAS: Record<string, string> = {
  actas: "Actas",
  aranceles: "Aranceles",
  avisos: "Avisos a empresas",
  capacitaciones: "Capacitaciones",
  certificado_productos: "Productos de certificados",
  certificados: "Certificados",
  cuentas_recaudadoras: "Cuentas recaudadoras",
  declaraciones: "Declaraciones",
  denuncias: "Denuncias",
  documentos: "Documentos del legajo",
  empresa_productos: "Memorias técnicas",
  empresas: "Empresas",
  envases_movimientos: "Envases vacíos",
  establecimientos: "Establecimientos",
  inspecciones: "Inspecciones",
  noticias: "Noticias",
  notificaciones: "Notificaciones",
  pagos: "Pagos y liquidaciones",
  parametros: "Parámetros",
  perfiles: "Usuarios",
  productos: "Productos",
  rubros: "Rubros del Anexo",
  tecnicos: "Asesores técnicos",
  tramites: "Trámites",
};

export type AccionAuditoria = "INSERT" | "UPDATE" | "DELETE";

export type CambioAuditoria = {
  campo: string;
  antes: string | null;
  despues: string | null;
};

export type UsuarioAuditoria = {
  id: string;
  nombre: string;
  email: string | null;
  rol: Rol | null;
};

export type EventoAuditoria = {
  id: number;
  tabla: string;
  tablaLabel: string;
  registroId: string | null;
  accion: AccionAuditoria;
  createdAt: string;
  usuario: UsuarioAuditoria | null;
  /** usuario_id sin perfil (cuenta eliminada) o null (proceso del sistema). */
  usuarioId: string | null;
  /** Texto que identifica el registro (nombre, código, número…). */
  descriptor: string | null;
  /** Campos modificados (UPDATE) o cargados (INSERT) o eliminados (DELETE). */
  cambios: CambioAuditoria[];
  /** Enlace a la ficha del registro en gestión, si existe. */
  href: string | null;
};

export type FiltrosAuditoria = {
  tabla?: string;
  accion?: AccionAuditoria;
  /** uuid del perfil o "sistema" (sin usuario). */
  usuario?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  registro?: string;
  desde: number;
  hasta: number;
};

const CAMPOS_OMITIDOS = new Set(["updated_at"]);
const CAMPOS_DESCRIPTOR = [
  "nombre_comercial",
  "codigo",
  "numero",
  "titulo",
  "concepto",
  "razon_social",
  "cliente",
  "clave",
  "email",
  "slug",
  "nombre",
];

const RUTAS_FICHA: Record<string, string> = {
  empresas: "/gestion/empresas",
  certificados: "/gestion/certificados",
  pagos: "/gestion/pagos",
  inspecciones: "/gestion/inspecciones",
  notificaciones: "/gestion/notificaciones",
  actas: "/gestion/actas",
  tramites: "/gestion/tramites",
  establecimientos: "/gestion/establecimientos",
  declaraciones: "/gestion/control",
  noticias: "/gestion/noticias",
  capacitaciones: "/gestion/capacitaciones",
};

type ObjetoJson = { [key: string]: Json | undefined };

function comoObjeto(valor: Json | null): ObjetoJson | null {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? valor : null;
}

function valorTexto(valor: Json | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "string") return valor;
  if (typeof valor === "number") return String(valor);
  return JSON.stringify(valor, null, 2);
}

function calcularCambios(
  accion: AccionAuditoria,
  antes: ObjetoJson | null,
  despues: ObjetoJson | null,
): CambioAuditoria[] {
  if (accion === "UPDATE" && antes && despues) {
    const claves = [...new Set([...Object.keys(antes), ...Object.keys(despues)])];
    return claves
      .filter((k) => !CAMPOS_OMITIDOS.has(k) && JSON.stringify(antes[k] ?? null) !== JSON.stringify(despues[k] ?? null))
      .map((k) => ({
        campo: k,
        antes: valorTexto(antes[k]),
        despues: valorTexto(despues[k]),
      }));
  }
  const fuente = accion === "DELETE" ? antes : despues;
  if (!fuente) return [];
  return Object.keys(fuente)
    .filter((k) => !CAMPOS_OMITIDOS.has(k) && k !== "created_at" && fuente[k] !== null && fuente[k] !== undefined)
    .map((k) =>
      accion === "DELETE"
        ? { campo: k, antes: valorTexto(fuente[k]), despues: null }
        : { campo: k, antes: null, despues: valorTexto(fuente[k]) },
    );
}

function descriptorDe(tabla: string, datos: ObjetoJson | null): string | null {
  if (!datos) return null;
  if (tabla === "perfiles") {
    const nombre = `${valorTexto(datos.nombre) ?? ""} ${valorTexto(datos.apellido) ?? ""}`.trim();
    return nombre || valorTexto(datos.email);
  }
  if (tabla === "tecnicos") {
    return `${valorTexto(datos.nombre) ?? ""} ${valorTexto(datos.apellido) ?? ""}`.trim() || null;
  }
  for (const campo of CAMPOS_DESCRIPTOR) {
    const v = datos[campo];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

function normalizarAccion(valor: string): AccionAuditoria {
  return valor === "INSERT" || valor === "DELETE" ? valor : "UPDATE";
}

export async function listarAuditoria(f: FiltrosAuditoria): Promise<{ filas: EventoAuditoria[]; total: number }> {
  const supabase = await createClient();
  let consulta = supabase.from("auditoria").select("*", { count: "exact" });
  if (f.tabla) consulta = consulta.eq("tabla", f.tabla);
  if (f.accion) consulta = consulta.eq("accion", f.accion);
  if (f.usuario === "sistema") consulta = consulta.is("usuario_id", null);
  else if (esUuid(f.usuario)) consulta = consulta.eq("usuario_id", f.usuario);
  if (f.fechaDesde) consulta = consulta.gte("created_at", inicioDelDia(f.fechaDesde));
  if (f.fechaHasta) consulta = consulta.lt("created_at", inicioDelDia(sumarDias(f.fechaHasta, 1)));
  const registro = f.registro?.trim();
  if (registro) consulta = consulta.eq("registro_id", registro.slice(0, 80));

  const { data, error, count } = await consulta
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(f.desde, f.hasta);
  if (error) throw new Error(mensajeError(error, "No se pudo obtener el registro de auditoría."));
  const lista = data ?? [];

  const ids = [...new Set(lista.map((e) => e.usuario_id).filter((v): v is string => Boolean(v)))];
  const usuarios = new Map<string, UsuarioAuditoria>();
  if (ids.length > 0) {
    const perfiles = filas(
      await supabase.from("perfiles").select("id, nombre, apellido, email, rol").in("id", ids),
      "los usuarios de la auditoría",
    );
    for (const p of perfiles) {
      usuarios.set(p.id, {
        id: p.id,
        nombre: `${p.nombre} ${p.apellido}`.trim() || p.email || "Usuario sin nombre",
        email: p.email,
        rol: p.rol,
      });
    }
  }

  return {
    total: count ?? 0,
    filas: lista.map((e) => {
      const accion = normalizarAccion(e.accion);
      const antes = comoObjeto(e.datos_anteriores);
      const despues = comoObjeto(e.datos_nuevos);
      const ruta = RUTAS_FICHA[e.tabla];
      return {
        id: e.id,
        tabla: e.tabla,
        tablaLabel: TABLAS_AUDITADAS[e.tabla] ?? e.tabla,
        registroId: e.registro_id,
        accion,
        createdAt: e.created_at,
        usuario: e.usuario_id ? (usuarios.get(e.usuario_id) ?? null) : null,
        usuarioId: e.usuario_id,
        descriptor: descriptorDe(e.tabla, despues ?? antes),
        cambios: calcularCambios(accion, antes, despues),
        href: ruta && accion !== "DELETE" && esUuid(e.registro_id) ? `${ruta}/${e.registro_id}` : null,
      };
    }),
  };
}

export type ResumenAuditoria = {
  hoy: number;
  semana: number;
  modificaciones: number;
  bajas: number;
};

export async function resumenAuditoria(): Promise<ResumenAuditoria> {
  const supabase = await createClient();
  const hoy = hoyISO();
  const inicioHoy = inicioDelDia(hoy);
  const inicioSemana = inicioDelDia(sumarDias(hoy, -6));
  const contar = () => supabase.from("auditoria").select("id", { count: "exact", head: true });
  const [rHoy, rSemana, rMod, rBajas] = await Promise.all([
    contar().gte("created_at", inicioHoy),
    contar().gte("created_at", inicioSemana),
    contar().gte("created_at", inicioSemana).eq("accion", "UPDATE"),
    contar().gte("created_at", inicioSemana).eq("accion", "DELETE"),
  ]);
  const error = rHoy.error ?? rSemana.error ?? rMod.error ?? rBajas.error;
  if (error) throw new Error(mensajeError(error, "No se pudo obtener el resumen de auditoría."));
  return {
    hoy: rHoy.count ?? 0,
    semana: rSemana.count ?? 0,
    modificaciones: rMod.count ?? 0,
    bajas: rBajas.count ?? 0,
  };
}

export type OpcionUsuario = { id: string; etiqueta: string; rol: Rol };

/** Usuarios para el filtro de auditoría (staff primero). */
export async function opcionesUsuariosAuditoria(): Promise<OpcionUsuario[]> {
  const supabase = await createClient();
  const perfiles = filas(
    await supabase
      .from("perfiles")
      .select("id, nombre, apellido, email, rol")
      .order("apellido")
      .order("nombre")
      .limit(1000),
    "los usuarios",
  );
  const orden: Record<Rol, number> = {
    admin: 0,
    control: 1,
    inspector: 2,
    tecnico: 3,
    empresa: 4,
  };
  return perfiles
    .map((p) => ({
      id: p.id,
      rol: p.rol,
      etiqueta:
        [`${p.apellido}, ${p.nombre}`.replace(/^, |, $/g, "").trim(), p.email].filter(Boolean).join(" · ") || p.id,
    }))
    .sort((a, b) => orden[a.rol] - orden[b.rol] || a.etiqueta.localeCompare(b.etiqueta, "es"));
}
