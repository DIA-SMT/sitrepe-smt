"use client";

import { useId, useState, useTransition } from "react";
import { CalendarClock, Ban } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OpcionPersona } from "@/lib/data/fiscalizacion";
import { cancelarInspeccion, reprogramarInspeccion } from "../actions";

export function DialogoReprogramar({
  inspeccionId,
  fechaActual,
  fechaMinima,
  inspectorActual,
  inspectorActualNombre,
  inspectores,
}: {
  inspeccionId: string;
  fechaActual: string;
  fechaMinima: string;
  inspectorActual: string | null;
  inspectorActualNombre: string | null;
  inspectores: OpcionPersona[];
}) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [, startTransition] = useTransition();
  const [estado, accion, pendiente] = useAccion(reprogramarInspeccion, { alExito: () => setAbierto(false) });
  const err = (campo: string) => estado.errores?.[campo]?.[0];

  return (
    <Dialog open={abierto} onOpenChange={(v) => !pendiente && setAbierto(v)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarClock aria-hidden />
          Reprogramar
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            startTransition(() => accion(datos));
          }}
          className="flex min-h-0 flex-col"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>Reprogramar inspección</DialogTitle>
            <DialogDescription>Cambiá la fecha o la persona asignada.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <input type="hidden" name="id" value={inspeccionId} />
            <Field htmlFor={`${id}-fecha`} label="Nueva fecha" required error={err("fecha_programada")}>
              <Input
                id={`${id}-fecha`}
                name="fecha_programada"
                type="date"
                min={fechaMinima}
                defaultValue={fechaActual < fechaMinima ? fechaMinima : fechaActual}
                required
              />
            </Field>
            <Field htmlFor={`${id}-inspector`} label="Inspector/a" error={err("inspector_id")}>
              <Select id={`${id}-inspector`} name="inspector_id" defaultValue={inspectorActual ?? ""}>
                <option value="">Sin asignar</option>
                {inspectores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
                {inspectorActual && !inspectores.some((p) => p.id === inspectorActual) ? (
                  <option value={inspectorActual}>{inspectorActualNombre ?? "Asignación actual"}</option>
                ) : null}
              </Select>
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={pendiente}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DialogoCancelar({ inspeccionId, codigo }: { inspeccionId: string; codigo: string | null }) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [, startTransition] = useTransition();
  const [estado, accion, pendiente] = useAccion(cancelarInspeccion, {
    alExito: () => {
      setAbierto(false);
      setMotivo("");
    },
  });

  return (
    <Dialog open={abierto} onOpenChange={(v) => !pendiente && setAbierto(v)}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger">
          <Ban aria-hidden />
          Cancelar inspección
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            startTransition(() => accion(datos));
          }}
          className="flex min-h-0 flex-col"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>¿Cancelar la inspección {codigo ?? ""}?</DialogTitle>
            <DialogDescription>
              Va a quedar registrada como cancelada, con el motivo en sus observaciones. Si estaba vinculada a una denuncia,
              la denuncia vuelve a “en curso”.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <input type="hidden" name="id" value={inspeccionId} />
            <Field htmlFor={`${id}-motivo`} label="Motivo" required error={estado.errores?.motivo?.[0]}>
              <Textarea
                id={`${id}-motivo`}
                name="motivo"
                rows={3}
                maxLength={500}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej.: el establecimiento cerró definitivamente."
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Volver
              </Button>
            </DialogClose>
            <Button type="submit" variant="danger" loading={pendiente}>
              Cancelar inspección
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
