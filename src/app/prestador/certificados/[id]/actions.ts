"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirEmpresa } from "@/lib/auth";
import { formatFecha } from "@/lib/domain/formato";
import { createClient } from "@/lib/supabase/server";

const esquemaLote = z.object({
  certificado_id: z.guid("Certificado inválido."),
  producto_id: z.guid("Producto inválido."),
  lote: z.string("Indicá el número de lote.").trim().min(1, "Indicá el número de lote.").max(60, "Usá como máximo 60 caracteres."),
  vence: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Ingresá una fecha válida."),
});

/** Lote y vencimiento del producto comprado con la receta (no anula la firma del asesor). */
export async function registrarLote(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirEmpresa();
  const parse = esquemaLote.safeParse(Object.fromEntries(formData));
  if (!parse.success) return falloValidacion(parse.error);
  const d = parse.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_lote", {
    p_certificado: d.certificado_id,
    p_producto: d.producto_id,
    p_lote: d.lote,
    // La RPC acepta null (vencimiento desconocido); el tipo generado no lo refleja.
    p_vence: d.vence as string,
  });
  if (error) return fallo(mensajeError(error, "No se pudo registrar el lote."));

  revalidatePath(`/prestador/certificados/${d.certificado_id}`);
  return exito(`Lote ${d.lote} registrado${d.vence ? ` (vence el ${formatFecha(d.vence)})` : ""}.`);
}
