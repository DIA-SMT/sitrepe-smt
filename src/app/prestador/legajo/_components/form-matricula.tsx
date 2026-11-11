"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { SubirArchivo } from "@/components/shared/subir-archivo";
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
import { Textarea } from "@/components/ui/textarea";
import { hoyISO } from "@/lib/domain/formato";
import { informarMatricula } from "../actions";
import { ErrorCampo } from "./error-campo";
import { useEnvio } from "./use-envio";

type FormMatriculaProps = {
  empresaId: string;
  tecnico: { id: string; nombre: string };
  /** Botón que abre el diálogo. */
  trigger: React.ReactElement;
};

/** Carga de la constancia de matrícula al día de un asesor (declaración jurada; la Dirección puede rechazarla). */
export function FormMatricula({ empresaId, tecnico, trigger }: FormMatriculaProps) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const { pendiente, onSubmit, error, reiniciar } = useEnvio(informarMatricula, { alExito: () => setAbierto(false) });

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        setAbierto(v);
        if (v) {
          setNombre("");
          reiniciar();
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="md">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="tecnico_id" value={tecnico.id} />
          <DialogHeader>
            <DialogTitle>Matrícula al día de {tecnico.nombre}</DialogTitle>
            <DialogDescription>
              Subí la constancia del colegio profesional (CIAZT para ingenieros agrónomos) e indicá hasta cuándo está paga
              la matrícula. Se presenta con carácter de declaración jurada.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-5">
            <Field
              htmlFor="mat-vence"
              label="Al día hasta"
              required
              hint="Si la pagás por mes o por trimestre, cargá la constancia nueva en cada pago."
              error={error("vence")}
            >
              <Input id="mat-vence" name="vence" type="date" required min={hoyISO()} />
            </Field>

            <div className="grid gap-2">
              <SubirArchivo
                name="path"
                bucket="documentos"
                carpeta={[empresaId, "legajo"]}
                label="Constancia de matrícula al día"
                required
                hint="PDF, JPG o PNG de hasta 10 MB."
                onSubido={(_ruta, archivo) => setNombre(archivo.name)}
              />
              <input type="hidden" name="nombre_archivo" value={nombre} />
              <ErrorCampo mensaje={error("path")} />
            </div>

            <Field htmlFor="mat-obs" label="Aclaraciones para la Dirección" hint="Opcional." error={error("observaciones")}>
              <Textarea id="mat-obs" name="observaciones" rows={2} maxLength={300} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={pendiente}>
              {pendiente ? null : <Upload aria-hidden />}
              Cargar constancia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
