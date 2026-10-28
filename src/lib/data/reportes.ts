import "server-only";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { mensajeError } from "@/lib/acciones";
import { APP } from "@/lib/config";
import { hoyISO } from "@/lib/domain/formato";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

/* =============================================================================
 * Reportes e información estratégica (Art. 10.º c, Ord. 2681/98):
 * - Rendición mensual de recaudación a Ingresos Municipales (Expte. N.º 500004/26)
 * - Planilla mensual por empresa
 * - Estadísticas por rubro, zona y producto
 * ========================================================================== */

type Param = string | string[] | undefined;
export type ParamsBusqueda = Record<string, Param>;

export type TipoServicio = Enums<"tipo_servicio">;
export type MedioPago = Enums<"medio_pago">;
export type ClaseProducto = Enums<"clase_producto">;
export type EstadoCertificado = Enums<"estado_certificado">;

const MEDIOS_PAGO = ["transferencia", "boleta", "plataforma_electronica"] as const satisfies readonly MedioPago[];
const CLASES_PRODUCTO = [
  "insecticida",
  "rodenticida",
  "desinfectante",
  "larvicida",
  "fungicida",
  "otro",
] as const satisfies readonly ClaseProducto[];
const TIPOS_SERVICIO = ["fumigacion", "tanque"] as const satisfies readonly TipoServicio[];

function esClaseProducto(valor: string | null | undefined): valor is ClaseProducto {
  return !!valor && (CLASES_PRODUCTO as readonly string[]).includes(valor);
}

/** Primer año habilitado en los selectores (incluye la carga histórica de los informes de timbrado). */
export const ANIO_INICIO = 2024;

/** Expediente de la rendición mensual a la Secretaría de Ingresos Municipales. */
export const EXPEDIENTE_RENDICION = "500004/26";

function primerValor(valor: Param): string | undefined {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v === undefined || v === "" ? undefined : v;
}

/** Lee un parámetro de texto de la URL (primer valor, sin vacíos). */
export function leerParam(sp: ParamsBusqueda, nombre: string): string | undefined {
  return primerValor(sp[nombre]);
}

export function esUuid(valor: string | null | undefined): valor is string {
  return !!valor && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

/* --- Períodos ---------------------------------------------------------------- */

/** Mes calendario (mes de 1 a 12). */
export type Periodo = { anio: number; mes: number };

export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

const capitalizar = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

export function periodoDeFecha(iso: string): Periodo {
  const [a, m] = iso.slice(0, 10).split("-").map(Number);
  return { anio: a, mes: m };
}

/** Mes en curso (hora de Tucumán). */
export function periodoActual(): Periodo {
  return periodoDeFecha(hoyISO());
}

export function desplazarPeriodo(p: Periodo, meses: number): Periodo {
  const indice = p.anio * 12 + (p.mes - 1) + meses;
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}

/** Diferencia en meses (b − a). */
export function mesesEntre(a: Periodo, b: Periodo): number {
  return b.anio * 12 + b.mes - (a.anio * 12 + a.mes);
}

export function compararPeriodos(a: Periodo, b: Periodo): number {
  return mesesEntre(b, a);
}

/** 'YYYY-MM' */
export function clavePeriodo(p: Periodo): string {
  return `${p.anio}-${String(p.mes).padStart(2, "0")}`;
}

/** 'YYYY-MM-01' (formato de la columna `mes` de las vistas). */
export function primerDiaISO(p: Periodo): string {
  return `${clavePeriodo(p)}-01`;
}

/** "octubre de 2026" */
export function nombrePeriodo(p: Periodo): string {
  return `${MESES[p.mes - 1]} de ${p.anio}`;
}

/** "Octubre 2026" */
export function tituloPeriodo(p: Periodo): string {
  return `${capitalizar(MESES[p.mes - 1])} ${p.anio}`;
}

/** "Oct 26" (ejes de gráficos). */
export function etiquetaCortaPeriodo(p: Periodo): string {
  return `${capitalizar(MESES_CORTOS[p.mes - 1])} ${String(p.anio).slice(2)}`;
}

/** Límites del mes como timestamps con la zona de Tucumán (UTC−3), para columnas timestamptz. */
export function limitesPeriodo(p: Periodo): { desde: string; hasta: string } {
  return { desde: `${primerDiaISO(p)}T00:00:00-03:00`, hasta: `${primerDiaISO(desplazarPeriodo(p, 1))}T00:00:00-03:00` };
}

/** Años disponibles en los selectores (del más reciente al más antiguo). */
export function aniosDisponibles(): number[] {
  const actual = periodoActual().anio;
  const anios: number[] = [];
  for (let a = actual; a >= ANIO_INICIO; a--) anios.push(a);
  return anios;
}

function periodoValido(anio: number, mes: number): boolean {
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) return false;
  if (anio < ANIO_INICIO) return false;
  return compararPeriodos({ anio, mes }, periodoActual()) <= 0;
}

