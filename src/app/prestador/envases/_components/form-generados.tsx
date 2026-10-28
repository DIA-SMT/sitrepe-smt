"use client";

import { useState } from "react";
import { PackagePlus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { hoyISO } from "@/lib/domain/formato";
import { useEnvio } from "../../legajo/_components/use-envio";
import { registrarEnvasesGenerados } from "../actions";

export type OpcionProducto = { id: string; nombre: string; registro: string | null };

const CAPACIDADES = ["250 ml", "500 ml", "1 L", "4 L", "5 L", "10 L", "20 L", "1 kg", "5 kg"];

/** Registro de envases vacíos generados (producto de la memoria técnica aprobada). */
export function FormGenerados({ productos, bloqueado }: { productos: OpcionProducto[]; bloqueado?: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const { pendiente, onSubmit, error, reiniciar } = useEnvio(registrarEnvasesGenerados, { alExito: () => setAbierto(false) });
  const sinProductos = productos.length === 0;
  const motivo = bloqueado ?? (sinProductos ? "Necesitás productos aprobados en tu memoria técnica." : null);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        setAbierto(v);
        if (v) reiniciar();
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={Boolean(motivo)} title={motivo ?? undefined}>
          <PackagePlus aria-hidden />
          Registrar envases generados
        </Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Registrar envases vacíos generados</DialogTitle>
            <DialogDescription>
              Cargá los envases que quedaron vacíos después de los servicios. Suman al saldo en depósito hasta que los
              entregues a un operador habilitado.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="gen-producto" label="Producto" required error={error("producto_id")} className="sm:col-span-2">
              <Select id="gen-producto" name="producto_id" required placeholder="Elegí un producto de tu memoria técnica">
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.registro ? ` · ${p.registro}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="gen-cantidad" label="Cantidad de envases" required error={error("cantidad")}>
              <Input id="gen-cantidad" name="cantidad" type="number" inputMode="numeric" min={1} max={100000} step={1} required />
            </Field>
            <Field htmlFor="gen-capacidad" label="Capacidad de cada envase" hint="Ej.: 1 L, 5 L, 500 ml." error={error("capacidad")}>
              <Input id="gen-capacidad" name="capacidad" list="gen-capacidades" maxLength={40} />
            </Field>
            <datalist id="gen-capacidades">
              {CAPACIDADES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <Field htmlFor="gen-lote" label="Lote" error={error("lote")}>
              <Input id="gen-lote" name="lote" maxLength={60} />
            </Field>
            <Field htmlFor="gen-fecha" label="Fecha" required error={error("fecha")}>
              <Input id="gen-fecha" name="fecha" type="date" required defaultValue={hoyISO()} max={hoyISO()} />
            </Field>
            <div className="sm:col-span-2">
              <Checkbox
                name="triple_lavado"
                defaultChecked
                label="Se realizó el triple lavado"
                description="Enjuagar tres veces e inutilizar el envase (perforarlo) antes de almacenarlo."
              />
            </div>
            <Field htmlFor="gen-obs" label="Observaciones" error={error("observaciones")} className="sm:col-span-2">
              <Textarea id="gen-obs" name="observaciones" rows={2} maxLength={500} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={pendiente}>
              {pendiente ? null : <Save aria-hidden />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
