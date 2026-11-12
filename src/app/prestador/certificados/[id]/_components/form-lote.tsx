"use client";

import { useState } from "react";
import { PackageCheck } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
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
import { registrarLote } from "../actions";

/** Registro del lote y vencimiento de un producto comprado con la receta. */
export function FormLote({
  certificadoId,
  producto,
}: {
  certificadoId: string;
  producto: { productoId: string; nombre: string; lote: string | null; loteVence: string | null };
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion] = useAccion(registrarLote, { alExito: () => setAbierto(false) });
  const error = (campo: string) => (estado.ok ? undefined : estado.errores?.[campo]?.[0]);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PackageCheck aria-hidden />
          {producto.lote ? "Corregir lote" : "Registrar lote"}
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <form action={accion} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="certificado_id" value={certificadoId} />
          <input type="hidden" name="producto_id" value={producto.productoId} />
          <DialogHeader>
            <DialogTitle>Lote de {producto.nombre}</DialogTitle>
            <DialogDescription>
              Copialo del envase o de la factura del comercio. Queda en la receta y no anula la firma del asesor.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field htmlFor="lote-numero" label="N.º de lote" required error={error("lote")}>
              <Input id="lote-numero" name="lote" required maxLength={60} defaultValue={producto.lote ?? ""} />
            </Field>
            <Field htmlFor="lote-vence" label="Vencimiento del producto" hint="Opcional." error={error("vence")}>
              <Input id="lote-vence" name="vence" type="date" defaultValue={producto.loteVence ?? ""} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton>Guardar lote</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
