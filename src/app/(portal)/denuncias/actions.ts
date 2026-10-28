"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { type EstadoDenunciaPublico, consultarDenuncia } from "@/lib/data/portal";
import { CODIGO_DENUNCIA, normalizarCodigoDenuncia } from "@/lib/domain/denuncias";
import { Constants } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { MENSAJE_LIMITE, permitirEnvio } from "@/lib/limite-envio";

/*
 * Acciones públicas del portal (sin sesión). crear_denuncia solo la ejecuta el servidor (clave secreta),
 * después de aplicar el límite de envíos por origen. consultar_denuncia es pública pero exige el código
 * completo, con su sufijo aleatorio, y solo expone el tipo, el estado y la respuesta.
 */

function campo(formData: FormData, clave: string): string {
  const v = formData.get(clave);
  return typeof v === "string" ? v : "";
}

const esquemaDenuncia = z
  .object({
    tipo: z.enum(Constants.public.Enums.tipo_denuncia, "Elegí qué querés denunciar."),
    descripcion: z
      .string()
      .trim()
      .min(10, "Contanos qué pasó con al menos 10 caracteres.")
      .max(4000, "La descripción no puede superar los 4000 caracteres."),
    domicilio: z.string().trim().max(300, "El domicilio no puede superar los 300 caracteres."),
    empresa: z.string().trim().max(200, "El nombre de la empresa no puede superar los 200 caracteres."),
    anonima: z.boolean(),
    nombre: z.string().trim().max(200, "El nombre no puede superar los 200 caracteres."),
    contacto: z.string().trim().max(200, "El contacto no puede superar los 200 caracteres."),
  })
  .superRefine((d, ctx) => {
    if (d.anonima) return;
    if (d.nombre.length < 3) {
      ctx.addIssue({ code: "custom", path: ["nombre"], message: "Ingresá tu nombre o marcá la denuncia como anónima." });
    }
    if (d.contacto.length < 6) {
      ctx.addIssue({
        code: "custom",
        path: ["contacto"],
        message: "Indicá un teléfono o correo para contactarte, o marcá la denuncia como anónima.",
      });
    }
  });

export async function crearDenuncia(
  _prev: EstadoAccion<{ codigo: string }>,
  formData: FormData,
): Promise<EstadoAccion<{ codigo: string }>> {
  // Campo trampa para bots: las personas no lo ven ni lo completan.
  if (campo(formData, "sitio_web")) return fallo("No se pudo registrar la denuncia.");

  const datos = esquemaDenuncia.safeParse({
    tipo: campo(formData, "tipo"),
    descripcion: campo(formData, "descripcion"),
    domicilio: campo(formData, "domicilio"),
    empresa: campo(formData, "empresa"),
    anonima: campo(formData, "anonima") === "on",
    nombre: campo(formData, "nombre"),
    contacto: campo(formData, "contacto"),
  });
  if (!datos.success) return falloValidacion(datos.error);

  if (!(await permitirEnvio("denuncia"))) return fallo(MENSAJE_LIMITE);

  const d = datos.data;
  const supabase = createAdminClient();
  const { data: codigo, error } = await supabase.rpc("crear_denuncia", {
    p_tipo: d.tipo,
    p_descripcion: d.descripcion,
    p_domicilio: d.domicilio || undefined,
    p_empresa_mencionada: d.empresa || undefined,
    // Si es anónima no se envían datos personales (la base además los descarta).
    p_nombre: d.anonima ? undefined : d.nombre,
    p_contacto: d.anonima ? undefined : d.contacto,
    p_anonima: d.anonima,
  });
  if (error) return fallo(mensajeError(error, "No se pudo registrar la denuncia."));
  if (!codigo) return fallo("No se pudo registrar la denuncia. Intentá de nuevo en unos minutos.");

  revalidatePath("/denuncias");
  revalidatePath("/gestion/denuncias");
  return exito("Recibimos tu denuncia.", { codigo });
}

const esquemaConsulta = z.object({
  codigo: z
    .string()
    .transform(normalizarCodigoDenuncia)
    .pipe(
      z.string().regex(CODIGO_DENUNCIA, "Ingresá el código completo, con el formato DEN-AAAA-NNNNNN-XXXXXXXX."),
    ),
});

export async function consultarDenunciaAccion(
  _prev: EstadoAccion<EstadoDenunciaPublico>,
  formData: FormData,
): Promise<EstadoAccion<EstadoDenunciaPublico>> {
  const datos = esquemaConsulta.safeParse({ codigo: campo(formData, "codigo") });
  if (!datos.success) return falloValidacion(datos.error);

  try {
    const denuncia = await consultarDenuncia(datos.data.codigo);
    if (!denuncia) return fallo(`No encontramos una denuncia con el código ${datos.data.codigo}. Revisá que esté bien escrito.`);
    return exito(`Denuncia ${denuncia.codigo}`, denuncia);
  } catch (e) {
    return fallo(e instanceof Error ? e.message : "No se pudo consultar la denuncia.");
  }
}