/**
 * Lee `?anio=&mes=` (mes de 1 a 12). Si faltan o son inválidos (o futuros), usa el
 * período por defecto: el último mes cerrado, que es el que se rinde.
 */
export function leerPeriodo(sp: ParamsBusqueda, porDefecto: Periodo = desplazarPeriodo(periodoActual(), -1)): Periodo {
  const anio = Number(leerParam(sp, "anio"));
  const mes = Number(leerParam(sp, "mes"));
  return periodoValido(anio, mes) ? { anio, mes } : porDefecto;
}

/** Interpreta 'YYYY-MM' (inputs type="month"). */
export function parsearClavePeriodo(valor: string | undefined): Periodo | null {
  if (!valor || !/^\d{4}-\d{2}$/.test(valor)) return null;
  const [anio, mes] = valor.split("-").map(Number);
  return periodoValido(anio, mes) ? { anio, mes } : null;
}

/** Querystring `anio=&mes=` (más parámetros opcionales) para enlaces. */
export function queryPeriodo(p: Periodo, extra: Record<string, string | null | undefined> = {}): string {
  const sp = new URLSearchParams({ anio: String(p.anio), mes: String(p.mes) });
  for (const [k, v] of Object.entries(extra)) if (v) sp.set(k, v);
  return sp.toString();
}

/** Lista de meses entre dos períodos (inclusive). */
export function periodosEntre(desde: Periodo, hasta: Periodo): Periodo[] {
  const total = mesesEntre(desde, hasta);
  return Array.from({ length: Math.max(0, total + 1) }, (_, i) => desplazarPeriodo(desde, i));
}

/** Último día hábil del mes (sin sábados, domingos ni feriados cargados). */
export async function getUltimoDiaHabil(p: Periodo): Promise<string> {
  const supabase = await createClient();
  const siguiente = primerDiaISO(desplazarPeriodo(p, 1));
  const { data } = await supabase.from("feriados").select("fecha").gte("fecha", primerDiaISO(p)).lt("fecha", siguiente);
  const feriados = new Set((data ?? []).map((f) => f.fecha));
  const diasDelMes = new Date(Date.UTC(p.anio, p.mes, 0)).getUTCDate();
  for (let d = diasDelMes; d >= 1; d--) {
    const fecha = new Date(Date.UTC(p.anio, p.mes - 1, d));
    const dia = fecha.getUTCDay();
    const iso = `${clavePeriodo(p)}-${String(d).padStart(2, "0")}`;
    if (dia !== 0 && dia !== 6 && !feriados.has(iso)) return iso;
  }
  return `${clavePeriodo(p)}-${String(diasDelMes).padStart(2, "0")}`;
}

/* --- Utilidades de consulta --------------------------------------------------- */

const LOTE = 1000;

/**
 * Trae todas las filas de una consulta paginando de a 1000 (límite de PostgREST).
 * La consulta debe tener un orden estable.
 */
