import { ArchiveRestore, Ban, ChevronDown, History, Landmark, Receipt, Scale } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConceptoArancel, CuentaRecaudadora } from "@/lib/data/admin";
import { formatFecha, formatPesos } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { AccionConfirmada } from "../_compartido/acciones-cliente";
import { cambiarEstadoConcepto } from "../actions";
import { DialogoNuevaVersion, DialogoNuevoConcepto } from "./dialogos-arancel";

type Props = {
  conceptos: ConceptoArancel[];
  cuentas: CuentaRecaudadora[];
  editable: boolean;
  hoy: string;
};

export function SeccionAranceles({ conceptos, cuentas, editable, hoy }: Props) {
  const grupos = cuentas
    .map((cuenta) => ({ cuenta, conceptos: conceptos.filter((c) => c.cuenta?.id === cuenta.id) }))
    .filter((g) => g.conceptos.length > 0);
  const sinCuenta = conceptos.filter((c) => !c.cuenta);

  return (
    <div className="flex flex-col gap-6">
      <Alert tone="info" title="Los importes se actualizan con cada Ordenanza Tarifaria">
        Cuando se sanciona una nueva Ordenanza Tarifaria, cargá una <strong>nueva versión</strong> de cada concepto con
        su fecha de vigencia: la versión anterior se cierra automáticamente el día previo y queda en el historial. Las
        liquidaciones toman el importe vigente a la fecha en que se generan (Art. 11.º, Ord. 2681/98).
      </Alert>

      {editable ? (
        <div className="flex justify-end">
          <DialogoNuevoConcepto cuentas={cuentas} hoy={hoy} />
        </div>
      ) : null}

      {conceptos.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No hay conceptos de cobro cargados"
          description="Cargá los conceptos de la Ordenanza Tarifaria vigente para poder liquidar el timbrado."
        />
      ) : null}

      {grupos.map(({ cuenta, conceptos: lista }) => (
        <SectionCard
          key={cuenta.id}
          title={`Cuenta ${cuenta.codigo} · ${cuenta.nombre}`}
          description={`${cuenta.banco} · ${lista.length} ${lista.length === 1 ? "concepto" : "conceptos"}`}
          icon={Landmark}
          flush
        >
          <ul className="divide-y divide-border">
            {lista.map((c) => (
              <FilaConcepto key={c.codigo} concepto={c} cuentas={cuentas} editable={editable} hoy={hoy} />
            ))}
          </ul>
        </SectionCard>
      ))}

      {sinCuenta.length > 0 ? (
        <SectionCard title="Sin cuenta asignada" icon={Landmark} flush>
          <ul className="divide-y divide-border">
            {sinCuenta.map((c) => (
              <FilaConcepto key={c.codigo} concepto={c} cuentas={cuentas} editable={editable} hoy={hoy} />
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

function FilaConcepto({
  concepto: c,
  cuentas,
  editable,
  hoy,
}: {
  concepto: ConceptoArancel;
  cuentas: CuentaRecaudadora[];
  editable: boolean;
  hoy: string;
}) {
  const referencia = c.vigente ?? c.versiones[0];
  const ultima = c.versiones[0];

  return (
    <li className={cn("flex flex-col gap-4 px-5 py-5 sm:px-6", !c.activo && "bg-subtle/60")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("font-semibold text-foreground", !c.activo && "text-muted-foreground line-through")}>
              {c.concepto}
            </h3>
            {c.activo ? null : (
              <Badge tone="neutral" size="sm">
                De baja
              </Badge>
            )}
            {c.activo && !c.vigente ? (
              <Badge tone="ambar" size="sm" dot>
                Sin importe vigente hoy
              </Badge>
            ) : null}
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            <span className="font-mono text-xs">{c.codigo}</span>
            <span className="inline-flex items-center gap-1">
              <Scale className="size-3.5" aria-hidden />
              Ord. {referencia.ordenanza} · {referencia.articulo}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:justify-end">
          <div className="flex flex-col items-start lg:items-end">
            <span className="font-display text-2xl leading-none font-semibold tracking-tight nums-tabular text-foreground">
              {c.vigente ? formatPesos(c.vigente.importe) : "—"}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {c.unidad}
              {c.vigente ? ` · desde ${formatFecha(c.vigente.vigente_desde)}` : ""}
            </span>
          </div>
          {editable ? (
            <div className="flex flex-wrap gap-2">
              {c.activo ? (
                <DialogoNuevaVersion
                  codigo={c.codigo}
                  concepto={c.concepto}
                  ultima={ultima}
                  importeVigente={c.vigente ? Number(c.vigente.importe) : null}
                  cuentas={cuentas}
                  hoy={hoy}
                />
              ) : null}
              <AccionConfirmada
                accion={cambiarEstadoConcepto}
                campos={{ codigo: c.codigo, activo: c.activo ? "false" : "true" }}
                titulo={c.activo ? `¿Dar de baja "${c.concepto}"?` : `¿Reactivar "${c.concepto}"?`}
                descripcion={
                  c.activo
                    ? "No se podrá incluir en nuevas liquidaciones. Las liquidaciones ya emitidas y el historial de importes se conservan."
                    : "Vuelve a estar disponible para liquidar con su importe vigente."
                }
                confirmar={c.activo ? "Dar de baja" : "Reactivar"}
                tono={c.activo ? "danger" : "primary"}
                trigger={
                  <Button size="sm" variant="ghost" className={c.activo ? "text-muted-foreground hover:text-danger" : undefined}>
                    {c.activo ? <Ban aria-hidden /> : <ArchiveRestore aria-hidden />}
                    {c.activo ? "Dar de baja" : "Reactivar"}
                  </Button>
                }
              />
            </div>
          ) : null}
        </div>
      </div>

      {c.proxima ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-celeste-200 bg-celeste-50/70 px-3 py-2 text-[13px] text-celeste-900">
          <Badge tone="celeste" size="sm" dot pulse>
            Programado
          </Badge>
          Desde el {formatFecha(c.proxima.vigente_desde)} rige {formatPesos(c.proxima.importe)} (Ord. {c.proxima.ordenanza}).
        </div>
      ) : null}

      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <History className="size-4" aria-hidden />
          Historial de versiones ({c.versiones.length})
          <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <ol className="flex flex-col border-t border-border">
          {c.versiones.map((v, i) => {
            const anterior = c.versiones[i + 1];
            const variacion =
              anterior && Number(anterior.importe) > 0
                ? ((Number(v.importe) - Number(anterior.importe)) / Number(anterior.importe)) * 100
                : null;
            const esVigente = c.vigente?.id === v.id;
            const esFutura = v.vigente_desde > hoy;
            return (
              <li
                key={v.id}
                className={cn(
                  "grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 px-3 py-2.5 text-[13px] sm:grid-cols-[auto_1fr_auto]",
                  i > 0 && "border-t border-dashed border-border",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2 rounded-full",
                    esVigente ? "bg-emerald-500" : esFutura ? "bg-celeste-500" : "bg-noche-300",
                  )}
                />
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium text-foreground">
                    {formatFecha(v.vigente_desde)} → {v.vigente_hasta ? formatFecha(v.vigente_hasta) : "sin fecha de fin"}
                    {esVigente ? (
                      <Badge tone="verde" size="sm" className="ml-2 align-middle">
                        Vigente
                      </Badge>
                    ) : esFutura ? (
                      <Badge tone="celeste" size="sm" className="ml-2 align-middle">
                        Futura
                      </Badge>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">
                    Ord. {v.ordenanza} · {v.articulo} · {v.unidad}
                  </span>
                </div>
                <div className="col-start-2 flex items-baseline gap-2 sm:col-start-3 sm:justify-end">
                  <span className="font-semibold nums-tabular text-foreground">{formatPesos(v.importe)}</span>
                  {variacion !== null ? (
                    <span className={cn("text-xs nums-tabular", variacion > 0 ? "text-amber-700" : "text-emerald-700")}>
                      {variacion > 0 ? "+" : ""}
                      {variacion.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </details>
    </li>
  );
}
