"use client";

import { useId, useState, useTransition } from "react";
import { CheckCircle2, CircleSlash, Crosshair, DoorClosed, LoaderCircle, MapPin, Save, X, XCircle } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { useGeolocalizacion } from "@/components/mapa/use-geolocalizacion";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { registrarResultado } from "../actions";
import type { ItemChecklist } from "./checklist";

type Respuesta = "si" | "no" | "na";
type Resultado = Enums<"resultado_inspeccion">;

const OPCIONES_RESPUESTA: { valor: Respuesta; label: string; activa: string }[] = [
  { valor: "si", label: "Cumple", activa: "bg-emerald-600 text-white ring-emerald-600" },
  { valor: "no", label: "No cumple", activa: "bg-red-600 text-white ring-red-600" },
  { valor: "na", label: "N/A", activa: "bg-noche-600 text-white ring-noche-600" },
];

const OPCIONES_RESULTADO: { valor: Resultado; label: string; ayuda: string; icono: typeof CheckCircle2; activa: string }[] = [
  {
    valor: "conforme",
    label: "Conforme",
    ayuda: "Todo en regla",
    icono: CheckCircle2,
    activa: "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/30",
  },
  {
    valor: "no_conforme",
    label: "No conforme",
    ayuda: "Hay irregularidades",
    icono: XCircle,
    activa: "border-red-500 bg-red-50 text-red-900 ring-2 ring-red-500/30",
  },
  {
    valor: "ausente",
    label: "Ausente / cerrado",
    ayuda: "No se pudo inspeccionar",
    icono: DoorClosed,
    activa: "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/30",
  },
];

