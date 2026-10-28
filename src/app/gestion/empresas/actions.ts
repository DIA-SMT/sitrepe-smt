"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { cuitValido, normalizarCuit } from "@/lib/domain/cuit";
import { hoyISO } from "@/lib/domain/formato";
import { Constants, type Enums, type TablesUpdate } from "@/lib/supabase/database.types";
import { createClient, type SupabaseServer } from "@/lib/supabase/server";

/* Solo Administración y Control de Empresas editan el registro (RLS: puede_controlar). */
const ROLES_EDICION = ["admin", "control"] as const;

type EstadoEmpresa = Enums<"estado_empresa">;
const ESTADOS_ALTA: EstadoEmpresa[] = ["en_tramite", "habilitada", "observada", "suspendida"];
const ESTADOS_EDICION: EstadoEmpresa[] = ["habilitada", "observada", "suspendida", "baja"];

/* --- Esquemas ------------------------------------------------------------------ */

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Usá como máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

const fechaOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .pipe(z.iso.date({ message: "Ingresá una fecha válida." }).nullable());

const casilla = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

/** Resolución DSA (000/DSA/AAAA, se completa con ceros) o habilitación comercial (N/SHN/AAAA). */
const numeroResolucion = (sufijo: "DSA" | "SHN") =>
  textoOpcional(40).transform((valor, ctx) => {
    if (!valor) return null;
    const limpio = valor
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/^RES(OLUCI[OÓ]N)?\.?(N[º°O]?\.?)?/, "");
    const m = limpio.match(new RegExp(`^(\\d{1,6})/${sufijo}/(\\d{4})$`));
    if (!m || Number(m[2]) < 1990 || Number(m[2]) > 2100) {
      ctx.addIssue({
        code: "custom",
        message: sufijo === "DSA" ? "Usá el formato 000/DSA/AAAA (p. ej. 070/DSA/2026)." : "Usá el formato N/SHN/AAAA (p. ej. 9256/SHN/2025).",
      });
      return z.NEVER;
    }
    const numero = sufijo === "DSA" ? m[1].padStart(3, "0") : String(Number(m[1]));
    return `${numero}/${sufijo}/${m[2]}`;
  });

const esquemaEmpresa = z
  .object({
    numero_registro: z
      .string()
      .trim()
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        const limpio = v.replace(/^n\.?\s*[º°o]?\.?\s*/i, "");
        if (!/^\d{1,6}$/.test(limpio) || Number(limpio) <= 0) {
          ctx.addIssue({ code: "custom", message: "Ingresá un número entero mayor que cero." });
          return z.NEVER;
        }
        return Number(limpio);
      }),
    nombre_comercial: z.string().trim().min(2, "Ingresá el nombre comercial.").max(200, "Usá como máximo 200 caracteres."),
    titular: textoOpcional(200),
    tipo_persona: z.enum(["humana", "juridica"], { message: "Elegí el tipo de persona." }),
    cuit: z
      .string()
      .trim()
      .transform((valor, ctx) => {
        const cuit = normalizarCuit(valor);
        if (!cuit) {
          ctx.addIssue({ code: "custom", message: "Ingresá un CUIT de 11 dígitos (20-12345678-9)." });
          return z.NEVER;
        }
        return cuit;
      }),
    email: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.toLowerCase() : null))
      .pipe(z.email("Ingresá un correo válido.").nullable()),
    telefono: textoOpcional(60),
    domicilio_oficina: textoOpcional(200),
    domicilio_deposito: textoOpcional(200),
    habilitacion_comercial: numeroResolucion("SHN"),
    resolucion_dsa: numeroResolucion("DSA"),
    habilita_fumigacion: casilla,
    habilita_tanques: casilla,
    estado: z.enum(Constants.public.Enums.estado_empresa, { message: "Elegí un estado." }),
    fecha_habilitacion: fechaOpcional,
    vencimiento_habilitacion: fechaOpcional,
    ultima_inspeccion_deposito: fechaOpcional,
    observaciones: textoOpcional(2000),
  })
  .superRefine((d, ctx) => {
    if (!d.habilita_fumigacion && !d.habilita_tanques) {
      ctx.addIssue({ code: "custom", path: ["habilita_fumigacion"], message: "Indicá al menos una actividad habilitada." });
    }
    if (d.estado === "habilitada" && !d.vencimiento_habilitacion) {
      ctx.addIssue({
        code: "custom",
        path: ["vencimiento_habilitacion"],
        message: "Una empresa habilitada necesita la fecha de vencimiento (renovación anual, Art. 8.º).",
      });
    }
    if (d.fecha_habilitacion && d.vencimiento_habilitacion && d.vencimiento_habilitacion < d.fecha_habilitacion) {
      ctx.addIssue({
        code: "custom",
        path: ["vencimiento_habilitacion"],
        message: "El vencimiento no puede ser anterior a la fecha de habilitación.",
      });
    }
    if (d.ultima_inspeccion_deposito && d.ultima_inspeccion_deposito > hoyISO()) {
      ctx.addIssue({ code: "custom", path: ["ultima_inspeccion_deposito"], message: "La inspección no puede tener fecha futura." });
    }
  });