async function traerTodo<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  porDefecto: string,
  maximo = 20000,
): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; desde < maximo; desde += LOTE) {
    const { data, error } = await consulta(desde, desde + LOTE - 1);
    if (error) throw new Error(mensajeError(error, porDefecto));
    const lote = data ?? [];
    filas.push(...lote);
    if (lote.length < LOTE) break;
  }
  return filas;
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === "string" ? Number(v) : (v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/* --- Recaudación ---------------------------------------------------------------- */

const numero = z.coerce.number().catch(0);
const textoOpcional = z.string().nullish().catch(null);

const esquemaConcepto = z.object({
  concepto: z.string().catch("Concepto sin nombre"),
  ordenanza: textoOpcional,
  articulo: textoOpcional,
  importe_unitario: numero,
  cantidad: numero,
  pagos: numero,
  total: numero,
});

const esquemaCuenta = z.object({
  codigo: z.string().catch("—"),
  nombre: z.string().catch(""),
  banco: z.string().catch(""),
  cbu: z.string().catch(""),
  numero_cuenta: z.string().catch(""),
  medios_pago: z.array(z.enum(MEDIOS_PAGO)).catch([]),
  total: numero,
  conceptos: z.array(esquemaConcepto).catch([]),
});

const esquemaMovimiento = z.object({
  fecha_pago: textoOpcional,
  codigo: textoOpcional,
  contribuyente: textoOpcional,
  cuit: textoOpcional,
  concepto: textoOpcional,
  cuenta: textoOpcional,
  medio: z.enum(MEDIOS_PAGO).nullish().catch(null),
  numero_operacion: textoOpcional,
  cantidad: numero,
  importe: numero,
});

const esquemaInforme = z.object({
  total: numero,
  cuentas: z.array(esquemaCuenta).catch([]),
  movimientos: z.array(esquemaMovimiento).catch([]),
});

export type ConceptoRecaudado = z.infer<typeof esquemaConcepto>;
export type MovimientoRecaudacion = z.infer<typeof esquemaMovimiento>;
export type CuentaInforme = z.infer<typeof esquemaCuenta> & {
  /** Cantidad de operaciones (pagos verificados) del mes en la cuenta. */
  operaciones: number;
  /** Total y cantidad por medio de cobro. */
  porMedio: { medio: MedioPago; operaciones: number; total: number }[];
};

export type InformeRecaudacion = {
  periodo: Periodo;
  total: number;
  cuentas: CuentaInforme[];
  movimientos: MovimientoRecaudacion[];
};

/** Informe mensual de recaudación (rpc `informe_recaudacion`, solo staff). */
export async function getInformeRecaudacion(p: Periodo): Promise<InformeRecaudacion> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("informe_recaudacion", { p_anio: p.anio, p_mes: p.mes });
  if (error) throw new Error(mensajeError(error, "No se pudo generar el informe de recaudación."));
  const informe = esquemaInforme.parse(data ?? {});

  const cuentas: CuentaInforme[] = informe.cuentas.map((c) => {
    const movs = informe.movimientos.filter((m) => m.cuenta === c.codigo);
    const porMedio = MEDIOS_PAGO.map((medio) => {
      const delMedio = movs.filter((m) => m.medio === medio);
      return { medio, operaciones: delMedio.length, total: delMedio.reduce((acc, m) => acc + m.importe, 0) };
    }).filter((x) => x.operaciones > 0);
    return { ...c, operaciones: movs.length, porMedio };
  });

  return { periodo: p, total: informe.total, cuentas, movimientos: informe.movimientos };
}

export type ArancelTarifario = {
  id: number;
  codigo: string;
  concepto: string;
  ordenanza: string;
  articulo: string;
  importe: number;
  unidad: string;
  cuentaCodigo: string;
  cuentaNombre: string;
  cbu: string;
};

/** Planilla de la Ordenanza Tarifaria vigente durante el período (uno por código: el más reciente). */
export async function getTarifario(p: Periodo): Promise<ArancelTarifario[]> {
  const supabase = await createClient();
  const finDelMes = primerDiaISO(desplazarPeriodo(p, 1));
  const [{ data: aranceles, error }, { data: cuentas, error: errorCuentas }] = await Promise.all([
    supabase
      .from("aranceles")
      .select("id, codigo, concepto, ordenanza, articulo, importe, unidad, cuenta_id, vigente_desde, vigente_hasta")
      .eq("activo", true)
      .lt("vigente_desde", finDelMes)
      .or(`vigente_hasta.is.null,vigente_hasta.gte.${primerDiaISO(p)}`)
      .order("vigente_desde", { ascending: false }),
    supabase.from("cuentas_recaudadoras").select("id, codigo, nombre, cbu"),
  ]);
  if (error || errorCuentas) {
    throw new Error(mensajeError(error ?? errorCuentas, "No se pudo leer la planilla de aranceles."));
  }
  const vistos = new Set<string>();
  const filas: ArancelTarifario[] = [];
  for (const a of aranceles ?? []) {
    if (vistos.has(a.codigo)) continue;
    vistos.add(a.codigo);
    const cuenta = (cuentas ?? []).find((c) => c.id === a.cuenta_id);
    filas.push({
      id: a.id,
      codigo: a.codigo,
      concepto: a.concepto,
      ordenanza: a.ordenanza,
      articulo: a.articulo,
      importe: num(a.importe),
      unidad: a.unidad,
      cuentaCodigo: cuenta?.codigo ?? "—",
      cuentaNombre: cuenta?.nombre ?? "",
      cbu: cuenta?.cbu ?? "",
    });
  }
  // Primero la cuenta 505 (como la planilla oficial), luego por concepto.
  return filas.sort((a, b) => b.cuentaCodigo.localeCompare(a.cuentaCodigo) || a.concepto.localeCompare(b.concepto, "es"));
}

export type ConceptoPlanilla = ConceptoRecaudado & { sinMovimiento: boolean };

/**
 * Conceptos de una cuenta para la planilla en pantalla: los recaudados en el mes y,
 * debajo, los del tarifario de esa cuenta sin movimientos (en cero).
 */
