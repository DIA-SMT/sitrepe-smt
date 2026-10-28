"use client";

import { useId, useState } from "react";
import { CircleCheck, CircleX, Landmark, Pencil } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { MEDIO_PAGO } from "@/lib/domain/etiquetas";
import { Constants, type Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { useEnvio } from "../_compartido/use-envio";
import { guardarCuenta } from "../actions";
import { cbuValido } from "./validaciones";

type Cuenta = Tables<"cuentas_recaudadoras">;

/** Edición de los datos bancarios de una cuenta recaudadora. */
export function DialogoCuenta({ cuenta }: { cuenta: Cuenta }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil aria-hidden />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <Formulario cuenta={cuenta} onCerrar={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Formulario({ cuenta, onCerrar }: { cuenta: Cuenta; onCerrar: () => void }) {
  const id = useId();
  const f = (campo: string) => `${id}-${campo}`;
  const [cbu, setCbu] = useState(cuenta.cbu);
  const [estado, despachar, pendiente] = useAccion(guardarCuenta, { alExito: onCerrar });
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];

  const digitos = cbu.replace(/\D/g, "");
  const cbuCompleto = digitos.length === 22;
  const cbuOk = cbuCompleto && cbuValido(digitos);

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <input type="hidden" name="id" value={cuenta.id} />
      <DialogHeader className="flex-row items-start gap-4">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
        >
          <Landmark className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <DialogTitle>Cuenta {cuenta.codigo}</DialogTitle>
          <DialogDescription>
            Estos datos se muestran a las empresas al pagar las liquidaciones. Revisá el CBU con la constancia del banco.
          </DialogDescription>
        </div>
      </DialogHeader>
      <DialogBody className="grid gap-5 sm:grid-cols-2">
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No se pudo guardar la cuenta" className="sm:col-span-2">
            {estado.mensaje}
          </Alert>
        ) : null}

        <Field htmlFor={f("nombre")} label="Nombre" required error={error("nombre")} className="sm:col-span-2">
          <Input id={f("nombre")} name="nombre" defaultValue={cuenta.nombre} maxLength={160} required />
        </Field>

        <Field htmlFor={f("banco")} label="Banco" required error={error("banco")}>
          <Input id={f("banco")} name="banco" defaultValue={cuenta.banco} maxLength={80} required />
        </Field>

        <Field htmlFor={f("numero")} label="Número de cuenta" required error={error("numero_cuenta")}>
          <Input id={f("numero")} name="numero_cuenta" defaultValue={cuenta.numero_cuenta} maxLength={40} className="font-mono" required />
        </Field>

        <Field
          htmlFor={f("cbu")}
          label="CBU"
          required
          error={error("cbu")}
          hint={cbuCompleto ? (cbuOk ? "Dígitos verificadores correctos." : "Los dígitos verificadores no coinciden.") : `${digitos.length}/22 dígitos.`}
          className="sm:col-span-2"
        >
          <Input
            id={f("cbu")}
            name="cbu"
            inputMode="numeric"
            value={cbu}
            onChange={(e) => setCbu(e.target.value)}
            maxLength={26}
            className="font-mono tracking-wide"
            trailing={
              cbuCompleto ? (
                cbuOk ? (
                  <CircleCheck className="size-4 text-emerald-600" aria-hidden />
                ) : (
                  <CircleX className="size-4 text-danger" aria-hidden />
                )
              ) : null
            }
            required
          />
        </Field>

        <fieldset className="flex flex-col gap-2 sm:col-span-2" aria-describedby={error("medios_pago") ? f("medios-error") : undefined}>
          <legend className="mb-2 text-sm font-medium text-foreground">
            Medios de pago aceptados <span className="text-danger">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {Constants.public.Enums.medio_pago.map((m) => (
              <Checkbox
                key={m}
                name="medios_pago"
                value={m}
                defaultChecked={cuenta.medios_pago.includes(m)}
                label={MEDIO_PAGO[m].label}
                wrapperClassName="rounded-xl border border-border bg-card p-3"
              />
            ))}
          </div>
          {error("medios_pago") ? (
            <p id={f("medios-error")} role="alert" className="text-[13px] font-medium text-danger">
              {error("medios_pago")}
            </p>
          ) : null}
        </fieldset>

        <Field
          htmlFor={f("descripcion")}
          label="Indicaciones para el pago"
          error={error("descripcion")}
          hint="Qué se paga en esta cuenta y cómo (se muestra a las empresas)."
          className="sm:col-span-2"
        >
          <Textarea id={f("descripcion")} name="descripcion" rows={3} defaultValue={cuenta.descripcion ?? ""} maxLength={500} />
        </Field>

        <div className={cn("rounded-xl border border-border bg-subtle p-4 sm:col-span-2")}>
          <Checkbox
            name="activo"
            defaultChecked={cuenta.activo}
            label="Cuenta activa"
            description="Una cuenta inactiva no se ofrece para nuevos conceptos de cobro."
          />
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pendiente}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pendiente}>
          Guardar cuenta
        </Button>
      </DialogFooter>
    </form>
  );
}