type DatosEmpresa = z.infer<typeof esquemaEmpresa>;

/** Columnas con permiso de escritura (ver 20261026000300_seguridad.sql). */
function filaEmpresa(d: DatosEmpresa): TablesUpdate<"empresas"> {
  return {
    numero_registro: d.numero_registro,
    nombre_comercial: d.nombre_comercial,
    titular: d.titular,
    tipo_persona: d.tipo_persona,
    cuit: d.cuit,
    email: d.email,
    telefono: d.telefono,
    domicilio_oficina: d.domicilio_oficina,
    domicilio_deposito: d.domicilio_deposito,
    habilitacion_comercial: d.habilitacion_comercial,
    resolucion_dsa: d.resolucion_dsa,
    habilita_fumigacion: d.habilita_fumigacion,
    habilita_tanques: d.habilita_tanques,
    estado: d.estado,
    fecha_habilitacion: d.fecha_habilitacion,
    vencimiento_habilitacion: d.vencimiento_habilitacion,
    ultima_inspeccion_deposito: d.ultima_inspeccion_deposito,
    observaciones: d.observaciones,
  };
}

/** Busca otras empresas con el mismo CUIT, resolución DSA o N.º de registro (valores únicos). */
async function buscarDuplicados(
  supabase: SupabaseServer,
  d: DatosEmpresa,
  excluirId?: string,
): Promise<Record<string, string[]>> {
  const condiciones = [`cuit.eq.${d.cuit}`];
  if (d.resolucion_dsa) condiciones.push(`resolucion_dsa.eq."${d.resolucion_dsa}"`);
  if (d.numero_registro) condiciones.push(`numero_registro.eq.${d.numero_registro}`);
  let consulta = supabase
    .from("empresas")
    .select("id, nombre_comercial, numero_registro, cuit, resolucion_dsa")
    .or(condiciones.join(","));
  if (excluirId) consulta = consulta.neq("id", excluirId);
  const { data } = await consulta;

  const errores: Record<string, string[]> = {};
  for (const e of data ?? []) {
    const ref = `${e.nombre_comercial}${e.numero_registro ? ` (N.º ${e.numero_registro})` : ""}`;
    if (e.cuit === d.cuit) errores.cuit = [`Este CUIT ya está registrado para ${ref}.`];
    if (d.resolucion_dsa && e.resolucion_dsa === d.resolucion_dsa) {
      errores.resolucion_dsa = [`La Res. ${d.resolucion_dsa} ya está asignada a ${ref}: la resolución es única por empresa.`];
    }
    if (d.numero_registro && e.numero_registro === d.numero_registro) {
      errores.numero_registro = [`El N.º ${d.numero_registro} ya corresponde a ${ref}.`];
    }
  }
  return errores;
}

