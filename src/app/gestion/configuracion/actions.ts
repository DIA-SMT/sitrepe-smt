"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { Constants, type Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { GRUPOS_RUBRO } from "./_components/constantes";
import { cbuValido, PARAMETROS_CONOCIDOS } from "./_components/validaciones";

/* La configuración la edita solo Administración (RLS: es_admin). */
const SOLO_ADMIN = ["admin"] as const;

/* --- Utilidades de validación -------------------------------------------------- */

const casilla = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

const numero = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\./g, "").replace(",", ".") : v);
const numeroDecimal = (v: unknown) => (typeof v === "string" ? v.trim().replace(",", ".") : v);

const fecha = (mensaje: string) => z.iso.date({ message: mensaje });

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Usá como máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

const importe = z.preprocess(
  numeroDecimal,
  z.coerce
    .number({ message: "Ingresá el importe." })
    .min(0, "El importe no puede ser negativo.")
    .max(1_000_000_000, "Revisá el importe.")
    // Tolerancia para la representación binaria (p. ej. 0,1 + 0,2): más de dos decimales no se acepta.
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Usá hasta dos decimales."),
);

/** Día anterior a una fecha 'AAAA-MM-DD'. */
function diaAnterior(fechaISO: string): string {
  const [a, m, d] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d - 1, 12)).toISOString().slice(0, 10);
}

function formatoFecha(fechaISO: string): string {
  const [a, m, d] = fechaISO.split("-");
  return `${d}/${m}/${a}`;
}

function revalidarConfiguracion() {
  revalidatePath("/gestion/configuracion");
}

/* =============================================================================
 * Aranceles (Ordenanza Tarifaria)
 * ========================================================================== */

const esquemaVersion = z.object({
  codigo: z.string().trim().min(1, "Falta el concepto."),
  importe,
  ordenanza: z
    .string()
    .trim()
    .min(3, "Indicá la Ordenanza Tarifaria (p. ej. 5487/27).")
    .max(40, "Usá como máximo 40 caracteres."),
  articulo: z
    .string()
    .trim()
    .min(3, "Indicá el artículo, inciso y apartado.")
    .max(120, "Usá como máximo 120 caracteres."),
  unidad: z
    .string()
    .trim()
    .min(2, "Indicá la unidad (p. ej. por certificado).")
    .max(40, "Usá como máximo 40 caracteres."),
  cuenta_id: z.preprocess(
    numero,
    z.coerce.number({ message: "Elegí la cuenta recaudadora." }).int().positive("Elegí la cuenta recaudadora."),
  ),
  vigente_desde: fecha("Indicá desde cuándo rige el nuevo importe."),
});

/**
 * Nueva versión de un arancel: inserta el importe con su vigencia y cierra la versión
 * anterior el día previo (vigente_hasta). El historial se conserva.
 */
