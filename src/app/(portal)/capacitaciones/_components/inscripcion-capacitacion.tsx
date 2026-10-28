"use client";

import { useCallback, useId, useState } from "react";
import { CalendarCheck, CircleCheck, MapPin, Send, UserPlus } from "lucide-react";
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
import { enviarSinReiniciar } from "../../_lib/formulario";
import { inscribirCapacitacion } from "../actions";

type Props = {
  capacitacion: { id: string; titulo: string; fecha: string; lugar: string | null; modalidad: string };
};

/**
 * Botón + diálogo de inscripción a una capacitación (acción pública).
 * Con `cerrada` el botón se muestra deshabilitado con el motivo. El componente se mantiene montado aunque
 * la inscripción se cierre (p. ej. si esta persona ocupó la última vacante y la página se revalidó), para
 * que el diálogo abierto siga mostrando la confirmación.
 */
export function InscripcionCapacitacion({ capacitacion, cerrada = null }: Props & { cerrada?: string | null }) {
  const [abierto, setAbierto] = useState(false);
  // La clave reinicia el formulario (y el estado de la acción) cada vez que se vuelve a abrir.
  const [intento, setIntento] = useState(0);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (!v) setIntento((n) => n + 1);
      }}
    >
      {cerrada ? (
        <Button disabled variant="outline" className="w-full sm:w-auto">
          {cerrada}
        </Button>
      ) : (
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto">
            <UserPlus aria-hidden />
            Inscribirme
          </Button>
        </DialogTrigger>
      )}
      <DialogContent size="md">
        <FormularioInscripcion key={intento} capacitacion={capacitacion} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioInscripcion({ capacitacion }: Props) {
  const id = useId();
  const [confirmada, setConfirmada] = useState<{ mensaje: string; vacantes: number | null } | null>(null);
  const alExito = useCallback(
    (e: { mensaje?: string; datos?: { vacantes: number | null } }) =>
      setConfirmada({ mensaje: e.mensaje ?? "Inscripción registrada.", vacantes: e.datos?.vacantes ?? null }),
    [],
  );
  const [estado, accion] = useAccion(inscribirCapacitacion, { alExito });
  const err = (k: string) => estado.errores?.[k]?.[0];

  if (confirmada) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Inscripción confirmada</DialogTitle>
          <DialogDescription>{capacitacion.titulo}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col items-center gap-4 py-4 text-center" role="status">
            <span className="flex size-16 animate-pop-in items-center justify-center rounded-full bg-success-soft text-success ring-8 ring-emerald-50">
              <CircleCheck className="size-8" aria-hidden />
            </span>
            <p className="font-display text-lg font-semibold text-foreground">{confirmada.mensaje}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Te esperamos el {capacitacion.fecha}
              {capacitacion.lugar ? ` en ${capacitacion.lugar}` : ""}. Guardá esta información: la Dirección registra la
              asistencia y emite los certificados de participación.
            </p>
            {confirmada.vacantes !== null ? (
              <p className="text-xs text-muted-foreground">
                {confirmada.vacantes <= 0
                  ? "Ocupaste la última vacante disponible."
                  : `Quedan ${confirmada.vacantes} ${confirmada.vacantes === 1 ? "vacante" : "vacantes"}.`}
              </p>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Listo</Button>
          </DialogClose>
        </DialogFooter>
      </>
    );
  }

  return (
    <form action={accion} onSubmit={enviarSinReiniciar(accion)} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogHeader>
        <DialogTitle>Inscripción a la capacitación</DialogTitle>
        <DialogDescription>{capacitacion.titulo}</DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-azul-50 px-3 py-2.5 text-[13px] text-azul-900">
          <span className="inline-flex items-center gap-1.5">
            <CalendarCheck className="size-4" aria-hidden />
            {capacitacion.fecha}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {capacitacion.lugar ?? capacitacion.modalidad}
          </span>
        </div>

        <input type="hidden" name="capacitacion" value={capacitacion.id} />
        {/* Campo trampa para bots (oculto para personas y lectores de pantalla). */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor={`${id}-sitio`}>No completar</label>
          <input id={`${id}-sitio`} type="text" name="sitio_web" tabIndex={-1} autoComplete="off" />
        </div>

        <Field htmlFor={`${id}-nombre`} label="Nombre y apellido" required error={err("nombre")}>
          <Input id={`${id}-nombre`} name="nombre" autoComplete="name" required maxLength={120} placeholder="Como figura en tu DNI" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor={`${id}-dni`} label="DNI" required hint="Sin puntos, 7 u 8 dígitos." error={err("dni")}>
            <Input id={`${id}-dni`} name="dni" inputMode="numeric" autoComplete="off" required maxLength={11} placeholder="30111222" />
          </Field>
          <Field htmlFor={`${id}-email`} label="Correo electrónico" required error={err("email")}>
            <Input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
              placeholder="nombre@correo.com"
            />
          </Field>
        </div>
        <Field
          htmlFor={`${id}-empresa`}
          label="Empresa (opcional)"
          hint="Si trabajás en una empresa prestadora, indicá su nombre."
          error={err("empresa")}
        >
          <Input id={`${id}-empresa`} name="empresa" autoComplete="organization" maxLength={200} />
        </Field>
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium whitespace-pre-line text-danger">
            {estado.mensaje}
          </p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pendingText="Inscribiendo…">
          <Send aria-hidden />
          Confirmar inscripción
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
