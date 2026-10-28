import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/acciones";
import { Constants, type Enums, type Views } from "@/lib/supabase/database.types";
import { fechaHoraLocalAISO, formatFecha, formatMesCorto, hoyISO } from "@/lib/domain/formato";
import { DIAS_VENCIMIENTO_TANQUE } from "@/lib/domain/vencimiento";
import { PERIODICIDAD } from "@/lib/domain/etiquetas";

/* ==========================================================================
   Certificados de fumigación y de limpieza de tanques (lado prestador e
   impresión oficial). Todas las lecturas pasan por la RLS de quien consulta:
   la empresa ve lo propio y el staff, todo.
   ========================================================================== */

export type TipoServicio = Enums<"tipo_servicio">;
export type EstadoCertificado = Enums<"estado_certificado">;
export type VigenciaCertificado = "vigente" | "por_vencer" | "vencido" | "sin_timbrar" | "anulado";

export const VIGENCIAS_CERTIFICADO = ["vigente", "por_vencer", "vencido", "sin_timbrar", "anulado"] as const;

/** Suma días a una fecha 'YYYY-MM-DD'. */
function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

/** Primer y último día del mes actual en Tucumán ('YYYY-MM-DD'), para filtros y enlaces. */
export function diasMesActual(): { primero: string; ultimo: string } {
  const hoy = hoyISO();
  const [a, m] = hoy.split("-").map(Number);
  return {
    primero: `${hoy.slice(0, 7)}-01`,
    ultimo: new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10),
  };
}

/** Inicio del mes actual y del siguiente en Tucumán, como timestamptz ISO. */
function limitesMesISO(): { desde: string; hasta: string } {
  const { primero, ultimo } = diasMesActual();
  return {
    desde: fechaHoraLocalAISO(`${primero}T00:00`),
    hasta: fechaHoraLocalAISO(`${sumarDias(ultimo, 1)}T00:00`),
  };
}

/** Primer día del mes `n` meses atrás ('YYYY-MM-01'). */
function mesesAtras(n: number): string {
  const [a, m] = hoyISO().split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1 - n, 1));
  return f.toISOString().slice(0, 10);
}

/* --------------------------------------------------------------------------
   Utilidades de presentación (sin acceso a datos)
   -------------------------------------------------------------------------- */

/** Título oficial del certificado según el servicio. */
export function tituloCertificado(tipo: TipoServicio | null | undefined): string {
  return tipo === "tanque" ? "Certificado de limpieza y desinfección de tanques" : "Certificado de fumigación y desinfección";
}

/** Periodicidad legible: la del rubro (Anexo Ord. 2681/98) o 180 días para tanques. */
export function periodicidadTexto(
  tipo: TipoServicio | null | undefined,
  periodicidad: Enums<"periodicidad"> | null | undefined,
): string {
  if (tipo === "tanque") return `Cada ${DIAS_VENCIMIENTO_TANQUE} días (Ord. 2004/92)`;
  if (!periodicidad) return "—";
  return PERIODICIDAD[periodicidad].label;
}

/** Huella de la firma digital abreviada: "3FA2 9C01 … 77D0 B1E4". */
export function huellaAbreviada(hash: string | null | undefined): string | null {
  if (!hash) return null;
  const h = hash.toUpperCase();
  if (h.length <= 16) return h.match(/.{1,4}/g)?.join(" ") ?? h;
  const grupos = (s: string) => s.match(/.{1,4}/g)?.join(" ") ?? s;
  return `${grupos(h.slice(0, 8))} … ${grupos(h.slice(-8))}`;
}

/** Plazo de reingreso legible: "4 horas", "Inmediato" o "—". */
export function plazoReingresoTexto(horas: number | null | undefined): string {
  if (horas === null || horas === undefined) return "—";
  if (horas === 0) return "Inmediato";
  if (horas === 1) return "1 hora";
  if (horas % 24 === 0 && horas >= 24) return horas === 24 ? "24 horas (1 día)" : `${horas} horas (${horas / 24} días)`;
  return `${horas} horas`;
}

