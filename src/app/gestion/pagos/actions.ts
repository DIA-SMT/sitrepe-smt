"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { getArancelesVigentes } from "@/lib/data/catalogos";
import { CODIGOS_ARANCEL_CERTIFICADOS, comprobanteEnCarpeta } from "@/lib/data/pagos";
import { cuitValido, normalizarCuit } from "@/lib/domain/cuit";
import { MEDIO_PAGO } from "@/lib/domain/etiquetas";
import { hoyISO } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/** Conciliar, rechazar y registrar pagos: Administración y Control de Empresas / Timbrado. */
const ROLES_CONCILIACION = ["admin", "control"] as const;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MEDIOS = ["transferencia", "boleta", "plataforma_electronica"] as const;

export type SelloAsignado = { certificadoId: string; numero: string; sello: string };

function revalidarPagos(pagoId?: string) {
  revalidatePath("/gestion/pagos");
  if (pagoId) revalidatePath(`/gestion/pagos/${pagoId}`);
  // Al verificar se timbran certificados: cambian sus fichas, los reportes y el portal del prestador.
  revalidatePath("/gestion/certificados", "layout");
  revalidatePath("/gestion/reportes", "layout");
  revalidatePath("/gestion");
  revalidatePath("/prestador", "layout");
  if (pagoId) revalidatePath(`/imprimir/liquidacion/${pagoId}`);
}

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "");

function medioAdmitido(medios: readonly Enums<"medio_pago">[], medio: Enums<"medio_pago">, codigoCuenta: string) {
  if (medios.includes(medio)) return null;
  const admitidos = medios.map((m) => MEDIO_PAGO[m].label.toLowerCase()).join(" o ");
  return `La cuenta ${codigoCuenta} solo admite ${admitidos}.`;
}

// -----------------------------------------------------------------------------
// Verificar y timbrar
// -----------------------------------------------------------------------------

const esquemaVerificar = z.object({
  pago: z.guid("Pago inválido."),
  observaciones: z.string().trim().max(500, "Las observaciones no pueden superar los 500 caracteres."),
});

export async function verificarPago(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion<{ sellos: SelloAsignado[] }>> {
  await requerirStaff(ROLES_CONCILIACION);
  const parsed = esquemaVerificar.safeParse({ pago: formData.get("pago"), observaciones: texto(formData, "observaciones") });
  if (!parsed.success) return falloValidacion(parsed.error);
  const { pago: pagoId, observaciones } = parsed.data;

  const supabase = await createClient();
  const { data: pago, error: errorPago } = await supabase
    .from("pagos")
    .select("id, estado, fecha_pago, observaciones")
    .eq("id", pagoId)
    .maybeSingle();
  if (errorPago) return fallo(mensajeError(errorPago));
  if (!pago) return fallo("No se encontró el pago.");
  if (pago.estado !== "informado" && pago.estado !== "pendiente") {
    return fallo("Este pago ya no admite verificación: recargá la página para ver su estado actual.");
  }
  if (!pago.fecha_pago) {
    return fallo("El pago no tiene fecha de pago: registrá los datos del pago recibido antes de verificarlo.");
  }

  // verificar_pago conserva las observaciones anteriores si no se envían nuevas. En un pago informado de
  // nuevo después de un rechazo, esas observaciones son el motivo del rechazo: se reemplazan para que la
  // empresa no lo vea como nota de la verificación.
  const nota =
    observaciones ||
    (pago.estado === "informado" && pago.observaciones ? "Acreditación verificada y conciliada por la Dirección." : "");
  const { error } = await supabase.rpc("verificar_pago", {
    p_pago: pago.id,
    p_aprobar: true,
    ...(nota ? { p_observaciones: nota } : {}),
  });
  if (error) return fallo(mensajeError(error, "No se pudo verificar el pago."));

  const { data: certificados } = await supabase
    .from("certificados")
    .select("id, numero, sello_codigo")
    .eq("pago_id", pago.id)
    .eq("estado", "timbrado")
    .order("numero");
  const sellos: SelloAsignado[] = (certificados ?? [])
    .filter((c) => c.sello_codigo)
    .map((c) => ({ certificadoId: c.id, numero: c.numero, sello: c.sello_codigo ?? "" }));

  revalidarPagos(pago.id);
  return exito(
    sellos.length > 0
      ? `Pago verificado: ${sellos.length === 1 ? "se timbró 1 certificado" : `se timbraron ${sellos.length} certificados`}.`
      : "Pago verificado y conciliado.",
    { sellos },
  );
}

// -----------------------------------------------------------------------------
// Rechazar (motivo obligatorio)
// -----------------------------------------------------------------------------

const esquemaRechazar = z.object({
  pago: z.guid("Pago inválido."),
  motivo: z
    .string()
    .trim()
    .min(10, "Explicá el motivo del rechazo (al menos 10 caracteres).")
    .max(500, "El motivo no puede superar los 500 caracteres."),
});

export async function rechazarPago(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES_CONCILIACION);
  const parsed = esquemaRechazar.safeParse({ pago: formData.get("pago"), motivo: texto(formData, "motivo") });
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("verificar_pago", {
    p_pago: parsed.data.pago,
    p_aprobar: false,
    p_observaciones: parsed.data.motivo,
  });
  if (error) return fallo(mensajeError(error, "No se pudo rechazar el pago."));

  revalidarPagos(parsed.data.pago);
  return exito("Pago rechazado. La empresa verá el motivo y podrá volver a informarlo.");
}