/** Traduce violaciones de unicidad (23505) a errores por campo. */
function falloPorDuplicado(error: { code?: string; message?: string; details?: string | null }): EstadoAccion<never> {
  const texto = `${error.message ?? ""} ${error.details ?? ""}`;
  if (error.code === "23505") {
    if (texto.includes("resolucion_dsa")) {
      return fallo("La resolución DSA ya está asignada a otra empresa.", {
        resolucion_dsa: ["Esta resolución ya está asignada a otra empresa: debe ser única."],
      });
    }
    if (texto.includes("cuit")) return fallo("El CUIT ya está registrado.", { cuit: ["Este CUIT ya está registrado en el padrón."] });
    if (texto.includes("numero_registro")) {
      return fallo("El N.º de registro ya está en uso.", { numero_registro: ["Este número ya corresponde a otra empresa."] });
    }
  }
  return fallo(mensajeError(error, "No se pudieron guardar los datos de la empresa."));
}

/**
 * Resuelve los trámites pendientes que piden lo mismo que se acaba de revisar en el legajo (alta de
 * producto o cambio de asesor técnico), para que no queden en la bandeja como pendientes. Se resuelven
 * por la RPC (que además aplica los efectos: p. ej. la baja del técnico reemplazado).
 * Devuelve el texto que se agrega al mensaje de resultado ("" si no había trámites vinculados).
 */
async function resolverTramitesVinculados(
  supabase: SupabaseServer,
  tipo: "alta_producto" | "cambio_tecnico",
  clave: "empresa_producto_id" | "tecnico_id",
  referenciaId: string,
  empresaId: string,
  decision: "aprobar" | "rechazar",
  observaciones: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .from("tramites")
    .select("id, codigo")
    .eq("empresa_id", empresaId)
    .eq("tipo", tipo)
    .in("estado", ["presentado", "observado"])
    .filter(`datos->>${clave}`, "eq", referenciaId);
  if (error) return " No se pudo verificar si había trámites vinculados: revisá la bandeja de trámites.";

  const fallidos: string[] = [];
  for (const t of data ?? []) {
    const { error: errorRpc } = await supabase.rpc("resolver_tramite", {
      p_tramite: t.id,
      p_decision: decision,
      p_observaciones:
        observaciones ?? (decision === "aprobar" ? "Aprobado al revisar el legajo." : "Rechazado al revisar el legajo."),
    });
    if (errorRpc) fallidos.push(t.codigo ?? "trámite");
  }
  if (fallidos.length > 0) {
    return ` No se pudo resolver ${fallidos.join(", ")}: resolvelo desde la bandeja de trámites.`;
  }
  const resueltos = data ?? [];
  if (resueltos.length === 0) return "";
  const verbo = decision === "aprobar" ? "aprobó" : "rechazó";
  const cuales = resueltos.length === 1 ? "el trámite vinculado" : `los ${resueltos.length} trámites vinculados`;
  return ` También se ${verbo} ${cuales} (${resueltos.map((t) => t.codigo ?? "s/código").join(", ")}).`;
}

function revalidarEmpresa(id?: string) {
  revalidatePath("/gestion/empresas");
  revalidatePath("/gestion");
  revalidatePath("/empresas");
  if (id) {
    revalidatePath(`/gestion/empresas/${id}`);
    revalidatePath(`/empresas/${id}`);
  }
}

/* --- Empresas ------------------------------------------------------------------- */

export async function crearEmpresa(_prev: EstadoAccion<{ id: string }>, formData: FormData): Promise<EstadoAccion<{ id: string }>> {
  await requerirStaff(ROLES_EDICION);
  const parsed = esquemaEmpresa.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  if (!ESTADOS_ALTA.includes(d.estado)) {
    return fallo("Revisá los datos marcados.", { estado: ["Elegí un estado válido para el alta."] });
  }
  if (!cuitValido(d.cuit)) {
    return fallo("Revisá los datos marcados.", { cuit: ["El CUIT no es válido: revisá el dígito verificador."] });
  }

  const supabase = await createClient();
  const duplicados = await buscarDuplicados(supabase, d);
  if (Object.keys(duplicados).length > 0) return fallo("Hay datos que ya están registrados en el padrón.", duplicados);

  const fila = filaEmpresa(d);
  const { data, error } = await supabase
    .from("empresas")
    .insert({ ...fila, nombre_comercial: d.nombre_comercial, cuit: d.cuit })
    .select("id")
    .single();
  if (error) return falloPorDuplicado(error);

  revalidarEmpresa(data.id);
  return exito(`${d.nombre_comercial} quedó registrada en el padrón.`, { id: data.id });
}