export function conceptosConTarifario(cuenta: CuentaInforme, tarifario: ArancelTarifario[]): ConceptoPlanilla[] {
  const recaudados: ConceptoPlanilla[] = cuenta.conceptos.map((c) => ({ ...c, sinMovimiento: false }));
  const presentes = new Set(cuenta.conceptos.map((c) => c.concepto));
  const sinMovimiento: ConceptoPlanilla[] = tarifario
    .filter((a) => a.cuentaCodigo === cuenta.codigo && !presentes.has(a.concepto))
    .map((a) => ({
      concepto: a.concepto,
      ordenanza: a.ordenanza,
      articulo: a.articulo,
      importe_unitario: a.importe,
      cantidad: 0,
      pagos: 0,
      total: 0,
      sinMovimiento: true,
    }));
  return [...recaudados, ...sinMovimiento];
}

export type PendientesConciliacion = { cantidad: number; total: number };

/** Pagos informados con fecha de pago en el mes que todavía no se verificaron (no entran en la rendición). */
export async function getPendientesConciliacion(p: Periodo): Promise<PendientesConciliacion> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pagos")
    .select("importe_total")
    .eq("estado", "informado")
    .gte("fecha_pago", primerDiaISO(p))
    .lt("fecha_pago", primerDiaISO(desplazarPeriodo(p, 1)));
  if (error) throw new Error(mensajeError(error, "No se pudieron consultar los pagos a verificar."));
  const filas = data ?? [];
  return { cantidad: filas.length, total: filas.reduce((acc, f) => acc + num(f.importe_total), 0) };
}

export type MesRecaudacion = {
  periodo: Periodo;
  clave: string;
  etiqueta: string;
  c505: number;
  c091: number;
  otras: number;
  total: number;
  operaciones: number;
};

/** Recaudación verificada por mes y cuenta (v_recaudacion_mensual), con los meses sin movimientos en cero. */
export async function getSerieRecaudacion(desde: Periodo, hasta: Periodo): Promise<MesRecaudacion[]> {
  const supabase = await createClient();
  const filas = await traerTodo(
    (a, b) =>
      supabase
        .from("v_recaudacion_mensual")
        .select("mes, cuenta_codigo, arancel_codigo, cantidad_pagos, total")
        .gte("mes", primerDiaISO(desde))
        .lte("mes", primerDiaISO(hasta))
        .order("mes")
        .order("cuenta_codigo")
        .order("arancel_codigo")
        .order("concepto")
        .range(a, b),
    "No se pudo obtener la serie de recaudación.",
  );

  const esOtra = (codigo: string | null) => codigo !== "505" && codigo !== "091";
  return periodosEntre(desde, hasta).map((p) => {
    const delMes = filas.filter((f) => f.mes?.slice(0, 7) === clavePeriodo(p));
    const suma = (codigo: string | null) =>
      delMes
        .filter((f) => (codigo === null ? esOtra(f.cuenta_codigo) : f.cuenta_codigo === codigo))
        .reduce((acc, f) => acc + num(f.total), 0);
    const c505 = suma("505");
    const c091 = suma("091");
    const otras = suma(null);
    return {
      periodo: p,
      clave: clavePeriodo(p),
      etiqueta: etiquetaCortaPeriodo(p),
      c505,
      c091,
      otras,
      total: c505 + c091 + otras,
      operaciones: delMes.reduce((acc, f) => acc + num(f.cantidad_pagos), 0),
    };
  });
}

/* --- Planilla mensual por empresa (Art. 10.º c) ------------------------------- */

export type FilaPlanilla = {
  empresaId: string;
  empresaNombre: string;
  empresaCuit: string;
  fumigacion: number;
  tanque: number;
  certificados: number;
  timbrados: number;
  enProceso: number;
  anulados: number;
  superficieM2: number;
};

export type TotalesPlanilla = Omit<FilaPlanilla, "empresaId" | "empresaNombre" | "empresaCuit"> & { empresas: number };

/** Resumen del mes por empresa (v_planilla_mensual, sin borradores). */
export async function getPlanillaMensual(p: Periodo): Promise<FilaPlanilla[]> {
  const supabase = await createClient();
  const filas = await traerTodo(
    (a, b) =>
      supabase
        .from("v_planilla_mensual")
        .select("*")
        .eq("mes", primerDiaISO(p))
        .order("empresa_nombre")
        .order("empresa_id")
        .order("tipo")
        .range(a, b),
    "No se pudo obtener la planilla mensual.",
  );

  const porEmpresa = new Map<string, FilaPlanilla>();
  for (const f of filas) {
    if (!f.empresa_id) continue;
    const fila =
      porEmpresa.get(f.empresa_id) ??
      ({
        empresaId: f.empresa_id,
        empresaNombre: f.empresa_nombre ?? "Empresa sin nombre",
        empresaCuit: f.empresa_cuit ?? "",
        fumigacion: 0,
        tanque: 0,
        certificados: 0,
        timbrados: 0,
        enProceso: 0,
        anulados: 0,
        superficieM2: 0,
      } satisfies FilaPlanilla);
    const cantidad = num(f.certificados);
    if (f.tipo === "tanque") fila.tanque += cantidad;
    else fila.fumigacion += cantidad;
    fila.certificados += cantidad;
    fila.timbrados += num(f.timbrados);
    fila.enProceso += num(f.en_proceso);
    fila.anulados += num(f.anulados);
    fila.superficieM2 += num(f.superficie_total_m2);
    porEmpresa.set(f.empresa_id, fila);
  }
  return [...porEmpresa.values()].sort(
    (a, b) => b.certificados - a.certificados || a.empresaNombre.localeCompare(b.empresaNombre, "es"),
  );
}

