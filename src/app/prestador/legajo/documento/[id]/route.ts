import { NextResponse } from "next/server";
import { requerirEmpresa } from "@/lib/auth";
import { urlFirmada } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { idValido } from "../../_lib/esquemas";

/**
 * Abre un documento del legajo propio: verifica la sesión, busca el documento (la RLS limita a la
 * empresa) y redirige a una URL firmada de corta duración del bucket privado "documentos".
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirEmpresa();
  const { id } = await params;
  if (!idValido.safeParse(id).success) {
    return new NextResponse("Documento inexistente.", { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("path")
    .eq("id", id)
    .eq("empresa_id", sesion.empresa.id)
    .maybeSingle();
  if (error) return new NextResponse("No se pudo consultar el documento.", { status: 500 });
  if (!data) return new NextResponse("Documento inexistente o sin permiso de acceso.", { status: 404 });

  const url = await urlFirmada("documentos", data.path, 120);
  if (!url) return new NextResponse("El archivo no está disponible. Volvé a subirlo o consultá a la Dirección.", { status: 404 });
  return NextResponse.redirect(url);
}
