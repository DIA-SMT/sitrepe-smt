import type { Json } from "@/lib/supabase/database.types";

/**
 * Trámite más reciente que referencia una entidad en `datos` (p. ej. `tecnico_id` o
 * `empresa_producto_id`). Espera la lista ordenada del más reciente al más antiguo.
 */
export function ultimoTramiteDe<T extends { datos: Json | null }>(tramites: T[], clave: string, id: string | null): T | null {
  if (!id) return null;
  return (
    tramites.find((t) => {
      const d = t.datos;
      return d !== null && typeof d === "object" && !Array.isArray(d) && d[clave] === id;
    }) ?? null
  );
}
