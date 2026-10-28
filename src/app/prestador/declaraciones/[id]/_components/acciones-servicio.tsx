"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { ServicioEditable } from "../../_lib/tipos";
import { eliminarServicio } from "../actions";
import { FormularioServicio } from "./formulario-servicio";

type Props = {
  id: string;
  numero: string;
  /** Datos para editar (solo si el certificado está en borrador u observado). */
  servicio?: ServicioEditable;
  puedeEliminar: boolean;
};

/** Acciones de una fila de la planilla: editar y quitar. */
export function AccionesServicio({ id, numero, servicio, puedeEliminar }: Props) {
  if (!servicio && !puedeEliminar) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      {servicio ? <FormularioServicio servicio={servicio} disparador="icono" /> : null}
      {puedeEliminar ? (
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Quitar el servicio N.º ${numero}`}
              className="text-muted-foreground hover:text-danger"
            >
              <Trash2 aria-hidden />
            </Button>
          }
          title={`¿Quitar el servicio N.º ${numero}?`}
          description="Se elimina la fila de la planilla junto con sus productos. El número queda libre para volver a usarlo."
          confirmLabel="Sí, quitar"
          onConfirm={async () => {
            const r = await eliminarServicio(id);
            if (r.ok) toast.success(r.mensaje);
            else toast.error(r.mensaje ?? "No se pudo quitar el servicio.");
          }}
        />
      ) : null}
    </div>
  );
}
