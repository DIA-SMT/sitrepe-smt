import Link from "next/link";
import { ArrowRight, Landmark } from "lucide-react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { Card } from "@/components/ui/card";
import { formatPesos } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

/** Recaudación verificada del mes, abierta por cuenta recaudadora (505 y 091). */
export function RecaudacionMes({
  mes,
  total,
  c505,
  c091,
}: {
  mes: string;
  total: number;
  c505: number;
  c091: number;
}) {
  const cuentas = [
    { codigo: "505", nombre: "Cuenta Especial de Salud Ambiental", valor: c505, tono: "azul" as const },
    { codigo: "091", nombre: "Compartida con Bromatología y Ambiente", valor: c091, tono: "sol" as const },
  ];
  const base = Math.max(total, c505 + c091, 1);

  return (
    <Card className="relative h-full gap-5 overflow-hidden p-5 sm:p-6">
      <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Recaudado en {mes}</p>
          <p className="mt-1 text-[2rem] leading-none font-semibold tracking-tight text-foreground">
            <AnimatedNumber value={total} format="currency" />
          </p>
          <p className="mt-2 text-[13px] text-muted-foreground">Pagos verificados (conciliados) del mes en curso</p>
        </div>
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
        >
          <Landmark className="size-5" strokeWidth={1.9} />
        </span>
      </div>

      <ul className="relative flex flex-col gap-4">
        {cuentas.map((c) => (
          <li key={c.codigo} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="font-semibold text-foreground">Cuenta {c.codigo}</span>
                <span className="ml-1.5 hidden text-xs text-muted-foreground sm:inline">{c.nombre}</span>
              </span>
              <span className="font-semibold text-foreground nums-tabular">{formatPesos(c.valor)}</span>
            </div>
            <div aria-hidden className={cn("h-2 w-full overflow-hidden rounded-full", c.tono === "azul" ? "bg-azul-100" : "bg-sol-100")}>
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700 ease-out",
                  c.tono === "azul" ? "bg-linear-to-r from-azul-600 to-celeste-400" : "bg-sol-400",
                )}
                style={{ width: `${Math.min(100, (c.valor / base) * 100)}%` }}
              />
            </div>
            <span className="sr-only">
              {Math.round((c.valor / base) * 100)} % del total recaudado en la cuenta {c.codigo}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/gestion/reportes/recaudacion"
        className="relative mt-auto inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-azul-700 transition-colors hover:text-azul-800"
      >
        Ver informe de recaudación
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}
