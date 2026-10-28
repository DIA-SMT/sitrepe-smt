"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirSesion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const esquemaPerfil = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre.").max(80, "Máximo 80 caracteres."),
  apellido: z.string().trim().min(2, "Ingresá tu apellido.").max(80, "Máximo 80 caracteres."),
  dni: textoOpcional
    .transform((v) => (v === null ? null : v.replace(/[\s.]/g, "")))
    .refine((v) => v === null || /^\d{7,8}$/.test(v), "Ingresá el DNI sin puntos (7 u 8 números)."),
  telefono: textoOpcional.refine(
    (v) => v === null || (/^[\d+()\-\s]{6,30}$/.test(v) && (v.match(/\d/g)?.length ?? 0) >= 6),
    "Ingresá un teléfono válido (por ejemplo, 381 4123456).",
  ),
});

/**
 * Edita los datos personales de la propia cuenta. La base solo permite escribir
 * nombre, apellido, DNI y teléfono de la fila propia (permisos por columna + RLS).
 */
export async function actualizarPerfil(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion();

  const datos = esquemaPerfil.safeParse({
    nombre: formData.get("nombre") ?? "",
    apellido: formData.get("apellido") ?? "",
    dni: formData.get("dni") ?? "",
    telefono: formData.get("telefono") ?? "",
  });
  if (!datos.success) return falloValidacion(datos.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfiles")
    .update({
      nombre: datos.data.nombre,
      apellido: datos.data.apellido,
      dni: datos.data.dni,
      telefono: datos.data.telefono,
    })
    .eq("id", sesion.userId)
    .select("id")
    .maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudieron guardar tus datos."));
  if (!data) return fallo("No se encontró tu perfil. Volvé a ingresar e intentá de nuevo.");

  revalidatePath("/perfil");
  // El nombre se muestra en el menú de usuario de las áreas de gestión y de prestadores.
  revalidatePath("/", "layout");
  return exito("Tus datos se guardaron correctamente.");
}
