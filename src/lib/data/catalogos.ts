import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/acciones";
import { hoyISO } from "@/lib/domain/formato";

/** Catálogos de lectura pública (rubros del Anexo, productos, aranceles, cuentas, parámetros). */

export async function getRubros({ soloActivos = true } = {}) {
  const supabase = await createClient();
  let q = supabase.from("rubros").select("*").order("grupo").order("nombre");
  if (soloActivos) q = q.eq("activo", true);
  const { data, error } = await q;
  if (error) throw new Error(mensajeError(error));
  return data;
}

export async function getProductos({ soloActivos = true } = {}) {
  const supabase = await createClient();
  let q = supabase.from("productos").select("*").order("nombre_comercial");
  if (soloActivos) q = q.eq("activo", true);
  const { data, error } = await q;
  if (error) throw new Error(mensajeError(error));
  return data;
}

/** Aranceles vigentes hoy (uno por código) con su cuenta recaudadora. */
export async function getArancelesVigentes() {
  const supabase = await createClient();
  const [{ data: aranceles, error }, { data: cuentas, error: errorCuentas }] = await Promise.all([
    supabase.from("aranceles").select("*").eq("activo", true).order("vigente_desde", { ascending: false }),
    supabase.from("cuentas_recaudadoras").select("*").order("codigo", { ascending: false }),
  ]);
  if (error || errorCuentas) throw new Error(mensajeError(error ?? errorCuentas));
  const hoy = hoyISO();
  const vistos = new Set<string>();
  const vigentes = (aranceles ?? []).filter((a) => {
    if (a.vigente_desde > hoy || (a.vigente_hasta && a.vigente_hasta < hoy) || vistos.has(a.codigo)) return false;
    vistos.add(a.codigo);
    return true;
  });
  return vigentes.map((a) => ({ ...a, cuenta: (cuentas ?? []).find((c) => c.id === a.cuenta_id) ?? null }));
}

export async function getCuentas() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cuentas_recaudadoras").select("*").order("codigo", { ascending: false });
  if (error) throw new Error(mensajeError(error));
  return data;
}

/** Parámetros como objeto clave → valor. */
export async function getParametros(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("parametros").select("clave, valor");
  if (error) throw new Error(mensajeError(error));
  return Object.fromEntries((data ?? []).map((p) => [p.clave, p.valor]));
}
