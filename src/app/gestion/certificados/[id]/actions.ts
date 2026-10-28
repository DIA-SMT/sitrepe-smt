"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { puedeControlar } from "@/lib/data/control";
import { createClient } from "@/lib/supabase/server";

const esquemaAnulacion = z.object({
  certificado_id: z.guid("Certificado inválido."),
  motivo: z
    .string()
    .trim()
    .min(10, "Explicá el motivo de la anulación (al menos 10 caracteres).")
    .max(1000, "El motivo admite hasta 1000 caracteres."),
});

function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor : "";
}

/** Anula un certificado (deja de validar en la verificación pública por QR). */
export async function anularCertificado(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirStaff();
  if (!puedeControlar(sesion.perfil.rol)) {
    return fallo("Solo Administración y Control de Empresas pueden anular certificados.");
  }

  const datos = esquemaAnulacion.safeParse({
    certificado_id: texto(formData.get("certificado_id")),
    motivo: texto(formData.get("motivo")),
  });
  if (!datos.success) return falloValidacion(datos.error);
  const { certificado_id, motivo } = datos.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("anular_certificado", { p_certificado: certificado_id, p_motivo: motivo });
  if (error) return fallo(mensajeError(error, "No se pudo anular el certificado."));

  const { data: certificado } = await supabase
    .from("certificados")
    .select("numero")
    .eq("id", certificado_id)
    .maybeSingle();

  // Detalle, buscador, planilla, panel (alertas) y la vista de la empresa.
  revalidatePath("/gestion", "layout");
  revalidatePath("/prestador", "layout");
  return exito(certificado?.numero ? `Certificado N.º ${certificado.numero} anulado.` : "Certificado anulado.");
}
