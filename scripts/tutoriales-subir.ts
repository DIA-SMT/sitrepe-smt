/**
 * Sube los videos tutoriales, sus subtítulos y portadas, y los manuales de operación al bucket público
 * `tutoriales` de Supabase (los muestra el centro de ayuda: /ayuda, /prestador/ayuda y /gestion/ayuda).
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY en .env.local.
 *
 * Uso: npm run tutoriales:subir -- <carpeta>
 *   La carpeta tiene tutorial-NN.mp4 / .vtt / .jpg y manual-{perfil}.pdf (ver src/lib/ayuda.ts).
 *   Los archivos con el mismo nombre se reemplazan.
 */
import { config } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: join(__dirname, "..", ".env.local") });

const TIPOS: Record<string, string> = {
  ".mp4": "video/mp4",
  ".vtt": "text/vtt",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
};

async function main() {
  const carpeta = process.argv[2];
  if (!carpeta) throw new Error("Indicá la carpeta con los archivos: npm run tutoriales:subir -- <carpeta>");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  const supabase = createClient(url, clave, { auth: { persistSession: false } });

  const archivos = readdirSync(carpeta).filter((f) => /^(tutorial-\d{2}\.(mp4|vtt|jpg)|manual-[a-z-]+\.pdf)$/.test(f));
  if (!archivos.length) throw new Error("No hay archivos con el formato esperado en la carpeta.");
  for (const archivo of archivos.sort()) {
    const destino = `${archivo.startsWith("manual-") ? "manuales" : "videos"}/${archivo}`;
    const { error } = await supabase.storage.from("tutoriales").upload(destino, readFileSync(join(carpeta, archivo)), {
      contentType: TIPOS[extname(archivo)],
      cacheControl: "86400",
      upsert: true,
    });
    if (error) throw new Error(`${archivo}: ${error.message}`);
    console.log(`  ✓ ${destino}`);
  }
}

main().catch((error) => {
  console.error("Error:", error.message ?? error);
  process.exit(1);
});
