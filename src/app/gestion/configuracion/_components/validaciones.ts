/** Validaciones y metadatos de la configuración, compartidos entre el servidor y los formularios. */

const PESOS_BLOQUE_1 = [7, 1, 3, 9, 7, 1, 3];
const PESOS_BLOQUE_2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];

function digitoVerificador(digitos: string, pesos: number[]): number {
  const suma = pesos.reduce((acc, peso, i) => acc + Number(digitos[i]) * peso, 0);
  return (10 - (suma % 10)) % 10;
}

/**
 * CBU argentino: 22 dígitos en dos bloques (entidad + sucursal + DV, y cuenta + DV),
 * cada uno con su dígito verificador (algoritmo del BCRA).
 */
export function cbuValido(cbu: string): boolean {
  if (!/^\d{22}$/.test(cbu)) return false;
  const bloque1 = cbu.slice(0, 8);
  const bloque2 = cbu.slice(8);
  return (
    digitoVerificador(bloque1, PESOS_BLOQUE_1) === Number(bloque1[7]) &&
    digitoVerificador(bloque2, PESOS_BLOQUE_2) === Number(bloque2[13])
  );
}

export type ClaveParametro =
  | "antelacion_min_horas"
  | "antelacion_max_horas"
  | "vencimiento_tanque_dias"
  | "dias_alerta_vencimiento"
  | "email_contacto"
  | "domicilio_atencion"
  | "horario_atencion";

export type MetaParametro = {
  etiqueta: string;
  descripcion: string;
  tipo: "entero" | "texto" | "email";
  unidad?: string;
  min?: number;
  max?: number;
  /** Valor de referencia normativo (se muestra como ayuda). */
  referencia?: string;
};

export const PARAMETROS_CONOCIDOS: Record<ClaveParametro, MetaParametro> = {
  antelacion_min_horas: {
    etiqueta: "Antelación mínima",
    descripcion: "Antelación mínima para declarar un servicio (Art. 9.º a, Ord. 2681/98)",
    tipo: "entero",
    unidad: "horas",
    min: 0,
    max: 720,
    referencia: "La ordenanza fija 24 horas.",
  },
  antelacion_max_horas: {
    etiqueta: "Antelación máxima",
    descripcion: "Antelación máxima para declarar un servicio (Art. 9.º a, Ord. 2681/98)",
    tipo: "entero",
    unidad: "horas",
    min: 1,
    max: 720,
    referencia: "La ordenanza fija 48 horas.",
  },
  vencimiento_tanque_dias: {
    etiqueta: "Vigencia de la limpieza de tanques",
    descripcion: "Vigencia del certificado de limpieza de tanques (Ord. 2004/92 t.o. Ord. 3098/01)",
    tipo: "entero",
    unidad: "días",
    min: 1,
    max: 730,
    referencia: "Semestral: 180 días.",
  },
  dias_alerta_vencimiento: {
    etiqueta: "Alerta de vencimiento",
    descripcion: 'Días previos al vencimiento en que un certificado figura "por vencer"',
    tipo: "entero",
    unidad: "días",
    min: 1,
    max: 180,
  },
  email_contacto: {
    etiqueta: "Correo de contacto",
    descripcion: "Correo de la Dirección de Salud Ambiental",
    tipo: "email",
  },
  domicilio_atencion: {
    etiqueta: "Domicilio de atención",
    descripcion: "Lugar de presentación",
    tipo: "texto",
  },
  horario_atencion: {
    etiqueta: "Horario de atención",
    descripcion: "Horario de atención al público",
    tipo: "texto",
  },
};

export const CLAVES_PARAMETRO = Object.keys(PARAMETROS_CONOCIDOS) as ClaveParametro[];

export function esClaveParametro(clave: string): clave is ClaveParametro {
  return clave in PARAMETROS_CONOCIDOS;
}
