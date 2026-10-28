"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";import { requerirEmpresa } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { datosFormulario, idValido, textoOpcional, textoRequerido } from "../legajo/_lib/esquemas";
import { motivoBloqueo, presentarTramite } from "../legajo/_lib/tramites";

const esquemaPropuesta = z.object({
  producto_id: z.string("Elegí un producto del catálogo.").pipe(idValido),
  dosis: textoRequerido(2, 200, "Indicá la dosis de aplicación."),
  concentracion_uso: textoOpcional(200),
  precauciones: textoOpcional(1500),
});

/**
 * Propone un producto del catálogo para la memoria técnica (Art. 5.º): crea la fila en
 * `empresa_productos` como "propuesto" y presenta el trámite de alta de producto.
 */
export async function proponerProducto(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const bloqueo = motivoBloqueo(sesion.empresa.estado);
  if (bloqueo) return fallo(bloqueo);

  const parse = esquemaPropuesta.safeParse(datosFormulario(formData));
  if (!parse.success) return falloValidacion(parse.error);
  const datos = parse.data;

  const supabase = await createClient();
  const { data: producto, error: errorProducto } = await supabase
    .from("productos")
    .select("id, nombre_comercial, organismo, registro_numero, activo")
    .eq("id", datos.producto_id)
    .maybeSingle();
  if (errorProducto) return fallo(mensajeError(errorProducto));
  if (!producto || !producto.activo) {
    return fallo("El producto elegido no está disponible en el catálogo.", { producto_id: ["Elegí otro producto."] });
  }

  const { data: item, error: errorItem } = await supabase
    .from("empresa_productos")
    .insert({
      empresa_id: empresaId,
      producto_id: producto.id,
      dosis: datos.dosis,
      concentracion_uso: datos.concentracion_uso,
      precauciones: datos.precauciones,
      estado: "propuesto",
    })
    .select("id")
    .single();
  if (errorItem) {
    if (errorItem.code === "23505") {
      return fallo(`${producto.nombre_comercial} ya figura en tu memoria técnica.`, { producto_id: ["Ya está en tu memoria."] });
    }
    return fallo(mensajeError(errorItem, "No se pudo registrar la propuesta."));
  }

  const resultado = await presentarTramite(supabase, {
    empresaId,
    tipo: "alta_producto",
    datos: {
      empresa_producto_id: item.id,
      producto_id: producto.id,
      producto_nombre: producto.nombre_comercial,
      registro: `${producto.organismo} ${producto.registro_numero}`,
    },
  });
  if (!resultado.ok) {
    // Compensación: la propuesta sigue en estado "propuesto" y la empresa puede eliminarla.
    await supabase.from("empresa_productos").delete().eq("id", item.id);
    return fallo(mensajeError(resultado.error, "No se pudo presentar el trámite de alta del producto."));
  }

  revalidatePath("/prestador/productos");
  revalidatePath("/prestador/tramites");
  revalidatePath("/prestador/legajo");
  return exito(
    `Propusiste ${producto.nombre_comercial} (${resultado.codigo ?? "trámite presentado"}). Vas a poder declararlo cuando la Dirección lo apruebe.`,
    { id: item.id },
  );
}

/**
 * Retira una propuesta de la memoria técnica que todavía no fue aprobada (estado "propuesto").
 * Sirve para desistir de una propuesta observada o para liberar el producto cuando la Dirección
 * rechazó el trámite (resolver_tramite no cambia el estado de la propuesta al rechazar) y así
 * poder volver a proponerlo. Si el trámite está en revisión, no se puede retirar.
 */
export async function retirarPropuesta(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const parse = z.object({ id: idValido }).safeParse(datosFormulario(formData));
  if (!parse.success) return falloValidacion(parse.error);

  const supabase = await createClient();
  const [{ data: item, error }, { data: tramites, error: errorTramites }] = await Promise.all([
    supabase
      .from("v_memorias_tecnicas")
      .select("id, estado, producto_nombre")
      .eq("id", parse.data.id)
      .eq("empresa_id", empresaId)
      .maybeSingle(),
    supabase
      .from("tramites")
      .select("id, codigo, estado, datos")
      .eq("empresa_id", empresaId)
      .eq("tipo", "alta_producto")
      .in("estado", ["presentado", "observado"]),
  ]);
  if (error) return fallo(mensajeError(error));
  if (errorTramites) return fallo(mensajeError(errorTramites));
  if (!item?.id) return fallo("No encontramos esa propuesta en tu memoria técnica.");
  if (item.estado !== "propuesto") {
    return fallo("Solo podés retirar propuestas que la Dirección todavía no aprobó ni rechazó.");
  }

  const abiertos = tramites.flatMap((t) => {
    const d = t.datos;
    if (d === null || typeof d !== "object" || Array.isArray(d) || d.empresa_producto_id !== item.id) return [];
    return [{ ...t, datos: d }];
  });
  const enRevision = abiertos.find((t) => t.estado === "presentado");
  if (enRevision) {
    return fallo(
      `La propuesta está en revisión (${enRevision.codigo ?? "trámite presentado"}). Esperá la resolución de la Dirección o pedile que la deje sin efecto.`,
    );
  }

  const { error: errorBaja } = await supabase.from("empresa_productos").delete().eq("id", item.id).eq("empresa_id", empresaId);
  if (errorBaja) return fallo(mensajeError(errorBaja, "No se pudo retirar la propuesta."));

  // Un trámite observado queda desistido: vuelve a borrador y deja de figurar ante la Dirección.
  for (const t of abiertos) {
    await supabase
      .from("tramites")
      .update({ estado: "borrador", datos: { ...t.datos, desistido: true, desistido_at: new Date().toISOString() } })
      .eq("id", t.id);
  }

  revalidatePath("/prestador/productos");
  revalidatePath("/prestador/tramites");
  revalidatePath("/prestador/legajo");
  return exito(`Retiraste ${item.producto_nombre ?? "el producto"} de tu memoria técnica. Podés volver a proponerlo cuando quieras.`);
}