/* --------------------------------------------------------------------------
   Inicio del prestador
   -------------------------------------------------------------------------- */

export type HabilitacionEmpresa = Pick<
  Views<"v_empresas">,
  | "id"
  | "nombre_comercial"
  | "cuit"
  | "numero_registro"
  | "resolucion_dsa"
  | "habilitacion_comercial"
  | "habilita_fumigacion"
  | "habilita_tanques"
  | "estado"
  | "estado_efectivo"
  | "fecha_habilitacion"
  | "vencimiento_habilitacion"
  | "dias_para_vencer"
  | "certificados_mes"
  | "pagos_pendientes"
>;

/** Estado de habilitación de la empresa (v_empresas, con estado efectivo y días para vencer). */
export async function getHabilitacion(empresaId: string): Promise<HabilitacionEmpresa | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_empresas")
    .select(
      "id, nombre_comercial, cuit, numero_registro, resolucion_dsa, habilitacion_comercial, habilita_fumigacion, habilita_tanques, estado, estado_efectivo, fecha_habilitacion, vencimiento_habilitacion, dias_para_vencer, certificados_mes, pagos_pendientes",
    )
    .eq("id", empresaId)
    .maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
}

export type ResumenCertificados = {
  delMes: number;
  timbradosMes: number;
  vigentes: number;
  aControlar: number;
  listosParaPagar: number;
  observados: number;
  /** Solo para técnicos: certificados propios pendientes de firma. */
  pendientesFirma: number | null;
};

/** Contadores para las tarjetas del inicio. */
export async function getResumenCertificados(
  empresaId: string,
  tecnicoId: string | null,
): Promise<ResumenCertificados> {
  const supabase = await createClient();
  const mes = limitesMesISO();
  const contar = () => supabase.from("certificados").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId);

  const contarVista = () =>
    supabase.from("v_certificados").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId);

  const [resultados, firmas] = await Promise.all([
    Promise.all([
      // Mes calendario: la declaración anticipada puede traer servicios del mes siguiente.
      contar().neq("estado", "anulado").gte("fecha_servicio", mes.desde).lt("fecha_servicio", mes.hasta),
      contar().eq("estado", "timbrado").gte("timbrado_at", mes.desde),
      contarVista().in("vigencia", ["vigente", "por_vencer"]),
      contar().eq("estado", "declarado"),
      // Misma condición que generar_liquidacion(): controlado y sin pago (o con la liquidación anulada).
      contarVista().eq("estado", "controlado").or("pago_id.is.null,pago_estado.eq.anulado"),
      contar().eq("estado", "observado"),
    ]),
    tecnicoId
      ? contar().eq("tecnico_id", tecnicoId).is("firma_hash", null).in("estado", ["borrador", "observado"])
      : null,
  ]);

  const conError = resultados.find((r) => r.error) ?? (firmas?.error ? firmas : undefined);
  if (conError?.error) throw new Error(mensajeError(conError.error));
  const [delMes, timbradosMes, vigentes, aControlar, listos, observados] = resultados.map((r) => r.count ?? 0);

  return {
    delMes,
    timbradosMes,
    vigentes,
    aControlar,
    listosParaPagar: listos,
    observados,
    pendientesFirma: firmas ? (firmas.count ?? 0) : null,
  };
}

export type AlertaPrestador = {
  tipo: string;
  nivel: "urgente" | "alerta" | "info";
  titulo: string;
  detalle: string;
  fecha: string | null;
  href: string | null;
};

const ORDEN_NIVEL: Record<AlertaPrestador["nivel"], number> = { urgente: 0, alerta: 1, info: 2 };

/**
 * El detalle de v_alertas está pensado para el staff ("Empresa · código"): para la
 * empresa se quita su propio nombre y se deja el resto con mayúscula inicial.
 */
function detalleSinEmpresa(detalle: string | null): string {
  const partes = (detalle ?? "").split(" · ");
  const resto = partes.length > 1 ? partes.slice(1).join(" · ") : partes[0];
  return resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : "";
}

