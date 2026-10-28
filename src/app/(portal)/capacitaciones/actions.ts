"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSesion } from "@/lib/auth";
import { MENSAJE_LIMITE, permitirEnvio } from "@/lib/limite-envio";

/*
 * Acción pública del portal: no exige sesión. inscribir_capacitacion solo la ejecuta el servidor (clave
 * secreta), después de aplicar el límite de envíos por origen. La base valida estado, cupo y DNI duplicado;
 * si quien se inscribe tiene sesión de empresa, la empresa se toma de la sesión (nunca del formulario).
 */

const esquema = z.object({
  capacitacion: z.guid("La capacitación seleccionada no es válida."),
  nombre: z
    .string()
    .trim()
    .min(3, "Ingresá tu nombre y apellido.")
    .max(120, "El nombre no puede superar los 120 caracteres."),
  dni: z
    .string()
    .transform((v) => v.replace(/[.\s-]/g, ""))
    .pipe(z.string().regex(/^\d{7,8}$/, "Ingresá un DNI de 7 u 8 dígitos, sin puntos.")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200, "El correo no puede superar los 200 caracteres.")
    .pipe(z.email("Ingresá un correo electrónico válido.")),
  empresa: z.string().trim().max(200, "El nombre de la empresa no puede superar los 200 caracteres."),
});

const esquemaRespuesta = z.object({ vacantes: z.number().nullable().catch(null) }).catch({ vacantes: null });

function campo(formData: FormData, clave: string): string {
  const v = formData.get(clave);
  return typeof v === "string" ? v : "";
}

export async function inscribirCapacitacion(
  _prev: EstadoAccion<{ vacantes: number | null }>,
  formData: FormData,
): Promise<EstadoAccion<{ vacantes: number | null }>> {
  // Campo trampa para bots: las personas no lo ven ni lo completan.
  if (campo(formData, "sitio_web")) return fallo("No se pudo procesar la inscripción.");

  const datos = esquema.safeParse({
    capacitacion: campo(formData, "capacitacion"),
    nombre: campo(formData, "nombre"),
    dni: campo(formData, "dni"),
    email: campo(formData, "email"),
    empresa: campo(formData, "empresa"),
  });
  if (!datos.success) return falloValidacion(datos.error);

  const { capacitacion, nombre, dni, email, empresa } = datos.data;
  const supabase = await createClient();

  // La RPC valida estado, cupo y DNI, pero no la fecha: una capacitación ya iniciada que siga "abierta"
  // no debe admitir inscripciones (el portal la muestra como realizada).
  const { data: cap, error: errorCap } = await supabase
    .from("capacitaciones")
    .select("fecha_inicio")
    .eq("id", capacitacion)
    .maybeSingle();
  if (errorCap) return fallo(mensajeError(errorCap, "No se pudo completar la inscripción."));
  if (!cap) return fallo("La capacitación no existe o ya no está disponible.");
  if (new Date(cap.fecha_inicio).getTime() <= Date.now()) {
    return fallo("La capacitación ya comenzó: no admite nuevas inscripciones.");
  }

  if (!(await permitirEnvio("inscripcion_capacitacion"))) return fallo(MENSAJE_LIMITE);

  const sesion = await getSesion();
  const { data, error } = await createAdminClient().rpc("inscribir_capacitacion", {
    p_capacitacion: capacitacion,
    p_nombre: nombre,
    p_dni: dni,
    p_email: email,
    p_empresa: empresa || undefined,
    p_empresa_id: sesion?.empresa?.id ?? undefined,
  });
  if (error) return fallo(mensajeError(error, "No se pudo completar la inscripción."));

  revalidatePath("/capacitaciones");
  revalidatePath("/");
  const { vacantes } = esquemaRespuesta.parse(data);
  return exito(`¡Listo, ${nombre.split(/\s+/)[0]}! Tu inscripción quedó registrada.`, { vacantes });
}