// -----------------------------------------------------------------------------
// Anular una liquidación pendiente o rechazada
// -----------------------------------------------------------------------------

const esquemaAnular = z.object({ pago: z.guid("Pago inválido.") });

export async function anularLiquidacionStaff(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES_CONCILIACION);
  const parsed = esquemaAnular.safeParse({ pago: formData.get("pago") });
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("anular_liquidacion", { p_pago: parsed.data.pago });
  if (error) return fallo(mensajeError(error, "No se pudo anular la liquidación."));

  revalidarPagos(parsed.data.pago);
  return exito("Liquidación anulada. Sus certificados quedaron liberados.");
}

// -----------------------------------------------------------------------------
// Registrar el pago recibido de una liquidación pendiente (sin informar) y timbrar
// -----------------------------------------------------------------------------

const datosPago = {
  medio: z.enum(MEDIOS, { error: "Elegí el medio de pago." }),
  numero_operacion: z.string().trim().max(60, "El N.º de operación es demasiado largo."),
  fecha_pago: z
    .string()
    .regex(FECHA, "Indicá la fecha de pago.")
    .refine((f) => f <= hoyISO(), "La fecha de pago no puede ser posterior a hoy."),
  comprobante: z.string().trim().max(500),
  observaciones: z.string().trim().max(500, "Las observaciones no pueden superar los 500 caracteres."),
};

const esquemaRecibido = z
  .object({ pago: z.guid("Pago inválido."), ...datosPago })
  .refine((d) => d.comprobante !== "" || d.numero_operacion !== "", {
    path: ["comprobante"],
    message: "Adjuntá el comprobante o indicá el N.º de operación.",
  });

