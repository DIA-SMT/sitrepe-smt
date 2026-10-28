"use client";

import { useState } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { isoAFechaHoraLocal } from "@/lib/domain/formato";

/** Fecha y hora actual (Tucumán) como valor de <input type="datetime-local">. */
function ahoraLocal(): string {
  return isoAFechaHoraLocal(new Date());
}

/**
 * Campo datetime-local que arranca con la hora del momento en que se monta.
 * Pensado para los diálogos de seguimiento: su contenido se monta recién al
 * abrirse (no se renderiza en el servidor), así que la hora propuesta es la de
 * la apertura y no la de la carga de la página, que puede tener horas.
 * Sin `max`: en los selectores nativos de los celulares bloquearía la hora real
 * si la página quedó abierta; el servidor ya rechaza fechas futuras.
 */
export function InputFechaHoraActual(props: Omit<InputProps, "type" | "value" | "defaultValue" | "max">) {
  const [inicial] = useState(ahoraLocal);
  return <Input {...props} type="datetime-local" defaultValue={inicial} />;
}
