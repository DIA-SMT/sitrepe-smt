import "server-only";
import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { mensajeError } from "@/lib/acciones";
import { normalizarCuit } from "@/lib/domain/cuit";
import { TIPO_DOCUMENTO } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha, hoyISO } from "@/lib/domain/formato";
import type { Enums, Json, Tables, Views } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/* -----------------------------------------------------------------------------
 * Registro de prestadores: padrón de empresas, legajo, trámites, catálogo de
 * productos y memorias técnicas. Lecturas para el staff (la RLS de cada vista
 * decide qué se devuelve).
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

export type EstadoEmpresa = Enums<"estado_empresa">;
export type EmpresaPadron = Views<"v_empresas">;

/* --- Padrón ----------------------------------------------------------------- */

export type FiltrosPadron = {
  q?: string;
  estado?: EstadoEmpresa;
  actividad?: "F" | "T";
  vence30?: boolean;
  conObservaciones?: boolean;
  desde: number;
  hasta: number;
};

function condicionBusquedaEmpresa(q: string | undefined): string | null {
  const t = limpiarBusqueda(q);
  if (!t) return null;
  const partes = [ilike("nombre_comercial", t), ilike("titular", t), ilike("cuit", t)];
  const numeroRegistro = t.match(/^(?:n\.?\s*[º°o]?\.?\s*|#\s*)?(\d{1,6})$/i);
  if (numeroRegistro) partes.push(`numero_registro.eq.${Number(numeroRegistro[1])}`);
  const cuit = normalizarCuit(t);
  if (cuit) partes.push(`cuit.eq.${cuit}`);
  return partes.join(",");
}

/** Padrón paginado (v_empresas) con filtros de la URL. */
export async function listarEmpresas(f: FiltrosPadron): Promise<{ filas: EmpresaPadron[]; total: number }> {
  const supabase = await createClient();
  let consulta = supabase.from("v_empresas").select("*", { count: "exact" });
  const busqueda = condicionBusquedaEmpresa(f.q);
  if (busqueda) consulta = consulta.or(busqueda);
  if (f.estado) consulta = consulta.eq("estado_efectivo", f.estado);
  if (f.actividad === "F") consulta = consulta.eq("habilita_fumigacion", true);
  if (f.actividad === "T") consulta = consulta.eq("habilita_tanques", true);
  // Mismo criterio que el resumen y el panel: habilitadas cuyo vencimiento cae en los próximos 30 días.
  if (f.vence30) consulta = consulta.eq("estado", "habilitada").gte("dias_para_vencer", 0).lte("dias_para_vencer", 30);
  if (f.conObservaciones) consulta = consulta.not("observaciones", "is", null);

  const { data, error, count } = await consulta
    .order("numero_registro", { ascending: true, nullsFirst: false })
    .order("nombre_comercial", { ascending: true })
    .range(f.desde, f.hasta);
  if (error) throw new Error(mensajeError(error, "No se pudo obtener el padrón de empresas."));
  return { filas: data ?? [], total: count ?? 0 };
}

export type ResumenPadron = {
  total: number;
  porEstado: Record<EstadoEmpresa, number>;
  porVencer30: number;
  conTanques: number;
  conObservaciones: number;
};

/** Totales del padrón por estado efectivo (para los chips de resumen). */
export async function getResumenPadron(): Promise<ResumenPadron> {
  const supabase = await createClient();
  const r = await supabase.from("v_empresas").select("estado_efectivo, dias_para_vencer, habilita_tanques, observaciones");
  const lista = filas(r, "el resumen del padrón");
  const porEstado: Record<EstadoEmpresa, number> = {
    en_tramite: 0,
    habilitada: 0,
    observada: 0,
    suspendida: 0,
    vencida: 0,
    baja: 0,
  };
  let porVencer30 = 0;
  let conTanques = 0;
  let conObservaciones = 0;
  for (const e of lista) {
    if (e.estado_efectivo) porEstado[e.estado_efectivo] += 1;
    if (e.estado_efectivo === "habilitada" && e.dias_para_vencer !== null && e.dias_para_vencer >= 0 && e.dias_para_vencer <= 30) {
      porVencer30 += 1;
    }
    if (e.habilita_tanques && e.estado_efectivo === "habilitada") conTanques += 1;
    if (e.observaciones) conObservaciones += 1;
  }
  return { total: lista.length, porEstado, porVencer30, conTanques, conObservaciones };
}

/* --- Legajo ----------------------------------------------------------------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ¿Es un UUID válido? (evita errores 22P02 de Postgres con parámetros de la URL). */
export function esUuid(valor: string | null | undefined): valor is string {
  return Boolean(valor && UUID.test(valor));
}

/** Fila de v_empresas (memorizada por request: la usan la página y su metadata). */
export const getEmpresa = cache(async (id: string): Promise<EmpresaPadron | null> => {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_empresas").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error, "No se pudo obtener la empresa."));
  return data;
});

export type Tecnico = Tables<"tecnicos">;
export type MemoriaTecnica = Views<"v_memorias_tecnicas">;
export type DocumentoLegajo = Views<"v_documentos">;
export type TramiteVista = Views<"v_tramites">;
export type EnvaseSaldo = Views<"v_envases_saldo">;

const SEL_CERTIFICADOS =
  "id, numero, tipo, cliente, domicilio, rubro_nombre, fecha_servicio, fecha_vencimiento, estado, vigencia, sello_codigo";
const SEL_PAGOS =
  "id, codigo, arancel_concepto, cantidad, importe_total, cuenta_codigo, medio, estado, fecha_pago, created_at, cantidad_certificados";
const SEL_INSPECCIONES =
  "id, codigo, tipo, estado, resultado, fecha_programada, realizada_at, establecimiento_nombre, establecimiento_domicilio, inspector_nombre, observaciones";
const SEL_ACTAS = "id, numero, motivo, estado, fecha, establecimiento_nombre, establecimiento_domicilio, inspector_nombre, descripcion";

/** Todo el legajo de una empresa (pestañas de /gestion/empresas/[id]). */
export async function getLegajoEmpresa(id: string) {
  const supabase = await createClient();
  const [tecnicos, memorias, documentos, certificados, pagos, tramites, inspecciones, actas, envases] = await Promise.all([
    supabase.from("tecnicos").select("*").eq("empresa_id", id).order("estado").order("apellido"),
    supabase.from("v_memorias_tecnicas").select("*").eq("empresa_id", id).order("producto_nombre"),
    supabase.from("v_documentos").select("*").eq("empresa_id", id).order("created_at", { ascending: false }),
    supabase
      .from("v_certificados")
      .select(SEL_CERTIFICADOS, { count: "exact" })
      .eq("empresa_id", id)
      .order("fecha_servicio", { ascending: false })
      .limit(10),
    supabase
      .from("v_pagos")
      .select(SEL_PAGOS, { count: "exact" })
      .eq("empresa_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("v_tramites")
      .select("*")
      .eq("empresa_id", id)
      .neq("estado", "borrador")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("v_inspecciones")
      .select(SEL_INSPECCIONES, { count: "exact" })
      .eq("empresa_id", id)
      .order("fecha_programada", { ascending: false })
      .limit(15),
    supabase
      .from("v_actas")
      .select(SEL_ACTAS, { count: "exact" })
      .eq("empresa_id", id)
      .order("fecha", { ascending: false })
      .limit(15),
    supabase.from("v_envases_saldo").select("*").eq("empresa_id", id).order("producto_nombre"),
  ]);

  return {
    tecnicos: filas(tecnicos, "los técnicos"),
    memorias: filas(memorias, "la memoria técnica"),
    documentos: filas(documentos, "los documentos"),
    certificados: { filas: filas(certificados, "los certificados"), total: certificados.count ?? 0 },
    pagos: { filas: filas(pagos, "los pagos"), total: pagos.count ?? 0 },
    tramites: filas(tramites, "los trámites"),
    inspecciones: { filas: filas(inspecciones, "las inspecciones"), total: inspecciones.count ?? 0 },
    actas: { filas: filas(actas, "las actas"), total: actas.count ?? 0 },
    envases: filas(envases, "el saldo de envases"),
  };
}

export type Legajo = Awaited<ReturnType<typeof getLegajoEmpresa>>;

/* --- Historial (auditoría) ---------------------------------------------------- */

const TABLAS_HIJAS = ["tecnicos", "empresa_productos", "documentos", "tramites"] as const;

export const TABLA_AUDITORIA: Record<string, string> = {
  empresas: "Datos de la empresa",
  tecnicos: "Asesor técnico",
  empresa_productos: "Memoria técnica",
  documentos: "Documento del legajo",
  tramites: "Trámite",
};

const CAMPOS_OCULTOS = new Set(["updated_at", "created_at", "id", "empresa_id", "created_by"]);

export type CambioAuditoria = { campo: string; antes: string; despues: string };

export type EntradaHistorial = {
  id: number;
  tabla: string;
  accion: "INSERT" | "UPDATE" | "DELETE";
  fecha: string;
  usuario: string | null;
  referencia: string | null;
  cambios: CambioAuditoria[];
};

function comoTexto(valor: Json | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "object") {
    const json = JSON.stringify(valor);
    return json.length > 80 ? `${json.slice(0, 77)}…` : json;
  }
  const texto = String(valor);
  return texto.length > 80 ? `${texto.slice(0, 77)}…` : texto;
}

/** Convierte un valor JSON en objeto plano (o vacío). */
export function comoObjeto(valor: Json | null | undefined): Record<string, Json | undefined> {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
}

function referenciaRegistro(tabla: string, datos: Record<string, Json | undefined>): string | null {
  const s = (v: Json | undefined) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
  switch (tabla) {
    case "empresas":
      return s(datos.nombre_comercial) || null;
    case "tecnicos":
      return `${s(datos.nombre)} ${s(datos.apellido)}`.trim() || null;
    case "documentos": {
      const tipo = s(datos.tipo);
      const etiquetaTipo = (TIPO_DOCUMENTO as Record<string, { label: string }>)[tipo]?.label ?? tipo;
      return [etiquetaTipo, s(datos.nombre_archivo)].filter(Boolean).join(" · ") || null;
    }
    case "tramites":
      return [s(datos.codigo), s(datos.tipo).replace(/_/g, " ")].filter(Boolean).join(" · ") || null;
    case "empresa_productos":
      return s(datos.estado) ? `Estado: ${s(datos.estado)}` : null;
    default:
      return null;
  }
}

/** Últimos movimientos del legajo de una empresa (solo administración: la RLS de auditoría lo exige). */
export async function getHistorialEmpresa(id: string, limite = 60): Promise<EntradaHistorial[]> {
  const supabase = await createClient();
  const sel = "id, tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos, created_at";
  const [propios, actuales, eliminados] = await Promise.all([
    supabase
      .from("auditoria")
      .select(sel)
      .eq("tabla", "empresas")
      .eq("registro_id", id)
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("auditoria")
      .select(sel)
      .in("tabla", [...TABLAS_HIJAS])
      .filter("datos_nuevos->>empresa_id", "eq", id)
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("auditoria")
      .select(sel)
      .in("tabla", [...TABLAS_HIJAS])
      .eq("accion", "DELETE")
      .filter("datos_anteriores->>empresa_id", "eq", id)
      .order("created_at", { ascending: false })
      .limit(limite),
  ]);

  type FilaAuditoria = Pick<
    Tables<"auditoria">,
    "id" | "tabla" | "registro_id" | "accion" | "usuario_id" | "datos_anteriores" | "datos_nuevos" | "created_at"
  >;
  const unicos = new Map<number, FilaAuditoria>();
  for (const r of [
    ...filas(propios, "el historial"),
    ...filas(actuales, "el historial"),
    ...filas(eliminados, "el historial"),
  ]) {
    unicos.set(r.id, r);
  }
  const registros = [...unicos.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limite);

  const idsUsuarios = [...new Set(registros.map((r) => r.usuario_id).filter((u): u is string => Boolean(u)))];
  const nombres = new Map<string, string>();
  if (idsUsuarios.length > 0) {
    const { data } = await supabase.from("perfiles").select("id, nombre, apellido, email").in("id", idsUsuarios);
    for (const p of data ?? []) {
      nombres.set(p.id, `${p.nombre} ${p.apellido}`.trim() || p.email || "Usuario");
    }
  }

  return registros.map((r) => {
    const antes = comoObjeto(r.datos_anteriores);
    const despues = comoObjeto(r.datos_nuevos);
    const accion = r.accion === "INSERT" || r.accion === "DELETE" ? r.accion : "UPDATE";
    const cambios: CambioAuditoria[] =
      accion === "UPDATE"
        ? Object.keys({ ...antes, ...despues })
            .filter((k) => !CAMPOS_OCULTOS.has(k) && JSON.stringify(antes[k] ?? null) !== JSON.stringify(despues[k] ?? null))
            .map((k) => ({ campo: k.replace(/_/g, " "), antes: comoTexto(antes[k]), despues: comoTexto(despues[k]) }))
        : [];
    return {
      id: r.id,
      tabla: r.tabla,
      accion,
      fecha: r.created_at,
      usuario: r.usuario_id ? (nombres.get(r.usuario_id) ?? "Usuario") : "Sistema",
      referencia: referenciaRegistro(r.tabla, accion === "DELETE" ? antes : despues),
      cambios,
    };
  });
}

/* --- Trámites --------------------------------------------------------------- */

export type EstadoTramite = Enums<"estado_tramite">;
export type TipoTramite = Enums<"tipo_tramite">;
export const ESTADOS_BANDEJA = ["presentado", "observado", "aprobado", "rechazado"] as const satisfies readonly EstadoTramite[];

export type FiltrosTramites = {
  estado: (typeof ESTADOS_BANDEJA)[number] | "todos";
  tipo?: TipoTramite;
  q?: string;
  desde: number;
  hasta: number;
};

/** Bandeja de trámites (sin borradores: todavía no fueron presentados). */
export async function listarTramites(f: FiltrosTramites): Promise<{ filas: TramiteVista[]; total: number }> {
  const supabase = await createClient();
  let consulta = supabase.from("v_tramites").select("*", { count: "exact" }).neq("estado", "borrador");
  if (f.estado !== "todos") consulta = consulta.eq("estado", f.estado);
  if (f.tipo) consulta = consulta.eq("tipo", f.tipo);
  const t = limpiarBusqueda(f.q);
  if (t) consulta = consulta.or([ilike("empresa_nombre", t), ilike("codigo", t), ilike("empresa_cuit", t)].join(","));

  // Pendientes: primero los que esperan hace más tiempo. Resueltos: los más recientes primero.
  const pendientes = f.estado === "presentado" || f.estado === "observado";
  consulta = pendientes
    ? consulta.order("presentado_at", { ascending: true, nullsFirst: false })
    : consulta.order("updated_at", { ascending: false });

  const { data, error, count } = await consulta.range(f.desde, f.hasta);
  if (error) throw new Error(mensajeError(error, "No se pudo obtener la bandeja de trámites."));
  return { filas: data ?? [], total: count ?? 0 };
}

/** Cantidad de trámites por estado (pestañas de la bandeja). */
export async function contarTramitesPorEstado(): Promise<Record<(typeof ESTADOS_BANDEJA)[number] | "todos", number>> {
  const supabase = await createClient();
  const conteos = await Promise.all(
    ESTADOS_BANDEJA.map((estado) =>
      supabase.from("tramites").select("id", { count: "exact", head: true }).eq("estado", estado),
    ),
  );
  const resultado = Object.fromEntries(ESTADOS_BANDEJA.map((e, i) => [e, conteos[i].count ?? 0])) as Record<
    (typeof ESTADOS_BANDEJA)[number],
    number
  >;
  return { ...resultado, todos: Object.values(resultado).reduce((a, b) => a + b, 0) };
}

export type InspeccionResumen = Pick<
  Tables<"inspecciones">,
  "id" | "codigo" | "tipo" | "estado" | "resultado" | "fecha_programada" | "realizada_at"
>;

export type ContextoTramite = {
  tramite: TramiteVista & { id: string; empresa_id: string };
  datos: Record<string, Json | undefined>;
  empresa: EmpresaPadron | null;
  tecnicos: Tecnico[];
  memorias: MemoriaTecnica[];
  documentos: DocumentoLegajo[];
  inspecciones: InspeccionResumen[];
  referencias: {
    tecnico: Tecnico | null;
    tecnicoBaja: Tecnico | null;
    memoria: MemoriaTecnica | null;
    producto: Tables<"productos"> | null;
  };
  personas: { presentadoPor: string | null; resueltoPor: string | null };
};

const textoDe = (v: Json | undefined) => (typeof v === "string" ? v : null);

/** Respuesta de la empresa a una observación (la guarda el módulo del prestador en `datos.respuestas`). */
export type RespuestaTramite = { fecha: string; texto: string; observacion: string | null };

export function respuestasTramite(datos: Record<string, Json | undefined>): RespuestaTramite[] {
  const lista = datos.respuestas;
  if (!Array.isArray(lista)) return [];
  const salida: RespuestaTramite[] = [];
  for (const item of lista) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const fecha = textoDe(item.fecha);
    const texto = textoDe(item.texto);
    if (fecha && texto) salida.push({ fecha, texto, observacion: textoDe(item.observacion) });
  }
  return salida;
}

/** Trámite con todo lo necesario para resolverlo (empresa, legajo y referencias de `datos`). */
export const getContextoTramite = cache(async (id: string): Promise<ContextoTramite | null> => {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data: tramite, error } = await supabase.from("v_tramites").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error, "No se pudo obtener el trámite."));
  if (!tramite?.id || !tramite.empresa_id) return null;

  const empresaId = tramite.empresa_id;
  const datos = comoObjeto(tramite.datos);
  const idTecnico = textoDe(datos.tecnico_id);
  const idTecnicoBaja = textoDe(datos.tecnico_baja_id);
  const idMemoria = textoDe(datos.empresa_producto_id);
  const idsPersonas = [tramite.created_by, tramite.resuelto_por].filter((x): x is string => Boolean(x));

  const [empresa, tecnicos, memorias, documentos, inspecciones, personas] = await Promise.all([
    supabase.from("v_empresas").select("*").eq("id", empresaId).maybeSingle(),
    supabase.from("tecnicos").select("*").eq("empresa_id", empresaId).order("estado").order("apellido"),
    supabase.from("v_memorias_tecnicas").select("*").eq("empresa_id", empresaId).order("producto_nombre"),
    supabase.from("v_documentos").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
    supabase
      .from("inspecciones")
      .select("id, codigo, tipo, estado, resultado, fecha_programada, realizada_at")
      .eq("empresa_id", empresaId)
      .in("tipo", ["habilitacion", "deposito_anual"])
      .order("fecha_programada", { ascending: false })
      .limit(20),
    idsPersonas.length > 0
      ? supabase.from("perfiles").select("id, nombre, apellido, email").in("id", idsPersonas)
      : Promise.resolve({ data: [] as Pick<Tables<"perfiles">, "id" | "nombre" | "apellido" | "email">[], error: null }),
  ]);
  if (empresa.error) throw new Error(mensajeError(empresa.error, "No se pudo obtener la empresa del trámite."));

  const listaTecnicos = filas(tecnicos, "los técnicos");
  const listaMemorias = filas(memorias, "la memoria técnica");
  const memoria = idMemoria ? (listaMemorias.find((m) => m.id === idMemoria) ?? null) : null;

  // El producto sale de la memoria técnica; si la propuesta ya no existe, de `datos.producto_id`.
  const idProducto = memoria?.producto_id ?? textoDe(datos.producto_id);
  let producto: Tables<"productos"> | null = null;
  if (esUuid(idProducto)) {
    const { data } = await supabase.from("productos").select("*").eq("id", idProducto).maybeSingle();
    producto = data;
  }

  const nombrePersona = (pid: string | null) => {
    if (!pid) return null;
    const p = (personas.data ?? []).find((x) => x.id === pid);
    return p ? `${p.nombre} ${p.apellido}`.trim() || p.email || "Usuario" : null;
  };

  return {
    tramite: { ...tramite, id: tramite.id, empresa_id: empresaId },
    datos,
    empresa: empresa.data,
    tecnicos: listaTecnicos,
    memorias: listaMemorias,
    documentos: filas(documentos, "los documentos"),
    inspecciones: filas(inspecciones, "las inspecciones"),
    referencias: {
      tecnico: idTecnico ? (listaTecnicos.find((t) => t.id === idTecnico) ?? null) : null,
      tecnicoBaja: idTecnicoBaja ? (listaTecnicos.find((t) => t.id === idTecnicoBaja) ?? null) : null,
      memoria,
      producto,
    },
    personas: { presentadoPor: nombrePersona(tramite.created_by), resueltoPor: nombrePersona(tramite.resuelto_por) },
  };
});