export async function actualizarEmpresa(
  _prev: EstadoAccion<{ id: string }>,
  formData: FormData,
): Promise<EstadoAccion<{ id: string }>> {
  await requerirStaff(ROLES_EDICION);
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return fallo("No se indicó la empresa a modificar.");
  const parsed = esquemaEmpresa.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();
  const { data: actual, error: errorActual } = await supabase
    .from("empresas")
    .select("id, cuit, estado")
    .eq("id", id.data)
    .maybeSingle();
  if (errorActual) return fallo(mensajeError(errorActual));
  if (!actual) return fallo("No se encontró la empresa.");

  if (!ESTADOS_EDICION.includes(d.estado) && d.estado !== actual.estado) {
    return fallo("Revisá los datos marcados.", {
      estado: ["El estado puede cambiarse a habilitada, observada, suspendida o baja."],
    });
  }
  if (d.cuit !== actual.cuit && !cuitValido(d.cuit)) {
    return fallo("Revisá los datos marcados.", { cuit: ["El CUIT no es válido: revisá el dígito verificador."] });
  }

  const duplicados = await buscarDuplicados(supabase, d, id.data);
  if (Object.keys(duplicados).length > 0) return fallo("Hay datos que ya están registrados para otra empresa.", duplicados);

  const { data, error } = await supabase.from("empresas").update(filaEmpresa(d)).eq("id", id.data).select("id").maybeSingle();
  if (error) return falloPorDuplicado(error);
  if (!data) return fallo("No tenés permisos para modificar esta empresa.");

  revalidarEmpresa(id.data);
  revalidatePath("/gestion/tramites", "layout");
  return exito("Los datos de la empresa se guardaron.", { id: id.data });
}

/* --- Técnicos ------------------------------------------------------------------- */

const esquemaTecnico = z
  .object({
    id: z.uuid({ message: "Técnico inválido." }),
    decision: z.enum(["aprobar", "rechazar", "baja"], { message: "Acción inválida." }),
    motivo: textoOpcional(1000),
  })
  .superRefine((d, ctx) => {
    if (d.decision === "rechazar" && !d.motivo) {
      ctx.addIssue({ code: "custom", path: ["motivo"], message: "Indicá el motivo del rechazo." });
    }
  });

export async function revisarTecnico(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES_EDICION);
  const parsed = esquemaTecnico.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, decision, motivo } = parsed.data;

  const supabase = await createClient();
  const { data: tecnico, error: errorTecnico } = await supabase
    .from("tecnicos")
    .select("id, empresa_id, estado, nombre, apellido, fecha_alta, observaciones")
    .eq("id", id)
    .maybeSingle();
  if (errorTecnico) return fallo(mensajeError(errorTecnico));
  if (!tecnico) return fallo("No se encontró el asesor técnico.");

  const hoy = hoyISO();
  let cambios: TablesUpdate<"tecnicos">;
  let mensaje: string;
  const nombre = `${tecnico.nombre} ${tecnico.apellido}`;
  switch (decision) {
    case "aprobar":
      if (tecnico.estado === "aprobado") return fallo(`${nombre} ya está aprobado.`);
      cambios = { estado: "aprobado", fecha_alta: tecnico.fecha_alta ?? hoy, fecha_baja: null, observaciones: motivo ?? tecnico.observaciones };
      mensaje = `${nombre} quedó aprobado como asesor técnico.`;
      break;
    case "rechazar":
      if (tecnico.estado !== "pendiente") return fallo("Solo pueden rechazarse asesores pendientes de aprobación.");
      cambios = { estado: "rechazado", observaciones: motivo };
      mensaje = `Se rechazó a ${nombre}.`;
      break;
    case "baja":
      if (tecnico.estado !== "aprobado") return fallo("Solo pueden darse de baja asesores aprobados.");
      cambios = { estado: "baja", fecha_baja: hoy, observaciones: motivo ?? tecnico.observaciones };
      mensaje = `${nombre} fue dado de baja: ya no puede firmar certificados.`;
      break;
  }

  const { data, error } = await supabase.from("tecnicos").update(cambios).eq("id", id).select("id").maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo actualizar el asesor técnico."));
  if (!data) return fallo("No tenés permisos para modificar este asesor técnico.");

  // Si la empresa lo propuso con un trámite de cambio de asesor, se resuelve en el mismo sentido
  // (al aprobar, la RPC también da de baja al asesor que reemplaza).
  const vinculados =
    decision === "baja"
      ? ""
      : await resolverTramitesVinculados(supabase, "cambio_tecnico", "tecnico_id", id, tecnico.empresa_id, decision, motivo);

  revalidarEmpresa(tecnico.empresa_id);
  revalidatePath("/gestion/tramites", "layout");
  revalidatePath("/prestador", "layout");
  return exito(`${mensaje}${vinculados}`);
}

