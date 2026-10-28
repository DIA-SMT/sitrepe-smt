import { BadgeCheck, Landmark, ReceiptText, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const PASOS: { icono: LucideIcon; titulo: string; texto: string }[] = [
  {
    icono: ReceiptText,
    titulo: "Generá la liquidación",
    texto: "Elegí los certificados controlados por el área.",
  },
  {
    icono: Landmark,
    titulo: "Pagá el arancel",
    texto: "Transferencia a la cuenta 505 del Banco Macro.",
  },
  {
    icono: Send,
    titulo: "Informá el pago",
    texto: "Cargá el N.º de operación y el comprobante.",
  },
  {
    icono: BadgeCheck,
    titulo: "Sellado digital",
    texto: "La Dirección verifica y timbra cada certificado.",
  },
];

/** Recorrido del timbrado en cuatro pasos (Art. 9.º b, Ord. 2681/98). */
export function PasosTimbrado({ className }: { className?: string }) {
  return (
    <ol
      aria-label="Cómo funciona el timbrado"
      className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}
    >
      {PASOS.map((paso, i) => {
        const Icono = paso.icono;
        return (
          <li
            key={paso.titulo}
            className="group relative flex items-start gap-3 overflow-hidden rounded-card border border-border bg-card p-4 shadow-card"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-3 -right-1 font-display text-6xl leading-none font-bold text-azul-50 transition-colors group-hover:text-celeste-100"
            >
              {i + 1}
            </span>
            <span
              aria-hidden
              className={cn(
                "relative flex size-9 shrink-0 items-center justify-center rounded-xl",
                i === PASOS.length - 1 ? "bg-sol-400 text-noche-950" : "bg-gradient-brand text-white shadow-brand",
              )}
            >
              <Icono className="size-[18px]" strokeWidth={1.9} />
            </span>
            <span className="relative flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">
                <span className="sr-only">Paso {i + 1}: </span>
                {paso.titulo}
              </span>
              <span className="text-[13px] leading-snug text-muted-foreground">{paso.texto}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
