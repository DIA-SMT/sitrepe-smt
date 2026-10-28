"use client";

import { useState } from "react";
import { Hash, Send } from "lucide-react";
import { SubirArchivo } from "@/components/shared/subir-archivo";
import { useAccion } from "@/components/shared/use-accion";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { informarPago } from "../actions";
import { enviarSinReiniciar } from "./enviar-sin-reiniciar";

type Props = {
  pagoId: string;
  empresaId: string;
  /** Fecha de hoy en Tucumán ('YYYY-MM-DD'): tope del selector de fecha. */
  hoy: string;
  /** Medios que admite la cuenta de la liquidación. */
  medios: { valor: string; label: string }[];
  /** Si la liquidación fue rechazada y se vuelve a informar. */
  reintento?: boolean;
};

/** Formulario para informar el pago de una liquidación con su comprobante. */
export function InformarPagoForm({ pagoId, empresaId, hoy, medios, reintento = false }: Props) {
  const [estado, accion, pendiente] = useAccion(informarPago);
  const err = (campo: string) => estado.errores?.[campo]?.[0];
  // Campos controlados + envío sin reinicio del formulario: si la acción falla, no se pierde lo cargado.
  const [medio, setMedio] = useState(medios[0]?.valor ?? "");
  const [fecha, setFecha] = useState(hoy);
  const [operacion, setOperacion] = useState("");

  return (
    <form
      onSubmit={enviarSinReiniciar(accion, pendiente)}
      aria-busy={pendiente || undefined}
      className="grid gap-5 sm:grid-cols-2"
      noValidate
    >
      <input type="hidden" name="pago" value={pagoId} />
      <Field htmlFor="medio" label="Medio de pago" required error={err("medio")}>
        <Select id="medio" name="medio" value={medio} onChange={(e) => setMedio(e.target.value)} required>
          {medios.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field htmlFor="fecha_pago" label="Fecha de pago" required error={err("fecha_pago")} hint="La fecha en que se acreditó o abonó.">
        <Input
          id="fecha_pago"
          name="fecha_pago"
          type="date"
          max={hoy}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
        />
      </Field>
      <Field
        htmlFor="numero_operacion"
        label="N.º de operación"
        error={err("numero_operacion")}
        hint="Figura en el comprobante de la transferencia o de la boleta."
        className="sm:col-span-2"
      >
        <Input
          id="numero_operacion"
          name="numero_operacion"
          inputMode="text"
          autoComplete="off"
          maxLength={60}
          value={operacion}
          onChange={(e) => setOperacion(e.target.value)}
          placeholder="Ej.: 00012345678"
          leading={<Hash aria-hidden />}
        />
      </Field>
      <div className="sm:col-span-2">
        <SubirArchivo
          name="comprobante"
          bucket="comprobantes"
          carpeta={[empresaId, pagoId]}
          label="Comprobante de pago"
          hint="PDF, JPG o PNG de hasta 10 MB. Agiliza la verificación."
        />
        {err("comprobante") ? (
          <p role="alert" className="mt-1.5 text-[13px] font-medium text-danger">
            {err("comprobante")}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground">
          Indicá al menos el comprobante o el N.º de operación. La Dirección verifica la acreditación y sella tus
          certificados.
        </p>
        <Button type="submit" loading={pendiente} className="shrink-0">
          {pendiente ? null : <Send aria-hidden />}
          {pendiente ? "Informando…" : reintento ? "Volver a informar el pago" : "Informar pago"}
        </Button>
      </div>
    </form>
  );
}