export function totalizarPlanilla(filas: FilaPlanilla[]): TotalesPlanilla {
  return filas.reduce<TotalesPlanilla>(
    (acc, f) => ({
      empresas: acc.empresas + 1,
      fumigacion: acc.fumigacion + f.fumigacion,
      tanque: acc.tanque + f.tanque,
      certificados: acc.certificados + f.certificados,
      timbrados: acc.timbrados + f.timbrados,
      enProceso: acc.enProceso + f.enProceso,
      anulados: acc.anulados + f.anulados,
      superficieM2: acc.superficieM2 + f.superficieM2,
    }),
    { empresas: 0, fumigacion: 0, tanque: 0, certificados: 0, timbrados: 0, enProceso: 0, anulados: 0, superficieM2: 0 },
  );
}

export type EmpresaOpcion = {
  id: string;
  nombre: string;
  cuit: string;
  numeroRegistro: number | null;
  estado: Enums<"estado_empresa">;
};

/** Empresas del registro para el selector de la planilla. */
export async function getEmpresasOpciones(): Promise<EmpresaOpcion[]> {
  const supabase = await createClient();
  const filas = await traerTodo(
    (a, b) =>
      supabase
        .from("empresas")
        .select("id, nombre_comercial, cuit, numero_registro, estado")
        .neq("estado", "en_tramite")
        .order("nombre_comercial")
        .order("id")
        .range(a, b),
    "No se pudo obtener el listado de empresas.",
  );
  return filas.map((e) => ({
    id: e.id,
    nombre: e.nombre_comercial,
    cuit: e.cuit,
    numeroRegistro: e.numero_registro,
    estado: e.estado,
  }));
}

export type EmpresaPlanilla = {
  id: string;
  nombre: string;
  titular: string | null;
  cuit: string;
  numeroRegistro: number | null;
  resolucionDsa: string | null;
  habilitacionComercial: string | null;
  domicilio: string | null;
  estado: Enums<"estado_empresa">;
  vencimientoHabilitacion: string | null;
};

export async function getEmpresaPlanilla(id: string): Promise<EmpresaPlanilla | null> {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .select(
      "id, nombre_comercial, titular, cuit, numero_registro, resolucion_dsa, habilitacion_comercial, domicilio_oficina, estado, vencimiento_habilitacion",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error, "No se pudo leer la empresa."));
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre_comercial,
    titular: data.titular,
    cuit: data.cuit,
    numeroRegistro: data.numero_registro,
    resolucionDsa: data.resolucion_dsa,
    habilitacionComercial: data.habilitacion_comercial,
    domicilio: data.domicilio_oficina,
    estado: data.estado,
    vencimientoHabilitacion: data.vencimiento_habilitacion,
  };
}

export type CertificadoMes = {
  id: string;
  empresaId: string | null;
  empresaNombre: string;
  empresaCuit: string;
  tipo: TipoServicio;
  numero: string;
  fechaServicio: string | null;
  fechaVencimiento: string | null;
  cliente: string;
  clienteCuit: string | null;
  domicilio: string;
  barrio: string | null;
  zona: string | null;
  rubro: string;
  rubroGrupo: string | null;
  superficieM2: number | null;
  capacidadLitros: number | null;
  tecnico: string | null;
  estado: EstadoCertificado;
  vigencia: string | null;
  selloCodigo: string | null;
  declaracionCodigo: string | null;
  pagoCodigo: string | null;
};

const COLUMNAS_CERTIFICADO =
  "id, empresa_id, empresa_nombre, empresa_cuit, tipo, numero, fecha_servicio, fecha_vencimiento, cliente, cliente_cuit, domicilio, establecimiento_barrio, establecimiento_zona, rubro_nombre, rubro_grupo, superficie_m2, capacidad_litros, tecnico_nombre, estado, vigencia, sello_codigo, declaracion_codigo, pago_codigo";

