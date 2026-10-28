"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, mensajeError } from "@/lib/acciones";
import { requerirEmpresa } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Json } from "@/lib/supabase/database.types";
import {
  datosFormulario,
  idValido,
  juntarErrores,
  nombreArchivo,
  rutaEmpresaOpcional,
  textoOpcional,
  textoRequerido,
} from "../legajo/_lib/esquemas";
import { motivoBloqueo } from "../legajo/_lib/tramites";
import { leerDatos, numero, respuestas, texto } from "./_lib/datos";

const REVISAR = "Revisá los datos marcados.";

const esquemaBase = z.object({
  id: idValido,
  respuesta: textoRequerido(10, 2000, "Explicá qué corregiste o aclarás (al menos 10 caracteres)."),
  adjunto_tipo: z
    .union([z.enum(Constants.public.Enums.tipo_documento), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
});

const esquemaDomicilio = z
  .object({
    domicilio_oficina: textoOpcional(200),
    domicilio_deposito: textoOpcional(200),
    motivo: textoRequerido(10, 600, "Contanos el motivo del cambio (al menos 10 caracteres)."),
  })
  .refine((d) => d.domicilio_oficina || d.domicilio_deposito, {
    message: "Indicá al menos un domicilio nuevo (oficina o depósito).",
    path: ["domicilio_oficina"],
  });

const esquemaRenovacion = z.object({
  categoria: z.enum(["A", "B", "C"], "Seleccioná la categoría declarada."),
});

const esquemaProducto = z.object({
  dosis: textoRequerido(2, 200, "Indicá la dosis de aplicación."),
  concentracion_uso: textoOpcional(200),
  precauciones: textoOpcional(1500),
});

/**
 * Responde las observaciones de la Dirección y vuelve a presentar el trámite
 * (la política de `tramites` permite pasar de "observado" a "presentado").
 */
export async function responderObservaciones(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const bloqueo = motivoBloqueo(sesion.empresa.estado);
  if (bloqueo) return fallo(bloqueo);

  const crudo = datosFormulario(formData);
  const base = esquemaBase.safeParse(crudo);
  const adjunto = rutaEmpresaOpcional([empresaId, "legajo"]).safeParse(crudo.adjunto_path);
  const erroresBase = juntarErrores(base, { adjunto_path: adjunto });
  if (erroresBase || !base.success || !adjunto.success) return fallo(REVISAR, erroresBase ?? {});
  if (adjunto.data && !base.data.adjunto_tipo) {
    return fallo(REVISAR, { adjunto_tipo: ["Indicá qué documento adjuntás."] });
  }

  const supabase = await createClient();
  const { data: tramite, error } = await supabase
    .from("tramites")
    .select("id, codigo, tipo, estado, datos, observaciones")
    .eq("id", base.data.id)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (error) return fallo(mensajeError(error));
  if (!tramite) return fallo("No encontramos ese trámite.");
  if (tramite.estado !== "observado") {
    return fallo("Solo podés responder trámites observados por la Dirección.");
  }

  const previos = leerDatos(tramite.datos);
  const cambios: { [clave: string]: Json | undefined } = {};

  if (tramite.tipo === "cambio_domicilio") {
    const parse = esquemaDomicilio.safeParse(crudo);
    const errores = juntarErrores(parse);
    if (errores || !parse.success) return fallo(REVISAR, errores ?? {});
    cambios.domicilio_oficina = parse.data.domicilio_oficina;
    cambios.domicilio_deposito = parse.data.domicilio_deposito;
    cambios.motivo = parse.data.motivo;
  } else if (tramite.tipo === "renovacion") {
    const parse = esquemaRenovacion.safeParse(crudo);
    const errores = juntarErrores(parse);
    if (errores || !parse.success) return fallo(REVISAR, errores ?? {});
    cambios.categoria = parse.data.categoria;
  } else if (tramite.tipo === "alta_producto") {
    const parse = esquemaProducto.safeParse(crudo);
    const errores = juntarErrores(parse);
    if (errores || !parse.success) return fallo(REVISAR, errores ?? {});
    const itemId = texto(previos, "empresa_producto_id");
    if (itemId) {
      const { error: errorItem } = await supabase
        .from("empresa_productos")
        .update({
          dosis: parse.data.dosis,
          concentracion_uso: parse.data.concentracion_uso,
          precauciones: parse.data.precauciones,
        })
        .eq("id", itemId)
        .eq("empresa_id", empresaId)
        .eq("estado", "propuesto");
      if (errorItem) return fallo(mensajeError(errorItem, "No se pudo actualizar la propuesta del producto."));
    }
  }

  // Documento adicional (opcional), vinculado al trámite.
  let documentoId: string | null = null;
  if (adjunto.data && base.data.adjunto_tipo) {
    const tecnicoId = tramite.tipo === "cambio_tecnico" ? texto(previos, "tecnico_id") : null;
    const anioDeclarado = tramite.tipo === "renovacion" ? numero(previos, "anio") : null;
    const { data: doc, error: errorDoc } = await supabase
      .from("documentos")
      .insert({
        empresa_id: empresaId,
        tramite_id: tramite.id,
        tecnico_id: base.data.adjunto_tipo === "titulo_tecnico" ? tecnicoId : null,
        tipo: base.data.adjunto_tipo,
        nombre_archivo: nombreArchivo(adjunto.data, crudo.adjunto_nombre),
        path: adjunto.data,
        // Igual que al presentar la renovación: la DDJJ del año N sostiene la habilitación hasta el 31/3 de N + 2.
        vence: base.data.adjunto_tipo === "ddjj_anual" && anioDeclarado !== null ? `${anioDeclarado + 2}-03-31` : null,
        estado: "pendiente",
      })
      .select("id")
      .single();
    if (errorDoc) return fallo(mensajeError(errorDoc, "No se pudo adjuntar el documento."));
    documentoId = doc.id;
  }

  const historial = respuestas(previos);
  const ahora = new Date().toISOString();
  const { error: errorTramite } = await supabase
    .from("tramites")
    .update({
      estado: "presentado",
      datos: {
        ...previos,
        ...cambios,
        respuestas: [
          ...historial.map((r) => ({ fecha: r.fecha, texto: r.texto, observacion: r.observacion })),
          { fecha: ahora, texto: base.data.respuesta, observacion: tramite.observaciones },
        ],
      },
    })
    .eq("id", tramite.id);
  if (errorTramite) {
    if (documentoId) await supabase.from("documentos").delete().eq("id", documentoId);
    return fallo(mensajeError(errorTramite, "No se pudo volver a presentar el trámite."));
  }

  revalidatePath("/prestador/tramites");
  revalidatePath(`/prestador/tramites/${tramite.id}`);
  revalidatePath("/prestador/legajo");
  revalidatePath("/prestador/productos");
  return exito(`Respondiste las observaciones y el trámite ${tramite.codigo ?? ""} volvió a la Dirección.`.replace(/\s+/g, " "));
}