/** Títulos y destinos de cada alerta, desde la mirada de la empresa. */
function adaptarAlerta(a: Views<"v_alertas">): AlertaPrestador | null {
  if (!a.tipo) return null;
  const nivel: AlertaPrestador["nivel"] = a.nivel === "urgente" || a.nivel === "alerta" ? a.nivel : "info";
  const ref = a.referencia_id;
  const base = { tipo: a.tipo, nivel, detalle: detalleSinEmpresa(a.detalle), fecha: a.fecha };
  // Vencimientos de habilitación y documentos: la vista castea una columna date a timestamptz
  // (medianoche UTC). Se conserva solo el día para no mostrarlo corrido en hora de Tucumán.
  const dia = a.fecha ? a.fecha.slice(0, 10) : null;
  switch (a.tipo) {
    case "habilitacion_por_vencer":
      return {
        ...base,
        fecha: dia,
        titulo: nivel === "urgente" ? "Tu habilitación está vencida" : "Tu habilitación está por vencer",
        detalle: `${nivel === "urgente" ? "Venció" : "Vence"} el ${formatFecha(dia)}. Presentá la renovación anual (DDJJ de categorización y libre deuda) para seguir declarando servicios.`,
        href: "/prestador/legajo?tab=renovacion",
      };
    case "documento_por_vencer":
      return {
        ...base,
        fecha: dia,
        titulo: nivel === "urgente" ? "Documento vencido en tu legajo" : "Documento del legajo por vencer",
        href: "/prestador/legajo?tab=documentacion",
      };
    case "pago_a_verificar":
      return { ...base, titulo: "Pago informado: en verificación", href: ref ? `/prestador/pagos/${ref}` : "/prestador/pagos" };
    case "declaracion_a_controlar":
      return {
        ...base,
        titulo: "Declaración en control de la Dirección",
        href: ref ? `/prestador/declaraciones/${ref}` : "/prestador/declaraciones",
      };
    case "declaracion_observada":
      return {
        ...base,
        titulo: "Declaración observada: corregila y volvé a presentarla",
        href: ref ? `/prestador/declaraciones/${ref}` : "/prestador/declaraciones",
      };
    case "notificacion_vencida":
      // El detalle es "Razón social del establecimiento · N.º": se deja completo.
      return {
        ...base,
        detalle: a.detalle ?? "",
        titulo: "Notificación con plazo vencido",
        href: null,
      };
    case "tramite_pendiente":
      return { ...base, titulo: "Trámite en revisión", href: ref ? `/prestador/tramites/${ref}` : "/prestador/tramites" };
    default:
      return { ...base, titulo: a.titulo ?? "Alerta", href: null };
  }
}

/** Alertas propias (v_alertas filtrada por la RLS y por empresa), de mayor a menor urgencia. */
export async function getAlertasEmpresa(empresaId: string, limite = 8): Promise<AlertaPrestador[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_alertas")
    .select("tipo, nivel, titulo, detalle, empresa_id, referencia_id, fecha")
    .eq("empresa_id", empresaId)
    .order("fecha", { ascending: true, nullsFirst: false })
    .limit(40);
  if (error) throw new Error(mensajeError(error));
  return (data ?? [])
    .map(adaptarAlerta)
    .filter((a): a is AlertaPrestador => a !== null)
    .sort((a, b) => ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel])
    .slice(0, limite);
}

export type ServicioProximo = Pick<
  Views<"v_certificados">,
  "id" | "numero" | "tipo" | "cliente" | "domicilio" | "fecha_servicio" | "estado" | "rubro_nombre" | "tecnico_nombre" | "firma_hash"
>;

