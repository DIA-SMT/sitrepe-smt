"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff, ROLES_STAFF } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";

const vacioANull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const idOpcional = z.preprocess(vacioANull, z.guid("Identificador inválido.").nullable().default(null));

const esquemaGestion = z
  .object({
    id: z.guid("Denuncia inválida."),
    estado: z.enum(Constants.public.Enums.estado_denuncia, { message: "Elegí el estado." }),
    tipo: z.enum(Constants.public.Enums.tipo_denuncia, { message: "Elegí el tipo de denuncia." }),
    asignada_a: idOpcional,
    empresa_id: idOpcional,
    establecimiento_id: idOpcional,
    respuesta: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() || null : null),
      z.string().max(2000, "Usá como máximo 2000 caracteres.").nullable(),
    ),
  })
  .superRefine((d, ctx) => {
    if ((d.estado === "cerrada" || d.estado === "desestimada") && (d.respuesta?.length ?? 0) < 10) {
      ctx.addIssue({
        code: "custom",
        path: ["respuesta"],
        message: "Para cerrar o desestimar, escribí una respuesta para el vecino (al menos 10 caracteres).",
      });
    }
  });

function revalidar(id: string) {
  revalidatePath("/gestion/denuncias");
  revalidatePath(`/gestion/denuncias/${id}`);
}

export async function actualizarDenuncia(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff();
  const parsed = esquemaGestion.safeParse({
    id: formData.get("id"),
    estado: formData.get("estado"),
    tipo: formData.get("tipo"),
    asignada_a: formData.get("asignada_a"),
    empresa_id: formData.get("empresa_id"),
    establecimiento_id: formData.get("establecimiento_id"),
    respuesta: formData.get("respuesta"),
  });
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();

  if (d.asignada_a) {
    const { data: perfil, error } = await supabase
      .from("perfiles")
      .select("id, rol, activo")
      .eq("id", d.asignada_a)
      .maybeSingle();
    if (error) return fallo(mensajeError(error));
    if (!perfil || !perfil.activo || !ROLES_STAFF.some((r) => r === perfil.rol)) {
      const mensaje = "La persona elegida no es un usuario activo del área.";
      return fallo(mensaje, { asignada_a: [mensaje] });
    }
  }

  const { data, error } = await supabase
    .from("denuncias")
    .update({
      estado: d.estado,
      tipo: d.tipo,
      asignada_a: d.asignada_a,
      empresa_id: d.empresa_id,
      establecimiento_id: d.establecimiento_id,
      respuesta: d.respuesta,
    })
    .eq("id", d.id)
    .select("id, codigo")
    .maybeSingle();
  if (error) return fallo(mensajeError(error));
  if (!data) return fallo("No se encontró la denuncia.");

  revalidar(d.id);
  if (d.establecimiento_id) revalidatePath(`/gestion/establecimientos/${d.establecimiento_id}`);
  return exito(`Denuncia ${data.codigo ?? ""} actualizada.`);
}

/** El usuario actual toma la denuncia (y la pasa a "en curso" si estaba recibida). */
export async function tomarDenuncia(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirStaff();
  const id = z.guid().safeParse(formData.get("id"));
  if (!id.success) return fallo("Denuncia inválida.");
  const supabase = await createClient();

  const { data: actual, error: errorLectura } = await supabase
    .from("denuncias")
    .select("id, estado, asignada_a")
    .eq("id", id.data)
    .maybeSingle();
  if (errorLectura) return fallo(mensajeError(errorLectura));
  if (!actual) return fallo("No se encontró la denuncia.");
  if (actual.asignada_a && actual.asignada_a !== sesion.userId) return fallo("La denuncia ya está asignada a otra persona.");

  const { error } = await supabase
    .from("denuncias")
    .update({ asignada_a: sesion.userId, estado: actual.estado === "recibida" ? "en_curso" : actual.estado })
    .eq("id", id.data);
  if (error) return fallo(mensajeError(error));

  revalidar(id.data);
  return exito("Te asignaste la denuncia.");
}
