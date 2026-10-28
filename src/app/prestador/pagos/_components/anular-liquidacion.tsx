"use client";

import { useState } from "react";
import { Ban, TriangleAlert } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { useAccion } from "@/components/shared/use-accion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { anularLiquidacion } from "../actions";

/** Anula una liquidación pendiente o rechazada (sus certificados vuelven a estar listos para timbrar). */
export function AnularLiquidacion({
  pagoId,
  codigo,
  mostrarBoton = true,
}: {
  pagoId: string;
  codigo: string;
  /**
   * Si la liquidación admite anularse. El componente se mantiene montado aunque deje de admitirlo: al anular,
   * la página se actualiza en el mismo paso que el resultado y, desmontado, se perdería el aviso.
   */
  mostrarBoton?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [, accion, pendiente] = useAccion(anularLiquidacion, { alExito: () => setAbierto(false) });

  if (!mostrarBoton && !abierto) return null;

  return (
    <Dialog open={abierto} onOpenChange={(v) => !pendiente && setAbierto(v)}>
      {mostrarBoton ? (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger">
            <Ban aria-hidden />
            Anular liquidación
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent size="sm" showClose={false}>
        <form action={accion} className="flex flex-col">
          <input type="hidden" name="pago" value={pagoId} />
          <DialogHeader className="flex-row items-start gap-4 pb-5">
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger ring-1 ring-red-200"
            >
              <TriangleAlert className="size-5" />
            </span>
            <div className="flex flex-col gap-1.5">
              <DialogTitle>¿Anular la liquidación {codigo}?</DialogTitle>
              <DialogDescription>
                Si todavía no pagaste, podés anularla para armar otra con distintos certificados. Los certificados
                vuelven a la lista de listos para timbrar. Esta acción no se puede deshacer.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton variant="danger" pendingText="Anulando…">
              Sí, anular
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
