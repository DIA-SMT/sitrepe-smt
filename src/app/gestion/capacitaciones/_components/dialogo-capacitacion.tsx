"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Pencil, Plus } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
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
import { isoAFechaHoraLocal } from "@/lib/domain/formato";
import { ESTADO_CAPACITACION, MODALIDAD_CAPACITACION } from "@/lib/domain/etiquetas";
import { Constants, type Enums, type Tables } from "@/lib/supabase/database.types";
import { useEnvio } from "../../configuracion/_compartido/use-envio";
import { guardarCapacitacion } from "../actions";

type Capacitacion = Tables<"capacitaciones">;

type Props =
  | { modo: "crear"; capacitacion?: undefined; className?: string }
  | { modo: "editar"; capacitacion: Capacitacion; className?: string };

/** Alta o edición de una capacitación en un diálogo. */
export function DialogoCapacitacion(props: Props) {
  const [abierto, setAbierto] = useState(false);
  const editar = props.modo === "editar";
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {editar ? (
          <Button variant="outline" className={props.className}>
            <Pencil aria-hidden />
            Editar
          </Button>
        ) : (
          <Button className={props.className}>
            <Plus aria-hidden />
            Nueva capacitación
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="lg">
        <Formulario {...props} onCerrar={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Formulario(props: Props & { onCerrar: () => void }) {
  const router = useRouter();
  const id = useId();
  const c = props.capacitacion;
  const editar = props.modo === "editar";
  const { onCerrar } = props;
  const [modalidad, setModalidad] = useState<Enums<"modalidad_capacitacion">>(c?.modalidad ?? "presencial");

  const [estado, despachar, pendiente] = useAccion<{ id: string }>(guardarCapacitacion, {
    alExito: (r) => {
      onCerrar();
      if (!editar && r.datos?.id) router.push(`/gestion/capacitaciones/${r.datos.id}`);
    },
  });
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];
  const f = (campo: string) => `${id}-${campo}`;

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <DialogHeader className="flex-row items-start gap-4">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
        >
          <GraduationCap className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <DialogTitle>{editar ? "Editar capacitación" : "Nueva capacitación"}</DialogTitle>
          <DialogDescription>
            {editar
              ? "Los cambios se ven al instante en el portal."
              : "Con la inscripción abierta, las personas se anotan desde el portal público."}
          </DialogDescription>
        </div>
      </DialogHeader>

      <DialogBody className="grid gap-5 sm:grid-cols-6">
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No se pudo guardar" className="sm:col-span-6">
            {estado.mensaje}
          </Alert>
        ) : null}

        <Field htmlFor={f("titulo")} label="Título" required error={error("titulo")} className="sm:col-span-6">
          <Input
            id={f("titulo")}
            name="titulo"
            defaultValue={c?.titulo ?? ""}
            maxLength={160}
            placeholder="Ej.: Manejo seguro de productos domisanitarios"
            required
          />
        </Field>

        <Field
          htmlFor={f("descripcion")}
          label="Descripción"
          required
          error={error("descripcion")}
          hint="Contenidos, objetivos y requisitos. Se muestra en el portal."
          className="sm:col-span-6"
        >
          <Textarea id={f("descripcion")} name="descripcion" rows={4} defaultValue={c?.descripcion ?? ""} maxLength={2000} required />
        </Field>

        <Field htmlFor={f("modalidad")} label="Modalidad" required error={error("modalidad")} className="sm:col-span-2">
          <Select
            id={f("modalidad")}
            name="modalidad"
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value as Enums<"modalidad_capacitacion">)}
          >
            {Constants.public.Enums.modalidad_capacitacion.map((m) => (
              <option key={m} value={m}>
                {MODALIDAD_CAPACITACION[m].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          htmlFor={f("lugar")}
          label={modalidad === "virtual" ? "Plataforma o enlace" : "Lugar"}
          required={modalidad !== "virtual"}
          error={error("lugar")}
          className="sm:col-span-4"
        >
          <Input
            id={f("lugar")}
            name="lugar"
            defaultValue={c?.lugar ?? ""}
            maxLength={200}
            placeholder={modalidad === "virtual" ? "Ej.: Google Meet (el enlace se envía por correo)" : "Ej.: San Martín 1009, salón auditorio"}
          />
        </Field>

        <Field htmlFor={f("fecha")} label="Fecha y hora de inicio" required error={error("fecha_inicio")} className="sm:col-span-3">
          <Input
            id={f("fecha")}
            name="fecha_inicio"
            type="datetime-local"
            defaultValue={c ? isoAFechaHoraLocal(c.fecha_inicio) : ""}
            required
          />
        </Field>

        <Field htmlFor={f("duracion")} label="Duración" required error={error("duracion_horas")} className="sm:col-span-3">
          <Input
            id={f("duracion")}
            name="duracion_horas"
            type="number"
            inputMode="decimal"
            min={0.5}
            max={200}
            step={0.5}
            defaultValue={c?.duracion_horas ?? 2}
            trailing="horas"
            required
          />
        </Field>

        <Field
          htmlFor={f("cupo")}
          label="Cupo"
          error={error("cupo")}
          hint="Dejalo vacío si no hay límite."
          className="sm:col-span-2"
        >
          <Input
            id={f("cupo")}
            name="cupo"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            defaultValue={c?.cupo ?? ""}
            trailing="personas"
          />
        </Field>

        <Field htmlFor={f("estado")} label="Estado" required error={error("estado")} className="sm:col-span-4">
          <Select id={f("estado")} name="estado" defaultValue={c?.estado ?? "abierta"}>
            {Constants.public.Enums.estado_capacitacion.map((e) => (
              <option key={e} value={e}>
                {ESTADO_CAPACITACION[e].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          htmlFor={f("destinatarios")}
          label="Destinatarios"
          error={error("destinatarios")}
          hint="A quién está dirigida. Ej.: titulares y asesores técnicos de empresas habilitadas."
          className="sm:col-span-6"
        >
          <Input id={f("destinatarios")} name="destinatarios" defaultValue={c?.destinatarios ?? ""} maxLength={300} />
        </Field>
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pendiente}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pendiente}>
          {editar ? "Guardar cambios" : "Crear capacitación"}
        </Button>
      </DialogFooter>
    </form>
  );
}
