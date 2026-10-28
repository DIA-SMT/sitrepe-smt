import type { Enums, Json } from "@/lib/supabase/database.types";

/**
 * Ítems a verificar en cada tipo de inspección. Se guardan en
 * `inspecciones.checklist` como { clave: true (cumple) | false (no cumple) };
 * los ítems "no aplica" no se guardan.
 */
export type ItemChecklist = { clave: string; label: string; ayuda?: string };

type TipoInspeccion = Enums<"tipo_inspeccion">;

const MUESTREO: ItemChecklist[] = [
  { clave: "tecnico_presente", label: "Técnico responsable presente", ayuda: "Asesor o representante técnico habilitado (Art. 5.º)." },
  { clave: "epp", label: "Personal con EPP completo", ayuda: "Máscara, guantes, antiparras y ropa de protección." },
  { clave: "productos_declarados", label: "Productos coinciden con lo declarado", ayuda: "Comparalos con la planilla y el certificado." },
  { clave: "envases_rotulados", label: "Envases rotulados", ayuda: "Etiqueta original con registro ANMAT o SENASA." },
  { clave: "aviso_reingreso", label: "Se informó el plazo de reingreso", ayuda: "El cliente conoce cuándo puede volver a usar el ambiente." },
];

/** Art. 7.º: equipo mínimo, oficina y depósito exclusivo. */
const DEPOSITO: ItemChecklist[] = [
  { clave: "carnet_sanidad", label: "Titular con carnet de sanidad vigente" },
  { clave: "oficina", label: "Oficina en el domicilio declarado" },
  { clave: "deposito_exclusivo", label: "Depósito exclusivo de productos químicos", ayuda: "Espacio separado, ventilado y sin alimentos." },
  { clave: "mochila_pulverizadora", label: "Mochila pulverizadora en condiciones" },
  { clave: "equipo_seguridad", label: "Equipo completo de seguridad" },
  { clave: "productos_rotulados", label: "Productos rotulados y registrados", ayuda: "Con registro ANMAT o SENASA y dentro de la memoria técnica." },
];

const VENCIMIENTO: ItemChecklist[] = [
  { clave: "certificado_exhibido", label: "Exhibe el certificado de fumigación" },
  { clave: "certificado_vigente", label: "El certificado está vigente", ayuda: "Verificalo escaneando el QR." },
  { clave: "empresa_habilitada", label: "Lo emitió una empresa habilitada" },
];

const TANQUE: ItemChecklist[] = [
  { clave: "tanque_certificado", label: "Certificado de limpieza de tanques vigente", ayuda: "Cada 180 días (Ord. 2004/92)." },
  { clave: "analisis_agua", label: "Análisis bacteriológico y físico-químico del agua" },
];

const DENUNCIA: ItemChecklist[] = [
  { clave: "hechos_no_constatados", label: "No se constatan los hechos denunciados" },
  { clave: "certificado_exhibido", label: "Exhibe certificado vigente" },
  { clave: "empresa_habilitada", label: "El servicio lo realizó una empresa habilitada" },
  { clave: "envases_correctos", label: "Sin envases ni residuos descartados en forma indebida" },
];

const REINSPECCION: ItemChecklist[] = [
  { clave: "observaciones_subsanadas", label: "Se subsanaron las observaciones anteriores" },
  { clave: "certificado_exhibido", label: "Exhibe certificado vigente" },
  { clave: "documentacion_presentada", label: "Presentó la documentación intimada" },
];

export function checklistPara(tipo: TipoInspeccion, opciones: { tieneTanque?: boolean } = {}): ItemChecklist[] {
  switch (tipo) {
    case "muestreo_servicio":
      return MUESTREO;
    case "deposito_anual":
    case "habilitacion":
      return DEPOSITO;
    case "control_vencimiento":
      return opciones.tieneTanque ? [...VENCIMIENTO, ...TANQUE] : VENCIMIENTO;
    case "denuncia":
      return DENUNCIA;
    case "reinspeccion":
      return opciones.tieneTanque ? [...REINSPECCION, ...TANQUE] : REINSPECCION;
  }
}

/** Etiquetas de todas las claves conocidas (para mostrar checklists ya guardados). */
const ETIQUETAS: Record<string, string> = Object.fromEntries(
  [...MUESTREO, ...DEPOSITO, ...VENCIMIENTO, ...TANQUE, ...DENUNCIA, ...REINSPECCION].map((i) => [i.clave, i.label]),
);

export function etiquetaItem(clave: string): string {
  const e = ETIQUETAS[clave];
  if (e) return e;
  const texto = clave.replace(/_/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Lee el jsonb guardado y devuelve los ítems respondidos. */
export function leerChecklist(valor: Json | null | undefined): { clave: string; cumple: boolean }[] {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return [];
  const items: { clave: string; cumple: boolean }[] = [];
  for (const [clave, v] of Object.entries(valor)) {
    if (typeof v === "boolean") items.push({ clave, cumple: v });
  }
  return items;
}

/** Descripción del alcance de cada tipo (encabezado del formulario). */
export const ALCANCE_TIPO: Record<TipoInspeccion, string> = {
  muestreo_servicio: "Inspección por muestreo en el lugar del servicio declarado (Art. 10.º b).",
  control_vencimiento: "Control del certificado exhibido en el establecimiento: vigencia y empresa habilitada.",
  deposito_anual: "Inspección anual de oficina y depósito de la empresa (Arts. 6.º, 7.º y 10.º d).",
  habilitacion: "Inspección previa a la habilitación: oficina, depósito y equipo mínimo (Arts. 4.º y 7.º).",
  denuncia: "Verificación en el lugar de los hechos denunciados por un vecino.",
  reinspeccion: "Nueva visita para verificar que se subsanaron las observaciones.",
};
