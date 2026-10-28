"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { eliminarDeclaracion } from "../../actions";

/** Descarta una planilla en borrador (con sus servicios). */
export function BotonEliminarDeclaracion({ id, codigo, servicios }: { id: string; codigo: string; servicios: number }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="hover:border-red-300 hover:bg-danger-soft hover:text-danger">
          <Trash2 aria-hidden />
          Descartar borrador
        </Button>
      }
      title={`¿Descartar la declaración ${codigo}?`}
      description={
        servicios > 0
          ? `Se eliminan la planilla y ${servicios === 1 ? "el servicio cargado" : `los ${servicios} servicios cargados`}. Esta acción no se puede deshacer.`
          : "Se elimina la planilla vacía. Esta acción no se puede deshacer."
      }
      confirmLabel="Sí, descartar"
      onConfirm={async () => {
        // Si se elimina, la acción redirige al listado.
        const r = await eliminarDeclaracion(id);
        if (r && !r.ok) toast.error(r.mensaje ?? "No se pudo descartar la declaración.");
      }}
    />
  );
}
