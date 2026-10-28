import { Logo } from "@/components/brand/logo";
import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";

type HojaImpresionProps = {
  /** Título del documento (p. ej. "Certificado de fumigación"). */
  titulo: string;
  /** Subtítulo/identificador (p. ej. "N.º 1234 · Original para el cliente"). */
  subtitulo?: React.ReactNode;
  /** Bloque a la derecha del encabezado (p. ej. código QR o número). */
  lateral?: React.ReactNode;
  /** Texto de pie (normativa, leyendas). */
  pie?: React.ReactNode;
  /** Forzar salto de página después de esta hoja. */
  saltoDePagina?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Hoja A4 con encabezado institucional (logo oficial, Secretaría y Dirección)
 * para certificados, notificaciones, actas, liquidaciones e informes.
 * Se ve como una hoja en pantalla y se imprime limpia (ver /imprimir/layout).
 */
export function HojaImpresion({ titulo, subtitulo, lateral, pie, saltoDePagina, className, children }: HojaImpresionProps) {
  return (
    <article
      className={cn(
        "hoja-a4 relative mx-auto flex w-full max-w-[210mm] flex-col bg-white text-[13px] leading-relaxed text-noche-900",
        "min-h-[297mm] px-[16mm] py-[14mm] shadow-[0_20px_60px_-30px_rgb(2_6_38/0.35)] ring-1 ring-black/5",
        "print:min-h-0 print:max-w-none print:px-0 print:py-0 print:shadow-none print:ring-0",
        saltoDePagina && "print:break-after-page",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-6 border-b-2 border-azul-600 pb-4">
        <div className="flex items-center gap-4">
          <Logo variant="positivo" height={46} />
          <div className="border-l border-border pl-4 text-[11px] leading-snug text-noche-600">
            <p className="font-semibold text-noche-800">{APP.secretaria}</p>
            <p>{APP.direccion}</p>
            <p>{APP.contacto.domicilio}</p>
          </div>
        </div>
        {lateral ? <div className="shrink-0">{lateral}</div> : null}
      </header>

      <div className="mt-5 mb-4">
        <h1 className="font-display text-xl font-bold tracking-tight text-noche-950">{titulo}</h1>
        {subtitulo ? <div className="mt-0.5 text-sm text-noche-600">{subtitulo}</div> : null}
      </div>

      <div className="flex-1">{children}</div>

      <footer className="mt-8 border-t border-border pt-3 text-[10.5px] leading-snug text-noche-500">
        {pie ? <div className="mb-1">{pie}</div> : null}
        <p>
          {APP.municipio} · {APP.direccion} · {APP.contacto.email} · Documento generado por {APP.nombre}
        </p>
      </footer>
    </article>
  );
}

/** Bloque de firma para documentos impresos. */
export function Firma({ titulo, detalle }: { titulo: string; detalle?: React.ReactNode }) {
  return (
    <div className="flex min-w-48 flex-col items-center gap-1 pt-12 text-center text-[11px] text-noche-600">
      <span className="w-full border-t border-noche-400" />
      <span className="font-semibold text-noche-800">{titulo}</span>
      {detalle ? <span>{detalle}</span> : null}
    </div>
  );
}
