"use client";

import { useId, useRef } from "react";
import { CalendarPlus } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEnvio } from "../_compartido/use-envio";
import { agregarFeriado } from "../actions";

/** Alta de un feriado del año que se está viendo. */
export function FormFeriado({ anio }: { anio: number }) {
  const id = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const [estado, despachar, pendiente] = useAccion(agregarFeriado, {
    alExito: () => formulario.current?.reset(),
  });
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];

  return (
    <form ref={formulario} onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <Field htmlFor={`${id}-fecha`} label="Fecha" required error={error("fecha")}>
        <Input
          id={`${id}-fecha`}
          name="fecha"
          type="date"
          min={`${anio}-01-01`}
          max={`${anio}-12-31`}
          defaultValue=""
          required
        />
      </Field>
      <Field
        htmlFor={`${id}-descripcion`}
        label="Motivo"
        required
        error={error("descripcion")}
        hint="Feriados nacionales, provinciales (9 de Julio, Batalla de Tucumán) y asuetos municipales."
      >
        <Input
          id={`${id}-descripcion`}
          name="descripcion"
          maxLength={160}
          placeholder="Ej.: Día de la Independencia"
          required
        />
      </Field>
      <Button type="submit" loading={pendiente}>
        {pendiente ? null : <CalendarPlus aria-hidden />}
        Agregar feriado
      </Button>
    </form>
  );
}