/** Servicios programados para las próximas 48 horas (no anulados). */
export async function getServiciosProximos(empresaId: string, limite = 8): Promise<ServicioProximo[]> {
  const supabase = await createClient();
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 48 * 3600 * 1000);
  const { data, error } = await supabase
    .from("v_certificados")
    .select("id, numero, tipo, cliente, domicilio, fecha_servicio, estado, rubro_nombre, tecnico_nombre, firma_hash")
    .eq("empresa_id", empresaId)
    .neq("estado", "anulado")
    .gte("fecha_servicio", ahora.toISOString())
    .lt("fecha_servicio", hasta.toISOString())
    .order("fecha_servicio", { ascending: true })
    .limit(limite);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}

export type MesCertificados = { label: string; mes: string; fumigacion: number; tanque: number };

/** Certificados presentados por mes (sin anulados) de los últimos 12 meses (v_planilla_mensual). */
export async function getCertificadosPorMes(empresaId: string): Promise<MesCertificados[]> {
  const supabase = await createClient();
  const desde = mesesAtras(11);
  const { data, error } = await supabase
    .from("v_planilla_mensual")
    .select("mes, tipo, certificados, anulados")
    .eq("empresa_id", empresaId)
    .gte("mes", desde)
    .order("mes", { ascending: true });
  if (error) throw new Error(mensajeError(error));

  const meses: MesCertificados[] = [];
  for (let i = 11; i >= 0; i--) {
    const mes = mesesAtras(i).slice(0, 7);
    meses.push({ mes, label: formatMesCorto(mes), fumigacion: 0, tanque: 0 });
  }
  for (const fila of data ?? []) {
    if (!fila.mes || !fila.tipo) continue;
    const destino = meses.find((m) => m.mes === fila.mes?.slice(0, 7));
    if (!destino) continue;
    destino[fila.tipo] += Math.max(0, (fila.certificados ?? 0) - (fila.anulados ?? 0));
  }
  return meses;
}

export type RecordatorioVencimiento = Pick<
  Views<"v_certificados">,
  | "id"
  | "numero"
  | "tipo"
  | "cliente"
  | "domicilio"
  | "fecha_servicio"
  | "fecha_vencimiento"
  | "rubro_nombre"
  | "rubro_periodicidad"
  | "establecimiento_id"
> & {
  /** Ya hay un servicio posterior cargado para el mismo establecimiento/domicilio. */
  programado: boolean;
};

const normalizar = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Certificados timbrados de clientes que vencen en los próximos días (vigencia "por_vencer"),
 * para programar el próximo servicio. Marca los que ya tienen un servicio posterior cargado.
 */
export async function getRecordatoriosVencimiento(empresaId: string, limite = 6): Promise<RecordatorioVencimiento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_certificados")
    .select(
      "id, numero, tipo, cliente, domicilio, fecha_servicio, fecha_vencimiento, rubro_nombre, rubro_periodicidad, establecimiento_id",
    )
    .eq("empresa_id", empresaId)
    .eq("vigencia", "por_vencer")
    .order("fecha_vencimiento", { ascending: true })
    .limit(30);
  if (error) throw new Error(mensajeError(error));
  const candidatos = data ?? [];
  if (candidatos.length === 0) return [];

  const desde = candidatos.reduce<string>(
    (min, c) => (c.fecha_servicio && c.fecha_servicio < min ? c.fecha_servicio : min),
    candidatos[0].fecha_servicio ?? new Date().toISOString(),
  );
  const { data: posteriores, error: errorPosteriores } = await supabase
    .from("certificados")
    .select("id, tipo, establecimiento_id, domicilio, fecha_servicio")
    .eq("empresa_id", empresaId)
    .neq("estado", "anulado")
    .gt("fecha_servicio", desde)
    // Los más recientes primero: el "próximo servicio" de un certificado por vencer es reciente o futuro.
    .order("fecha_servicio", { ascending: false })
    .limit(1000);
  if (errorPosteriores) throw new Error(mensajeError(errorPosteriores));

  const recordatorios = candidatos.map((c) => {
    const programado = (posteriores ?? []).some(
      (p) =>
        p.id !== c.id &&
        p.tipo === c.tipo &&
        !!c.fecha_servicio &&
        p.fecha_servicio > c.fecha_servicio &&
        ((c.establecimiento_id && p.establecimiento_id === c.establecimiento_id) ||
          normalizar(p.domicilio) === normalizar(c.domicilio)),
    );
    return { ...c, programado };
  });
  recordatorios.sort((a, b) => Number(a.programado) - Number(b.programado));
  return recordatorios.slice(0, limite);
}

