"use client";

import { useState, useTransition } from "react";
import { ArchiveRestore, ArchiveX } from "lucide-react";
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
import { cambiarActivoEstablecimiento } from "../actions";

/** Baja del padrón o reactivación de un establecimiento. */
export function BotonEstadoActivo({ establecimientoId, activo, nombre }: { establecimientoId: string; activo: boolean; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [, startTransition] = useTransition();
  const [, accion, pendiente] = useAccion(cambiarActivoEstablecimiento, { alExito: () => setAbierto(false) });

  return (
    <Dialog open={abierto} onOpenChange={(v) => !pendiente && setAbierto(v)}>
      <DialogTrigger asChild>
        {activo ? (
          <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger">
            <ArchiveX aria-hidden /> Dar de baja
          </Button>
        ) : (
          <Button variant="secondary">
            <ArchiveRestore aria-hidden /> Reactivar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            startTransition(() => accion(datos));
          }}
          className="flex flex-col"
        >
          <input type="hidden" name="id" value={establecimientoId} />
          <input type="hidden" name="activo" value={activo ? "false" : "true"} />
          <DialogHeader className="pb-5">
            <DialogTitle>{activo ? `¿Dar de baja ${nombre}?` : `¿Reactivar ${nombre}?`}</DialogTitle>
            <DialogDescription>
              {activo
                ? "Deja de figurar en la hoja de ruta y en el padrón activo (por cierre, mudanza o duplicado). Su historial se conserva y podés reactivarlo cuando quieras."
                : "Vuelve a figurar en el padrón y en la hoja de ruta según el estado de sus certificados."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Volver
              </Button>
            </DialogClose>
            <Button type="submit" variant={activo ? "danger" : "primary"} loading={pendiente}>
              {activo ? "Dar de baja" : "Reactivar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
