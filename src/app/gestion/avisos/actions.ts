"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/* Avisos a empresas: los envía Administración o Control (RLS: puede_controlar). */
const ROLES = ["admin", "control"] as const;

const esquemaAviso = z
  .object({
    titulo: z.string().trim().min(5, "Escribí un título de al menos 5 caracteres.").max(120, "Usá como máximo 120 caracteres."),
    cuerpo: z
      .string()
      .trim()
      .min(10, "Escribí el mensaje (al menos 10 caracteres).")
      .max(2000, "El mensaje admite hasta 2.000 caracteres."),
    nivel: z.enum(Constants.public.Enums.nivel_aviso, { message: "Elegí el nivel del aviso." }),
    destino: z.enum(["todas", "empresa"], { message: "Elegí el destinatario." }),
    empresa_id: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined),
  })
  .superRefine((d, ctx) => {
    if (d.destino === "empresa" && !d.empresa_id) {
      ctx.addIssue({ code: "custom", path: ["empresa_id"], message: "Elegí la empresa destinataria." });
    }
    if (d.destino === "empresa" && d.empresa_id && !z.uuid().safeParse(d.empresa_id).success) {
      ctx.addIssue({ code: "custom", path: ["empresa_id"], message: "La empresa elegida no es válida." });
    }
  });

function revalidarAvisos() {
  revalidatePath("/gestion/avisos");
  // El área de prestadores muestra los avisos (listado y contadores del panel).
  revalidatePath("/prestador", "layout");
}

/** Envía un aviso a todas las empresas o a una del padrón. */
export async function enviarAviso(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES);
  const parsed = esquemaAviso.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();
  let destinatario = "todas las empresas";
  if (d.destino === "empresa" && d.empresa_id) {
    const { data: empresa, error } = await supabase
      .from("empresas")
      .select("id, nombre_comercial")
      .eq("id", d.empresa_id)
      .maybeSingle();
    if (error) return fallo(mensajeError(error, "No se pudo verificar la empresa."));
    if (!empresa) return fallo("Revisá los datos marcados.", { empresa_id: ["La empresa no existe en el padrón."] });
    destinatario = empresa.nombre_comercial;
  }

  const { error } = await supabase.from("avisos").insert({
    titulo: d.titulo,
    cuerpo: d.cuerpo,
    nivel: d.nivel,
    empresa_id: d.destino === "empresa" ? (d.empresa_id ?? null) : null,
  });
  if (error) return fallo(mensajeError(error, "No se pudo enviar el aviso."));
  revalidarAvisos();
  return exito(`Aviso enviado a ${destinatario}.`);
}

/** Elimina un aviso (deja de verse en el panel de las empresas). */
export async function eliminarAviso(formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES);
  const parsed = z.object({ id: z.uuid({ message: "Identificador inválido." }) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.from("avisos").delete().eq("id", parsed.data.id).select("id").maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo eliminar el aviso."));
  if (!data) return fallo("El aviso ya no existe.");
  revalidarAvisos();
  return exito("Aviso eliminado.");
}