export type AvisoReciente = {
  id: string;
  titulo: string;
  cuerpo: string;
  nivel: Enums<"nivel_aviso">;
  created_at: string;
  general: boolean;
  leido: boolean;
};

/** Últimos avisos de la Dirección (generales y propios) con su estado de lectura. */
export async function getAvisosRecientes(perfilId: string, limite = 4): Promise<AvisoReciente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("avisos")
    .select("id, titulo, cuerpo, nivel, created_at, empresa_id")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(mensajeError(error));
  const avisos = data ?? [];
  if (avisos.length === 0) return [];
  const { data: lecturas, error: errorLecturas } = await supabase
    .from("avisos_lecturas")
    .select("aviso_id")
    .eq("perfil_id", perfilId)
    .in(
      "aviso_id",
      avisos.map((a) => a.id),
    );
  if (errorLecturas) throw new Error(mensajeError(errorLecturas));
  const leidos = new Set((lecturas ?? []).map((l) => l.aviso_id));
  return avisos.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    cuerpo: a.cuerpo,
    nivel: a.nivel,
    created_at: a.created_at,
    general: a.empresa_id === null,
    leido: leidos.has(a.id),
  }));
}

/* --------------------------------------------------------------------------
   Listado de certificados
   -------------------------------------------------------------------------- */

const primero = (v: unknown) => (Array.isArray(v) ? v[0] : v);
/** 'YYYY-MM-DD' que además sea una fecha real (p. ej. rechaza 2026-13-45, que haría fallar toISOString). */
const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const [a, m, d] = s.split("-").map(Number);
    const f = new Date(Date.UTC(a, m - 1, d));
    return a >= 2000 && a <= 2100 && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
  })
  .optional()
  .catch(undefined);

