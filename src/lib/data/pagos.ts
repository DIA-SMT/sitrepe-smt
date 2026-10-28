import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/acciones";
import { hoyISO } from "@/lib/domain/formato";
import type { Enums, Tables, Views } from "@/lib/supabase/database.types";

/**
 * Timbrado: liquidación, pago, conciliación y sellado digital
 * (Arts. 9.º b y 11.º, Ord. 2681/98; Ord. Tarifaria 5487).
 * Todas las lecturas respetan la RLS: la empresa ve solo lo propio y el staff, todo.
 */

export type EstadoPago = Enums<"estado_pago">;
export type MedioPago = Enums<"medio_pago">;
export type TipoServicio = Enums<"tipo_servicio">;
export type PagoVista = Views<"v_pagos">;
export type CuentaRecaudadora = Tables<"cuentas_recaudadoras">;

export const ESTADOS_PAGO: readonly EstadoPago[] = ["pendiente", "informado", "verificado", "rechazado", "anulado"];
export const MEDIOS_PAGO: readonly MedioPago[] = ["transferencia", "boleta", "plataforma_electronica"];

/** Arancel que corresponde a cada tipo de certificado (una vez por certificado, no por ejemplar). */
export const ARANCEL_POR_TIPO: Record<TipoServicio, string> = {
  fumigacion: "TIMBRADO_CERTIFICADO",
  tanque: "LIMPIEZA_TANQUE",
};

/** Conceptos que se liquidan desde los certificados (no se registran como "otros conceptos"). */
export const CODIGOS_ARANCEL_CERTIFICADOS: readonly string[] = Object.values(ARANCEL_POR_TIPO);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: string | null | undefined): valor is string {
  return !!valor && UUID.test(valor);
}

export function esEstadoPago(valor: string | null | undefined): valor is EstadoPago {
  return !!valor && (ESTADOS_PAGO as readonly string[]).includes(valor);
}

export function esMedioPago(valor: string | null | undefined): valor is MedioPago {
  return !!valor && (MEDIOS_PAGO as readonly string[]).includes(valor);
}

/** Inicio del mes actual en hora de Tucumán (UTC−3), como ISO con zona. */
export function inicioMesISO(hoy: string = hoyISO()): string {
  return `${hoy.slice(0, 7)}-01T00:00:00-03:00`;
}

/** Inicio del año actual en hora de Tucumán (UTC−3), como ISO con zona. */
export function inicioAnioISO(hoy: string = hoyISO()): string {
  return `${hoy.slice(0, 4)}-01-01T00:00:00-03:00`;
}

/**
 * Valida la ruta de un comprobante subido desde el navegador (`<SubirArchivo>`): tiene que estar
 * directamente en la carpeta esperada (convención de lib/storage.ts), sin subcarpetas ni segmentos
 * "." / "..", y con un nombre de archivo saneado.
 */
export function comprobanteEnCarpeta(path: string, carpeta: readonly string[]): boolean {
  const partes = path.split("/");
  if (partes.length !== carpeta.length + 1) return false;
  if (!carpeta.every((segmento, i) => segmento !== "" && partes[i] === segmento)) return false;
  const archivo = partes[partes.length - 1];
  return archivo !== "." && archivo !== ".." && /^[A-Za-z0-9._-]{1,200}$/.test(archivo);
}