/** Certificados con servicio en el mes (sin borradores), de una empresa o de todas. */
export async function getCertificadosDelMes(p: Periodo, empresaId?: string): Promise<CertificadoMes[]> {
  const supabase = await createClient();
  const { desde, hasta } = limitesPeriodo(p);
  const filas = await traerTodo(
    (a, b) => {
      let q = supabase
        .from("v_certificados")
        .select(COLUMNAS_CERTIFICADO)
        .gte("fecha_servicio", desde)
        .lt("fecha_servicio", hasta)
        .neq("estado", "borrador");
      if (empresaId) q = q.eq("empresa_id", empresaId);
      return q.order("empresa_nombre").order("fecha_servicio").order("numero").order("id").range(a, b);
    },
    "No se pudieron obtener los certificados del mes.",
    60000,
  );

  return filas
    .filter((c): c is typeof c & { id: string } => !!c.id)
    .map((c) => ({
      id: c.id,
      empresaId: c.empresa_id,
      empresaNombre: c.empresa_nombre ?? "",
      empresaCuit: c.empresa_cuit ?? "",
      tipo: c.tipo ?? "fumigacion",
      numero: c.numero ?? "s/n",
      fechaServicio: c.fecha_servicio,
      fechaVencimiento: c.fecha_vencimiento,
      cliente: c.cliente ?? "",
      clienteCuit: c.cliente_cuit,
      domicilio: c.domicilio ?? "",
      barrio: c.establecimiento_barrio,
      zona: c.establecimiento_zona,
      rubro: c.rubro_nombre ?? "—",
      rubroGrupo: c.rubro_grupo,
      superficieM2: c.superficie_m2 === null ? null : num(c.superficie_m2),
      capacidadLitros: c.capacidad_litros === null ? null : num(c.capacidad_litros),
      tecnico: c.tecnico_nombre,
      estado: c.estado ?? "declarado",
      vigencia: c.vigencia,
      selloCodigo: c.sello_codigo,
      declaracionCodigo: c.declaracion_codigo,
      pagoCodigo: c.pago_codigo,
    }));
}

/* --- Estadísticas ------------------------------------------------------------- */

export const PRESETS_RANGO = [
  { valor: "3m", etiqueta: "3 meses" },
  { valor: "6m", etiqueta: "6 meses" },
  { valor: "12m", etiqueta: "12 meses" },
  { valor: "anio", etiqueta: "Año en curso" },
  { valor: "anio-anterior", etiqueta: "Año anterior" },
] as const;

export type PresetRango = (typeof PRESETS_RANGO)[number]["valor"] | "personalizado";
export type RangoPeriodos = { desde: Periodo; hasta: Periodo; preset: PresetRango };

/** Lee `?periodo=` (preset) o `?desde=YYYY-MM&hasta=YYYY-MM`. Por defecto, los últimos 12 meses. */
export function leerRango(sp: ParamsBusqueda): RangoPeriodos {
  const actual = periodoActual();
  const desde = parsearClavePeriodo(leerParam(sp, "desde"));
  const hasta = parsearClavePeriodo(leerParam(sp, "hasta"));
  if (desde && hasta) {
    const [a, b] = compararPeriodos(desde, hasta) <= 0 ? [desde, hasta] : [hasta, desde];
    // Como máximo 36 meses por consulta.
    const inicio = mesesEntre(a, b) > 35 ? desplazarPeriodo(b, -35) : a;
    return { desde: inicio, hasta: b, preset: "personalizado" };
  }
  switch (leerParam(sp, "periodo")) {
    case "3m":
      return { desde: desplazarPeriodo(actual, -2), hasta: actual, preset: "3m" };
    case "6m":
      return { desde: desplazarPeriodo(actual, -5), hasta: actual, preset: "6m" };
    case "anio":
      return { desde: { anio: actual.anio, mes: 1 }, hasta: actual, preset: "anio" };
    case "anio-anterior":
      return { desde: { anio: actual.anio - 1, mes: 1 }, hasta: { anio: actual.anio - 1, mes: 12 }, preset: "anio-anterior" };
    default:
      return { desde: desplazarPeriodo(actual, -11), hasta: actual, preset: "12m" };
  }
}

export function describirRango(r: { desde: Periodo; hasta: Periodo }): string {
  if (compararPeriodos(r.desde, r.hasta) === 0) return tituloPeriodo(r.desde);
  return `${tituloPeriodo(r.desde)} a ${tituloPeriodo(r.hasta)}`;
}

export type Conteo = { label: string; value: number };

export type ProductoEstadistica = {
  id: string;
  producto: string;
  principioActivo: string | null;
  clase: ClaseProducto | null;
  servicios: number;
  cantidades: { unidad: string; total: number }[];
};

