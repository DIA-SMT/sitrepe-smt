"use client";

import { useId } from "react";
import { Check, MessageSquareText, Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { useAccion } from "@/components/shared/use-accion";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { EstadoDenunciaPublico } from "@/lib/data/portal";
import { ESTADO_DENUNCIA, TIPO_DENUNCIA } from "@/lib/domain/etiquetas";
import { formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { enviarSinReiniciar } from "../../_lib/formulario";
import { consultarDenunciaAccion } from "../actions";

const PASOS: { estado: EstadoDenunciaPublico["estado"]; label: string }[] = [
  { estado: "recibida", label: "Recibida" },
  { estado: "en_curso", label: "En análisis" },
  { estado: "inspeccion_programada", label: "Inspección" },
  { estado: "cerrada", label: "Cerrada" },
];

/** Consulta pública del estado de una denuncia por su código. */
export function ConsultaDenuncia({ codigoInicial = "" }: { codigoInicial?: string }) {
  const id = useId();
  const [estado, accion] = useAccion(consultarDenunciaAccion, { silenciarExito: true });
  const d = estado.ok ? estado.datos : undefined;

  return (
    <div className="flex flex-col gap-4">
      <form action={accion} onSubmit={enviarSinReiniciar(accion)} noValidate className="flex flex-col gap-3">
        <Field
          htmlFor={`${id}-codigo`}
          label="Código de la denuncia"
          error={estado.errores?.codigo?.[0] ?? (!estado.ok && estado.mensaje && !estado.errores ? estado.mensaje : undefined)}
        >
          <Input
            id={`${id}-codigo`}
            name="codigo"
            defaultValue={codigoInicial}
            placeholder="DEN-2026-000123-7F3A9C21"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={30}
            className="font-mono tracking-wide uppercase placeholder:font-sans placeholder:normal-case"
            leading={<Search aria-hidden />}
          />
        </Field>
        <SubmitButton variant="secondary" pendingText="Consultando…">
          Consultar estado
        </SubmitButton>
      </form>

      {d ? <ResultadoDenuncia d={d} /> : null}
    </div>
  );
}

function ResultadoDenuncia({ d }: { d: EstadoDenunciaPublico }) {
  const estado = ESTADO_DENUNCIA[d.estado];
  const desestimada = d.estado === "desestimada";
  const indice = PASOS.findIndex((p) => p.estado === d.estado);

  return (
    <div className="animate-fade-up rounded-xl border border-border bg-card p-4 shadow-xs" role="status" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold text-foreground">{d.codigo}</p>
          <p className="text-[13px] text-muted-foreground">{TIPO_DENUNCIA[d.tipo].label}</p>
        </div>
        <StatusBadge label={estado.label} tone={estado.tono} pulse={d.estado === "en_curso" || d.estado === "inspeccion_programada"} />
      </div>

      {desestimada ? (
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          La Dirección analizó la denuncia y la desestimó.
        </p>
      ) : (
        <ol className="mt-5 grid grid-cols-4 gap-1" aria-label="Avance de la denuncia">
          {PASOS.map((p, i) => {
            const hecho = i <= indice;
            const actual = i === indice;
            return (
              <li key={p.estado} className="flex flex-col items-center gap-1.5 text-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-semibold ring-2 transition-colors",
                    hecho ? "bg-azul-600 text-white ring-azul-100" : "bg-muted text-muted-foreground ring-transparent",
                    actual && "ring-azul-200",
                  )}
                  aria-hidden
                >
                  {hecho && !actual ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn("text-[11px] leading-tight", actual ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {p.label}
                  {actual ? <span className="sr-only"> (estado actual)</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-[13px]">
        <div>
          <dt className="text-muted-foreground">Recibida</dt>
          <dd className="font-medium text-foreground">{formatFechaHora(d.creada)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Última novedad</dt>
          <dd className="font-medium text-foreground">{d.actualizada ? formatRelativo(d.actualizada) : "—"}</dd>
        </div>
      </dl>

      {d.respuesta ? (
        <div className="mt-4 flex gap-2.5 rounded-lg bg-azul-50 p-3 text-[13px] leading-relaxed text-azul-900">
          <MessageSquareText className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="whitespace-pre-line">
            <span className="font-semibold">Respuesta de la Dirección: </span>
            {d.respuesta}
          </p>
        </div>
      ) : null}
    </div>
  );
}
