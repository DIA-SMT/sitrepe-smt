"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, mensajeError } from "@/lib/acciones";
import { requerirEmpresa } from "@/lib/auth";
import { formatNumero } from "@/lib/domain/formato";
import { createClient } from "@/lib/supabase/server";
import {
  casilla,
  datosFormulario,
  fechaHastaHoy,
  idValido,
  juntarErrores,
  rutaEmpresaOpcional,
  textoOpcional,
  textoRequerido,
} from "../legajo/_lib/esquemas";
import { motivoBloqueo } from "../legajo/_lib/tramites";

const REVISAR = "Revisá los datos marcados.";

const cantidad = z.coerce
  .number("Indicá la cantidad de envases.")
  .int("La cantidad debe ser un número entero.")
  .min(1, "La cantidad debe ser al menos 1.")
  .max(100000, "La cantidad es demasiado alta.");

const esquemaGenerados = z.object({
  producto_id: z.string("Elegí el producto.").pipe(idValido),
  cantidad,
  capacidad: textoOpcional(40),
  lote: textoOpcional(60),
  fecha: fechaHastaHoy,
  triple_lavado: casilla,
  observaciones: textoOpcional(500),
});

/** Registra envases vacíos generados por los servicios (SITREPE, Art. 5.º). */
export async function registrarEnvasesGenerados(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const bloqueo = motivoBloqueo(sesion.empresa.estado);
  if (bloqueo) return fallo(bloqueo);

  const parse = esquemaGenerados.safeParse(datosFormulario(formData));
  const errores = juntarErrores(parse);
  if (errores || !parse.success) return fallo(REVISAR, errores ?? {});
  const datos = parse.data;

  const supabase = await createClient();
  const { data: item, error: errorItem } = await supabase
    .from("empresa_productos")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("producto_id", datos.producto_id)
    .eq("estado", "aprobado")
    .maybeSingle();
  if (errorItem) return fallo(mensajeError(errorItem));
  if (!item) {
    return fallo("El producto no está aprobado en tu memoria técnica.", { producto_id: ["Elegí un producto aprobado."] });
  }

  const { error } = await supabase.from("envases_movimientos").insert({
    empresa_id: empresaId,
    producto_id: datos.producto_id,
    tipo: "generado",
    cantidad: datos.cantidad,
    capacidad: datos.capacidad,
    lote: datos.lote,
    fecha: datos.fecha,
    triple_lavado: datos.triple_lavado,
    observaciones: datos.observaciones,
  });
  if (error) return fallo(mensajeError(error, "No se pudo registrar el movimiento."));

  revalidatePath("/prestador/envases");
  return exito(
    `Registraste ${formatNumero(datos.cantidad, 0)} envase${datos.cantidad === 1 ? "" : "s"} vacío${datos.cantidad === 1 ? "" : "s"}.${
      datos.triple_lavado ? "" : " Recordá realizar el triple lavado antes de entregarlos."
    }`,
  );
}

const esquemaEntrega = z.object({
  producto_id: z.string("Elegí el producto.").pipe(idValido),
  cantidad,
  destinatario: textoRequerido(3, 160, "Indicá el operador o centro de acopio que recibe los envases."),
  manifiesto: textoOpcional(60),
  fecha: fechaHastaHoy,
  triple_lavado: casilla,
  observaciones: textoOpcional(500),
});

/** Registra la entrega de envases vacíos a un operador habilitado (descarga el saldo en depósito). */
export async function registrarEntregaEnvases(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const bloqueo = motivoBloqueo(sesion.empresa.estado);
  if (bloqueo) return fallo(bloqueo);

  const crudo = datosFormulario(formData);
  const parse = esquemaEntrega.safeParse(crudo);
  const comprobante = rutaEmpresaOpcional([empresaId]).safeParse(crudo.comprobante_path);
  const errores = juntarErrores(parse, { comprobante_path: comprobante });
  if (errores || !parse.success || !comprobante.success) return fallo(REVISAR, errores ?? {});
  const datos = parse.data;

  const supabase = await createClient();
  const { data: saldo, error: errorSaldo } = await supabase
    .from("v_envases_saldo")
    .select("saldo, producto_nombre")
    .eq("empresa_id", empresaId)
    .eq("producto_id", datos.producto_id)
    .maybeSingle();
  if (errorSaldo) return fallo(mensajeError(errorSaldo));
  const disponible = saldo?.saldo ?? 0;
  if (disponible <= 0) {
    return fallo("No tenés envases de ese producto pendientes de entrega.", { producto_id: ["Sin saldo en depósito."] });
  }
  if (datos.cantidad > disponible) {
    return fallo(`Solo tenés ${formatNumero(disponible, 0)} envases de ${saldo?.producto_nombre ?? "ese producto"} en depósito.`, {
      cantidad: [`Como máximo ${formatNumero(disponible, 0)}.`],
    });
  }

  const { error } = await supabase.from("envases_movimientos").insert({
    empresa_id: empresaId,
    producto_id: datos.producto_id,
    tipo: "entregado",
    cantidad: datos.cantidad,
    fecha: datos.fecha,
    triple_lavado: datos.triple_lavado,
    destinatario: datos.destinatario,
    manifiesto: datos.manifiesto,
    comprobante_path: comprobante.data,
    observaciones: datos.observaciones,
  });
  if (error) return fallo(mensajeError(error, "No se pudo registrar la entrega."));

  revalidatePath("/prestador/envases");
  const restante = disponible - datos.cantidad;
  return exito(
    `Entrega registrada. ${restante > 0 ? `Quedan ${formatNumero(restante, 0)} envases de ese producto en depósito.` : "No quedan envases de ese producto en depósito."}`,
  );
}