export async function nuevaVersionArancel(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(SOLO_ADMIN);
  const parsed = esquemaVersion.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();
  const { data: versiones, error: errorVersiones } = await supabase
    .from("aranceles")
    .select("*")
    .eq("codigo", d.codigo)
    .order("vigente_desde", { ascending: false });
  if (errorVersiones) return fallo(mensajeError(errorVersiones, "No se pudo obtener el arancel."));
  const ultima = versiones?.[0];
  if (!ultima) return fallo("El concepto ya no existe.");
  if (d.vigente_desde <= ultima.vigente_desde) {
    return fallo("Revisá los datos marcados.", {
      vigente_desde: [
        `Tiene que ser posterior al ${formatoFecha(ultima.vigente_desde)}, inicio de la última versión cargada.`,
      ],
    });
  }

  const { data: nueva, error } = await supabase
    .from("aranceles")
    .insert({
      codigo: ultima.codigo,
      concepto: ultima.concepto,
      unidad: d.unidad,
      cuenta_id: d.cuenta_id,
      ordenanza: d.ordenanza,
      articulo: d.articulo,
      importe: d.importe,
      vigente_desde: d.vigente_desde,
      activo: ultima.activo,
    })
    .select("id")
    .single();
  if (error) return fallo(mensajeError(error, "No se pudo cargar la nueva versión."));

  const hasta = diaAnterior(d.vigente_desde);
  const { error: errorCierre } = await supabase
    .from("aranceles")
    .update({ vigente_hasta: hasta })
    .eq("codigo", d.codigo)
    .neq("id", nueva.id)
    .lt("vigente_desde", d.vigente_desde)
    .or(`vigente_hasta.is.null,vigente_hasta.gt.${hasta}`);
  if (errorCierre) {
    // Sin el cierre, quedarían dos versiones vigentes a la vez: se deshace el alta.
    await supabase.from("aranceles").delete().eq("id", nueva.id);
    return fallo(mensajeError(errorCierre, "No se pudo cerrar la versión anterior; no se aplicaron cambios."));
  }

  revalidarConfiguracion();
  revalidatePath("/normativa");
  return exito(
    `Nuevo importe cargado. Rige desde el ${formatoFecha(d.vigente_desde)}; la versión anterior vale hasta el ${formatoFecha(hasta)}.`,
  );
}

const esquemaConcepto = esquemaVersion.omit({ codigo: true }).extend({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z][A-Z0-9_]{2,39}$/,
      "Usá de 3 a 40 letras mayúsculas, números o guiones bajos (p. ej. TIMBRADO_CERTIFICADO).",
    ),
  concepto: z.string().trim().min(3, "Escribí el nombre del concepto.").max(160, "Usá como máximo 160 caracteres."),
});

/** Alta de un concepto de cobro nuevo (primera versión). */
export async function nuevoConceptoArancel(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(SOLO_ADMIN);
  const parsed = esquemaConcepto.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();
  const { count, error: errorExiste } = await supabase
    .from("aranceles")
    .select("id", { count: "exact", head: true })
    .eq("codigo", d.codigo);
  if (errorExiste) return fallo(mensajeError(errorExiste, "No se pudo verificar el código."));
  if ((count ?? 0) > 0) {
    return fallo("Revisá los datos marcados.", {
      codigo: ["Ya existe un concepto con ese código: cargá una nueva versión."],
    });
  }

  const { error } = await supabase.from("aranceles").insert({
    codigo: d.codigo,
    concepto: d.concepto,
    unidad: d.unidad,
    cuenta_id: d.cuenta_id,
    ordenanza: d.ordenanza,
    articulo: d.articulo,
    importe: d.importe,
    vigente_desde: d.vigente_desde,
  });
  if (error) return fallo(mensajeError(error, "No se pudo crear el concepto."));
  revalidarConfiguracion();
  revalidatePath("/normativa");
  return exito(`Concepto "${d.concepto}" creado.`);
}

/** Da de baja o reactiva un concepto (todas sus versiones). Sin borrar: los pagos lo referencian. */
export async function cambiarEstadoConcepto(formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(SOLO_ADMIN);
  const parsed = z
    .object({ codigo: z.string().trim().min(1), activo: casilla })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { codigo, activo } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.from("aranceles").update({ activo }).eq("codigo", codigo).select("id");
  if (error) return fallo(mensajeError(error, "No se pudo cambiar el estado del concepto."));
  if (!data?.length) return fallo("El concepto ya no existe.");
  revalidarConfiguracion();
  revalidatePath("/normativa");
  return exito(activo ? "Concepto reactivado." : "Concepto dado de baja: ya no se puede liquidar.");
}

/* =============================================================================
 * Anexo de rubros (Ord. 2681/98)
 * ========================================================================== */

