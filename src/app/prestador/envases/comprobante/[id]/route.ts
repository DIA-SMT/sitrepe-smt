import { NextResponse } from "next/server";
import { requerirEmpresa } from "@/lib/auth";
import { urlFirmada } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { idValido } from "../../../legajo/_lib/esquemas";

/** Abre el comprobante de entrega de envases (bucket privado "envases") con una URL firmada breve. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirEmpresa();
  const { id } = await params;
  if (!idValido.safeParse(id).success) {
    return new NextResponse("Movimiento inexistente.", { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("envases_movimientos")
    .select("comprobante_path")
    .eq("id", id)
    .eq("empresa_id", sesion.empresa.id)
    .maybeSingle();
  if (error) return new NextResponse("No se pudo consultar el movimiento.", { status: 500 });
  if (!data?.comprobante_path) return new NextResponse("El movimiento no tiene comprobante adjunto.", { status: 404 });

  const url = await urlFirmada("envases", data.comprobante_path, 120);
  if (!url) return new NextResponse("El archivo no está disponible.", { status: 404 });
  return NextResponse.redirect(url);
}
