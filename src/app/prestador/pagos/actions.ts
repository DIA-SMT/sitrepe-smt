"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirEmpresa } from "@/lib/auth";
import { comprobanteEnCarpeta } from "@/lib/data/pagos";
import { hoyISO } from "@/lib/domain/formato";
import { MEDIO_PAGO } from "@/lib/domain/etiquetas";
import { createClient } from "@/lib/supabase/server";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function revalidarPagos(pagoId?: string) {
  revalidatePath("/prestador/pagos");
  if (pagoId) revalidatePath(`/prestador/pagos/${pagoId}`);
  // Los certificados cambian de liquidación (y su detalle muestra el estado del pago).
  revalidatePath("/prestador/certificados", "layout");
  revalidatePath("/prestador");
  revalidatePath("/gestion/pagos", "layout");
  if (pagoId) revalidatePath(`/imprimir/liquidacion/${pagoId}`);
}

// -----------------------------------------------------------------------------
// Generar liquidación de timbrado
// -----------------------------------------------------------------------------

const esquemaLiquidacion = z.object({
  certificados: z
    .array(z.guid("Hay un certificado inválido en la selección."))
    .min(1, "Seleccioná al menos un certificado.")
    .max(500, "Podés liquidar hasta 500 certificados por vez."),
});

export async function generarLiquidacion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirEmpresa();
  const parsed = esquemaLiquidacion.safeParse({
    certificados: formData.getAll("certificados").map((v) => String(v)),
  });
  if (!parsed.success) return falloValidacion(parsed.error);
  const ids = [...new Set(parsed.data.certificados)];

  const supabase = await createClient();
  // La empresa sale de la sesión dentro de la RPC (empresa_actual()): solo liquida certificados propios,
  // controlados, sin pago activo y de un mismo tipo.
  const { data: pagoId, error } = await supabase.rpc("generar_liquidacion", { p_certificados: ids });
  if (error || !pagoId) return fallo(mensajeError(error, "No se pudo generar la liquidación."));

  revalidarPagos(pagoId);
  redirect(`/prestador/pagos/${pagoId}?generada=1`);
}

// -----------------------------------------------------------------------------
// Informar el pago (transferencia, boleta o plataforma) con su comprobante
// -----------------------------------------------------------------------------

const esquemaInformar = z
  .object({
    pago: z.guid("Liquidación inválida."),
    medio: z.enum(["transferencia", "boleta", "plataforma_electronica"], { error: "Elegí el medio de pago." }),
    numero_operacion: z.string().trim().max(60, "El N.º de operación es demasiado largo."),
    fecha_pago: z
      .string()
      .regex(FECHA, "Indicá la fecha en que pagaste.")
      .refine((f) => f <= hoyISO(), "La fecha de pago no puede ser posterior a hoy."),
    comprobante: z.string().trim().max(500),
  })
  .refine((d) => d.comprobante !== "" || d.numero_operacion !== "", {
    path: ["comprobante"],
    message: "Adjuntá el comprobante o indicá el N.º de operación.",
  });

export async function informarPago(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const parsed = esquemaInformar.safeParse({
    pago: formData.get("pago"),
    medio: formData.get("medio"),
    numero_operacion: String(formData.get("numero_operacion") ?? ""),
    fecha_pago: formData.get("fecha_pago"),
    comprobante: String(formData.get("comprobante") ?? ""),
  });
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();
  const { data: pago, error: errorPago } = await supabase
    .from("pagos")
    .select("id, codigo, estado, cuenta_id")
    .eq("id", d.pago)
    .eq("empresa_id", sesion.empresa.id)
    .maybeSingle();
  if (errorPago) return fallo(mensajeError(errorPago));
  if (!pago) return fallo("No encontramos esa liquidación en tu empresa.");
  if (pago.estado !== "pendiente" && pago.estado !== "rechazado") {
    return fallo(`La liquidación ${pago.codigo ?? "seleccionada"} ya no admite informar un pago.`);
  }

  // El comprobante tiene que estar en la carpeta de la empresa y de esta liquidación.
  if (d.comprobante && !comprobanteEnCarpeta(d.comprobante, [sesion.empresa.id, pago.id])) {
    return fallo("El comprobante adjunto no corresponde a esta liquidación. Volvé a subirlo.", {
      comprobante: ["Volvé a subir el comprobante."],
    });
  }

  // El medio tiene que ser uno de los que admite la cuenta (505: transferencia; 091: boleta o plataformas).
  const { data: cuenta, error: errorCuenta } = await supabase
    .from("cuentas_recaudadoras")
    .select("codigo, medios_pago")
    .eq("id", pago.cuenta_id)
    .maybeSingle();
  if (errorCuenta) return fallo(mensajeError(errorCuenta));
  if (cuenta && !cuenta.medios_pago.includes(d.medio)) {
    const admitidos = cuenta.medios_pago.map((m) => MEDIO_PAGO[m].label.toLowerCase()).join(" o ");
    return fallo(`La cuenta ${cuenta.codigo} solo admite ${admitidos}.`, {
      medio: [`Medio no admitido por la cuenta ${cuenta.codigo}.`],
    });
  }

  const { error } = await supabase.rpc("informar_pago", {
    p_pago: pago.id,
    p_medio: d.medio,
    p_numero_operacion: d.numero_operacion,
    p_fecha_pago: d.fecha_pago,
    p_comprobante_path: d.comprobante,
  });
  if (error) return fallo(mensajeError(error, "No se pudo informar el pago."));

  revalidarPagos(pago.id);
  // El formulario desaparece al pasar a "informado" (y con él, el aviso del resultado): la confirmación se
  // muestra en la página.
  redirect(`/prestador/pagos/${pago.id}?informado=1`);
}

// -----------------------------------------------------------------------------
// Anular una liquidación (pendiente o rechazada): libera los certificados
// -----------------------------------------------------------------------------

const esquemaAnular = z.object({ pago: z.guid("Liquidación inválida.") });

export async function anularLiquidacion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const parsed = esquemaAnular.safeParse({ pago: formData.get("pago") });
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await createClient();
  const { data: pago, error: errorPago } = await supabase
    .from("pagos")
    .select("id, codigo, estado")
    .eq("id", parsed.data.pago)
    .eq("empresa_id", sesion.empresa.id)
    .maybeSingle();
  if (errorPago) return fallo(mensajeError(errorPago));
  if (!pago) return fallo("No encontramos esa liquidación en tu empresa.");

  const { error } = await supabase.rpc("anular_liquidacion", { p_pago: pago.id });
  if (error) return fallo(mensajeError(error, "No se pudo anular la liquidación."));

  revalidarPagos(pago.id);
  return exito(
    `Liquidación ${pago.codigo ?? "seleccionada"} anulada. Sus certificados quedaron listos para una nueva liquidación.`,
  );
}