const esquemaRubro = z.object({
  id: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : numero(v)),
    z.coerce.number().int().positive().optional(),
  ),
  grupo: z.enum(GRUPOS_RUBRO, { message: "Elegí el grupo del Anexo." }),
  nombre: z.string().trim().min(3, "Escribí el nombre del rubro.").max(160, "Usá como máximo 160 caracteres."),
  periodicidad: z.enum(Constants.public.Enums.periodicidad, {
    message: "Elegí la periodicidad.",
  }),
  descripcion: textoOpcional(500),
  validado: casilla,
  activo: casilla,
});

/** Alta o edición de un rubro del Anexo (con `id`, edita). */
export async function guardarRubro(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(SOLO_ADMIN);
  const parsed = esquemaRubro.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, ...campos } = parsed.data;

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("rubros").update(campos).eq("id", id)
    : await supabase.from("rubros").insert(campos);
  if (error) {
    if (error.code === "23505") {
      return fallo("Revisá los datos marcados.", {
        nombre: ["Ya existe un rubro con ese nombre en el grupo."],
      });
    }
    return fallo(mensajeError(error, "No se pudo guardar el rubro."));
  }
  revalidarConfiguracion();
  return exito(id ? "Rubro actualizado." : `Rubro agregado al grupo ${campos.grupo}.`);
}