export type Estadisticas = {
  meses: number;
  total: number;
  totalAnterior: number;
  porTipo: (Conteo & { tipo: TipoServicio })[];
  evolucion: { label: string; clave: string; fumigacion: number; tanque: number }[];
  porGrupo: Conteo[];
  rubros: { rubro: string; grupo: string; value: number }[];
  porZona: Conteo[];
  barrios: { barrio: string; zona: string; value: number }[];
  porClase: (Conteo & { clase: ClaseProducto | null })[];
  productos: ProductoEstadistica[];
  aplicaciones: number;
};

function acumular(mapa: Map<string, number>, clave: string, valor: number) {
  mapa.set(clave, (mapa.get(clave) ?? 0) + valor);
}

const ordenarDesc = (a: Conteo, b: Conteo) => b.value - a.value || a.label.localeCompare(b.label, "es");

/** Certificados timbrados por rubro, zona y producto en el rango (vistas v_estadisticas_*). */
export async function getEstadisticas(r: RangoPeriodos): Promise<Estadisticas> {
  const supabase = await createClient();
  const desde = primerDiaISO(r.desde);
  const hasta = primerDiaISO(r.hasta);
  const meses = mesesEntre(r.desde, r.hasta) + 1;
  const anteriorDesde = desplazarPeriodo(r.desde, -meses);
  const anteriorHasta = desplazarPeriodo(r.desde, -1);

  const [rubros, zonas, productos, anteriores] = await Promise.all([
    traerTodo(
      (a, b) =>
        supabase
          .from("v_estadisticas_rubro")
          .select("*")
          .gte("mes", desde)
          .lte("mes", hasta)
          .order("mes")
          .order("grupo")
          .order("rubro")
          .order("tipo")
          .range(a, b),
      "No se pudieron obtener las estadísticas por rubro.",
    ),
    traerTodo(
      (a, b) =>
        supabase
          .from("v_estadisticas_zona")
          .select("*")
          .gte("mes", desde)
          .lte("mes", hasta)
          .order("mes")
          .order("zona")
          .order("barrio")
          .order("tipo")
          .range(a, b),
      "No se pudieron obtener las estadísticas por zona.",
    ),
    traerTodo(
      (a, b) =>
        supabase
          .from("v_estadisticas_producto")
          .select("*")
          .gte("mes", desde)
          .lte("mes", hasta)
          .order("mes")
          .order("producto_id")
          .order("unidad")
          .range(a, b),
      "No se pudieron obtener las estadísticas por producto.",
    ),
    traerTodo(
      (a, b) =>
        supabase
          .from("v_estadisticas_rubro")
          .select("mes, grupo, rubro, tipo, certificados")
          .gte("mes", primerDiaISO(anteriorDesde))
          .lte("mes", primerDiaISO(anteriorHasta))
          .order("mes")
          .order("grupo")
          .order("rubro")
          .order("tipo")
          .range(a, b),
      "No se pudieron obtener las estadísticas del período anterior.",
    ),
  ]);

  // Totales, tipo y evolución mensual (por rubro: cada certificado figura una sola vez).
  let total = 0;
  const porTipo = new Map<TipoServicio, number>();
  const porGrupo = new Map<string, number>();
  const porRubro = new Map<string, { rubro: string; grupo: string; value: number }>();
  const porMes = new Map<string, { fumigacion: number; tanque: number }>();
  for (const f of rubros) {
    const n = num(f.certificados);
    total += n;
    const tipo: TipoServicio = f.tipo === "tanque" ? "tanque" : "fumigacion";
    porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + n);
    const grupo = f.grupo ?? "Sin grupo";
    acumular(porGrupo, grupo, n);
    const rubro = f.rubro ?? "Sin rubro";
    const clave = `${grupo}::${rubro}`;
    const previo = porRubro.get(clave) ?? { rubro, grupo, value: 0 };
    previo.value += n;
    porRubro.set(clave, previo);
    const mes = f.mes?.slice(0, 7) ?? "";
    const m = porMes.get(mes) ?? { fumigacion: 0, tanque: 0 };
    m[tipo] += n;
    porMes.set(mes, m);
  }

  const porZona = new Map<string, number>();
  const porBarrio = new Map<string, { barrio: string; zona: string; value: number }>();
  for (const f of zonas) {
    const n = num(f.certificados);
    const zona = f.zona ?? "Sin zona";
    const barrio = f.barrio ?? "Sin barrio";
    acumular(porZona, zona, n);
    const clave = `${zona}::${barrio}`;
    const previo = porBarrio.get(clave) ?? { barrio, zona, value: 0 };
    previo.value += n;
    porBarrio.set(clave, previo);
  }

  const porProducto = new Map<string, ProductoEstadistica & { porUnidad: Map<string, number> }>();
  const porClase = new Map<string, number>();
  let aplicaciones = 0;
  for (const f of productos) {
    const id = f.producto_id ?? f.producto ?? "sin-producto";
    const servicios = num(f.servicios);
    aplicaciones += servicios;
    const clase = esClaseProducto(f.clase) ? f.clase : null;
    acumular(porClase, clase ?? "otro", servicios);
    const previo =
      porProducto.get(id) ??
      {
        id,
        producto: f.producto ?? "Producto sin nombre",
        principioActivo: f.principio_activo,
        clase,
        servicios: 0,
        cantidades: [],
        porUnidad: new Map<string, number>(),
      };
    previo.servicios += servicios;
    acumular(previo.porUnidad, f.unidad ?? "unidades", num(f.cantidad_total));
    porProducto.set(id, previo);
  }

  const evolucion = periodosEntre(r.desde, r.hasta).map((p) => {
    const m = porMes.get(clavePeriodo(p)) ?? { fumigacion: 0, tanque: 0 };
    return { label: etiquetaCortaPeriodo(p), clave: clavePeriodo(p), fumigacion: m.fumigacion, tanque: m.tanque };
  });

  const etiquetasTipo: Record<TipoServicio, string> = { fumigacion: "Fumigación y desinfección", tanque: "Limpieza de tanques" };

  return {
    meses,
    total,
    totalAnterior: anteriores.reduce((acc, f) => acc + num(f.certificados), 0),
    porTipo: TIPOS_SERVICIO.map((tipo) => ({ tipo, label: etiquetasTipo[tipo], value: porTipo.get(tipo) ?? 0 })),
    evolucion,
    porGrupo: [...porGrupo.entries()].map(([label, value]) => ({ label, value })).sort(ordenarDesc),
    rubros: [...porRubro.values()].sort((a, b) => b.value - a.value || a.rubro.localeCompare(b.rubro, "es")),
    porZona: [...porZona.entries()].map(([label, value]) => ({ label, value })).sort(ordenarDesc),
    barrios: [...porBarrio.values()].sort((a, b) => b.value - a.value || a.barrio.localeCompare(b.barrio, "es")),
    porClase: [...porClase.entries()]
      .map(([clase, value]) => ({
        clase: esClaseProducto(clase) ? clase : null,
        label: clase,
        value,
      }))
      .sort(ordenarDesc),
    productos: [...porProducto.values()]
      .map(({ porUnidad, ...resto }) => ({
        ...resto,
        cantidades: [...porUnidad.entries()].map(([unidad, t]) => ({ unidad, total: t })),
      }))
      .sort((a, b) => b.servicios - a.servicios || a.producto.localeCompare(b.producto, "es")),
    aplicaciones,
  };
}