/** Última resolución DSA registrada en el año (referencia para numerar la próxima). */
export async function getUltimaResolucionDsa(anio: number): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("empresas").select("resolucion_dsa").like("resolucion_dsa", `%/DSA/${anio}`);
  if (error) return null;
  let mayor: { numero: number; texto: string } | null = null;
  for (const fila of data ?? []) {
    const numero = Number.parseInt(fila.resolucion_dsa?.split("/")[0] ?? "", 10);
    if (Number.isFinite(numero) && (!mayor || numero > mayor.numero)) mayor = { numero, texto: fila.resolucion_dsa ?? "" };
  }
  return mayor?.texto ?? null;
}

/* --- Requisitos (checklist) ----------------------------------------------------- */

export type EstadoRequisito = "cumplido" | "pendiente" | "falta";

export type Requisito = {
  clave: string;
  titulo: string;
  detalle: string;
  estado: EstadoRequisito;
  enlace?: { label: string; href: string };
  items?: { label: string; estado: EstadoRequisito; detalle: string }[];
};

export const DOCUMENTOS_INSCRIPCION = [
  "constancia_cuit",
  "dni_titular",
  "titulo_tecnico",
  "carnet_sanidad",
  "habilitacion_comercial",
] as const satisfies readonly Enums<"tipo_documento">[];

