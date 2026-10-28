"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirEmpresa } from "@/lib/auth";
import {
  buscarEstablecimientos as buscarEstablecimientosDatos,
  getAntelacion,
  esUuid,
} from "@/lib/data/declaraciones";
import { cuitValido, normalizarCuit } from "@/lib/domain/cuit";
import { TIPO_SERVICIO_CORTO } from "@/lib/domain/etiquetas";
import { fechaHoraLocalAISO } from "@/lib/domain/formato";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { errorFechaServicio, UNIDADES } from "../_lib/reglas";
import type { EstablecimientoOpcion } from "../_lib/tipos";

// -----------------------------------------------------------------------------
// Esquemas
// -----------------------------------------------------------------------------

const vacio = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const parsearJson = (v: unknown) => {
  if (typeof v !== "string" || v.trim() === "") return [];
  try {
    return JSON.parse(v) as unknown;
  } catch {
    return null;
  }
};

const cuitOpcional = z.preprocess(
  vacio,
  z
    .string()
    .trim()
    .refine((v) => cuitValido(v), "El CUIT no es válido: revisá los 11 dígitos.")
    .transform((v) => normalizarCuit(v) ?? v)
    .optional(),
);

const numeroPositivoOpcional = (mensaje: string) =>
  z.preprocess(
    vacio,
    z.coerce.number({ error: mensaje }).positive(mensaje).max(100_000_000, "Revisá el valor ingresado.").optional(),
  );

const textoOpcional = (max: number, mensaje: string) => z.preprocess(vacio, z.string().trim().max(max, mensaje).optional());

const esquemaProducto = z.object({
  productoId: z.guid("Elegí el producto aplicado."),
  cantidad: z.coerce
    .number({ error: "Indicá la cantidad aplicada." })
    .positive("La cantidad debe ser mayor que cero.")
    .max(1_000_000, "Revisá la cantidad."),
  unidad: z.enum(UNIDADES, { error: "Elegí la unidad." }),
});

const esquemaServicio = z.object({
  declaracion_id: z.guid("Declaración inválida."),
  certificado_id: z.preprocess(vacio, z.guid("Certificado inválido.").optional()),
  numero: z
    .string({ error: "Indicá el N.º de certificado." })
    .trim()
    .min(1, "Indicá el N.º de certificado.")
    .max(30, "El N.º de certificado es demasiado largo."),
  establecimiento_id: z.preprocess(vacio, z.guid("Establecimiento inválido.").optional()),
  cliente: z
    .string({ error: "Indicá el titular o la razón social del cliente." })
    .trim()
    .min(2, "Indicá el titular o la razón social del cliente.")
    .max(200, "El nombre del cliente es demasiado largo."),
  cliente_cuit: cuitOpcional,
  domicilio: z
    .string({ error: "Indicá el domicilio donde se realiza el servicio." })
    .trim()
    .min(3, "Indicá el domicilio donde se realiza el servicio.")
    .max(250, "El domicilio es demasiado largo."),
  rubro_id: z.coerce
    .number({ error: "Elegí el rubro del Anexo." })
    .int("Elegí el rubro del Anexo.")
    .positive("Elegí el rubro del Anexo."),
  superficie_m2: numeroPositivoOpcional("Indicá una superficie mayor que cero."),
  capacidad_litros: numeroPositivoOpcional("Indicá una capacidad mayor que cero."),
  fecha_servicio: z
    .string({ error: "Indicá la fecha y hora del servicio." })
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "Indicá la fecha y hora del servicio."),
  tecnico_id: z.guid("Elegí el asesor técnico que firma el certificado."),
  laboratorio: textoOpcional(150, "El nombre del laboratorio es demasiado largo."),
  analisis_bacteriologico_path: textoOpcional(500, "Archivo inválido."),
  analisis_fisicoquimico_path: textoOpcional(500, "Archivo inválido."),
  productos: z.preprocess(
    parsearJson,
    z.array(esquemaProducto, { error: "No se pudieron leer los productos." }).max(20, "Podés cargar hasta 20 productos por servicio."),
  ),
});

type Errores = Record<string, string[]>;

function agregar(errores: Errores, campo: string, mensaje: string) {
  (errores[campo] ??= []).push(mensaje);
}

