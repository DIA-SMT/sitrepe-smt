import { NextResponse } from "next/server";
import { requerirStaff } from "@/lib/auth";
import { esUuid } from "@/lib/data/empresas";
import { urlFirmada } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

/**
 * Abre un documento del legajo: genera una URL firmada de corta duración en el
 * momento del clic (así el enlace de la página nunca vence) y redirige a ella.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; documentoId: string }> },
) {
  await requerirStaff();
  const { id, documentoId } = await params;
  const volver = new URL(`/gestion/empresas/${id}?tab=documentos&archivo=no-disponible`, request.url);
  if (!esUuid(id) || !esUuid(documentoId)) return NextResponse.redirect(volver);

  const supabase = await createClient();
  const { data } = await supabase
    .from("documentos")
    .select("path")
    .eq("id", documentoId)
    .eq("empresa_id", id)
    .maybeSingle();

  const url = await urlFirmada("documentos", data?.path, 300);
  if (!url) return NextResponse.redirect(volver);
  return NextResponse.redirect(url);
}
