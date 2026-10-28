"use client";

import { useCallback, useTransition } from "react";

/**
 * Envía un formulario a una acción de `useAccion`/`useActionState` sin el reseteo
 * automático que React aplica a los `<form action>`: si la validación falla, el
 * usuario conserva lo que escribió. Usar con `pendiente` de `useAccion` para el botón.
 *
 *   const [estado, despachar, pendiente] = useAccion(accion);
 *   const enviar = useEnvio(despachar);
 *   <form onSubmit={enviar}>…<Button type="submit" loading={pendiente}>Guardar</Button></form>
 */
export function useEnvio(despachar: (datos: FormData) => void) {
  const [, startTransition] = useTransition();
  return useCallback(
    (evento: React.FormEvent<HTMLFormElement>) => {
      evento.preventDefault();
      const datos = new FormData(evento.currentTarget);
      startTransition(() => despachar(datos));
    },
    [despachar],
  );
}