function revalidarPlanilla(declaracionId: string) {
  revalidatePath(`/prestador/declaraciones/${declaracionId}`);
  revalidatePath("/prestador/declaraciones");
  revalidatePath("/prestador/firmas");
  revalidatePath("/prestador");
}

// -----------------------------------------------------------------------------
// Alta y edición de un servicio (certificado + productos)
// -----------------------------------------------------------------------------

export async function guardarServicio(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion<{ id: string }>> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;

  const datos = esquemaServicio.safeParse(Object.fromEntries(formData));
  if (!datos.success) return falloValidacion(datos.error);
  const d = datos.data;

  const supabase = await createClient();
  const { data: declaracion, error: errorDeclaracion } = await supabase
    .from("declaraciones")
    .select("id, codigo, tipo, estado")
    .eq("id", d.declaracion_id)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (errorDeclaracion) return fallo(mensajeError(errorDeclaracion));
  if (!declaracion) return fallo("No encontramos la declaración.");
  if (declaracion.estado !== "borrador" && declaracion.estado !== "observada") {
    return fallo(`La declaración ${declaracion.codigo ?? ""} ya fue presentada y no admite cambios.`);
  }
  const tipo = declaracion.tipo;

  // Reglas que dependen del tipo de servicio y de la fecha.
  const errores: Errores = {};
  if (tipo === "fumigacion" && d.superficie_m2 === undefined) agregar(errores, "superficie_m2", "Indicá la superficie tratada en m².");
  if (tipo === "tanque" && d.capacidad_litros === undefined) agregar(errores, "capacidad_litros", "Indicá la capacidad del tanque en litros.");
  if (tipo === "fumigacion" && d.productos.length === 0) agregar(errores, "productos", "Agregá al menos un producto aplicado.");
  const idsProductos = d.productos.map((p) => p.productoId);
  if (new Set(idsProductos).size !== idsProductos.length) {
    agregar(errores, "productos", "Cada producto puede figurar una sola vez: sumá las cantidades en una misma fila.");
  }

  let fechaIso = "";
  try {
    fechaIso = fechaHoraLocalAISO(d.fecha_servicio);
  } catch {
    agregar(errores, "fecha_servicio", "Indicá una fecha y hora válidas.");
  }
  if (fechaIso) {
    const antelacion = await getAntelacion();
    const errorFecha = errorFechaServicio(tipo, fechaIso, antelacion, Date.now());
    if (errorFecha) agregar(errores, "fecha_servicio", errorFecha);
  }

  const prefijoArchivos = `${empresaId}/certificados/`;
  for (const campo of ["analisis_bacteriologico_path", "analisis_fisicoquimico_path"] as const) {
    const path = d[campo];
    if (path && !path.startsWith(prefijoArchivos)) agregar(errores, campo, "El archivo no corresponde a tu empresa: volvé a subirlo.");
  }
  if (Object.keys(errores).length > 0) return fallo("Revisá los datos marcados.", errores);

  // Validaciones contra el padrón (mensajes claros antes de llegar a los triggers).
  const [tecnico, rubro, productosAprobados, establecimiento, mismoNumero, existente, productosActuales] = await Promise.all([
    supabase
      .from("tecnicos")
      .select("id, nombre, apellido, estado")
      .eq("id", d.tecnico_id)
      .eq("empresa_id", empresaId)
      .maybeSingle(),
    supabase.from("rubros").select("id").eq("id", d.rubro_id).eq("activo", true).maybeSingle(),
    idsProductos.length > 0
      ? supabase
          .from("empresa_productos")
          .select("producto_id")
          .eq("empresa_id", empresaId)
          .eq("estado", "aprobado")
          .in("producto_id", idsProductos)
      : Promise.resolve({ data: [] as { producto_id: string }[], error: null }),
    d.establecimiento_id
      ? supabase.from("establecimientos").select("id").eq("id", d.establecimiento_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("certificados")
      .select("id, declaracion_id")
      .eq("empresa_id", empresaId)
      .eq("tipo", tipo)
      .eq("numero", d.numero),
    d.certificado_id
      ? supabase
          .from("certificados")
          .select("id, estado, declaracion_id, firma_hash, rubro_id")
          .eq("id", d.certificado_id)
          .eq("empresa_id", empresaId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    d.certificado_id
      ? supabase.from("certificado_productos").select("producto_id, cantidad, unidad").eq("certificado_id", d.certificado_id)
      : Promise.resolve({ data: [] as { producto_id: string; cantidad: number; unidad: string }[], error: null }),
  ]);
  const errorConsulta =
    tecnico.error ??
    rubro.error ??
    productosAprobados.error ??
    establecimiento.error ??
    mismoNumero.error ??
    existente.error ??
    productosActuales.error;
  if (errorConsulta) return fallo(mensajeError(errorConsulta));

  if (!tecnico.data) agregar(errores, "tecnico_id", "El asesor técnico elegido no pertenece a tu empresa.");
  else if (tecnico.data.estado !== "aprobado") {
    agregar(errores, "tecnico_id", `${tecnico.data.nombre} ${tecnico.data.apellido} no está aprobado por la Dirección como asesor técnico.`);
  }
  // Igual que el trigger de la base: el rubro debe estar vigente al cargarlo o cambiarlo
  // (un certificado ya cargado conserva su rubro aunque luego se haya dado de baja).
  const rubroSinCambios = existente.data?.rubro_id === d.rubro_id;
  if (!rubro.data && !rubroSinCambios) agregar(errores, "rubro_id", "Elegí un rubro vigente del Anexo.");
  const aprobados = new Set((productosAprobados.data ?? []).map((p) => p.producto_id));
  if (idsProductos.some((id) => !aprobados.has(id))) {
    agregar(errores, "productos", "Solo podés declarar productos aprobados en la memoria técnica de tu empresa.");
  }
  if (d.establecimiento_id && !establecimiento.data) agregar(errores, "establecimiento_id", "El establecimiento vinculado no existe.");
  if ((mismoNumero.data ?? []).some((c) => c.id !== d.certificado_id)) {
    agregar(
      errores,
      "numero",
      `Ya cargaste un certificado de ${TIPO_SERVICIO_CORTO[tipo].toLowerCase()} con el N.º ${d.numero}. Usá otro número.`,
    );
  }
  if (d.certificado_id) {
    if (!existente.data || existente.data.declaracion_id !== declaracion.id) return fallo("No encontramos el certificado en esta declaración.");
    if (existente.data.estado !== "borrador" && existente.data.estado !== "observado") {
      return fallo("El certificado ya fue presentado y no puede modificarse.");
    }
  }
  if (Object.keys(errores).length > 0) return fallo("Revisá los datos marcados.", errores);

  // Solo columnas con permiso de escritura para la empresa (ver migración de seguridad).
  const fila = {
    numero: d.numero,
    establecimiento_id: d.establecimiento_id ?? null,
    cliente: d.cliente,
    cliente_cuit: d.cliente_cuit ?? null,
    domicilio: d.domicilio,
    rubro_id: d.rubro_id,
    superficie_m2: tipo === "fumigacion" ? (d.superficie_m2 ?? null) : null,
    capacidad_litros: tipo === "tanque" ? (d.capacidad_litros ?? null) : null,
    fecha_servicio: fechaIso,
    tecnico_id: d.tecnico_id,
    laboratorio: tipo === "tanque" ? (d.laboratorio ?? null) : null,
    analisis_bacteriologico_path: tipo === "tanque" ? (d.analisis_bacteriologico_path ?? null) : null,
    analisis_fisicoquimico_path: tipo === "tanque" ? (d.analisis_fisicoquimico_path ?? null) : null,
  } satisfies TablesUpdate<"certificados">;

  const filasProductos = (certificadoId: string) =>
    d.productos.map((p) => ({ certificado_id: certificadoId, producto_id: p.productoId, cantidad: p.cantidad, unidad: p.unidad }));

  // ---- Alta ----------------------------------------------------------------
  if (!d.certificado_id) {
    const { data: nuevo, error } = await supabase
      .from("certificados")
      .insert({ ...fila, empresa_id: empresaId, declaracion_id: declaracion.id, tipo })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return fallo("Revisá los datos marcados.", { numero: [`El N.º ${d.numero} ya está en uso.`] });
      return fallo(mensajeError(error, "No se pudo agregar el servicio."));
    }

    if (d.productos.length > 0) {
      const { error: errorProductos } = await supabase.from("certificado_productos").insert(filasProductos(nuevo.id));
      if (errorProductos) {
        // Sin productos el certificado quedaría incompleto: se deshace el alta.
        await supabase.from("certificados").delete().eq("id", nuevo.id).eq("empresa_id", empresaId);
        return fallo(mensajeError(errorProductos, "No se pudieron registrar los productos aplicados."));
      }
    }

    revalidarPlanilla(declaracion.id);
    return exito(`Agregaste el servicio N.º ${d.numero} a la planilla.`, { id: nuevo.id });
  }

  // ---- Edición -------------------------------------------------------------
  const { data: actualizado, error } = await supabase
    .from("certificados")
    .update(fila)
    .eq("id", d.certificado_id)
    .eq("empresa_id", empresaId)
    .in("estado", ["borrador", "observado"])
    .select("id, firma_hash")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return fallo("Revisá los datos marcados.", { numero: [`El N.º ${d.numero} ya está en uso.`] });
    return fallo(mensajeError(error, "No se pudo actualizar el servicio."));
  }
  if (!actualizado) return fallo("El certificado ya no puede modificarse.");

  // Productos (solo si cambiaron): primero se agregan/actualizan los nuevos y después se quitan los que ya no están.
  const claveProducto = (productoId: string, cantidad: number, unidad: string) => `${productoId}|${cantidad}|${unidad}`;
  const productosAntes = new Set(
    (productosActuales.data ?? []).map((p) => claveProducto(p.producto_id, Number(p.cantidad), p.unidad)),
  );
  const productosDespues = d.productos.map((p) => claveProducto(p.productoId, p.cantidad, p.unidad));
  const productosCambiaron =
    productosAntes.size !== productosDespues.length || productosDespues.some((k) => !productosAntes.has(k));

  if (productosCambiaron) {
    if (d.productos.length > 0) {
      const { error: errorUpsert } = await supabase
        .from("certificado_productos")
        .upsert(filasProductos(actualizado.id), { onConflict: "certificado_id,producto_id" });
      if (errorUpsert) {
        revalidarPlanilla(declaracion.id);
        return fallo(`Se guardaron los datos del certificado, pero no los productos: ${mensajeError(errorUpsert)}`);
      }
    }
    let borrar = supabase.from("certificado_productos").delete().eq("certificado_id", actualizado.id);
    if (idsProductos.length > 0) borrar = borrar.not("producto_id", "in", `(${idsProductos.join(",")})`);
    const { error: errorBorrado } = await borrar;
    if (errorBorrado) {
      revalidarPlanilla(declaracion.id);
      return fallo(`Se guardaron los datos del certificado, pero no se pudieron quitar productos: ${mensajeError(errorBorrado)}`);
    }
  }

  revalidarPlanilla(declaracion.id);
  const estabaFirmado = existente.data?.firma_hash != null;
  const firmaAnulada = estabaFirmado && actualizado.firma_hash === null;
  // La huella de la firma no incluye los productos (la base no la anula si cambian): se avisa para que el asesor los revise.
  const productosSinRevisar = estabaFirmado && !firmaAnulada && productosCambiaron;
  return exito(
    firmaAnulada
      ? `Actualizaste el certificado N.º ${d.numero}. Como cambiaron sus datos, el asesor técnico tiene que volver a firmarlo.`
      : productosSinRevisar
        ? `Actualizaste el certificado N.º ${d.numero}. Cambiaron los productos de un certificado ya firmado: avisale al asesor técnico para que los revise.`
        : `Actualizaste el certificado N.º ${d.numero}.`,
    { id: actualizado.id },
  );
}

