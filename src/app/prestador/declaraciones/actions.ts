"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirEmpresa, requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const esquemaNueva = z.object({
  tipo: z.enum(["fumigacion", "tanque"], { error: "Elegí el tipo de servicio de la planilla." }),
});

/**
 * Crea una planilla en borrador y lleva a su detalle. Si la empresa ya tiene un
 * borrador vacío del mismo tipo, lo reutiliza para no acumular planillas vacías.
 */
export async function crearDeclaracion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const datos = esquemaNueva.safeParse({ tipo: formData.get("tipo") });
  if (!datos.success) return falloValidacion(datos.error);

  const { tipo } = datos.data;
  const empresa = sesion.empresa;
  if (tipo === "tanque" && !empresa.habilita_tanques) {
    return fallo("Tu empresa no tiene la habilitación específica para limpieza de tanques. Podés solicitarla desde Trámites.");
  }
  if (tipo === "fumigacion" && !empresa.habilita_fumigacion) {
    return fallo("Tu empresa no está habilitada para servicios de fumigación.");
  }

  const supabase = await createClient();
  const { data: vacia, error: errorVacia } = await supabase
    .from("v_declaraciones")
    .select("id")
    .eq("empresa_id", empresa.id)
    .eq("tipo", tipo)
    .eq("estado", "borrador")
    .eq("cantidad_certificados", 0)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errorVacia) return fallo(mensajeError(errorVacia, "No se pudo crear la declaración."));

  let id = vacia?.id ?? null;
  if (!id) {
    const { data, error } = await supabase
      .from("declaraciones")
      .insert({ empresa_id: empresa.id, tipo })
      .select("id")
      .single();
    if (error) return fallo(mensajeError(error, "No se pudo crear la declaración."));
    id = data.id;
  }

  revalidatePath("/prestador/declaraciones");
  redirect(`/prestador/declaraciones/${id}`);
}

const esquemaId = z.guid("Identificador inválido.");

/** Elimina una planilla en borrador (y sus servicios cargados). */
export async function eliminarDeclaracion(id: string): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  if (!esquemaId.safeParse(id).success) return fallo("Declaración inválida.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("declaraciones")
    .delete()
    .eq("id", id)
    .eq("empresa_id", sesion.empresa.id)
    .eq("estado", "borrador")
    .select("id");
  if (error) return fallo(mensajeError(error, "No se pudo eliminar la declaración."));
  if (!data || data.length === 0) return fallo("Solo podés eliminar declaraciones en borrador.");

  revalidatePath("/prestador/declaraciones");
  revalidatePath("/prestador/firmas");
  redirect("/prestador/declaraciones");
}

/**
 * Presenta la planilla ante Control de Empresas (Art. 9.º a). La base valida
 * antelación, firmas, productos, análisis y habilitación, y devuelve todos los
 * errores juntos (uno por línea).
 */
export async function presentarDeclaracion(id: string): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  if (!esquemaId.safeParse(id).success) return fallo("Declaración inválida.");

  const supabase = await createClient();
  const { data: declaracion, error: errorLectura } = await supabase
    .from("declaraciones")
    .select("id, codigo, estado")
    .eq("id", id)
    .eq("empresa_id", sesion.empresa.id)
    .maybeSingle();
  if (errorLectura) return fallo(mensajeError(errorLectura));
  if (!declaracion) return fallo("No encontramos la declaración.");

  const { error } = await supabase.rpc("presentar_declaracion", { p_declaracion: id });
  if (error) return fallo(mensajeError(error, "No se pudo presentar la declaración."));

  revalidatePath("/prestador", "layout");
  const nombre = declaracion.codigo ? `la declaración ${declaracion.codigo}` : "la declaración";
  return exito(`Presentaste ${nombre}. El área de Control de Empresas la va a revisar.`);
}

const esquemaFirma = z
  .array(z.guid("Certificado inválido."))
  .min(1, "Seleccioná al menos un certificado.")
  .max(300, "Podés firmar hasta 300 certificados por vez.");

/**
 * Firma digital del asesor técnico registrado (Art. 5.º): solo firma los
 * certificados que tiene asignados, sin firma y todavía editables.
 */
export async function firmarCertificados(ids: string[]): Promise<EstadoAccion<{ firmados: number }>> {
  const sesion = await requerirRol(["tecnico"]);
  if (!sesion.perfil.tecnico_id || !sesion.empresa) {
    return fallo("Tu usuario no está vinculado a un asesor técnico del padrón. Consultá con la administración de tu empresa.");
  }
  const datos = esquemaFirma.safeParse(ids);
  if (!datos.success) return fallo(datos.error.issues[0]?.message ?? "Selección inválida.");

  const unicos = [...new Set(datos.data)];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("firmar_certificados", { p_ids: unicos });
  if (error) return fallo(mensajeError(error, "No se pudieron firmar los certificados."));

  const firmados = data ?? 0;
  if (firmados === 0) {
    return fallo("Ninguno de los certificados seleccionados estaba pendiente de tu firma.");
  }

  revalidatePath("/prestador", "layout");
  const resto = unicos.length - firmados;
  const mensaje =
    (firmados === 1 ? "Firmaste 1 certificado." : `Firmaste ${firmados} certificados.`) +
    (resto > 0 ? ` ${resto === 1 ? "Uno ya no requería" : `${resto} ya no requerían`} tu firma.` : "");
  return exito(mensaje, { firmados });
}
