/** Grupos del Anexo de la Ord. 2681/98 (mismo orden y texto que el CHECK de `rubros.grupo`). */
export const GRUPOS_RUBRO = [
  "Comercio",
  "Cultura y esparcimiento",
  "Educación",
  "Residencia",
  "Sanidad",
  "Servicios",
  "Transporte",
  "No tipificada",
] as const;

export type GrupoRubro = (typeof GRUPOS_RUBRO)[number];

export const DESCRIPCION_GRUPO: Record<GrupoRubro, string> = {
  Comercio: "Locales comerciales, depósitos y venta de alimentos.",
  "Cultura y esparcimiento": "Cines, teatros, clubes, salones y espacios recreativos.",
  Educación: "Establecimientos educativos de todos los niveles.",
  Residencia: "Viviendas colectivas, hoteles, hogares y residencias.",
  Sanidad: "Hospitales, clínicas, consultorios y establecimientos de salud.",
  Servicios: "Oficinas, talleres, obras y prestaciones de servicios.",
  Transporte: "Vehículos de transporte público y de carga, terminales.",
  "No tipificada":
    "Actividades que el Anexo no menciona: el área fija su periodicidad por similitud con un rubro tipificado.",
};

export const PESTANAS = ["aranceles", "rubros", "parametros", "feriados", "cuentas"] as const;
export type Pestana = (typeof PESTANAS)[number];

export function esGrupoRubro(valor: string | null | undefined): valor is GrupoRubro {
  return (GRUPOS_RUBRO as readonly string[]).includes(valor ?? "");
}