export async function registrarPagoRecibido(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion<{ sellos: SelloAsignado[] }>> {
  await requerirStaff(ROLES_CONCILIACION);
  const parsed = esquemaRecibido.safeParse({
    pago: formData.get("pago"),
    medio: formData.get("medio"),
    numero_operacion: texto(formData, "numero_operacion"),
    fecha_pago: formData.get("fecha_pago"),
    comprobante: texto(formData, "comprobante"),
    observaciones: texto(formData, "observaciones"),
  });
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();
  const { data: pago, error: errorPago } = await supabase
    .from("pagos")
    .select("id, empresa_id, estado, cuenta_id")
    .eq("id", d.pago)
    .maybeSingle();
  if (errorPago) return fallo(mensajeError(errorPago));
  if (!pago) return fallo("No se encontró la liquidación.");
  if (pago.estado !== "pendiente") return fallo("Solo se puede registrar el pago de liquidaciones pendientes.");

  if (d.comprobante && !comprobanteEnCarpeta(d.comprobante, [pago.empresa_id ?? "staff", pago.id])) {
    return fallo("El comprobante no corresponde a esta liquidación. Volvé a subirlo.", {
      comprobante: ["Volvé a subir el comprobante."],
    });
  }

  const { data: cuenta, error: errorCuenta } = await supabase
    .from("cuentas_recaudadoras")
    .select("codigo, medios_pago")
    .eq("id", pago.cuenta_id)
    .maybeSingle();
  if (errorCuenta) return fallo(mensajeError(errorCuenta));
  const problemaMedio = cuenta ? medioAdmitido(cuenta.medios_pago, d.medio, cuenta.codigo) : null;
  if (problemaMedio) return fallo(problemaMedio, { medio: [problemaMedio] });

  // Solo columnas con permiso de actualización para el staff (ver 20261026000300_seguridad.sql).
  const { error: errorActualizar } = await supabase
    .from("pagos")
    .update({
      medio: d.medio,
      numero_operacion: d.numero_operacion || null,
      fecha_pago: d.fecha_pago,
      comprobante_path: d.comprobante || null,
    })
    .eq("id", pago.id);
  if (errorActualizar) return fallo(mensajeError(errorActualizar, "No se pudieron guardar los datos del pago."));
  // Los datos ya quedaron guardados aunque la verificación falle: refrescar la vista.
  revalidarPagos(pago.id);

  return verificarPago(_prev, formData);
}

// -----------------------------------------------------------------------------
// Registrar otros conceptos (reinspección, notas, plazos, permisos de transporte)
// -----------------------------------------------------------------------------

const esquemaNuevo = z
  .object({
    arancel: z.coerce.number().int().positive("Elegí el concepto a cobrar."),
    modo: z.enum(["padron", "otro"], { error: "Indicá quién paga." }),
    empresa: z.string().trim(),
    contribuyente: z.string().trim().max(160, "El nombre es demasiado largo."),
    contribuyente_cuit: z.string().trim(),
    cantidad: z.coerce
      .number({ error: "Indicá la cantidad." })
      .int("La cantidad debe ser un número entero.")
      .min(1, "La cantidad mínima es 1.")
      .max(999, "La cantidad máxima es 999."),
    ...datosPago,
  })
  .superRefine((d, ctx) => {
    if (d.modo === "padron" && !z.guid().safeParse(d.empresa).success) {
      ctx.addIssue({ code: "custom", path: ["empresa"], message: "Elegí la empresa del padrón." });
    }
    if (d.modo === "otro") {
      if (d.contribuyente.length < 3) {
        ctx.addIssue({ code: "custom", path: ["contribuyente"], message: "Ingresá el nombre o la razón social." });
      }
      if (!cuitValido(d.contribuyente_cuit)) {
        ctx.addIssue({ code: "custom", path: ["contribuyente_cuit"], message: "Ingresá un CUIT/CUIL válido." });
      }
    }
    if (d.comprobante === "" && d.numero_operacion === "") {
      ctx.addIssue({ code: "custom", path: ["comprobante"], message: "Adjuntá el comprobante o indicá el N.º de operación." });
    }
  });

export async function registrarOtroConcepto(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES_CONCILIACION);
  const parsed = esquemaNuevo.safeParse({
    arancel: texto(formData, "arancel"),
    modo: formData.get("modo"),
    empresa: texto(formData, "empresa"),
    contribuyente: texto(formData, "contribuyente"),
    contribuyente_cuit: texto(formData, "contribuyente_cuit"),
    cantidad: texto(formData, "cantidad"),
    medio: formData.get("medio"),
    numero_operacion: texto(formData, "numero_operacion"),
    fecha_pago: formData.get("fecha_pago"),
    comprobante: texto(formData, "comprobante"),
    observaciones: texto(formData, "observaciones"),
  });
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  // El importe sale siempre del arancel vigente en el servidor (nunca del formulario).
  const aranceles = await getArancelesVigentes();
  const arancel = aranceles.find((a) => a.id === d.arancel);
  if (!arancel) return fallo("El concepto elegido no tiene un arancel vigente.", { arancel: ["Concepto no vigente."] });
  if (CODIGOS_ARANCEL_CERTIFICADOS.includes(arancel.codigo)) {
    return fallo("El timbrado de certificados lo liquida cada empresa desde su portal.", {
      arancel: ["Elegí otro concepto."],
    });
  }
  if (arancel.cuenta) {
    const problemaMedio = medioAdmitido(arancel.cuenta.medios_pago, d.medio, arancel.cuenta.codigo);
    if (problemaMedio) return fallo(problemaMedio, { medio: [problemaMedio] });
  }
  // Carpeta de la Dirección: staff/AAAA-MM/{uuid}-{archivo} (el mes puede ser el anterior si se cargó a fin de mes).
  const mesComprobante = d.comprobante.split("/")[1] ?? "";
  if (
    d.comprobante &&
    !(/^\d{4}-(0[1-9]|1[0-2])$/.test(mesComprobante) && comprobanteEnCarpeta(d.comprobante, ["staff", mesComprobante]))
  ) {
    return fallo("El comprobante no se subió en la carpeta de la Dirección. Volvé a subirlo.", {
      comprobante: ["Volvé a subir el comprobante."],
    });
  }

  const supabase = await createClient();
  let empresaId: string | null = null;
  if (d.modo === "padron") {
    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("id", d.empresa)
      .maybeSingle();
    if (errorEmpresa) return fallo(mensajeError(errorEmpresa));
    if (!empresa) return fallo("La empresa elegida no figura en el padrón.", { empresa: ["Empresa inexistente."] });
    empresaId = empresa.id;
  }

  const importeUnitario = Number(arancel.importe);
  // En centavos: coincide exactamente con el check importe_total = round(importe_unitario * cantidad, 2).
  const importeTotal = (Math.round(importeUnitario * 100) * d.cantidad) / 100;

  // Solo columnas con permiso de inserción (ver 20261026000300_seguridad.sql).
  const { data: nuevo, error } = await supabase
    .from("pagos")
    .insert({
      empresa_id: empresaId,
      contribuyente: d.modo === "otro" ? d.contribuyente : null,
      contribuyente_cuit: d.modo === "otro" ? normalizarCuit(d.contribuyente_cuit) : null,
      arancel_id: arancel.id,
      cuenta_id: arancel.cuenta_id,
      cantidad: d.cantidad,
      importe_unitario: importeUnitario,
      importe_total: importeTotal,
      medio: d.medio,
      estado: "pendiente",
      numero_operacion: d.numero_operacion || null,
      fecha_pago: d.fecha_pago,
      comprobante_path: d.comprobante || null,
      observaciones: d.observaciones || null,
    })
    .select("id")
    .single();
  if (error || !nuevo) return fallo(mensajeError(error, "No se pudo registrar el pago."));

  const { error: errorVerificar } = await supabase.rpc("verificar_pago", { p_pago: nuevo.id, p_aprobar: true });

  revalidarPagos(nuevo.id);
  redirect(`/gestion/pagos/${nuevo.id}?registrado=${errorVerificar ? "pendiente" : "1"}`);
}
