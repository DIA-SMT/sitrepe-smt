import Image from "next/image";
import { ExternalLink, FileText, FileWarning, Paperclip } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const IMAGENES = ["jpg", "jpeg", "png", "webp"];

/** Vista del comprobante de pago (imagen o PDF embebido) a partir de una URL firmada temporal. */
export function VisorComprobante({ url, path }: { url: string | null; path: string | null }) {
  if (!path) {
    return (
      <EmptyState
        compact
        icon={Paperclip}
        title="Sin comprobante adjunto"
        description="Se informó solo el N.º de operación: verificalo contra el extracto de la cuenta antes de timbrar."
      />
    );
  }
  if (!url) {
    return (
      <Alert tone="warning" title="No se pudo abrir el comprobante" icon={<FileWarning />}>
        El archivo no está disponible o venció el enlace. Recargá la página para intentarlo de nuevo.
      </Alert>
    );
  }

  const nombre = path.split("/").pop()?.replace(/^[0-9a-f-]{36}-/i, "") ?? "comprobante";
  const extension = nombre.split(".").pop()?.toLowerCase() ?? "";
  const esImagen = IMAGENES.includes(extension);
  const esPdf = extension === "pdf";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4 shrink-0 text-azul-600" aria-hidden />
          <span className="truncate" title={nombre}>
            {nombre}
          </span>
        </p>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden />
            Abrir
          </a>
        </Button>
      </div>
      {esImagen ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block h-[440px] overflow-hidden rounded-xl border border-border bg-subtle"
          aria-label="Abrir el comprobante en una pestaña nueva"
        >
          <Image
            src={url}
            alt={`Comprobante de pago: ${nombre}`}
            fill
            unoptimized
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </a>
      ) : esPdf ? (
        <iframe
          src={url}
          title={`Comprobante de pago: ${nombre}`}
          className="h-[520px] w-full rounded-xl border border-border bg-subtle"
        />
      ) : (
        <p className="text-sm text-muted-foreground">Formato sin vista previa: abrilo en una pestaña nueva.</p>
      )}
    </div>
  );
}
