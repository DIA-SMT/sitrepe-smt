"use client";

import { useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { estadoInicial } from "@/lib/acciones";
import { type AccionFormulario, notificarResultado } from "./use-envio";

type BotonAccionProps = {
  accion: AccionFormulario;
  campos?: Record<string, string>;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  /** No mostrar el toast de éxito (acciones muy frecuentes, como marcar como leído). */
  silenciarExito?: boolean;
  "aria-label"?: string;
  children: React.ReactNode;
};

/**
 * Botón que ejecuta una Server Action sin confirmación. El toast se muestra aunque la
 * revalidación de la página haga desaparecer el botón (p. ej. "Marcar todos como leídos").
 */
export function BotonAccion({
  accion,
  campos = {},
  variant = "secondary",
  size = "sm",
  className,
  silenciarExito,
  children,
  ...aria
}: BotonAccionProps) {
  const [pendiente, startTransition] = useTransition();

  const ejecutar = () =>
    startTransition(async () => {
      const datos = new FormData();
      for (const [nombre, valor] of Object.entries(campos)) datos.set(nombre, valor);
      notificarResultado(await accion(estadoInicial, datos), silenciarExito);
    });

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      loading={pendiente}
      onClick={ejecutar}
      aria-label={aria["aria-label"]}
    >
      {children}
    </Button>
  );
}