/** Estado de un tipo de documento en el legajo (aprobado y vigente, en revisión o faltante). */
export function estadoDocumento(
  documentos: DocumentoLegajo[],
  tipo: Enums<"tipo_documento">,
  tecnicoId?: string | null,
  hoy: string = hoyISO(),
): { estado: EstadoRequisito; detalle: string } {
  const delTipo = documentos.filter((d) => d.tipo === tipo && (!tecnicoId || d.tecnico_id === tecnicoId));
  const vigente = delTipo.find((d) => d.estado === "aprobado" && (!d.vence || d.vence >= hoy));
  if (vigente) {
    return { estado: "cumplido", detalle: vigente.vence ? `Aprobado · vence el ${formatFecha(vigente.vence)}` : "Aprobado" };
  }
  if (delTipo.some((d) => d.estado === "pendiente")) return { estado: "pendiente", detalle: "Cargado, pendiente de revisión" };
  const vencido = delTipo.find((d) => d.estado === "aprobado" && d.vence && d.vence < hoy);
  if (vencido) return { estado: "falta", detalle: `Vencido el ${formatFecha(vencido.vence)}` };
  if (delTipo.some((d) => d.estado === "rechazado")) return { estado: "falta", detalle: "Rechazado: debe presentarse nuevamente" };
  return { estado: "falta", detalle: "No presentado" };
}

