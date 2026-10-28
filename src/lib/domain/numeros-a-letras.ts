const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const ESPECIALES = [
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE",
];
const VEINTIS = [
  "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE",
  "VEINTIOCHO", "VEINTINUEVE",
];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS",
  "OCHOCIENTOS", "NOVECIENTOS",
];

function decenas(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return ESPECIALES[n - 10];
  if (n < 30) return VEINTIS[n - 20];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d];
}

function centenas(n: number): string {
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  return [CENTENAS[c], decenas(resto)].filter(Boolean).join(" ");
}

function miles(n: number): string {
  const m = Math.floor(n / 1000);
  const resto = n % 1000;
  const parteMiles = m === 0 ? "" : m === 1 ? "MIL" : `${apocopar(centenas(m))} MIL`;
  return [parteMiles, centenas(resto)].filter(Boolean).join(" ");
}

/** "UNO" → "UN" delante de "MIL" / "MILLONES" (veintiún, treinta y un...). */
function apocopar(texto: string): string {
  return texto.replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN");
}

/** Convierte un entero (0 a 999.999.999.999) a letras en mayúsculas. */
export function enteroALetras(n: number): string {
  if (!Number.isFinite(n) || n < 0) throw new Error("Número inválido");
  n = Math.floor(n);
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1_000_000);
  const resto = n % 1_000_000;
  const parteMillones =
    millones === 0 ? "" : millones === 1 ? "UN MILLÓN" : `${apocopar(miles(millones))} MILLONES`;
  return [parteMillones, miles(resto)].filter(Boolean).join(" ").trim();
}

/**
 * Importe en letras para notas y rendiciones (evita las diferencias entre
 * importes en números y en letras que se producen al redactar a mano).
 * 5497 → "PESOS CINCO MIL CUATROCIENTOS NOVENTA Y SIETE CON 00/100"
 */
export function pesosEnLetras(importe: number | string): string {
  const valor = Math.round(Number(importe) * 100) / 100;
  const entero = Math.floor(valor);
  const centavos = Math.round((valor - entero) * 100);
  return `PESOS ${enteroALetras(entero)} CON ${String(centavos).padStart(2, "0")}/100`;
}
