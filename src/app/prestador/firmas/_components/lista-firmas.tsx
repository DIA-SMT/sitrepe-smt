"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, FlaskConical, MapPin, MessageSquareWarning, TriangleAlert } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ESTADO_DECLARACION, TIPO_SERVICIO_CORTO } from "@/lib/domain/etiquetas";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { BotonFirmar } from "../../declaraciones/_components/boton-firmar";

export type FilaFirma = {
  id: string;
  numero: string;
  tipo: Enums<"tipo_servicio">;
  cliente: string;
  domicilio: string;
  rubro: string | null;
  /** Fecha y hora ya formateadas (hora de Tucumán). */
  fecha: string;
  /** "Faltan 30 h", "Hace 2 días"… */
  cuando: string | null;
  medida: string;
  productos: string[];
  observacion: string | null;
  alerta: string | null;
};

export type GrupoFirma = {
  declaracionId: string | null;
  codigo: string;
  estado: Enums<"estado_declaracion"> | null;
  filas: FilaFirma[];
};

/** Selección múltiple de certificados pendientes y firma en lote. */
export function ListaFirmas({
  grupos,
  bloqueado = false,
}: {
  grupos: GrupoFirma[];
  /** El asesor no está aprobado por la Dirección: puede revisar, pero no firmar. */
  bloqueado?: boolean;
}) {
  const todos = useMemo(() => grupos.flatMap((g) => g.filas.map((f) => f.id)), [grupos]);
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set());
  // Solo cuentan los que siguen pendientes (después de firmar, la lista se actualiza sola).
  const elegidos = todos.filter((id) => seleccion.has(id));
  const todosElegidos = elegidos.length === todos.length && todos.length > 0;

  const alternar = (ids: string[], marcar: boolean) =>
    setSeleccion((prev) => {
      const nuevo = new Set(prev);
      for (const id of ids) {
        if (marcar) nuevo.add(id);
        else nuevo.delete(id);
      }
      return nuevo;
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-card">
        <Checkbox
          checked={todosElegidos}
          ref={(el) => {
            if (el) el.indeterminate = elegidos.length > 0 && !todosElegidos;
          }}
          onChange={(e) => alternar(todos, e.target.checked)}
          label={`Seleccionar todos (${todos.length})`}
        />
        <span aria-live="polite" className="text-sm text-muted-foreground">
          {elegidos.length === 0 ? "Ninguno seleccionado" : `${elegidos.length} seleccionado${elegidos.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {grupos.map((g) => {
        const ids = g.filas.map((f) => f.id);
        const marcados = ids.filter((id) => seleccion.has(id)).length;
        const completo = marcados === ids.length;
        return (
          <section key={g.declaracionId ?? g.codigo} className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-subtle/70 px-4 py-3 sm:px-5">
              <Checkbox
                checked={completo}
                ref={(el) => {
                  if (el) el.indeterminate = marcados > 0 && !completo;
                }}
                onChange={(e) => alternar(ids, e.target.checked)}
                aria-label={`Seleccionar los ${ids.length} certificados de ${g.codigo}`}
              />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-semibold text-foreground">{g.codigo}</h2>
                {g.estado ? <EstadoBadge mapa={ESTADO_DECLARACION} valor={g.estado} size="sm" /> : null}
                <span className="text-[13px] text-muted-foreground">
                  {ids.length} {ids.length === 1 ? "certificado" : "certificados"}
                </span>
              </div>
              {g.declaracionId ? (
                <Link
                  href={`/prestador/declaraciones/${g.declaracionId}`}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-azul-700 hover:text-azul-800"
                >
                  Ver planilla
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </header>
            <ul className="divide-y divide-border">
              {g.filas.map((f) => {
                const marcado = seleccion.has(f.id);
                return (
                  <li key={f.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors sm:px-5",
                        marcado ? "bg-azul-50/70" : "hover:bg-azul-50/40",
                      )}
                    >
                      <span className="mt-0.5">
                        <Checkbox
                          checked={marcado}
                          onChange={(e) => alternar([f.id], e.target.checked)}
                          aria-label={`Seleccionar el certificado N.º ${f.numero}`}
                        />
                      </span>
                      <span className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:gap-4">
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-display font-semibold text-foreground">N.º {f.numero}</span>
                            <Badge tone={f.tipo === "tanque" ? "celeste" : "azul"} size="sm">
                              {TIPO_SERVICIO_CORTO[f.tipo]}
                            </Badge>
                          </span>
                          <span className="block truncate text-sm font-medium text-foreground">{f.cliente}</span>
                          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" aria-hidden />
                            {f.domicilio}
                          </span>
                        </span>
                        <span className="min-w-0 text-[13px] text-muted-foreground">
                          <span className="block truncate">{f.rubro ?? "Sin rubro"}</span>
                          <span className="block">{f.medida}</span>
                          {f.productos.length > 0 ? (
                            <span className="flex items-start gap-1">
                              <FlaskConical className="mt-0.5 size-3 shrink-0" aria-hidden />
                              <span className="line-clamp-2">{f.productos.join(" · ")}</span>
                            </span>
                          ) : null}
                        </span>
                        <span className="flex flex-col gap-1 text-[13px] sm:items-end sm:text-right">
                          <span className="flex items-center gap-1 font-medium text-foreground nums-tabular">
                            <CalendarClock className="size-3.5 text-muted-foreground" aria-hidden />
                            {f.fecha}
                          </span>
                          {f.cuando ? <span className="text-xs text-muted-foreground">{f.cuando}</span> : null}
                        </span>
                        {f.alerta || f.observacion ? (
                          <span className="flex flex-col gap-1 sm:col-span-3">
                            {f.alerta ? (
                              <span className="flex items-start gap-1.5 text-xs font-medium text-warning">
                                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                                {f.alerta}
                              </span>
                            ) : null}
                            {f.observacion ? (
                              <span className="flex items-start gap-1.5 rounded-md bg-warning-soft px-2 py-1.5 text-xs text-amber-900">
                                <MessageSquareWarning className="mt-px size-3.5 shrink-0" aria-hidden />
                                Observación del área: {f.observacion}
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="sticky bottom-3 z-20 mt-2 flex flex-col items-stretch gap-3 rounded-panel border border-azul-200 bg-card/95 p-3 shadow-elevated backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-sm">
          <span className="font-semibold text-foreground">{elegidos.length}</span>{" "}
          <span className="text-muted-foreground">
            de {todos.length} {todos.length === 1 ? "certificado seleccionado" : "certificados seleccionados"}
          </span>
        </p>
        <BotonFirmar
          ids={elegidos}
          deshabilitado={bloqueado}
          variante="primary"
          tamanio="md"
          etiqueta={elegidos.length > 1 ? `Firmar ${elegidos.length} seleccionados` : "Firmar seleccionados"}
          titulo={elegidos.length === 1 ? "Firmar 1 certificado" : `Firmar ${elegidos.length} certificados`}
          alFirmar={() => setSeleccion(new Set())}
        />
      </div>
    </div>
  );
}