const esquemaFiltros = z.object({
  q: z
    .string()
    .trim()
    .max(80)
    .transform((s) => s.replace(/[,()"'\\%*:]/g, " ").replace(/\s+/g, " ").trim())
    .optional()
    .catch(undefined),
  estado: z.enum(Constants.public.Enums.estado_certificado).optional().catch(undefined),
  tipo: z.enum(Constants.public.Enums.tipo_servicio).optional().catch(undefined),
  vigencia: z.enum(VIGENCIAS_CERTIFICADO).optional().catch(undefined),
  desde: fechaISO,
  hasta: fechaISO,
});

export type FiltrosCertificados = z.infer<typeof esquemaFiltros>;

/** Lee y sanea los filtros del listado desde los searchParams. */
export function parsearFiltrosCertificados(
  params: Record<string, string | string[] | undefined>,
): FiltrosCertificados {
  const crudo = Object.fromEntries(
    ["q", "estado", "tipo", "vigencia", "desde", "hasta"].map((k) => [k, primero(params[k]) || undefined]),
  );
  return esquemaFiltros.parse(crudo);
}

export type CertificadoListado = Pick<
  Views<"v_certificados">,
  | "id"
  | "numero"
  | "tipo"
  | "cliente"
  | "domicilio"
  | "rubro_nombre"
  | "rubro_grupo"
  | "fecha_servicio"
  | "fecha_vencimiento"
  | "vigencia"
  | "estado"
  | "sello_codigo"
  | "timbrado_at"
  | "firma_hash"
  | "declaracion_id"
  | "pago_id"
>;

/** Certificados de la empresa con filtros y paginación. */
export async function listarCertificados(
  empresaId: string,
  filtros: FiltrosCertificados,
  rango: { desde: number; hasta: number },
): Promise<{ filas: CertificadoListado[]; total: number }> {
  const supabase = await createClient();
  let q = supabase
    .from("v_certificados")
    .select(
      "id, numero, tipo, cliente, domicilio, rubro_nombre, rubro_grupo, fecha_servicio, fecha_vencimiento, vigencia, estado, sello_codigo, timbrado_at, firma_hash, declaracion_id, pago_id",
      { count: "exact" },
    )
    .eq("empresa_id", empresaId);

  if (filtros.q) {
    // Entre comillas para que PostgREST no interprete puntos o espacios del texto (comillas y
    // barras ya se quitaron al sanear el filtro).
    const t = `"%${filtros.q}%"`;
    q = q.or(
      [
        `numero.ilike.${t}`,
        `cliente.ilike.${t}`,
        `domicilio.ilike.${t}`,
        `sello_codigo.ilike.${t}`,
        `codigo_verificacion.ilike.${t}`,
      ].join(","),
    );
  }
  if (filtros.estado) q = q.eq("estado", filtros.estado);
  if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
  if (filtros.vigencia) q = q.eq("vigencia", filtros.vigencia);
  if (filtros.desde) q = q.gte("fecha_servicio", fechaHoraLocalAISO(`${filtros.desde}T00:00`));
  if (filtros.hasta) q = q.lt("fecha_servicio", fechaHoraLocalAISO(`${sumarDias(filtros.hasta, 1)}T00:00`));

  const { data, count, error } = await q
    .order("fecha_servicio", { ascending: false })
    .order("numero", { ascending: false })
    .range(rango.desde, rango.hasta);
  // PGRST103: la página pedida está fuera de rango (p. ej. ?pagina=99). Se informa el total sin filas.
  if (error?.code === "PGRST103") {
    const { total: totalReal } = await listarCertificados(empresaId, filtros, { desde: 0, hasta: 0 });
    return { filas: [], total: totalReal };
  }
  if (error) throw new Error(mensajeError(error));
  return { filas: data ?? [], total: count ?? 0 };
}

export type ConteoVigencias = Record<"vigente" | "por_vencer" | "vencido" | "sin_timbrar", number>;

/** Cantidad de certificados por vigencia (atajos del listado). */
export async function contarVigencias(empresaId: string): Promise<ConteoVigencias> {
  const supabase = await createClient();
  const contar = (vigencia: keyof ConteoVigencias) =>
    supabase
      .from("v_certificados")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresaId)
      .eq("vigencia", vigencia);
  const [vigente, porVencer, vencido, sinTimbrar] = await Promise.all([
    contar("vigente"),
    contar("por_vencer"),
    contar("vencido"),
    contar("sin_timbrar"),
  ]);
  const conError = [vigente, porVencer, vencido, sinTimbrar].find((r) => r.error);
  if (conError?.error) throw new Error(mensajeError(conError.error));
  return {
    vigente: vigente.count ?? 0,
    por_vencer: porVencer.count ?? 0,
    vencido: vencido.count ?? 0,
    sin_timbrar: sinTimbrar.count ?? 0,
  };
}

/* --------------------------------------------------------------------------
   Detalle e impresión
   -------------------------------------------------------------------------- */

export type ProductoDetalle = {
  id: string;
  cantidad: number;
  unidad: string;
  nombre: string;
  principioActivo: string;
  concentracion: string | null;
  clase: Enums<"clase_producto">;
  organismo: Enums<"organismo_registro">;
  registro: string;
  plazoReingresoHoras: number;
};

export type CertificadoDetalle = {
  certificado: Views<"v_certificados"> & { id: string; empresa_id: string };
  productos: ProductoDetalle[];
  empresa: {
    id: string;
    nombre_comercial: string;
    titular: string | null;
    cuit: string;
    numero_registro: number | null;
    resolucion_dsa: string | null;
    domicilio_oficina: string | null;
    telefono: string | null;
    email: string | null;
  } | null;
  declaracion: {
    id: string;
    codigo: string | null;
    estado: Enums<"estado_declaracion">;
    created_at: string;
    presentada_at: string | null;
    controlada_at: string | null;
    observaciones: string | null;
  } | null;
  pago: {
    id: string;
    codigo: string | null;
    estado: Enums<"estado_pago">;
    medio: Enums<"medio_pago">;
    importe_total: number;
    cantidad: number;
    created_at: string;
    informado_at: string | null;
    fecha_pago: string | null;
    verificado_at: string | null;
  } | null;
  establecimiento: {
    id: string;
    nombre: string;
    nombre_fantasia: string | null;
    barrio: string | null;
    zona: string | null;
  } | null;
};

// Formato 8-4-4-4-12 (sin exigir versión: los datos de ejemplo pueden traer ids fijos).
const esUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/**
 * Certificado completo con productos, empresa, declaración, pago y establecimiento.
 * Devuelve null si el id no es válido o si la RLS no deja leerlo (no es propio ni staff).
 * Memorizado por request (lo usan generateMetadata y la página).
 */
export const getCertificadoDetalle = cache(async (id: string): Promise<CertificadoDetalle | null> => {
  if (!esUuid(id)) return null;
  const supabase = await createClient();
  const { data: c, error } = await supabase.from("v_certificados").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  if (!c || !c.id || !c.empresa_id) return null;
  const certificado = { ...c, id: c.id, empresa_id: c.empresa_id };

  const consultaDeclaracion = async () => {
    if (!c.declaracion_id) return null;
    const { data, error: e } = await supabase
      .from("declaraciones")
      .select("id, codigo, estado, created_at, presentada_at, controlada_at, observaciones")
      .eq("id", c.declaracion_id)
      .maybeSingle();
    if (e) throw new Error(mensajeError(e));
    return data;
  };
  const consultaPago = async () => {
    if (!c.pago_id) return null;
    const { data, error: e } = await supabase
      .from("pagos")
      .select("id, codigo, estado, medio, importe_total, cantidad, created_at, informado_at, fecha_pago, verificado_at")
      .eq("id", c.pago_id)
      .maybeSingle();
    if (e) throw new Error(mensajeError(e));
    return data;
  };
  const consultaEstablecimiento = async () => {
    if (!c.establecimiento_id) return null;
    const { data, error: e } = await supabase
      .from("establecimientos")
      .select("id, nombre, nombre_fantasia, barrio, zona")
      .eq("id", c.establecimiento_id)
      .maybeSingle();
    if (e) throw new Error(mensajeError(e));
    return data;
  };
  const consultaEmpresa = async () => {
    const { data, error: e } = await supabase
      .from("empresas")
      .select("id, nombre_comercial, titular, cuit, numero_registro, resolucion_dsa, domicilio_oficina, telefono, email")
      .eq("id", certificado.empresa_id)
      .maybeSingle();
    if (e) throw new Error(mensajeError(e));
    return data;
  };
  const consultaProductos = async (): Promise<ProductoDetalle[]> => {
    const { data, error: e } = await supabase
      .from("certificado_productos")
      .select(
        "id, cantidad, unidad, producto:productos(nombre_comercial, principio_activo, concentracion, clase, organismo, registro_numero, plazo_reingreso_horas)",
      )
      .eq("certificado_id", certificado.id);
    if (e) throw new Error(mensajeError(e));
    return (data ?? [])
      .flatMap((fila): ProductoDetalle[] => {
        const p = fila.producto;
        if (!p) return [];
        return [
          {
            id: fila.id,
            cantidad: fila.cantidad,
            unidad: fila.unidad,
            nombre: p.nombre_comercial,
            principioActivo: p.principio_activo,
            concentracion: p.concentracion,
            clase: p.clase,
            organismo: p.organismo,
            registro: p.registro_numero,
            plazoReingresoHoras: p.plazo_reingreso_horas,
          },
        ];
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  };

  const [productos, empresa, declaracion, pago, establecimiento] = await Promise.all([
    consultaProductos(),
    consultaEmpresa(),
    consultaDeclaracion(),
    consultaPago(),
    consultaEstablecimiento(),
  ]);

  return { certificado, productos, empresa, declaracion, pago, establecimiento };
});