/* --- Memoria técnica --------------------------------------------------------------- */

const esquemaMemoria = z
  .object({
    id: z.uuid({ message: "Producto inválido." }),
    decision: z.enum(["aprobar", "rechazar"], { message: "Acción inválida." }),
    observaciones: textoOpcional(1000),
  })
  .superRefine((d, ctx) => {
    if (d.decision === "rechazar" && !d.observaciones) {
      ctx.addIssue({ code: "custom", path: ["observaciones"], message: "Indicá el motivo del rechazo." });
    }
  });

export async function revisarMemoria(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirStaff(ROLES_EDICION);
  const parsed = esquemaMemoria.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, decision, observaciones } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresa_productos")
    .update({
      estado: decision === "aprobar" ? "aprobado" : "rechazado",
      observaciones,
      revisado_por: sesion.userId,
      revisado_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("empresa_id")
    .maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo actualizar la memoria técnica."));
  if (!data) return fallo("No se encontró el producto de la memoria técnica o no tenés permisos.");

  // La propuesta suele llegar con un trámite de alta de producto: se resuelve en el mismo sentido.
  const vinculados = await resolverTramitesVinculados(
    supabase,
    "alta_producto",
    "empresa_producto_id",
    id,
    data.empresa_id,
    decision,
    observaciones,
  );

  revalidarEmpresa(data.empresa_id);
  revalidatePath("/gestion/productos");
  revalidatePath("/gestion/tramites", "layout");
  revalidatePath("/prestador", "layout");
  return exito(
    `${
      decision === "aprobar"
        ? "Producto aprobado: la empresa ya puede declararlo en sus certificados."
        : "Producto rechazado en la memoria técnica."
    }${vinculados}`,
  );
}

/* --- Documentos del legajo ------------------------------------------------------------ */

const esquemaDocumento = z
  .object({
    id: z.uuid({ message: "Documento inválido." }),
    decision: z.enum(["aprobar", "rechazar"], { message: "Acción inválida." }),
    vence: fechaOpcional,
    observaciones: textoOpcional(1000),
  })
  .superRefine((d, ctx) => {
    if (d.decision === "rechazar" && !d.observaciones) {
      ctx.addIssue({ code: "custom", path: ["observaciones"], message: "Indicá el motivo del rechazo." });
    }
    if (d.decision === "aprobar" && d.vence && d.vence < hoyISO()) {
      ctx.addIssue({ code: "custom", path: ["vence"], message: "La fecha de vencimiento ya pasó: el documento no puede aprobarse." });
    }
  });

export async function revisarDocumento(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirStaff(ROLES_EDICION);
  const parsed = esquemaDocumento.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, decision, vence, observaciones } = parsed.data;

  const cambios: TablesUpdate<"documentos"> = {
    estado: decision === "aprobar" ? "aprobado" : "rechazado",
    observaciones,
    revisado_por: sesion.userId,
    revisado_at: new Date().toISOString(),
  };
  if (decision === "aprobar") cambios.vence = vence;

  const supabase = await createClient();
  const { data, error } = await supabase.from("documentos").update(cambios).eq("id", id).select("empresa_id").maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo actualizar el documento."));
  if (!data) return fallo("No se encontró el documento o no tenés permisos.");

  revalidarEmpresa(data.empresa_id);
  revalidatePath("/gestion/tramites", "layout");
  return exito(decision === "aprobar" ? "Documento aprobado." : "Documento rechazado: la empresa verá el motivo.");
}
