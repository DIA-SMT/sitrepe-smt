"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { type EstadoAccion, estadoInicial } from "@/lib/acciones";

export type AccionFormulario = (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;

/** Toast con el resultado de una acción (mismo formato que `useAccion`: varias líneas → descripción). */
export function notificarResultado(estado: EstadoAccion | undefined, silenciarExito = false) {
  if (!estado) return;
  if (estado.ok) {
    if (estado.mensaje && !silenciarExito) toast.success(estado.mensaje);
    return;
  }
  if (estado.mensaje) {
    const [titulo, ...resto] = estado.mensaje.split("\n");
    toast.error(titulo, { description: resto.length > 0 ? resto.join("\n") : undefined });
  }
}

/**
 * Envía un formulario a una Server Action del módulo.
 *
 * Variante de `useAccion` pensada para formularios largos y diálogos:
 *  - evita el reseteo automático de React 19 (si la validación falla, se conserva lo cargado);
 *  - muestra el toast apenas resuelve la acción, aunque la revalidación de la página desmonte
 *    el formulario (p. ej. cuando la renovación pasa a "en curso" y el formulario desaparece).
 */
export function useEnvio(accion: AccionFormulario, opciones: { alExito?: (estado: EstadoAccion) => void } = {}) {
  const [estado, setEstado] = useState<EstadoAccion>(estadoInicial);
  const [pendiente, startTransition] = useTransition();
  const { alExito } = opciones;

  const onSubmit = useCallback(
    (evento: React.FormEvent<HTMLFormElement>) => {
      evento.preventDefault();
      const datos = new FormData(evento.currentTarget);
      startTransition(async () => {
        const resultado = await accion(estadoInicial, datos);
        // Si la acción redirigió, no hay resultado que mostrar.
        if (!resultado) return;
        setEstado(resultado);
        notificarResultado(resultado);
        if (resultado.ok) alExito?.(resultado);
      });
    },
    [accion, alExito],
  );

  const error = (campo: string) => estado.errores?.[campo]?.[0];
  /** Limpia los errores (p. ej. al volver a abrir un diálogo). */
  const reiniciar = useCallback(() => setEstado(estadoInicial), []);

  return { estado, pendiente, onSubmit, error, reiniciar };
}
