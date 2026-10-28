/** Código completo de una denuncia: correlativo + sufijo aleatorio (DEN-AAAA-NNNNNN-XXXXXXXX). */
export const CODIGO_DENUNCIA = /^DEN-\d{4}-\d{6,8}-[0-9A-F]{8}$/;

/** Acepta "den-2026-12-7f3a9c21", "DEN 2026 000012 7F3A9C21", etc. y devuelve DEN-2026-000012-7F3A9C21. */
export function normalizarCodigoDenuncia(valor: string): string {
  const limpio = valor.trim().toUpperCase().replace(/\s+/g, "-");
  const m = limpio.match(/^DEN-*(\d{4})-*(\d{1,8})-*([0-9A-F]{8})$/);
  return m ? `DEN-${m[1]}-${m[2].padStart(6, "0")}-${m[3]}` : limpio;
}
