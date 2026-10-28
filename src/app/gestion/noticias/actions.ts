"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { createClient, type SupabaseServer } from "@/lib/supabase/server";
import { generarSlug } from "./_components/categorias";

/* Noticias del portal: las publica Administración o Control (RLS: puede_controlar). */
const ROLES = ["admin", "control"] as const;

const PREFIJO_PUBLICO = "/storage/v1/object/public/publico/";

const casilla = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

const idOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .pipe(z.uuid({ message: "Identificador inválido." }).optional());

const esquemaNoticia = z.object({
  id: idOpcional,
  titulo: z
    .string()
    .trim()
    .min(8, "Escribí un título de al menos 8 caracteres.")
    .max(160, "Usá como máximo 160 caracteres."),
  slug: z.string().trim().max(90, "Usá como máximo 90 caracteres.").optional(),
  resumen: z
    .string()
    .trim()
    .min(20, "Escribí un resumen de al menos 20 caracteres.")
    .max(300, "El resumen admite hasta 300 caracteres."),
  cuerpo: z
    .string()
    .trim()
    .min(40, "Escribí el cuerpo de la noticia (al menos 40 caracteres).")
    .max(20000, "El cuerpo admite hasta 20.000 caracteres."),
  categoria: z.string().trim().min(2, "Elegí una categoría.").max(40, "Usá como máximo 40 caracteres."),
  imagen_path: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || (/^noticias\/[A-Za-z0-9._-]+$/.test(v) && !v.includes("..")), "La imagen no es válida."),
  quitar_imagen: casilla,
  publicada: casilla,
});

/** Ruta del objeto en el bucket público a partir de su URL pública (solo si es de nuestro bucket). */
function rutaDeUrlPublica(url: string | null | undefined): string | null {
  if (!url) return null;
  const i = url.indexOf(PREFIJO_PUBLICO);
  if (i < 0) return null;
  const ruta = decodeURIComponent(url.slice(i + PREFIJO_PUBLICO.length).split("?")[0]);
  return ruta.startsWith("noticias/") ? ruta : null;
}

/** Borra del bucket público una imagen que dejó de usarse (si falla, no interrumpe la operación). */
async function borrarImagen(supabase: SupabaseServer, url: string | null | undefined) {
  const ruta = rutaDeUrlPublica(url);
  if (!ruta) return;
  await supabase.storage.from("publico").remove([ruta]);
}

/** Primera dirección libre a partir de la base: base, base-2, base-3… */
async function slugDisponible(supabase: SupabaseServer, base: string, idActual?: string): Promise<string | null> {
  const { data, error } = await supabase.from("noticias").select("id, slug").like("slug", `${base}%`);
  if (error) return null;
  const usados = new Set((data ?? []).filter((n) => n.id !== idActual).map((n) => n.slug));
  if (!usados.has(base)) return base;
  for (let i = 2; i < 500; i++) {
    const candidato = `${base.slice(0, 84)}-${i}`;
    if (!usados.has(candidato)) return candidato;
  }
  return null;
}

function revalidarNoticias(...slugs: (string | null | undefined)[]) {
  revalidatePath("/gestion/noticias");
  revalidatePath("/noticias");
  revalidatePath("/");
  for (const slug of new Set(slugs)) if (slug) revalidatePath(`/noticias/${slug}`);
}

/** Alta o edición de una noticia (con `id`, edita). */
export async function guardarNoticia(_prev: EstadoAccion<{ id: string }>, formData: FormData): Promise<EstadoAccion<{ id: string }>> {
  await requerirStaff(ROLES);
  const parsed = esquemaNoticia.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  const base = generarSlug(d.slug || d.titulo);
  if (!base) return fallo("Revisá los datos marcados.", { slug: ["No se pudo generar una dirección: usá letras o números."] });

  const supabase = await createClient();
  const slug = await slugDisponible(supabase, base, d.id);
  if (!slug) return fallo("No se pudo generar una dirección única para la noticia. Probá con otro título.");

  const imagenNueva = d.imagen_path ? supabase.storage.from("publico").getPublicUrl(d.imagen_path).data.publicUrl : null;
  const campos = {
    titulo: d.titulo,
    slug,
    resumen: d.resumen,
    cuerpo: d.cuerpo,
    categoria: d.categoria,
    publicada: d.publicada,
  };

  if (!d.id) {
    const { data, error } = await supabase
      .from("noticias")
      .insert({ ...campos, imagen_url: imagenNueva })
      .select("id")
      .single();
    if (error) return fallo(mensajeError(error, "No se pudo crear la noticia."));
    revalidarNoticias(slug);
    return exito(d.publicada ? "Noticia publicada en el portal." : "Borrador guardado.", { id: data.id });
  }

  const { data: actual, error: errorActual } = await supabase
    .from("noticias")
    .select("id, slug, imagen_url, publicada")
    .eq("id", d.id)
    .maybeSingle();
  if (errorActual) return fallo(mensajeError(errorActual, "No se pudo obtener la noticia."));
  if (!actual) return fallo("La noticia ya no existe.");

  const cambiaImagen = Boolean(imagenNueva) || d.quitar_imagen;
  const { error } = await supabase
    .from("noticias")
    .update({
      ...campos,
      ...(cambiaImagen ? { imagen_url: imagenNueva } : {}),
      // Al despublicar se borra la fecha: si se vuelve a publicar, la base registra la nueva.
      ...(d.publicada ? {} : { publicada_at: null }),
    })
    .eq("id", d.id);
  if (error) return fallo(mensajeError(error, "No se pudo guardar la noticia."));

  if (cambiaImagen && actual.imagen_url && actual.imagen_url !== imagenNueva) await borrarImagen(supabase, actual.imagen_url);
  revalidarNoticias(slug, actual.slug);
  revalidatePath(`/gestion/noticias/${d.id}`);
  const mensaje =
    d.publicada && !actual.publicada
      ? "Noticia publicada en el portal."
      : !d.publicada && actual.publicada
        ? "La noticia volvió a borrador: ya no se ve en el portal."
        : "Cambios guardados.";
  return exito(mensaje, { id: d.id });
}

const esquemaId = z.object({ id: z.uuid({ message: "Identificador inválido." }) });

/** Publica o despublica una noticia desde el listado. */
export async function cambiarPublicacion(formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES);
  const parsed = esquemaId.extend({ publicar: casilla }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, publicar } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("noticias")
    .update(publicar ? { publicada: true } : { publicada: false, publicada_at: null })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo cambiar la publicación."));
  if (!data) return fallo("La noticia ya no existe.");
  revalidarNoticias(data.slug);
  revalidatePath(`/gestion/noticias/${id}`);
  return exito(publicar ? "Noticia publicada en el portal." : "La noticia pasó a borrador.");
}

/** Elimina una noticia y su imagen del bucket público. */
export async function eliminarNoticia(formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(ROLES);
  const parsed = esquemaId.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("noticias")
    .delete()
    .eq("id", parsed.data.id)
    .select("slug, imagen_url")
    .maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo eliminar la noticia."));
  if (!data) return fallo("La noticia ya no existe.");
  await borrarImagen(supabase, data.imagen_url);
  revalidarNoticias(data.slug);
  return exito("Noticia eliminada.");
}
