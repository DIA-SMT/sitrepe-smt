"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type EstadoAccion, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { LARGO_MAXIMO_MOTIVO, puedeControlar } from "@/lib/data/control";
import { createClient } from "@/lib/supabase/server";

const SIN_PERMISO = "Solo Administración y Control de Empresas pueden resolver planillas.";

const esquemaObservados = z
  .array(
    z.object({
      certificado_id: z.guid("Certificado inválido."),
      motivo: z
        .string()
        .trim()
        .min(5, "Indicá el motivo de cada certificado observado (al menos 5 caracteres).")
        .max(LARGO_MAXIMO_MOTIVO, `El motivo de cada observación admite hasta ${LARGO_MAXIMO_MOTIVO} caracteres.`),
    }),
  )
  .max(500, "Demasiados certificados observados.")
  .refine((lista) => new Set(lista.map((o) => o.certificado_id)).size === lista.length, "Hay certificados repetidos.");

const esquemaAprobar = z.object({
  declaracion_id: z.guid("Declaración inválida."),
  observados: z
    .string()
    .transform((texto, ctx): unknown => {
      try {
        return JSON.parse(texto || "[]");
      } catch {
        ctx.addIssue({ code: "custom", message: "No se pudieron leer las observaciones." });
        return z.NEVER;
      }
    })
    .pipe(esquemaObservados),
  observaciones: z
    .string()
    .trim()
    .max(2000, "Las observaciones generales admiten hasta 2000 caracteres.")
    .transform((v) => v || undefined),
});

const esquemaRechazo = z.object({
  declaracion_id: z.guid("Declaración inválida."),
  motivo: z
    .string()
    .trim()
    .min(10, "Explicá el motivo del rechazo (al menos 10 caracteres).")
    .max(1000, "El motivo admite hasta 1000 caracteres."),
});

function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor : "";
}

function revalidarControl() {
  // Bandeja, panel (alertas del layout), certificados y la vista de la empresa.
  revalidatePath("/gestion", "layout");
  revalidatePath("/prestador", "layout");
}

/** Aprueba el control de la planilla (Art. 10.º a): controla todos los certificados salvo los observados. */
export async function aprobarControl(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirStaff();
  if (!puedeControlar(sesion.perfil.rol)) return fallo(SIN_PERMISO);

  const datos = esquemaAprobar.safeParse({
    declaracion_id: texto(formData.get("declaracion_id")),
    observados: texto(formData.get("observados")),
    observaciones: texto(formData.get("observaciones")),
  });
  if (!datos.success) {
    // Los motivos de los observados no son campos del formulario: se informa el primer error concreto.
    const resultado = falloValidacion(datos.error);
    return { ...resultado, mensaje: datos.error.issues[0]?.message ?? resultado.mensaje };
  }
  const { declaracion_id, observados, observaciones } = datos.data;

  const supabase = await createClient();

  // Solo valen los certificados de empresas habilitadas (Ord. 2681/98): la interfaz bloquea la aprobación,
  // pero se re-verifica aquí porque la habilitación puede haber vencido desde que se abrió la planilla.
  const { data: planilla, error: errorPlanilla } = await supabase
    .from("declaraciones")
    .select("empresa_id, tipo")
    .eq("id", declaracion_id)
    .maybeSingle();
  if (errorPlanilla) return fallo(mensajeError(errorPlanilla, "No se pudo leer la planilla."));
  if (!planilla) return fallo("La planilla no existe o ya no está disponible.");
  const { data: habilitada, error: errorHabilitacion } = await supabase.rpc("empresa_habilitada", {
    p_empresa: planilla.empresa_id,
    p_tipo: planilla.tipo,
  });
  if (!errorHabilitacion && habilitada === false) {
    return fallo(
      `La empresa no está habilitada para ${planilla.tipo === "tanque" ? "limpieza de tanques" : "servicios de fumigación"}: corresponde rechazar la planilla.`,
    );
  }

  const { error } = await supabase.rpc("controlar_declaracion", {
    p_declaracion: declaracion_id,
    p_observados: observados,
    p_observaciones: observaciones,
  });
  if (error) return fallo(mensajeError(error, "No se pudo registrar el control de la planilla."));

  // Resultado real (la RPC ignora observados que no estén "declarados" en esta planilla).
  const { data: declaracion } = await supabase
    .from("v_declaraciones")
    .select("codigo, estado, observados")
    .eq("id", declaracion_id)
    .maybeSingle();

  revalidarControl();
  const params = new URLSearchParams({
    resultado: declaracion?.estado ?? (observados.length > 0 ? "observada" : "controlada"),
    id: declaracion_id,
    n: String(declaracion?.observados ?? observados.length),
  });
  if (declaracion?.codigo) params.set("dj", declaracion.codigo);
  redirect(`/gestion/control?${params.toString()}`);
}

/** Rechaza la planilla completa: anula sus certificados sin pago asociado. */
export async function rechazarDeclaracion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirStaff();
  if (!puedeControlar(sesion.perfil.rol)) return fallo(SIN_PERMISO);

  const datos = esquemaRechazo.safeParse({
    declaracion_id: texto(formData.get("declaracion_id")),
    motivo: texto(formData.get("motivo")),
  });
  if (!datos.success) return falloValidacion(datos.error);
  const { declaracion_id, motivo } = datos.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("rechazar_declaracion", { p_declaracion: declaracion_id, p_motivo: motivo });
  if (error) return fallo(mensajeError(error, "No se pudo rechazar la planilla."));

  const { data: declaracion } = await supabase.from("declaraciones").select("codigo").eq("id", declaracion_id).maybeSingle();

  revalidarControl();
  const params = new URLSearchParams({ resultado: "rechazada", id: declaracion_id });
  if (declaracion?.codigo) params.set("dj", declaracion.codigo);
  redirect(`/gestion/control?${params.toString()}`);
}
