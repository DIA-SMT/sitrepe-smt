"use client";

import { startTransition } from "react";

/**
 * Manejador `onSubmit` que envía el formulario a una Server Action sin que React lo reinicie.
 *
 * Con `<form action={accion}>` React 19 limpia los campos no controlados cuando termina la acción,
 * aunque la acción devuelva errores de validación: la persona perdería lo que escribió. Enviando desde
 * `onSubmit` dentro de una transición los campos conservan su valor; el estado pendiente se toma de
 * `useAccion` (no de `useFormStatus`, que solo sigue a `<form action>`).
 */
export function enviarSinReiniciar(accion: (formData: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos));
  };
}
