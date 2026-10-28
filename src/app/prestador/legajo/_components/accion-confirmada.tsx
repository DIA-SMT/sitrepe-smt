"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { type EstadoAccion, estadoInicial } from "@/lib/acciones";

type AccionConfirmadaProps = {
  /** Server Action con la firma estándar del proyecto. */
  accion: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
  /** Campos ocultos (p. ej. `{ id }`). */
  campos: Record<string, string>;
  trigger: React.ReactElement;
  titulo: string;
  descripcion?: React.ReactNode;
  confirmar?: string;
  tono?: "danger" | "primary";
};

/** Diálogo de confirmación que ejecuta una Server Action y muestra el resultado en un toast. */
export function AccionConfirmada({
  accion,
  campos,
  trigger,
  titulo,
  descripcion,
  confirmar = "Confirmar",
  tono = "danger",
}: AccionConfirmadaProps) {
  return (
    <ConfirmDialog
      trigger={trigger}
      title={titulo}
      description={descripcion}
      confirmLabel={confirmar}
      tone={tono}
      hiddenFields={campos}
      action={async (formData) => {
        const resultado = await accion(estadoInicial, formData);
        if (resultado.ok) {
          if (resultado.mensaje) toast.success(resultado.mensaje);
        } else {
          toast.error(resultado.mensaje ?? "No se pudo completar la operación.");
        }
      }}
    />
  );
}
