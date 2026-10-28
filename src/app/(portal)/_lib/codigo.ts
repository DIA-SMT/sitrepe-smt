/**
 * Códigos verificables de un certificado:
 *  - Código del QR: 12 caracteres hexadecimales en tres grupos (XXXX-XXXX-XXXX).
 *  - Sello de timbrado: SA-AAAA-NNNNNN (el número se rellena a 6 dígitos y puede crecer).
 * Funciones puras, usables en cliente y servidor.
 */

const QR = /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/;
const SELLO = /^SA-\d{4}-\d{1,8}$/;

/** Ejemplo para placeholders y textos de ayuda. */
export const EJEMPLO_CODIGO = "7F3A-21C9-B04E";
export const EJEMPLO_SELLO = "SA-2026-000123";

/**
 * Normaliza lo que escribe o pega la persona: mayúsculas, sin espacios, guiones tipográficos,
 * URL completa del QR, código sin guiones y la letra O confundida con el cero.
 */
export function normalizarCodigo(valor: string): string {
  let texto = valor.trim();
  const url = texto.match(/\/verificar\/([^/?#\s]+)/i);
  if (url) {
    try {
      texto = decodeURIComponent(url[1]);
    } catch {
      texto = url[1];
    }
  }
  let limpio = texto
    .toUpperCase()
    .replace(/[‐-―−_]/g, "-")
    .replace(/\s+/g, "");

  if (limpio.startsWith("SA")) {
    const digitos = limpio.slice(2).replace(/-/g, "");
    if (/^\d{5,12}$/.test(digitos)) return `SA-${digitos.slice(0, 4)}-${digitos.slice(4)}`;
    return limpio;
  }

  limpio = limpio.replace(/O/g, "0");
  const hex = limpio.replace(/-/g, "");
  if (/^[0-9A-F]{12}$/.test(hex)) return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8)}`;
  return limpio;
}

/** ¿Tiene alguno de los dos formatos válidos? */
export function esCodigoValido(codigo: string): boolean {
  return QR.test(codigo) || SELLO.test(codigo);
}
