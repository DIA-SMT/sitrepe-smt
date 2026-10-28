import { Scale } from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { pesosEnLetras } from "@/lib/domain/numeros-a-letras";
import { formatPesos } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

type Props = {
  titulo?: string;
  total: number | null;
  cantidad: number | null;
  unitario: number | null;
  unidad?: string;
  concepto: string | null;
  ordenanza: string | null;
  articulo: string | null;
  className?: string;
};

/**
 * Tarjeta destacada con el importe de una liquidación: cantidad × importe = total,
 * el total en letras y la norma que lo fija. Se usa en el portal de prestadores y en gestión.
 */
export function ResumenImporte({
  titulo = "Total a pagar",
  total,
  cantidad,
  unitario,
  unidad = "c/u",
  concepto,
  ordenanza,
  articulo,
  className,
}: Props) {
  const importe = Number(total ?? 0);
  return (
    <div className={cn("relative overflow-hidden rounded-card bg-noche p-5 text-white shadow-elevated sm:p-6", className)}>
      <PetalDecor variant="corner" tone="dark" />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-[0.12em] text-celeste-200 uppercase">{titulo}</p>
          <p className="font-display text-4xl leading-none font-bold tracking-tight nums-tabular sm:text-[2.6rem]">
            {formatPesos(importe)}
          </p>
          <p className="mt-1 text-[11px] leading-snug font-medium tracking-wide text-noche-200">{pesosEnLetras(importe)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15 nums-tabular">
            <span className="font-semibold">{cantidad ?? 0}</span>
            <span className="text-noche-200">×</span>
            <span className="font-semibold">{formatPesos(unitario)}</span>
            <span className="text-noche-200">{unidad}</span>
          </span>
        </div>
        <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
          <p className="text-sm font-semibold text-white">{concepto ?? "Arancel"}</p>
          <p className="flex items-start gap-1.5 text-[13px] text-noche-200">
            <Scale className="mt-0.5 size-3.5 shrink-0 text-sol-400" aria-hidden />
            <span>
              Ord. Tarifaria {ordenanza ?? "—"}
              {articulo ? `, ${articulo}` : null}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
