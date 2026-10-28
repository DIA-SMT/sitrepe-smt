import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Bucket = "documentos" | "comprobantes" | "envases" | "publico";

/**
 * Convenciones de rutas (la primera carpeta es el id de la empresa; la política de
 * Storage solo deja a cada empresa leer/escribir dentro de su carpeta):
 *   documentos:   {empresa_id}/legajo/{uuid}-{archivo}
 *                 {empresa_id}/certificados/{certificado_id}/{uuid}-{archivo}
 *   comprobantes: {empresa_id}/{pago_id}/{uuid}-{archivo}
 *   envases:      {empresa_id}/{uuid}-{archivo}
 *   publico:      noticias/{uuid}-{archivo}
 */
export function rutaArchivo(partes: string[], nombreArchivo: string): string {
  const limpio = nombreArchivo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-80);
  return [...partes, `${crypto.randomUUID()}-${limpio}`].join("/");
}

/** URL firmada temporal para ver/descargar un archivo privado (respeta la RLS de Storage). */
export async function urlFirmada(bucket: Bucket, path: string | null | undefined, segundos = 600): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, segundos);
  if (error) return null;
  return data.signedUrl;
}

/** Sube un archivo recibido en un FormData desde una Server Action. */
export async function subirArchivo(bucket: Bucket, partes: string[], archivo: File): Promise<{ path: string } | { error: string }> {
  if (!archivo || archivo.size === 0) return { error: "Seleccioná un archivo." };
  if (archivo.size > 10 * 1024 * 1024) return { error: "El archivo supera los 10 MB." };
  const permitidos = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!permitidos.includes(archivo.type)) return { error: "Formato no admitido: usá PDF, JPG, PNG o WEBP." };
  const supabase = await createClient();
  const path = rutaArchivo(partes, archivo.name);
  const { error } = await supabase.storage.from(bucket).upload(path, archivo, { contentType: archivo.type, upsert: false });
  if (error) return { error: "No se pudo subir el archivo. Verificá tus permisos e intentá nuevamente." };
  return { path };
}
