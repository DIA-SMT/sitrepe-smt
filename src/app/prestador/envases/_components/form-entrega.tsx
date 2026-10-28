"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { SubirArchivo } from "@/components/shared/subir-archivo";
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
import { ErrorCampo } from "../../legajo/_components/error-campo";
import { useEnvio } from "../../legajo/_components/use-envio";
import { registrarEntregaEnvases } from "../actions";

export type SaldoProducto = { id: string; nombre: string; saldo: number };

type FormEntregaProps = {
  empresaId: string;
  saldos: SaldoProducto[];
  bloqueado?: string | null;
};

/** Entrega de envases vacíos a un operador habilitado (con manifiesto y comprobante). */
export function FormEntrega({ empresaId, saldos, bloqueado }: FormEntregaProps) {
  const [abierto, setAbierto] = useState(false);
  const [productoId, setProductoId] = useState("");
  const { pendiente, onSubmit, error, reiniciar } = useEnvio(registrarEntregaEnvases, { alExito: () => setAbierto(false) });

  const conSaldo = saldos.filter((s) => s.saldo > 0);
  const motivo = bloqueado ?? (conSaldo.length === 0 ? "No tenés envases pendientes de entrega." : null);
  const maximo = conSaldo.find((s) => s.id === productoId)?.saldo;

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        setAbierto(v);
        if (v) {
          setProductoId("");
          reiniciar();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={Boolean(motivo)} title={motivo ?? undefined}>
          <Truck aria-hidden />
          Registrar entrega a operador
        </Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Registrar entrega a operador</DialogTitle>
            <DialogDescription>
              Informá la entrega de envases vacíos a un operador o centro de acopio habilitado. Conservá el manifiesto
              o remito: puede pedírtelo la inspección.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="ent-producto" label="Producto" required error={error("producto_id")} className="sm:col-span-2">
              <Select
                id="ent-producto"
                name="producto_id"
                required
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
              >
                <option value="" disabled>
                  Elegí un producto con envases en depósito
                </option>
                {conSaldo.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} · {s.saldo.toLocaleString("es-AR")} en depósito
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              htmlFor="ent-cantidad"
              label="Cantidad entregada"
              required
              hint={maximo !== undefined ? `Máximo ${maximo.toLocaleString("es-AR")}.` : undefined}
              error={error("cantidad")}
            >
              <Input id="ent-cantidad" name="cantidad" type="number" inputMode="numeric" min={1} max={maximo} step={1} required />
            </Field>
            <Field htmlFor="ent-fecha" label="Fecha de entrega" required error={error("fecha")}>
              <Input id="ent-fecha" name="fecha" type="date" required defaultValue={hoyISO()} max={hoyISO()} />
            </Field>
            <Field
              htmlFor="ent-destinatario"
              label="Operador o centro de acopio"
              required
              error={error("destinatario")}
              className="sm:col-span-2"
            >
              <Input id="ent-destinatario" name="destinatario" required maxLength={160} placeholder="Razón social del operador habilitado" />
            </Field>
            <Field htmlFor="ent-manifiesto" label="N.º de manifiesto o remito" error={error("manifiesto")}>
              <Input id="ent-manifiesto" name="manifiesto" maxLength={60} />
            </Field>
            <div className="flex items-end pb-2">
              <Checkbox name="triple_lavado" defaultChecked label="Envases con triple lavado" />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <SubirArchivo
                name="comprobante_path"
                bucket="envases"
                carpeta={[empresaId]}
                label="Comprobante de entrega"
                hint="Manifiesto, remito o constancia del operador. PDF, JPG o PNG de hasta 10 MB."
              />
              <ErrorCampo mensaje={error("comprobante_path")} />
            </div>
            <Field htmlFor="ent-obs" label="Observaciones" error={error("observaciones")} className="sm:col-span-2">
              <Textarea id="ent-obs" name="observaciones" rows={2} maxLength={500} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={pendiente}>
              {pendiente ? null : <Truck aria-hidden />}
              Registrar entrega
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
