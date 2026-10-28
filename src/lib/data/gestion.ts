import "server-only";
import { z } from "zod";
import { mensajeError } from "@/lib/acciones";
import { APP } from "@/lib/config";
import { hoyISO } from "@/lib/domain/formato";
import { createClient } from "@/lib/supabase/server";

/* -----------------------------------------------------------------------------
 * Panel de gestión: indicadores (rpc dashboard_kpis), alertas (v_alertas) y
 * agenda de servicios declarados (v_agenda_servicios).
 * -------------------------------------------------------------------------- */

const numero = z.coerce.number().catch(0);

/** Si el bloque no llega como objeto, se parsea uno vacío (cada contador faltante vale 0). */
const objeto = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

const esquemaKpis = z.object({
  empresas: z.preprocess(
    objeto,
    z.object({
      habilitadas: numero,
      con_tanques: numero,
      en_tramite: numero,
      vencidas: numero,
      suspendidas: numero,
      por_vencer_30: numero,
    }),
  ),
  certificados: z.preprocess(
    objeto,
    z.object({ mes: numero, timbrados_mes: numero, a_controlar: numero, pendientes_pago: numero, vigentes: numero }),
  ),
  pagos: z.preprocess(
    objeto,
    z.object({ a_verificar: numero, recaudado_mes: numero, recaudado_mes_505: numero, recaudado_mes_091: numero }),
  ),
  fiscalizacion: z.preprocess(
    objeto,
    z.object({
      establecimientos_vencidos: numero,
      establecimientos_sin_certificado: numero,
      notificaciones_vencidas: numero,
      inspecciones_programadas_hoy: numero,
      actas_mes: numero,
      denuncias_abiertas: numero,
    }),
  ),
  tramites_pendientes: numero,
  serie_certificados: z
    .array(z.object({ mes: z.string(), fumigacion: numero, tanque: numero }))
    .catch([]),
  serie_recaudacion: z
    .array(z.object({ mes: z.string(), c505: numero, c091: numero }))
    .catch([]),
});

export type DashboardKpis = z.infer<typeof esquemaKpis>;

/** Indicadores del panel (la función valida que el usuario sea staff). */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_kpis");
  if (error) throw new Error(mensajeError(error, "No se pudieron obtener los indicadores del panel."));
  return esquemaKpis.parse(data ?? {});
}

/* --- Alertas ---------------------------------------------------------------- */

export const NIVELES_ALERTA = ["urgente", "alerta", "info"] as const;
export type NivelAlerta = (typeof NIVELES_ALERTA)[number];

export type TipoAlerta =
  | "habilitacion_por_vencer"
  | "documento_por_vencer"
  | "pago_a_verificar"
  | "declaracion_a_controlar"
  | "declaracion_observada"
  | "notificacion_vencida"
  | "tramite_pendiente";

export type Alerta = {
  clave: string;
  tipo: string;
  nivel: NivelAlerta;
  titulo: string;
  detalle: string;
  empresaId: string | null;
  referenciaId: string | null;
  fecha: string | null;
  href: string | null;
};

/** Destino de cada alerta según su tipo. */
export function hrefAlerta(tipo: string | null, empresaId: string | null, referenciaId: string | null): string | null {
  switch (tipo) {
    case "habilitacion_por_vencer":
      return empresaId ? `/gestion/empresas/${empresaId}` : null;
    case "documento_por_vencer":
      return empresaId ? `/gestion/empresas/${empresaId}?tab=documentos` : null;
    case "pago_a_verificar":
      return referenciaId ? `/gestion/pagos/${referenciaId}` : null;
    case "declaracion_a_controlar":
    case "declaracion_observada":
      return referenciaId ? `/gestion/control/${referenciaId}` : null;
    case "notificacion_vencida":
      return referenciaId ? `/gestion/notificaciones/${referenciaId}` : null;
    case "tramite_pendiente":
      return referenciaId ? `/gestion/tramites/${referenciaId}` : null;
    default:
      return null;
  }
}

function nivelValido(valor: string | null): NivelAlerta {
  return (NIVELES_ALERTA as readonly string[]).includes(valor ?? "") ? (valor as NivelAlerta) : "info";
}

export type AlertasAgrupadas = {
  grupos: Record<NivelAlerta, Alerta[]>;
  totales: Record<NivelAlerta, number>;
};

/**
 * Alertas del staff agrupadas por nivel. Trae hasta `limite` filas (las más
 * antiguas primero: vencimientos próximos y pendientes que esperan hace más
 * tiempo) y cuenta el total real de cada nivel.
 */