/* --- Resumen ------------------------------------------------------------------ */

const fmtVariacion = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1, signDisplay: "always" });

/** Variación porcentual para las tarjetas de indicadores. */
export function variacion(actual: number, anterior: number): { delta: string; trend: "up" | "down" | "flat" } {
  if (anterior === 0) return actual === 0 ? { delta: "Sin cambios", trend: "flat" } : { delta: "Nuevo", trend: "up" };
  const pct = ((actual - anterior) / anterior) * 100;
  if (Math.abs(pct) < 0.05) return { delta: "0 %", trend: "flat" };
  return { delta: `${fmtVariacion.format(pct)} %`, trend: pct > 0 ? "up" : "down" };
}

/** Diferencia absoluta con signo ("+3", "−2"). */
export function diferencia(actual: number, anterior: number): { delta: string; trend: "up" | "down" | "flat" } {
  const d = actual - anterior;
  if (d === 0) return { delta: "Sin cambios", trend: "flat" };
  return { delta: `${d > 0 ? "+" : "−"}${Math.abs(d).toLocaleString("es-AR")}`, trend: d > 0 ? "up" : "down" };
}

/** Nombre del Director/a para la firma de la nota (parámetro opcional `director_salud_ambiental`). */
export async function getFirmaDireccion(): Promise<{ nombre: string | null; cargo: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parametros")
    .select("clave, valor")
    .in("clave", ["director_salud_ambiental", "director_nombre"]);
  const valor = (data ?? []).map((p) => p.valor).find((v): v is string => typeof v === "string" && v.trim().length > 0);
  return { nombre: valor?.trim() ?? null, cargo: `Director/a de ${APP.direccion.replace(/^Dirección de /, "")}` };
}

/**
 * Enlace del sistema de Rentas para generar la boleta de la cuenta 091 (parámetro opcional
 * `url_boleta_rentas`). Solo se devuelve si es una URL http(s) válida.
 */
export async function getUrlBoletaRentas(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("parametros").select("valor").eq("clave", "url_boleta_rentas").maybeSingle();
  const valor = typeof data?.valor === "string" ? data.valor.trim() : "";
  if (!valor) return null;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
