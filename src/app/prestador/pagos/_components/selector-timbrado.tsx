"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCheck, Droplets, Info, MapPin, ReceiptText, SprayCan, Stamp, X } from "lucide-react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatFecha, formatPesos } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { generarLiquidacion } from "../actions";
import { enviarSinReiniciar } from "./enviar-sin-reiniciar";

export type CertificadoSeleccionable = {
  id: string;
  numero: string;
  cliente: string;
  domicilio: string;
  rubro: string | null;
  fechaServicio: string | null;
  declaracion: string | null;
};

export type ArancelResumen = {
  concepto: string;
  importe: number;
  unidad: string;
  ordenanza: string;
  articulo: string;
  cuenta: string | null;
};

type Props = {
  tipo: "fumigacion" | "tanque";
  titulo: string;
  arancel: ArancelResumen | null;
  certificados: CertificadoSeleccionable[];
};

/**
 * Selección de certificados controlados de un mismo tipo + vista previa del total
 * (cantidad × arancel vigente) y generación de la liquidación.
 */
export function SelectorTimbrado({ tipo, titulo, arancel, certificados }: Props) {
  const [marcados, setSeleccion] = useState<Set<string>>(() => new Set(certificados.map((c) => c.id)));
  const [estado, accion, pendiente] = useAccion(generarLiquidacion);
  const Icono = tipo === "tanque" ? Droplets : SprayCan;

  // Si la lista cambia (p. ej. otro usuario de la empresa ya liquidó alguno), se ignoran los que ya no están.
  const seleccion = useMemo(() => {
    const vigentes = new Set(certificados.map((c) => c.id));
    return new Set([...marcados].filter((id) => vigentes.has(id)));
  }, [marcados, certificados]);
  const cantidad = seleccion.size;
  // En centavos, para no arrastrar errores de punto flotante (la base calcula round(importe * cantidad, 2)).
  const total = (Math.round((arancel?.importe ?? 0) * 100) * cantidad) / 100;
  const todos = cantidad === certificados.length;

  const alternar = (id: string) =>
    setSeleccion((prev) => {
      const nueva = new Set(prev);
      if (nueva.has(id)) nueva.delete(id);
      else nueva.add(id);
      return nueva;
    });

  const alternarTodos = () => setSeleccion(todos ? new Set() : new Set(certificados.map((c) => c.id)));

  const errorSeleccion = estado.errores?.certificados?.[0];

  return (
    <Card className="overflow-hidden">
      <form onSubmit={enviarSinReiniciar(accion, pendiente)} aria-busy={pendiente || undefined} className="flex flex-col">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                tipo === "tanque" ? "bg-celeste-50 text-celeste-700 ring-celeste-200" : "bg-azul-50 text-azul-600 ring-azul-100",
              )}
            >
              <Icono className="size-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h3 className="flex flex-wrap items-center gap-2 font-display text-base leading-snug font-semibold text-foreground">
                {titulo}
                <Badge tone={tipo === "tanque" ? "celeste" : "azul"} size="sm">
                  {certificados.length} {certificados.length === 1 ? "certificado" : "certificados"}
                </Badge>
              </h3>
              {arancel ? (
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  {formatPesos(arancel.importe)} {arancel.unidad} · Ord. Tarifaria {arancel.ordenanza}, {arancel.articulo}
                  {arancel.cuenta ? ` · Cuenta ${arancel.cuenta}` : null}
                </p>
              ) : null}
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={alternarTodos} disabled={!arancel}>
            {todos ? <X aria-hidden /> : <CheckCheck aria-hidden />}
            {todos ? "Quitar selección" : "Seleccionar todos"}
          </Button>
        </div>

        {!arancel ? (
          <div className="p-5 sm:p-6">
            <Alert tone="warning" title="Arancel no configurado">
              No hay un arancel vigente para este concepto. Comunicate con la Dirección de Salud Ambiental para poder
              liquidar el timbrado.
            </Alert>
          </div>
        ) : (
          <fieldset className="min-w-0">
            <legend className="sr-only">Certificados de {titulo.toLowerCase()} para liquidar</legend>
            <ul className="max-h-[440px] divide-y divide-border overflow-y-auto" role="list">
              {certificados.map((c) => {
                const marcado = seleccion.has(c.id);
                return (
                  <li key={c.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 px-5 py-3.5 transition-colors sm:px-6",
                        marcado ? "bg-azul-50/60 hover:bg-azul-50" : "hover:bg-subtle",
                      )}
                    >
                      <span className="pt-0.5">
                        <Checkbox
                          name="certificados"
                          value={c.id}
                          checked={marcado}
                          onChange={() => alternar(c.id)}
                          aria-label={`Certificado N.º ${c.numero} · ${c.cliente}`}
                        />
                      </span>
                      <span className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-mono text-[13px] font-semibold text-azul-700">N.º {c.numero}</span>
                            <span className="truncate text-sm font-medium text-foreground">{c.cliente}</span>
                          </span>
                          {c.rubro ? <span className="block truncate text-xs text-muted-foreground">{c.rubro}</span> : null}
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{c.domicilio}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-[13px] whitespace-nowrap text-muted-foreground">
                          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                          {formatFecha(c.fechaServicio)}
                          {c.declaracion ? <span className="hidden text-xs lg:inline">· {c.declaracion}</span> : null}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        {arancel ? (
          <div className="flex flex-col gap-4 border-t border-border bg-gradient-brand-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground" aria-live="polite">
                <span className="nums-tabular font-medium text-foreground">
                  {cantidad} × {formatPesos(arancel.importe)}
                </span>
                <span aria-hidden>=</span>
                <span className="font-display text-2xl font-bold tracking-tight text-foreground nums-tabular">
                  <AnimatedNumber value={total} format="currency" duration={0.5} />
                </span>
              </p>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-px size-3.5 shrink-0 text-azul-600" aria-hidden />
                Se cobra una vez por certificado, no por ejemplar (original, duplicado y triplicado).
              </p>
            </div>
            <Button type="submit" disabled={cantidad === 0} loading={pendiente} className="sm:min-w-52">
              {pendiente ? null : cantidad === 0 ? <ReceiptText aria-hidden /> : <Stamp aria-hidden />}
              {pendiente ? "Generando…" : "Generar liquidación"}
            </Button>
          </div>
        ) : null}
        {errorSeleccion ? (
          <p role="alert" className="border-t border-border px-5 py-3 text-[13px] font-medium text-danger sm:px-6">
            {errorSeleccion}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
