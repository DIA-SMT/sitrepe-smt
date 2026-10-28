import "server-only";
import QRCode from "qrcode";
import { APP } from "@/lib/config";

/** URL pública de verificación de un certificado. */
export function urlVerificacion(codigo: string): string {
  return `${APP.siteUrl.replace(/\/$/, "")}/verificar/${encodeURIComponent(codigo)}`;
}

/** Código QR como SVG (string) listo para inyectar con dangerouslySetInnerHTML. */
export async function qrSvg(texto: string, opciones: { color?: string; margen?: number } = {}): Promise<string> {
  return QRCode.toString(texto, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: opciones.margen ?? 1,
    color: { dark: opciones.color ?? "#0A1A3F", light: "#FFFFFF00" },
  });
}
