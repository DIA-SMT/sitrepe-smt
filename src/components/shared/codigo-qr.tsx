import { qrSvg, urlVerificacion } from "@/lib/qr";
import { cn } from "@/lib/utils";

/** QR de verificación pública de un certificado (Server Component). */
export async function CodigoQR({
  codigo,
  tamanio = 112,
  className,
}: {
  codigo: string;
  tamanio?: number;
  className?: string;
}) {
  const svg = await qrSvg(urlVerificacion(codigo));
  return (
    <div
      role="img"
      aria-label={`Código QR de verificación ${codigo}`}
      className={cn("[&_svg]:h-full [&_svg]:w-full", className)}
      style={{ width: tamanio, height: tamanio }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