export async function getAlertas(limite = 400): Promise<AlertasAgrupadas> {
  const supabase = await createClient();
  const [lista, ...conteos] = await Promise.all([
    supabase.from("v_alertas").select("*").order("fecha", { ascending: true, nullsFirst: false }).limit(limite),
    ...NIVELES_ALERTA.map((nivel) =>
      supabase.from("v_alertas").select("tipo", { count: "exact", head: true }).eq("nivel", nivel),
    ),
  ]);
  if (lista.error) throw new Error(mensajeError(lista.error, "No se pudieron obtener las alertas."));

  const grupos: Record<NivelAlerta, Alerta[]> = { urgente: [], alerta: [], info: [] };
  (lista.data ?? []).forEach((fila, i) => {
    const nivel = nivelValido(fila.nivel);
    grupos[nivel].push({
      clave: `${fila.tipo ?? "alerta"}-${fila.referencia_id ?? i}-${i}`,
      tipo: fila.tipo ?? "",
      nivel,
      titulo: fila.titulo ?? "Alerta",
      detalle: fila.detalle ?? "",
      empresaId: fila.empresa_id,
      referenciaId: fila.referencia_id,
      fecha: fila.fecha,
      href: hrefAlerta(fila.tipo, fila.empresa_id, fila.referencia_id),
    });
  });

  const totales = Object.fromEntries(
    NIVELES_ALERTA.map((nivel, i) => [nivel, conteos[i]?.count ?? grupos[nivel].length]),
  ) as Record<NivelAlerta, number>;

  return { grupos, totales };
}

/* --- Agenda de servicios ---------------------------------------------------- */

export type ServicioAgenda = {
  id: string;
  empresaId: string | null;
  empresaNombre: string;
  tipo: "fumigacion" | "tanque";
  numero: string;
  cliente: string;
  domicilio: string;
  barrio: string | null;
  zona: string | null;
  rubro: string | null;
  tecnico: string | null;
  fechaServicio: string;
  establecimientoId: string | null;
  inspeccionado: boolean;
  dia: string;
};

/** Servicios declarados entre ayer y los próximos 3 días, separados en hoy / próximos. */
export async function getAgendaServicios(): Promise<{ hoy: ServicioAgenda[]; proximos: ServicioAgenda[]; fecha: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_agenda_servicios")
    .select("*")
    .order("fecha_servicio", { ascending: true })
    .limit(500);
  if (error) throw new Error(mensajeError(error, "No se pudo obtener la agenda de servicios."));

  const hoy = hoyISO();
  const servicios: ServicioAgenda[] = (data ?? [])
    .filter((s) => s.id && s.fecha_servicio)
    .map((s) => ({
      id: s.id as string,
      empresaId: s.empresa_id,
      empresaNombre: s.empresa_nombre ?? "Empresa",
      tipo: s.tipo ?? "fumigacion",
      numero: s.numero ?? "—",
      cliente: s.cliente ?? "—",
      domicilio: s.domicilio ?? "—",
      barrio: s.barrio,
      zona: s.zona,
      rubro: s.rubro_nombre,
      tecnico: s.tecnico_nombre,
      fechaServicio: s.fecha_servicio as string,
      establecimientoId: s.establecimiento_id,
      inspeccionado: Boolean(s.inspeccionado),
      dia: hoyISO(new Date(s.fecha_servicio as string)),
    }));

  return {
    hoy: servicios.filter((s) => s.dia === hoy),
    proximos: servicios.filter((s) => s.dia > hoy),
    fecha: hoy,
  };
}

/* --- Saludo ----------------------------------------------------------------- */

/** "Buenos días" / "Buenas tardes" / "Buenas noches" según la hora de Tucumán. */
export function saludoSegunHora(ahora: Date = new Date()): string {
  const hora = Number(
    // hourCycle h23: con `hour12: false` algunos motores devuelven "24" a la medianoche.
    new Intl.DateTimeFormat("en-US", { timeZone: APP.zonaHoraria, hour: "numeric", hourCycle: "h23" }).format(ahora),
  );
  if (hora >= 5 && hora < 13) return "Buenos días";
  if (hora >= 13 && hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** "Lunes 26 de octubre de 2026" en hora de Tucumán. */
export function fechaDeHoyLarga(ahora: Date = new Date()): string {
  const texto = new Intl.DateTimeFormat("es-AR", {
    timeZone: APP.zonaHoraria,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(ahora)
    .replace(",", "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
