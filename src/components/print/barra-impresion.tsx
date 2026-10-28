import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotonImprimir } from "./boton-imprimir";

/** Barra superior de las vistas de impresión (no se imprime). */
export function BarraImpresion({ volverHref, volverTexto = "Volver", children }: {
  volverHref: string;
  volverTexto?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="no-print mx-auto mb-5 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 sm:px-0">
      <Button asChild variant="outline" size="sm">
        <Link href={volverHref}>
          <ArrowLeft aria-hidden /> {volverTexto}
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <BotonImprimir />
      </div>
    </div>
  );
}
