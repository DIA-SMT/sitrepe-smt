import { startTransition, type FormEvent } from "react";

/**
 * Despacha una Server Action (el `despachar` de `useAccion`) desde `onSubmit`, dentro de una transición.
 *
 * Con `<form action={accion}>`, React 19 reinicia el formulario al terminar la acción: los `<select>`,
 * radios y casillas controlados vuelven en el DOM a su opción inicial aunque el estado de React conserve
 * la elección, y el siguiente envío manda el valor equivocado (p. ej. otro concepto u otro medio de pago).
 * Enviando así no hay reinicio y, si la acción falla, el formulario conserva lo cargado.
 * El estado de envío se lee del tercer valor de `useAccion` (no de `useFormStatus`).
 */
export function enviarSinReiniciar(despachar: (formData: FormData) => void, pendiente = false) {
  return (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (pendiente) return;
    const formData = new FormData(evento.currentTarget);
    startTransition(() => despachar(formData));
  };
}
