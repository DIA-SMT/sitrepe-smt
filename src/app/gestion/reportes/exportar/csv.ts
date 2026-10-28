/**
 * CSV para Excel en español (Argentina): UTF-8 con BOM, separador ";" y coma decimal.
 */

export type CeldaCsv = string | number | null | undefined;

const SEPARADOR = ";";
const BOM = "﻿";

/** Evita la inyección de fórmulas al abrir el archivo en una planilla de cálculo. */
function neutralizarFormula(texto: string): string {
  if (/^-?\d+(,\d+)?$/.test(texto)) return texto; // números ya formateados (pueden ser negativos)
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
}

/**
 * Códigos solo numéricos con ceros a la izquierda o de 12 dígitos o más (n.º de operación,
 * n.º de certificado): Excel los convertiría en número, perdería los ceros o los mostraría en
 * notación científica. Se exportan como texto con ="000123" (solo dígitos: sin riesgo de inyección).
 */
function esCodigoNumerico(texto: string): boolean {
  return /^\d+$/.test(texto) && (texto.length >= 12 || (texto.length > 1 && texto.startsWith("0")));
}

function celda(valor: CeldaCsv): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string" && esCodigoNumerico(valor)) return `"=""${valor}"""`;
  const texto = typeof valor === "number" ? String(valor) : neutralizarFormula(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Número con coma decimal y sin separador de miles (Excel es-AR lo interpreta como número). */
export function numeroCsv(valor: number | null | undefined, decimales = 0): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "";
  return valor.toFixed(decimales).replace(".", ",");
}

/** Arma el contenido del archivo: encabezados + filas. */
export function construirCsv(encabezados: string[], filas: CeldaCsv[][]): string {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(celda).join(SEPARADOR));
  return `${BOM}${lineas.join("\r\n")}\r\n`;
}

/** Nombre de archivo seguro (ASCII, minúsculas, guiones). */
export function nombreArchivo(...partes: string[]): string {
  const base = partes
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 120);
  return `${base || "reporte"}.csv`;
}

/** Respuesta de descarga del CSV. */
export function respuestaCsv(contenido: string, archivo: string): Response {
  return new Response(contenido, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${archivo}"; filename*=UTF-8''${encodeURIComponent(archivo)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
