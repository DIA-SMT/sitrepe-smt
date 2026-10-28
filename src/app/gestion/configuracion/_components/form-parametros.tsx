"use client";

import { useId, useState } from "react";
import { CalendarClock, Clock, type LucideIcon, Mail, MapPin, Save, Timer } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEnvio } from "../_compartido/use-envio";
import { guardarParametros } from "../actions";
import { type ClaveParametro, PARAMETROS_CONOCIDOS } from "./validaciones";

export type ValoresParametros = Record<ClaveParametro, string>;

type Props = {
  valores: ValoresParametros;
  editable: boolean;
};

/** Parámetros operativos: plazos de la declaración, vencimientos y datos de contacto. */
export function FormParametros({ valores, editable }: Props) {
  const id = useId();
  const f = (campo: string) => `${id}-${campo}`;
  const [min, setMin] = useState(valores.antelacion_min_horas);
  const [max, setMax] = useState(valores.antelacion_max_horas);
  const [estado, despachar, pendiente] = useAccion(guardarParametros);
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];

  const nMin = Number(min);
  const nMax = Number(max);
  const ventanaValida = Number.isFinite(nMin) && Number.isFinite(nMax) && nMax > nMin && nMin >= 0;
  const escala = Math.max(72, nMax || 0);

  const campoEntero = (clave: ClaveParametro, extra?: { value: string; onChange: (v: string) => void }) => {
    const meta = PARAMETROS_CONOCIDOS[clave];
    return (
      <Field
        htmlFor={f(clave)}
        label={meta.etiqueta}
        required
        error={error(clave)}
        hint={[meta.descripcion, meta.referencia].filter(Boolean).join(". ")}
      >
        <Input
          id={f(clave)}
          name={clave}
          type="number"
          inputMode="numeric"
          min={meta.min}
          max={meta.max}
          step={1}
          {...(extra
            ? { value: extra.value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => extra.onChange(e.target.value) }
            : { defaultValue: valores[clave] })}
          trailing={meta.unidad}
          disabled={!editable}
          required
        />
      </Field>
    );
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6" noValidate>
      {estado.mensaje && !estado.ok && !estado.errores ? (
        <Alert tone="danger" title="No se pudieron guardar los parámetros">
          {estado.mensaje}
        </Alert>
      ) : null}

      <Bloque icono={CalendarClock} titulo="Declaración anticipada de servicios" detalle="Art. 9.º a), Ord. 2681/98">
        <div className="grid gap-5 sm:grid-cols-2">
          {campoEntero("antelacion_min_horas", { value: min, onChange: setMin })}
          {campoEntero("antelacion_max_horas", { value: max, onChange: setMax })}
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-subtle p-4" aria-live="polite">
          <p className="text-[13px] text-muted-foreground">
            {ventanaValida ? (
              <>
                Las empresas pueden declarar un servicio entre{" "}
                <strong className="text-foreground">{nMax} y {nMin} horas antes</strong> de realizarlo.
              </>
            ) : (
              "La antelación máxima tiene que ser mayor que la mínima."
            )}
          </p>
          <div className="relative h-3 rounded-full bg-noche-100" aria-hidden>
            {ventanaValida ? (
              <span
                className="absolute inset-y-0 rounded-full bg-linear-to-r from-azul-600 to-celeste-400 transition-all duration-300"
                style={{ right: `${(nMin / escala) * 100}%`, left: `${100 - (nMax / escala) * 100}%` }}
              />
            ) : null}
            <span className="absolute top-1/2 right-0 size-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-sol-400 ring-2 ring-white" />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground nums-tabular" aria-hidden>
            <span>{escala} h antes</span>
            <span>Servicio</span>
          </div>
        </div>
      </Bloque>

      <Bloque icono={Timer} titulo="Vencimientos" detalle="Limpieza de tanques y alertas">
        <div className="grid gap-5 sm:grid-cols-2">
          {campoEntero("vencimiento_tanque_dias")}
          {campoEntero("dias_alerta_vencimiento")}
        </div>
      </Bloque>

      <Bloque icono={Mail} titulo="Atención al público" detalle="Se muestran en el portal, los avisos y los documentos impresos">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor={f("email")} label={PARAMETROS_CONOCIDOS.email_contacto.etiqueta} required error={error("email_contacto")}>
            <Input
              id={f("email")}
              name="email_contacto"
              type="email"
              defaultValue={valores.email_contacto}
              leading={<Mail aria-hidden />}
              disabled={!editable}
              required
            />
          </Field>
          <Field
            htmlFor={f("domicilio")}
            label={PARAMETROS_CONOCIDOS.domicilio_atencion.etiqueta}
            required
            error={error("domicilio_atencion")}
          >
            <Input
              id={f("domicilio")}
              name="domicilio_atencion"
              defaultValue={valores.domicilio_atencion}
              maxLength={200}
              leading={<MapPin aria-hidden />}
              disabled={!editable}
              required
            />
          </Field>
          <Field
            htmlFor={f("horario")}
            label={PARAMETROS_CONOCIDOS.horario_atencion.etiqueta}
            required
            error={error("horario_atencion")}
            className="sm:col-span-2"
          >
            <Input
              id={f("horario")}
              name="horario_atencion"
              defaultValue={valores.horario_atencion}
              maxLength={200}
              leading={<Clock aria-hidden />}
              disabled={!editable}
              required
            />
          </Field>
        </div>
      </Bloque>

      {editable ? (
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted-foreground">
            Los cambios rigen de inmediato para las declaraciones nuevas y quedan registrados en la auditoría.
          </p>
          <Button type="submit" loading={pendiente}>
            {pendiente ? null : <Save aria-hidden />}
            Guardar parámetros
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function Bloque({
  icono: Icono,
  titulo,
  detalle,
  children,
}: {
  icono: LucideIcon;
  titulo: string;
  detalle: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 flex items-center gap-3">
        <span className={cn("flex size-9 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100")}>
          <Icono className="size-[18px]" aria-hidden />
        </span>
        <span className="flex flex-col">
          <span className="font-display text-[15px] font-semibold text-foreground">{titulo}</span>
          <span className="text-[13px] text-muted-foreground">{detalle}</span>
        </span>
      </legend>
      {children}
    </fieldset>
  );
}