/** Quita un servicio de la planilla (solo certificados en borrador). */
export async function eliminarServicio(id: string): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  if (!esUuid(id)) return fallo("Certificado inválido.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificados")
    .delete()
    .eq("id", id)
    .eq("empresa_id", sesion.empresa.id)
    .eq("estado", "borrador")
    .select("numero, declaracion_id");
  if (error) return fallo(mensajeError(error, "No se pudo eliminar el servicio."));
  const borrado = data?.[0];
  if (!borrado) return fallo("Solo podés eliminar servicios en borrador. Los observados se corrigen editándolos.");

  if (borrado.declaracion_id) revalidarPlanilla(borrado.declaracion_id);
  return exito(`Quitaste el servicio N.º ${borrado.numero} de la planilla.`);
}

// -----------------------------------------------------------------------------
// Establecimientos
// -----------------------------------------------------------------------------

type FilaEstablecimiento = {
  id: string;
  nombre: string;
  nombre_fantasia: string | null;
  domicilio: string;
  barrio: string | null;
  cuit: string | null;
  rubro_id: number | null;
  tiene_tanque: boolean;
};

function aOpcion(e: FilaEstablecimiento): EstablecimientoOpcion {
  return {
    id: e.id,
    nombre: e.nombre,
    nombreFantasia: e.nombre_fantasia,
    domicilio: e.domicilio,
    barrio: e.barrio,
    cuit: e.cuit,
    rubroId: e.rubro_id,
    tieneTanque: e.tiene_tanque,
  };
}

