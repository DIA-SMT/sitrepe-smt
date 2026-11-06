import { ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Acceso al listado oficial de ANMAT de desinfestantes y plaguicidas de venta profesional, para que empresas y
 * personal confirmen que un producto está autorizado. `compacto` es un enlace en línea (diálogos, ayudas).
 */
export function EnlaceAnmat({ compacto = false, className }: { compacto?: boolean; className?: string }) {
  if (compacto) {
    return (
      <a
        href={APP.enlaces.anmatProductos}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("inline-flex items-center gap-1 font-medium text-azul-700 underline-offset-2 hover:underline", className)}
      >
        Consultá el listado oficial de ANMAT
        <ExternalLink className="size-3.5" aria-hidden />
        <span className="sr-only">(se abre en una pestaña nueva)</span>
      </a>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-card border border-azul-100 bg-azul-50/60 p-4 sm:flex-row sm:items-center sm:p-5",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-azul-600 shadow-xs ring-1 ring-azul-100"
      >
        <ShieldCheck className="size-5" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-semibold text-foreground">Productos autorizados por ANMAT</p>
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
          Solo se pueden aplicar productos con registro vigente. Ante cualquier duda, consultá el listado oficial de
          desinfestantes y plaguicidas de venta profesional de la ANMAT.
        </p>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <a href={APP.enlaces.anmatProductos} target="_blank" rel="noopener noreferrer">
          Ver listado de ANMAT
          <ExternalLink aria-hidden />
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
      </Button>
    </div>
  );
}
