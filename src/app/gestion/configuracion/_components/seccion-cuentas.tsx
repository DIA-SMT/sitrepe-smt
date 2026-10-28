import { Banknote, Landmark, Receipt } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { Badge } from "@/components/ui/badge";
import type { ConceptoArancel, CuentaRecaudadora } from "@/lib/data/admin";
import { MEDIO_PAGO } from "@/lib/domain/etiquetas";
import { formatPesos } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { DialogoCuenta } from "./dialogo-cuenta";

function formatoCbu(cbu: string): string {
  return cbu.length === 22 ? `${cbu.slice(0, 8)} ${cbu.slice(8)}` : cbu;
}

type Props = { cuentas: CuentaRecaudadora[]; conceptos: ConceptoArancel[]; editable: boolean };

export function SeccionCuentas({ cuentas, conceptos, editable }: Props) {
  if (cuentas.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="No hay cuentas recaudadoras cargadas"
        description="Las cuentas se cargan con la configuración inicial del sistema."
      />
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {cuentas.map((cuenta) => {
        const asociados = conceptos.filter((c) => c.cuenta?.id === cuenta.id && c.activo);
        return (
          <article
            key={cuenta.id}
            className={cn(
              "flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card",
              !cuenta.activo && "opacity-75",
            )}
          >
            <div className="relative overflow-hidden bg-noche-950 px-5 py-5 text-white sm:px-6">
              <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-azul-500/40 blur-3xl" />
              <span aria-hidden className="pointer-events-none absolute -bottom-20 left-10 size-40 rounded-full bg-celeste-400/25 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs tracking-wide text-white/70 uppercase">{cuenta.banco}</span>
                  <h3 className="font-display text-lg leading-snug font-semibold">{cuenta.nombre}</h3>
                </div>
                <span className="font-display text-3xl font-semibold tracking-tight text-sol-400">{cuenta.codigo}</span>
              </div>
              <dl className="relative mt-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] tracking-wide text-white/60 uppercase">N.º de cuenta</dt>
                  <dd className="font-mono text-sm">{cuenta.numero_cuenta}</dd>
                </div>
                <div>
                  <dt className="text-[11px] tracking-wide text-white/60 uppercase">CBU</dt>
                  <dd className="font-mono text-sm break-all">{formatoCbu(cuenta.cbu)}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {cuenta.activo ? (
                  <Badge tone="verde" dot>
                    Activa
                  </Badge>
                ) : (
                  <Badge tone="neutral">Inactiva</Badge>
                )}
                {cuenta.medios_pago.map((m) => (
                  <EstadoBadge key={m} mapa={MEDIO_PAGO} valor={m} size="sm" />
                ))}
              </div>
              {cuenta.descripcion ? <p className="text-sm leading-relaxed text-muted-foreground">{cuenta.descripcion}</p> : null}
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Receipt className="size-3.5" aria-hidden />
                  Conceptos que se cobran ({asociados.length})
                </p>
                {asociados.length ? (
                  <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                    {asociados.map((c) => (
                      <li key={c.codigo} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                        <span className="min-w-0 truncate text-foreground">{c.concepto}</span>
                        <span className="shrink-0 font-medium nums-tabular">{c.vigente ? formatPesos(c.vigente.importe) : "—"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-muted-foreground">Ningún concepto activo usa esta cuenta.</p>
                )}
              </div>
              {editable ? (
                <div className="mt-auto flex justify-end border-t border-border pt-4">
                  <DialogoCuenta cuenta={cuenta} />
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
      <p className="flex items-start gap-2 text-[13px] text-muted-foreground lg:col-span-2">
        <Banknote className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
        El medio de pago de cada liquidación depende de la cuenta de sus conceptos: transferencia a la 505; boleta de
        Rentas o plataformas electrónicas para la 091.
      </p>
    </div>
  );
}
