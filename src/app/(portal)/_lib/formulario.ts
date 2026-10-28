import { startTransition } from "react";

/**
 * Manejador `onSubmit` que envía el formulario a una Server Action sin que React reinicie los campos
 * (con `<form action>` React 19 limpia el formulario al terminar, y la persona perdería lo escrito si
 * hay errores de validación). Se usa junto con `action={accion}` para que el formulario siga
 * funcionando antes de hidratar o sin JavaScript. `useFormStatus` (SubmitButton) sigue mostrando el
 * estado pendiente porque el envío se agenda como transición dentro del evento.
 */
export function enviarSinReiniciar(accion: (formData: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos));
  };
}