export function FormResultado({ inspeccionId, items }: { inspeccionId: string; items: ItemChecklist[] }) {
  const id = useId();
  const [respuestas, setRespuestas] = useState<Record<string, Respuesta | undefined>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [resultadoManual, setResultadoManual] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const geo = useGeolocalizacion();
  const [estado, accion, pendiente] = useAccion(registrarResultado);
  const [, startTransition] = useTransition();

  const respondidos = items.filter((i) => respuestas[i.clave]).length;
  const incumplidos = items.filter((i) => respuestas[i.clave] === "no");
  const posicion = geo.estado.tipo === "ok" ? geo.estado.posicion : null;
  const err = (campo: string) => estado.errores?.[campo]?.[0];

  const responder = (clave: string, valor: Respuesta) => {
    const nuevas = { ...respuestas, [clave]: valor };
    setRespuestas(nuevas);
    if (resultadoManual) return;
    const valores = items.map((i) => nuevas[i.clave]);
    if (valores.includes("no")) setResultado("no_conforme");
    else if (valores.every(Boolean) && valores.includes("si")) setResultado("conforme");
    else setResultado(null);
  };

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos));
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-7" noValidate>
      <input type="hidden" name="id" value={inspeccionId} />

      {items.length > 0 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 flex w-full flex-col gap-2">
            <span className="font-display text-base font-semibold text-foreground">Verificaciones</span>
            <Progress
              value={respondidos}
              max={items.length}
              size="sm"
              tone={incumplidos.length > 0 ? "rojo" : respondidos === items.length ? "verde" : "azul"}
              label={`${respondidos} de ${items.length} verificados${incumplidos.length > 0 ? ` · ${incumplidos.length} no cumple${incumplidos.length === 1 ? "" : "n"}` : ""}`}
            />
          </legend>
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => {
              const valor = respuestas[item.clave];
              return (
                <li
                  key={item.clave}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border bg-card p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between",
                    valor === "no" ? "border-red-200 bg-red-50/40" : valor === "si" ? "border-emerald-200 bg-emerald-50/30" : "border-border",
                  )}
                >
                  <div className="min-w-0">
                    <p id={`${id}-${item.clave}`} className="text-[15px] leading-snug font-medium text-foreground">
                      {item.label}
                    </p>
                    {item.ayuda ? <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{item.ayuda}</p> : null}
                  </div>
                  <div role="radiogroup" aria-labelledby={`${id}-${item.clave}`} className="grid shrink-0 grid-cols-3 gap-1.5 sm:w-64">
                    {OPCIONES_RESPUESTA.map((o) => (
                      <label key={o.valor} className="relative">
                        <input
                          type="radio"
                          name={`check_${item.clave}`}
                          value={o.valor}
                          checked={valor === o.valor}
                          onChange={() => responder(item.clave, o.valor)}
                          className="peer sr-only"
                        />
                        <span
                          className={cn(
                            "flex h-11 cursor-pointer items-center justify-center rounded-lg px-2 text-sm font-semibold ring-1 transition-all select-none",
                            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                            valor === o.valor ? o.activa : "bg-card text-muted-foreground ring-border-strong hover:bg-muted",
                          )}
                        >
                          {o.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-display text-base font-semibold text-foreground">
          Resultado <span className="text-danger" aria-hidden>*</span>
        </legend>
        <div role="radiogroup" aria-required className="grid gap-2.5 sm:grid-cols-3">
          {OPCIONES_RESULTADO.map((o) => {
            const Icono = o.icono;
            const activa = resultado === o.valor;
            return (
              <label key={o.valor} className="relative">
                <input
                  type="radio"
                  name="resultado"
                  value={o.valor}
                  checked={activa}
                  onChange={() => {
                    setResultado(o.valor);
                    setResultadoManual(true);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all select-none",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                    activa ? o.activa : "border-border-strong hover:border-azul-300 hover:bg-azul-50/40",
                  )}
                >
                  <Icono className="size-6 shrink-0" aria-hidden />
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold">{o.label}</span>
                    <span className="text-xs opacity-80">{o.ayuda}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {err("resultado") ? (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {err("resultado")}
          </p>
        ) : !resultadoManual && resultado ? (
          <p className="text-[13px] text-muted-foreground">Sugerido según las verificaciones: podés cambiarlo.</p>
        ) : null}
      </fieldset>

      <Field
        htmlFor={`${id}-obs`}
        label="Observaciones"
        required={resultado !== null && resultado !== "conforme"}
        error={err("observaciones")}
        hint={
          resultado === "no_conforme"
            ? "Detallá las irregularidades: van a servir de base para el acta."
            : "Persona que atendió, DNI, lo que constataste."
        }
      >
        <Textarea
          id={`${id}-obs`}
          name="observaciones"
          rows={4}
          maxLength={4000}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </Field>

      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border-strong p-3.5">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="size-4 text-azul-600" aria-hidden /> Ubicación de la inspección <span className="font-normal text-muted-foreground">(opcional)</span>
        </p>
        {posicion ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input type="hidden" name="lat" value={posicion.lat} />
            <input type="hidden" name="lng" value={posicion.lng} />
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200 nums-tabular">
              {posicion.lat.toFixed(5)}, {posicion.lng.toFixed(5)}
              {posicion.precision !== null ? ` · ±${posicion.precision} m` : ""}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={geo.limpiar}>
              <X aria-hidden /> Quitar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="secondary"
              onClick={() => geo.obtener()}
              disabled={geo.estado.tipo === "buscando"}
              className="sm:w-fit"
            >
              {geo.estado.tipo === "buscando" ? <LoaderCircle className="animate-spin" aria-hidden /> : <Crosshair aria-hidden />}
              Registrar mi ubicación
            </Button>
            <p aria-live="polite" className="text-[13px] text-muted-foreground">
              {geo.estado.tipo === "error" ? (
                <span className="inline-flex items-center gap-1 text-danger">
                  <CircleSlash className="size-3.5" aria-hidden /> {geo.estado.mensaje}
                </span>
              ) : (
                "Deja constancia de que la visita se hizo en el lugar."
              )}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-5">
        <Button type="submit" size="lg" loading={pendiente} className="w-full sm:w-auto">
          {pendiente ? null : <Save aria-hidden />}
          {pendiente ? "Guardando…" : "Guardar resultado"}
        </Button>
      </div>
    </form>
  );
}