/** Búsqueda de establecimientos existentes por nombre o domicilio. */
export async function buscarEstablecimientos(texto: string): Promise<EstadoAccion<EstablecimientoOpcion[]>> {
  await requerirEmpresa();
  const datos = z.string().trim().min(2).max(80).safeParse(texto);
  if (!datos.success) return exito("", []);
  try {
    const filas = await buscarEstablecimientosDatos(datos.data);
    return exito("", filas.map(aOpcion));
  } catch (e) {
    return fallo(e instanceof Error ? e.message : "No se pudo buscar.");
  }
}

const esquemaEstablecimiento = z.object({
  nombre: z
    .string({ error: "Indicá el nombre o la razón social." })
    .trim()
    .min(2, "Indicá el nombre o la razón social.")
    .max(200, "El nombre es demasiado largo."),
  domicilio: z
    .string({ error: "Indicá el domicilio." })
    .trim()
    .min(3, "Indicá el domicilio.")
    .max(250, "El domicilio es demasiado largo."),
  barrio: textoOpcional(120, "El barrio es demasiado largo."),
  cuit: cuitOpcional,
  rubroId: z.preprocess(vacio, z.coerce.number().int().positive("Elegí el rubro.").optional()),
  tieneTanque: z.boolean().default(false),
});

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Alta de un establecimiento desde la planilla. Si ya existe (mismo nombre y domicilio), lo reutiliza. */
export async function crearEstablecimiento(entrada: unknown): Promise<EstadoAccion<EstablecimientoOpcion>> {
  await requerirEmpresa();
  const datos = esquemaEstablecimiento.safeParse(entrada);
  if (!datos.success) return falloValidacion(datos.error);
  const d = datos.data;

  const supabase = await createClient();
  const columnas = "id, nombre, nombre_fantasia, domicilio, barrio, cuit, rubro_id, tiene_tanque";
  const comodin = (s: string) => s.replace(/[\\%_*]/g, "_");
  const { data: candidatos, error: errorBusqueda } = await supabase
    .from("establecimientos")
    .select(columnas)
    .ilike("nombre", comodin(d.nombre))
    .ilike("domicilio", comodin(d.domicilio))
    .limit(5);
  if (errorBusqueda) return fallo(mensajeError(errorBusqueda));
  const existente = (candidatos ?? []).find(
    (c) => normalizar(c.nombre) === normalizar(d.nombre) && normalizar(c.domicilio) === normalizar(d.domicilio),
  );
  if (existente) return exito(`${existente.nombre} ya estaba registrado: lo vinculamos al servicio.`, aOpcion(existente));

  const { data, error } = await supabase
    .from("establecimientos")
    .insert({
      nombre: d.nombre,
      domicilio: d.domicilio,
      barrio: d.barrio ?? null,
      cuit: d.cuit ?? null,
      rubro_id: d.rubroId ?? null,
      tiene_tanque: d.tieneTanque,
    })
    .select(columnas)
    .single();
  if (error) return fallo(mensajeError(error, "No se pudo dar de alta el establecimiento."));
  return exito(`Registraste ${data.nombre} y lo vinculamos al servicio.`, aOpcion(data));
}
