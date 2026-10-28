"use client";

import { useId, useState } from "react";
import { ListChecks, Pencil, Plus } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PERIODICIDAD } from "@/lib/domain/etiquetas";
import { Constants, type Tables } from "@/lib/supabase/database.types";
import { useEnvio } from "../_compartido/use-envio";
import { guardarRubro } from "../actions";
import { DESCRIPCION_GRUPO, esGrupoRubro, GRUPOS_RUBRO, type GrupoRubro } from "./constantes";

type Rubro = Tables<"rubros">;

type Props =
  | { modo: "crear"; rubro?: undefined; grupoInicial?: GrupoRubro; compacto?: boolean }
  | { modo: "editar"; rubro: Rubro; grupoInicial?: undefined; compacto?: boolean };

/** Alta o edición de un rubro del Anexo. */
export function DialogoRubro(props: Props) {
  const [abierto, setAbierto] = useState(false);
  const editar = props.modo === "editar";
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {editar ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Editar el rubro ${props.rubro.nombre}`}>
            <Pencil aria-hidden />
          </Button>
        ) : props.compacto ? (
          <Button variant="ghost" size="sm">
            <Plus aria-hidden />
            Agregar
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden />
            Nuevo rubro
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
  const id = useId();
  const f = (campo: string) => `${id}-${campo}`;
  const r = props.rubro;
  const grupoActual = r?.grupo;
  const [grupo, setGrupo] = useState<GrupoRubro>(
    esGrupoRubro(grupoActual) ? grupoActual : (props.grupoInicial ?? "Comercio"),
  );
  const [estado, despachar, pendiente] = useAccion(guardarRubro, { alExito: props.onCerrar });
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      {r ? <input type="hidden" name="id" value={r.id} /> : null}
      <DialogHeader className="flex-row items-start gap-4">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
        >
          <ListChecks className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <DialogTitle>{r ? "Editar rubro del Anexo" : "Nuevo rubro del Anexo"}</DialogTitle>
          <DialogDescription>
            La periodicidad define el vencimiento de cada certificado emitido para este rubro. Los certificados ya
            emitidos conservan su vencimiento.
          </DialogDescription>
        </div>
      </DialogHeader>
      <DialogBody className="grid gap-5 sm:grid-cols-2">
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No se pudo guardar el rubro" className="sm:col-span-2">
            {estado.mensaje}
          </Alert>
        ) : null}

        <Field
          htmlFor={f("grupo")}
          label="Grupo"
          required
          error={error("grupo")}
          hint={DESCRIPCION_GRUPO[grupo]}
          className="sm:col-span-1"
        >
          <Select id={f("grupo")} name="grupo" value={grupo} onChange={(e) => {
              if (esGrupoRubro(e.target.value)) setGrupo(e.target.value);
            }}>
            {GRUPOS_RUBRO.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor={f("periodicidad")} label="Periodicidad" required error={error("periodicidad")}>
          <Select id={f("periodicidad")} name="periodicidad" defaultValue={r?.periodicidad ?? ""} placeholder="Elegí la periodicidad">
            {Constants.public.Enums.periodicidad.map((p) => (
              <option key={p} value={p}>
                {PERIODICIDAD[p].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          htmlFor={f("nombre")}
          label="Uso o actividad"
          required
          error={error("nombre")}
          hint="Transcribilo tal como figura en el Anexo de la Ord. 2681/98."
          className="sm:col-span-2"
        >
          <Input id={f("nombre")} name="nombre" defaultValue={r?.nombre ?? ""} maxLength={160} required />
        </Field>

        <Field
          htmlFor={f("descripcion")}
          label="Descripción o aclaraciones"
          error={error("descripcion")}
          hint={grupo === "No tipificada" ? "Indicá con qué rubro tipificado se fijó la periodicidad por similitud." : "Opcional."}
          className="sm:col-span-2"
        >
          <Textarea id={f("descripcion")} name="descripcion" rows={3} defaultValue={r?.descripcion ?? ""} maxLength={500} />
        </Field>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-subtle p-4 sm:col-span-2">
          <Checkbox
            name="validado"
            defaultChecked={r?.validado ?? false}
            label="Validado contra el texto original"
            description="Marcalo cuando el nombre y la periodicidad se cotejaron con las fotografías del Anexo (fojas 237 a 244)."
          />
          <Checkbox
            name="activo"
            defaultChecked={r?.activo ?? true}
            label="Activo"
            description="Los rubros inactivos no se ofrecen al cargar certificados nuevos."
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
          {r ? "Guardar cambios" : "Agregar rubro"}
        </Button>
      </DialogFooter>
    </form>
  );
}