/** Marca un rubro como validado (o no) contra el texto original del Anexo. */
export async function cambiarValidacionRubro(formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(SOLO_ADMIN);
  const parsed = z
    .object({
      id: z.preprocess(numero, z.coerce.number().int().positive()),
      validado: casilla,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rubros")
    .update({ validado: parsed.data.validado })
    .eq("id", parsed.data.id)
    .select("nombre")
    .maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo actualizar el rubro."));
  if (!data) return fallo("El rubro ya no existe.");
  revalidarConfiguracion();
  return exito(
    parsed.data.validado
      ? `"${data.nombre}" validado contra el original.`
      : `"${data.nombre}" quedó pendiente de validación.`,
  );
}

/* =============================================================================
 * Parámetros operativos
 * ========================================================================== */

const entero = (min: number, max: number, nombre: string) =>
  z.preprocess(
    numero,
    z.coerce
      .number({ message: `Ingresá ${nombre}.` })
      .int(`${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} debe ser un número entero.`)
      .min(min, `El mínimo es ${min}.`)
      .max(max, `El máximo es ${max}.`),
  );

const esquemaParametros = z
  .object({
    antelacion_min_horas: entero(0, 720, "la antelación mínima"),
    antelacion_max_horas: entero(1, 720, "la antelación máxima"),
    vencimiento_tanque_dias: entero(1, 730, "los días de vigencia"),
    dias_alerta_vencimiento: entero(1, 180, "los días de alerta"),
    email_contacto: z.string().trim().toLowerCase().pipe(z.email("Ingresá un correo válido.")),
    domicilio_atencion: z
      .string()
      .trim()
      .min(3, "Indicá el domicilio de atención.")
      .max(200, "Usá como máximo 200 caracteres."),
    horario_atencion: z
      .string()
      .trim()
      .min(3, "Indicá el horario de atención.")
      .max(200, "Usá como máximo 200 caracteres."),
  })
  .superRefine((d, ctx) => {
    if (d.antelacion_max_horas <= d.antelacion_min_horas) {
      ctx.addIssue({
        code: "custom",
        path: ["antelacion_max_horas"],
        message: "La antelación máxima tiene que ser mayor que la mínima.",
      });
    }
  });

/** Actualiza los parámetros operativos (solo los que cambiaron). */
export async function guardarParametros(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(SOLO_ADMIN);
  const parsed = esquemaParametros.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await createClient();
  const { data: actuales, error: errorActuales } = await supabase
    .from("parametros")
    .select("clave, valor, descripcion");
  if (errorActuales) return fallo(mensajeError(errorActuales, "No se pudieron obtener los parámetros."));
  const porClave = new Map((actuales ?? []).map((p) => [p.clave, p]));

  const ahora = new Date().toISOString();
  const cambios = (Object.entries(parsed.data) as [keyof typeof parsed.data, string | number][])
    .filter(([clave, valor]) => JSON.stringify(porClave.get(clave)?.valor ?? null) !== JSON.stringify(valor))
    .map(([clave, valor]) => ({
      clave,
      valor: valor satisfies Json,
      descripcion: porClave.get(clave)?.descripcion ?? PARAMETROS_CONOCIDOS[clave]?.descripcion ?? null,
      updated_at: ahora,
    }));

  if (cambios.length === 0) return exito("No había cambios para guardar.");
  const { error } = await supabase.from("parametros").upsert(cambios, { onConflict: "clave" });
  if (error) return fallo(mensajeError(error, "No se pudieron guardar los parámetros."));
  revalidarConfiguracion();
  // Los plazos y datos de contacto se usan en la declaración, los vencimientos y el portal.
  revalidatePath("/", "layout");
  return exito(cambios.length === 1 ? "Parámetro actualizado." : `${cambios.length} parámetros actualizados.`);
}

/* =============================================================================
 * Feriados
 * ========================================================================== */

const esquemaFeriado = z.object({
  fecha: fecha("Indicá la fecha del feriado."),
  descripcion: z.string().trim().min(3, "Escribí qué se conmemora.").max(160, "Usá como máximo 160 caracteres."),
});

export async function agregarFeriado(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(SOLO_ADMIN);
  const parsed = esquemaFeriado.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("feriados").insert(parsed.data);
  if (error) {
    if (error.code === "23505")
      return fallo("Revisá los datos marcados.", {
        fecha: ["Ya hay un feriado cargado en esa fecha."],
      });
    return fallo(mensajeError(error, "No se pudo agregar el feriado."));
  }
  revalidarConfiguracion();
  return exito(`Feriado del ${formatoFecha(parsed.data.fecha)} agregado.`);
}

export async function eliminarFeriado(formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(SOLO_ADMIN);
  const parsed = z.object({ fecha: fecha("Fecha inválida.") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feriados")
    .delete()
    .eq("fecha", parsed.data.fecha)
    .select("fecha")
    .maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo quitar el feriado."));
  if (!data) return fallo("El feriado ya no existe.");
  revalidarConfiguracion();
  return exito(`Feriado del ${formatoFecha(parsed.data.fecha)} quitado.`);
}

/* =============================================================================
 * Cuentas recaudadoras
 * ========================================================================== */

const esquemaCuenta = z.object({
  id: z.preprocess(numero, z.coerce.number().int().positive("Cuenta inválida.")),
  nombre: z.string().trim().min(3, "Escribí el nombre de la cuenta.").max(160, "Usá como máximo 160 caracteres."),
  banco: z.string().trim().min(2, "Indicá el banco.").max(80, "Usá como máximo 80 caracteres."),
  numero_cuenta: z.string().trim().min(3, "Indicá el número de cuenta.").max(40, "Usá como máximo 40 caracteres."),
  cbu: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 22, "El CBU tiene 22 dígitos.")
    .refine(cbuValido, "El CBU no es válido: revisá los dígitos verificadores."),
  descripcion: textoOpcional(500),
  activo: casilla,
  medios_pago: z.array(z.enum(Constants.public.Enums.medio_pago)).min(1, "Elegí al menos un medio de pago."),
});

export async function guardarCuenta(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(SOLO_ADMIN);
  const parsed = esquemaCuenta.safeParse({
    ...Object.fromEntries(formData),
    medios_pago: formData.getAll("medios_pago"),
  });
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, ...campos } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cuentas_recaudadoras")
    .update(campos)
    .eq("id", id)
    .select("codigo")
    .maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo guardar la cuenta."));
  if (!data) return fallo("La cuenta ya no existe.");
  revalidarConfiguracion();
  revalidatePath("/prestador/pagos", "layout");
  return exito(`Cuenta ${data.codigo} actualizada.`);
}
