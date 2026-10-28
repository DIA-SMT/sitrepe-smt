"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { EstadoAccion } from "@/lib/acciones";

/** Server Action que recibe solo el FormData (acciones puntuales: eliminar, publicar, marcar…). */
export type AccionDirecta = (datos: FormData) => Promise<EstadoAccion>;

export function mostrarResultado(resultado: EstadoAccion) {
  if (resultado.ok) {
    if (resultado.mensaje) toast.success(resultado.mensaje);
    return;
  }
  const mensaje = resultado.mensaje ?? "No se pudo completar la operación.";
  const [titulo, ...resto] = mensaje.split("\n");
  toast.error(titulo, { description: resto.length ? resto.join("\n") : undefined });
}

function aFormData(campos: Record<string, string>): FormData {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
}

type AccionConfirmadaProps = {
  accion: AccionDirecta;
  /** Campos ocultos que se envían (p. ej. `{ id }`). */
  campos: Record<string, string>;
  /** Botón que abre el diálogo. */
  trigger: React.ReactElement;
  titulo: string;
  descripcion?: React.ReactNode;
  confirmar?: string;
  tono?: "danger" | "primary";
  /** Ruta a la que navegar si la acción sale bien (p. ej. al eliminar desde la ficha). */
  redirigir?: string;
  /** Campos extra dentro del diálogo (p. ej. un motivo). */
  children?: React.ReactNode;
};

/** Diálogo de confirmación que ejecuta una Server Action y muestra el resultado con un toast. */
export function AccionConfirmada({
  accion,
  campos,
  trigger,
  titulo,
  descripcion,
  confirmar = "Confirmar",
  tono = "danger",
  redirigir,
  children,
}: AccionConfirmadaProps) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={trigger}
      title={titulo}
      description={descripcion}
      confirmLabel={confirmar}
      tone={tono}
      hiddenFields={campos}
      action={async (datos) => {
        const resultado = await accion(datos);
        mostrarResultado(resultado);
        if (resultado.ok && redirigir) router.push(redirigir);
      }}
    >
      {children}
    </ConfirmDialog>
  );
}

type BotonAccionProps = Omit<ButtonProps, "onClick" | "type" | "loading"> & {
  accion: AccionDirecta;
  campos: Record<string, string>;
  /** No mostrar el toast de éxito (p. ej. en interruptores muy frecuentes). */
  silencioso?: boolean;
};

/** Botón que ejecuta una Server Action sin confirmación (publicar, reabrir, marcar asistencia…). */
export function BotonAccion({ accion, campos, silencioso = false, disabled, children, ...props }: BotonAccionProps) {
  const [pendiente, startTransition] = useTransition();
  return (
    <Button
      type="button"
      loading={pendiente}
      disabled={disabled}
      onClick={() =>
        startTransition(async () => {
          const resultado = await accion(aFormData(campos));
          if (!(silencioso && resultado.ok)) mostrarResultado(resultado);
        })
      }
      {...props}
    >
      {children}
    </Button>
  );
}
