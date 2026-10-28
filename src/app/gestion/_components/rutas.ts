/** Rutas del módulo de padrón (y de otros módulos a los que se enlaza). */

export const rutaLegajo = (empresaId: string, tab?: string) =>
  `/gestion/empresas/${empresaId}${tab && tab !== "resumen" ? `?tab=${tab}` : ""}`;

/** Abre un documento del legajo con una URL firmada generada al hacer clic. */
export const rutaDocumento = (empresaId: string, documentoId: string) =>
  `/gestion/empresas/${empresaId}/documentos/${documentoId}`;

export const rutaTramite = (tramiteId: string) => `/gestion/tramites/${tramiteId}`;

export function rutaNuevaInspeccion(params: {
  empresa?: string | null;
  establecimiento?: string | null;
  certificado?: string | null;
  tipo?: string;
}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  return `/gestion/inspecciones/nueva${sp.size ? `?${sp}` : ""}`;
}