function peor(estados: EstadoRequisito[]): EstadoRequisito {
  if (estados.includes("falta")) return "falta";
  if (estados.includes("pendiente")) return "pendiente";
  return "cumplido";
}

/** Checklist de requisitos según el tipo de trámite (se recalcula en el servidor al aprobar). */
export function calcularRequisitos(ctx: ContextoTramite, hoy: string = hoyISO()): Requisito[] {
  const { tramite, empresa, tecnicos, memorias, documentos, inspecciones, referencias, datos } = ctx;
  const legajo = `/gestion/empresas/${tramite.empresa_id}`;
  const aprobados = tecnicos.filter((t) => t.estado === "aprobado").length;
  const pendientesTec = tecnicos.filter((t) => t.estado === "pendiente").length;

  const requisitoTecnico: Requisito = {
    clave: "tecnico",
    titulo: "Asesor técnico aprobado",
    detalle:
      aprobados > 0
        ? `${aprobados} asesor${aprobados === 1 ? "" : "es"} aprobado${aprobados === 1 ? "" : "s"}`
        : pendientesTec > 0
          ? `${pendientesTec} pendiente${pendientesTec === 1 ? "" : "s"} de aprobación`
          : "No hay asesores técnicos registrados (Art. 5.º)",
    estado: aprobados > 0 ? "cumplido" : pendientesTec > 0 ? "pendiente" : "falta",
    enlace: { label: "Revisar técnicos", href: `${legajo}?tab=tecnicos` },
  };

  const documentoReq = (clave: string, tipo: Enums<"tipo_documento">, titulo: string): Requisito => {
    const e = estadoDocumento(documentos, tipo, null, hoy);
    return { clave, titulo, detalle: e.detalle, estado: e.estado, enlace: { label: "Ver documentos", href: `${legajo}?tab=documentos` } };
  };

  switch (tramite.tipo) {
    case "inscripcion": {
      const items = DOCUMENTOS_INSCRIPCION.map((tipo) => {
        const e = estadoDocumento(documentos, tipo, null, hoy);
        return { label: TIPO_DOCUMENTO[tipo].label, estado: e.estado, detalle: e.detalle };
      });
      const memAprobadas = memorias.filter((m) => m.estado === "aprobado").length;
      const memPropuestas = memorias.filter((m) => m.estado === "propuesto").length;
      const habilitacion = inspecciones.find((i) => i.tipo === "habilitacion" && i.estado === "realizada");
      const programada = inspecciones.find((i) => i.tipo === "habilitacion" && i.estado === "programada");
      const domicilios = Boolean(empresa?.domicilio_oficina && empresa?.domicilio_deposito);
      return [
        {
          clave: "domicilios",
          titulo: "Domicilios de oficina y depósito declarados",
          detalle: domicilios ? "Oficina y depósito de químicos informados (Art. 6.º)" : "Falta declarar la oficina o el depósito",
          estado: domicilios ? "cumplido" : "falta",
          enlace: { label: "Editar datos", href: `${legajo}?tab=resumen` },
        },
        requisitoTecnico,
        {
          clave: "documentos",
          titulo: "Documentación obligatoria aprobada",
          detalle: `${items.filter((i) => i.estado === "cumplido").length} de ${items.length} documentos aprobados`,
          estado: peor(items.map((i) => i.estado)),
          enlace: { label: "Ver documentos", href: `${legajo}?tab=documentos` },
          items,
        },
        {
          clave: "memoria",
          titulo: "Memoria técnica de productos aprobada",
          detalle:
            memAprobadas > 0
              ? `${memAprobadas} producto${memAprobadas === 1 ? "" : "s"} aprobado${memAprobadas === 1 ? "" : "s"}`
              : memPropuestas > 0
                ? `${memPropuestas} producto${memPropuestas === 1 ? "" : "s"} propuesto${memPropuestas === 1 ? "" : "s"} sin revisar`
                : "No hay productos propuestos",
          estado: memAprobadas > 0 ? "cumplido" : memPropuestas > 0 ? "pendiente" : "falta",
          enlace: { label: "Revisar memoria", href: `${legajo}?tab=memoria` },
        },
        {
          clave: "inspeccion",
          titulo: "Inspección de habilitación realizada",
          detalle: habilitacion
            ? `${habilitacion.resultado === "conforme" ? "Conforme" : habilitacion.resultado === "no_conforme" ? "No conforme" : "Realizada"} · ${formatFecha(habilitacion.realizada_at)}`
            : programada
              ? `Programada para el ${formatFecha(programada.fecha_programada)}`
              : "Sin inspección (dentro de los 15 días, Art. 4.º)",
          estado: habilitacion ? (habilitacion.resultado === "conforme" ? "cumplido" : "falta") : programada ? "pendiente" : "falta",
          enlace: habilitacion
            ? { label: "Ver inspección", href: `/gestion/inspecciones/${habilitacion.id}` }
            : programada
              ? { label: "Ver inspección", href: `/gestion/inspecciones/${programada.id}` }
              : { label: "Programar inspección", href: `/gestion/inspecciones/nueva?empresa=${tramite.empresa_id}&tipo=habilitacion` },
        },
      ];
    }
    case "renovacion": {
      const ultima = empresa?.ultima_inspeccion_deposito ?? null;
      const dias = diasHasta(ultima, hoy);
      const depositoAlDia = dias !== null && dias >= -365;
      return [
        documentoReq("ddjj", "ddjj_anual", "DDJJ anual de categorización aprobada"),
        documentoReq("libre_deuda", "libre_deuda", "Libre deuda aprobado"),
        requisitoTecnico,
        {
          clave: "deposito",
          titulo: "Inspección anual de depósito",
          detalle: ultima ? `Última inspección conforme: ${formatFecha(ultima)}` : "Sin inspección de depósito registrada",
          estado: depositoAlDia ? "cumplido" : "falta",
          enlace: depositoAlDia
            ? undefined
            : { label: "Programar inspección", href: `/gestion/inspecciones/nueva?empresa=${tramite.empresa_id}&tipo=deposito_anual` },
        },
      ];
    }
    case "cambio_tecnico": {
      const nuevo = referencias.tecnico;
      const titulo = nuevo ? estadoDocumento(documentos, "titulo_tecnico", nuevo.id, hoy) : null;
      return [
        {
          clave: "nuevo_tecnico",
          titulo: "Nuevo asesor técnico registrado",
          detalle: nuevo ? `${nuevo.nombre} ${nuevo.apellido} · ${nuevo.titulo}` : "El trámite no indica un asesor técnico válido",
          estado: nuevo ? "cumplido" : "falta",
          enlace: { label: "Ver técnicos", href: `${legajo}?tab=tecnicos` },
        },
        {
          clave: "titulo",
          titulo: "Título habilitante autenticado",
          detalle: titulo?.detalle ?? "Sin asesor técnico asociado",
          estado: titulo?.estado ?? "falta",
          enlace: { label: "Ver documentos", href: `${legajo}?tab=documentos` },
        },
      ];
    }
    case "cambio_domicilio": {
      const nuevoDomicilio = textoDe(datos.domicilio_oficina) || textoDe(datos.domicilio_deposito);
      return [
        {
          clave: "domicilio",
          titulo: "Nuevo domicilio informado",
          detalle: nuevoDomicilio ? "Se informó el nuevo domicilio" : "El trámite no indica un domicilio nuevo",
          estado: nuevoDomicilio ? "cumplido" : "falta",
        },
        documentoReq("libre_deuda", "libre_deuda", "Libre deuda aprobado (Art. 6.º)"),
      ];
    }
    case "alta_producto": {
      const { memoria, producto } = referencias;
      return [
        {
          clave: "producto",
          titulo: "Producto con registro ANMAT o SENASA vigente",
          detalle: producto
            ? `${producto.nombre_comercial} · ${producto.organismo} ${producto.registro_numero}${producto.activo ? "" : " (inactivo en el catálogo)"}`
            : "El trámite no indica un producto de la memoria técnica",
          estado: producto?.activo ? "cumplido" : "falta",
          enlace: { label: "Ver catálogo", href: "/gestion/productos" },
        },
        {
          clave: "memoria",
          titulo: "Dosis y precauciones declaradas",
          detalle: memoria?.dosis || memoria?.precauciones ? "La memoria técnica indica dosis o precauciones" : "Sin dosis ni precauciones declaradas",
          estado: memoria?.dosis || memoria?.precauciones ? "cumplido" : "pendiente",
          enlace: { label: "Revisar memoria", href: `${legajo}?tab=memoria` },
        },
      ];
    }
    default:
      return [];
  }
}

