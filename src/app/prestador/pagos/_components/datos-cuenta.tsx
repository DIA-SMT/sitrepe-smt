import { Landmark } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import type { CuentaRecaudadora } from "@/lib/data/pagos";
import { MEDIO_PAGO } from "@/lib/domain/etiquetas";
import { BotonCopiar } from "./boton-copiar";

/** Datos de la cuenta recaudadora (Banco Macro) con botones para copiar CBU y N.º de cuenta. */
export function DatosCuenta({
  cuenta,
  codigo,
  banco,
  cbu,
  nombre,
  instrucciones = true,
}: {
  cuenta: CuentaRecaudadora | null;
  /** Respaldo desde v_pagos si no se pudo leer la cuenta. */
  codigo: string | null;
  banco: string | null;
  cbu: string | null;
  nombre: string | null;
  /** Muestra cómo pagar (solo tiene sentido mientras la liquidación está por pagarse). */
  instrucciones?: boolean;
}) {
  const cbuFinal = cuenta?.cbu ?? cbu;
  const medios = cuenta?.medios_pago ?? [];
  const esTransferencia = medios.includes("transferencia");

  return (
    <SectionCard
      title={`Cuenta ${cuenta?.codigo ?? codigo ?? "—"}`}
      description={cuenta?.nombre ?? nombre ?? undefined}
      icon={Landmark}
    >
      <dl className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Banco</dt>
          <dd className="text-sm font-medium text-foreground">{cuenta?.banco ?? banco ?? "—"}</dd>
        </div>
        {cuenta?.numero_cuenta ? (
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">N.º de cuenta</dt>
            <dd className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-semibold text-foreground">{cuenta.numero_cuenta}</span>
              <BotonCopiar texto={cuenta.numero_cuenta} etiqueta="N.º de cuenta" />
            </dd>
          </div>
        ) : null}
        {cbuFinal ? (
          <div className="flex flex-col gap-1.5">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">CBU</dt>
            <dd className="flex flex-col gap-2 rounded-xl border border-azul-100 bg-azul-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono text-[15px] font-semibold tracking-wider break-all text-azul-800">{cbuFinal}</span>
              <BotonCopiar texto={cbuFinal} etiqueta="CBU" />
            </dd>
          </div>
        ) : null}
        {medios.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Medios admitidos</dt>
            <dd className="flex flex-wrap gap-1.5">
              {medios.map((m) => (
                <Badge key={m} tone={MEDIO_PAGO[m].tono} size="sm">
                  {MEDIO_PAGO[m].label}
                </Badge>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
      {instrucciones ? (
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
          {esTransferencia
            ? "Transferí el importe exacto desde la cuenta de tu empresa y guardá el comprobante para informarlo."
            : "Generá la boleta con tu CUIT/CUIL en el sistema de Rentas o pagá por plataformas electrónicas (Rapipago, Pago Fácil, billeteras virtuales)."}
        </p>
      ) : null}
    </SectionCard>
  );
}
