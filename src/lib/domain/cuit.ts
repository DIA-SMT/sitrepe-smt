/** Normaliza un CUIT/CUIL a 20-12345678-9 (o null si no tiene 11 dígitos). */
export function normalizarCuit(valor: string | null | undefined): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length !== 11) return null;
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}

/** Valida formato y dígito verificador de un CUIT/CUIL. */
export function cuitValido(valor: string | null | undefined): boolean {
  const normalizado = normalizarCuit(valor);
  if (!normalizado) return false;
  const d = normalizado.replace(/\D/g, "").split("").map(Number);
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, p, i) => acc + p * d[i], 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  return verificador === d[10];
}