/* --- Productos y memorias técnicas ---------------------------------------------- */

export type Producto = Tables<"productos">;

export type FiltrosProductos = {
  q?: string;
  clase?: Enums<"clase_producto">;
  organismo?: Enums<"organismo_registro">;
  estado?: "activos" | "inactivos";
  desde: number;
  hasta: number;
};

/** Catálogo paginado con la cantidad de empresas que tienen cada producto aprobado. */
export async function listarProductos(
  f: FiltrosProductos,
): Promise<{ filas: (Producto & { empresas_autorizadas: number })[]; total: number }> {
  const supabase = await createClient();
  let consulta = supabase.from("productos").select("*", { count: "exact" });
  const t = limpiarBusqueda(f.q);
  if (t) {
    consulta = consulta.or(
      [ilike("nombre_comercial", t), ilike("principio_activo", t), ilike("registro_numero", t)].join(","),
    );
  }
  if (f.clase) consulta = consulta.eq("clase", f.clase);
  if (f.organismo) consulta = consulta.eq("organismo", f.organismo);
  if (f.estado === "activos") consulta = consulta.eq("activo", true);
  if (f.estado === "inactivos") consulta = consulta.eq("activo", false);

  const { data, error, count } = await consulta.order("nombre_comercial").range(f.desde, f.hasta);
  if (error) throw new Error(mensajeError(error, "No se pudo obtener el catálogo de productos."));

  const productos = data ?? [];
  const autorizadas = new Map<string, number>();
  if (productos.length > 0) {
    const r = await supabase
      .from("empresa_productos")
      .select("producto_id")
      .eq("estado", "aprobado")
      .in(
        "producto_id",
        productos.map((p) => p.id),
      );
    for (const fila of filas(r, "las empresas autorizadas")) {
      autorizadas.set(fila.producto_id, (autorizadas.get(fila.producto_id) ?? 0) + 1);
    }
  }
  return { filas: productos.map((p) => ({ ...p, empresas_autorizadas: autorizadas.get(p.id) ?? 0 })), total: count ?? 0 };
}

export async function contarMemoriasPendientes(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("empresa_productos")
    .select("id", { count: "exact", head: true })
    .eq("estado", "propuesto");
  if (error) throw new Error(mensajeError(error, "No se pudieron contar las memorias técnicas pendientes."));
  return count ?? 0;
}

/** Productos propuestos por las empresas que esperan revisión (los más antiguos primero). */
export async function listarMemoriasPendientes(limite = 200): Promise<MemoriaTecnica[]> {
  const supabase = await createClient();
  const r = await supabase
    .from("v_memorias_tecnicas")
    .select("*")
    .eq("estado", "propuesto")
    .order("created_at", { ascending: true })
    .limit(limite);
  return filas(r, "las memorias técnicas pendientes");
}
