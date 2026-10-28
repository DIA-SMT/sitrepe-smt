/**
 * URL de un listado en la página `pagina`, conservando los demás filtros de `searchParams`.
 * Se usa para volver a la última página válida cuando la pedida quedó vacía (p. ej. tras conciliar
 * el único pago de la última página).
 */
export function urlConPagina(
  ruta: string,
  params: Record<string, string | string[] | undefined>,
  pagina: number,
): string {
  const sp = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (clave === "pagina" || valor === undefined) continue;
    sp.set(clave, Array.isArray(valor) ? (valor[0] ?? "") : valor);
  }
  if (pagina > 1) sp.set("pagina", String(pagina));
  return `${ruta}${sp.size ? `?${sp}` : ""}`;
}