/** Quita los caracteres con significado en los filtros de PostgREST (`,()*%\`). */
function limpiarBusqueda(texto: string | undefined): string {
  return (texto ?? "")
    .replace(/[^\p{L}\p{N}\s\-_/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

// -----------------------------------------------------------------------------
// Certificados
// -----------------------------------------------------------------------------

const COLUMNAS_CERTIFICADO =
  "id, empresa_id, numero, tipo, cliente, domicilio, rubro_nombre, fecha_servicio, fecha_vencimiento, estado, sello_codigo, codigo_verificacion, timbrado_at, declaracion_codigo, pago_id, pago_estado";

/**
 * Certificados controlados por el área y sin pago activo: listos para liquidar el timbrado.
 * (Una liquidación anulada libera sus certificados.)
 */
export async function getCertificadosParaTimbrar(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_certificados")
    .select(COLUMNAS_CERTIFICADO)
    .eq("empresa_id", empresaId)
    .eq("estado", "controlado")
    .or("pago_id.is.null,pago_estado.eq.anulado")
    .order("tipo")
    .order("fecha_servicio", { ascending: true })
    .limit(500);
  if (error) throw new Error(mensajeError(error, "No se pudieron cargar los certificados para timbrar."));
  return data ?? [];
}

export type CertificadoParaTimbrar = Awaited<ReturnType<typeof getCertificadosParaTimbrar>>[number];

/** Certificados incluidos en una liquidación. */
export async function getCertificadosDePago(pagoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_certificados")
    .select(COLUMNAS_CERTIFICADO)
    .eq("pago_id", pagoId)
    .order("tipo")
    .order("numero");
  if (error) throw new Error(mensajeError(error, "No se pudieron cargar los certificados de la liquidación."));
  return data ?? [];
}

export type CertificadoDePago = Awaited<ReturnType<typeof getCertificadosDePago>>[number];

// -----------------------------------------------------------------------------
// Liquidaciones / pagos
// -----------------------------------------------------------------------------

/** Una liquidación por id (null si no existe o la RLS no la deja ver). Memorizada por request. */
export const getPago = cache(async (id: string): Promise<PagoVista | null> => {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_pagos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error, "No se pudo cargar la liquidación."));
  return data;
});

/** Cuenta recaudadora (para mostrar N.º de cuenta, CBU y medios admitidos). */
export async function getCuenta(id: number | null | undefined): Promise<CuentaRecaudadora | null> {
  if (id === null || id === undefined) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("cuentas_recaudadoras").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
}

/** Liquidaciones de la empresa, con filtro por estado y paginación. */
export async function getPagosEmpresa(
  empresaId: string,
  { estado, desde, hasta }: { estado?: EstadoPago; desde: number; hasta: number },
) {
  const supabase = await createClient();
  const consulta = (soloConteo: boolean) => {
    let q = supabase.from("v_pagos").select("*", { count: "exact", head: soloConteo }).eq("empresa_id", empresaId);
    if (estado) q = q.eq("estado", estado);
    return q;
  };
  const { data, error, count } = await consulta(false).order("created_at", { ascending: false }).range(desde, hasta);
  if (error && paginaFueraDeRango(error)) {
    const conteo = await consulta(true);
    if (conteo.error) throw new Error(mensajeError(conteo.error, "No se pudieron cargar las liquidaciones."));
    return { pagos: [], total: conteo.count ?? 0 };
  }
  if (error) throw new Error(mensajeError(error, "No se pudieron cargar las liquidaciones."));
  return { pagos: data ?? [], total: count ?? 0 };
}

/**
 * Con `count: "exact"`, PostgREST responde 416 (PGRST103) si se pide una página posterior a la última
 * (p. ej. después de verificar el único pago de la última página). En ese caso se devuelve la lista vacía
 * con el total real, y la página redirige a la última página válida.
 */
function paginaFueraDeRango(error: { code?: string } | null): boolean {
  return error?.code === "PGRST103";
}

/** Indicadores de pagos de la empresa: saldos a pagar, en verificación y pagado en el año. */
export async function getResumenPagosEmpresa(empresaId: string) {
  const supabase = await createClient();
  const [activos, verificados] = await Promise.all([
    supabase
      .from("pagos")
      .select("estado, importe_total")
      .eq("empresa_id", empresaId)
      .in("estado", ["pendiente", "informado", "rechazado"]),
    // v_pagos: `cantidad_certificados` cuenta solo los certificados sellados (no las unidades de otros conceptos).
    supabase
      .from("v_pagos")
      .select("importe_total, cantidad_certificados")
      .eq("empresa_id", empresaId)
      .eq("estado", "verificado")
      .gte("verificado_at", inicioAnioISO()),
  ]);
  if (activos.error || verificados.error) throw new Error(mensajeError(activos.error ?? verificados.error));

  const resumen = {
    aPagar: { cantidad: 0, monto: 0 },
    enVerificacion: { cantidad: 0, monto: 0 },
    rechazados: 0,
    pagadoAnio: { cantidad: 0, monto: 0, unidades: 0 },
  };
  for (const p of activos.data ?? []) {
    const monto = Number(p.importe_total);
    if (p.estado === "informado") {
      resumen.enVerificacion.cantidad += 1;
      resumen.enVerificacion.monto += monto;
    } else {
      resumen.aPagar.cantidad += 1;
      resumen.aPagar.monto += monto;
      if (p.estado === "rechazado") resumen.rechazados += 1;
    }
  }
  for (const p of verificados.data ?? []) {
    resumen.pagadoAnio.cantidad += 1;
    resumen.pagadoAnio.monto += Number(p.importe_total ?? 0);
    resumen.pagadoAnio.unidades += p.cantidad_certificados ?? 0;
  }
  return resumen;
}

// -----------------------------------------------------------------------------
// Bandeja de conciliación (staff)
// -----------------------------------------------------------------------------

export type FiltrosBandeja = {
  /** Estado a mostrar; null = todos. */
  estado: EstadoPago | null;
  cuenta?: string;
  empresa?: string;
  /** Fecha de pago desde/hasta ('YYYY-MM-DD'). */
  desde?: string;
  hasta?: string;
  q?: string;
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function consultaBandeja(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filtros: FiltrosBandeja,
  soloConteo = false,
) {
  let q = supabase.from("v_pagos").select("*", { count: "exact", head: soloConteo });
  if (filtros.estado) q = q.eq("estado", filtros.estado);
  if (filtros.cuenta) q = q.eq("cuenta_codigo", filtros.cuenta);
  if (esUuid(filtros.empresa)) q = q.eq("empresa_id", filtros.empresa);
  if (filtros.desde && FECHA.test(filtros.desde)) q = q.gte("fecha_pago", filtros.desde);
  if (filtros.hasta && FECHA.test(filtros.hasta)) q = q.lte("fecha_pago", filtros.hasta);
  const texto = limpiarBusqueda(filtros.q);
  if (texto) {
    q = q.or(
      [
        `codigo.ilike.*${texto}*`,
        `numero_operacion.ilike.*${texto}*`,
        `empresa_nombre.ilike.*${texto}*`,
        `contribuyente.ilike.*${texto}*`,
        `empresa_cuit.ilike.*${texto}*`,
        `contribuyente_cuit.ilike.*${texto}*`,
      ].join(","),
    );
  }
  return q;
}

/** Bandeja de pagos con filtros (estado, cuenta, empresa, fechas de pago, búsqueda) y paginación. */
export async function getBandejaPagos(filtros: FiltrosBandeja, { desde, hasta }: { desde: number; hasta: number }) {
  const supabase = await createClient();
  // Los "a verificar" se atienden por orden de llegada; el resto, del más reciente al más antiguo.
  const q = consultaBandeja(supabase, filtros);
  const ordenada =
    filtros.estado === "informado"
      ? q.order("informado_at", { ascending: true, nullsFirst: false })
      : q.order("created_at", { ascending: false });
  const { data, error, count } = await ordenada.range(desde, hasta);
  if (error && paginaFueraDeRango(error)) {
    const conteo = await consultaBandeja(supabase, filtros, true);
    if (conteo.error) throw new Error(mensajeError(conteo.error, "No se pudo cargar la bandeja de pagos."));
    return { pagos: [], total: conteo.count ?? 0 };
  }
  if (error) throw new Error(mensajeError(error, "No se pudo cargar la bandeja de pagos."));
  return { pagos: data ?? [], total: count ?? 0 };
}

/** Cantidad de pagos por estado con los mismos filtros (para las pestañas de la bandeja). */
export async function getConteosPorEstado(filtros: Omit<FiltrosBandeja, "estado">): Promise<Record<EstadoPago, number>> {
  const supabase = await createClient();
  const contar = async (estado: EstadoPago) => {
    const { count, error } = await consultaBandeja(supabase, { ...filtros, estado }, true);
    if (error) throw new Error(mensajeError(error));
    return count ?? 0;
  };
  const [pendiente, informado, verificado, rechazado, anulado] = await Promise.all([
    contar("pendiente"),
    contar("informado"),
    contar("verificado"),
    contar("rechazado"),
    contar("anulado"),
  ]);
  return { pendiente, informado, verificado, rechazado, anulado };
}

/** Indicadores de la bandeja: monto a verificar y verificado en el mes por cuenta. */
export async function getKpisConciliacion() {
  const supabase = await createClient();
  const [aVerificar, verificadosMes, pendientes] = await Promise.all([
    supabase.from("v_pagos").select("importe_total, informado_at").eq("estado", "informado"),
    supabase
      .from("v_pagos")
      .select("importe_total, cuenta_codigo")
      .eq("estado", "verificado")
      .gte("verificado_at", inicioMesISO()),
    supabase.from("pagos").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
  ]);
  const error = aVerificar.error ?? verificadosMes.error ?? pendientes.error;
  if (error) throw new Error(mensajeError(error, "No se pudieron calcular los indicadores."));

  let montoAVerificar = 0;
  let masAntiguo: string | null = null;
  for (const p of aVerificar.data ?? []) {
    montoAVerificar += Number(p.importe_total ?? 0);
    if (p.informado_at && (!masAntiguo || p.informado_at < masAntiguo)) masAntiguo = p.informado_at;
  }
  const porCuenta: Record<string, { monto: number; cantidad: number }> = {};
  for (const p of verificadosMes.data ?? []) {
    const cuenta = p.cuenta_codigo ?? "—";
    porCuenta[cuenta] ??= { monto: 0, cantidad: 0 };
    porCuenta[cuenta].monto += Number(p.importe_total ?? 0);
    porCuenta[cuenta].cantidad += 1;
  }
  return {
    aVerificar: { cantidad: aVerificar.data?.length ?? 0, monto: montoAVerificar, masAntiguo },
    verificadoMes: porCuenta,
    pendientesDePago: pendientes.count ?? 0,
  };
}

/** Otros pagos con el mismo N.º de operación (posible comprobante duplicado). */
export async function getPagosMismaOperacion(pago: Pick<PagoVista, "id" | "numero_operacion">) {
  const numero = pago.numero_operacion?.trim();
  if (!numero || !pago.id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_pagos")
    .select("id, codigo, empresa_nombre, contribuyente, estado, importe_total, fecha_pago")
    .eq("numero_operacion", numero)
    .neq("id", pago.id)
    .neq("estado", "anulado")
    .limit(5);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

/** Nombre del agente que verificó un pago (solo visible para el staff por RLS). */
export async function getNombrePerfil(id: string | null | undefined): Promise<string | null> {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("perfiles").select("nombre, apellido, email").eq("id", id).maybeSingle();
  if (!data) return null;
  return `${data.nombre} ${data.apellido}`.trim() || data.email;
}

/** Datos del contribuyente (empresa) para la liquidación impresa. */
export async function getEmpresaContribuyente(id: string | null | undefined) {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nombre_comercial, titular, cuit, numero_registro, domicilio_oficina, email")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
}

/** Empresas del padrón (para filtros y para registrar pagos de otros conceptos). */
export async function getEmpresasPadron() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nombre_comercial, cuit, numero_registro, estado")
    .order("nombre_comercial");
  if (error) throw new Error(mensajeError(error, "No se pudo cargar el padrón de empresas."));
  return data ?? [];
}
