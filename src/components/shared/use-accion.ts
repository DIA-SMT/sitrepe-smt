"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { type EstadoAccion, estadoInicial } from "@/lib/acciones";

/**
 * `useActionState` + toast automático con el mensaje del resultado.
 *
 *   const [estado, accion, pendiente] = useAccion(crearAlgo, { alExito: () => cerrarDialogo() });
 *   <form action={accion}>…<Field error={estado.errores?.campo?.[0]} />
 */
export function useAccion<T = unknown>(
  accion: (prev: EstadoAccion<T>, formData: FormData) => Promise<EstadoAccion<T>>,
  opciones: { alExito?: (estado: EstadoAccion<T>) => void; silenciarExito?: boolean } = {},
) {
  const [estado, despachar, pendiente] = useActionState(accion, estadoInicial as EstadoAccion<T>);
  const ultimo = useRef(estado);
  const { alExito, silenciarExito } = opciones;

  useEffect(() => {
    if (estado === ultimo.current) return;
    ultimo.current = estado;
    if (estado.ok) {
      if (estado.mensaje && !silenciarExito) toast.success(estado.mensaje);
      alExito?.(estado);
    } else if (estado.mensaje) {
      toast.error(estado.mensaje.split("\n")[0], {
        description: estado.mensaje.includes("\n") ? estado.mensaje.split("\n").slice(1).join("\n") : undefined,
      });
    }
  }, [estado, alExito, silenciarExito]);

  return [estado, despachar, pendiente] as const;
}
