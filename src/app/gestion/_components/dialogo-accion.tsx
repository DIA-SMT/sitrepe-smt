"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { CircleHelp, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
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
import type { EstadoAccion } from "@/lib/acciones";
import { cn } from "@/lib/utils";
import { enviarSinReiniciar } from "./formulario";

/** Campos simples (serializables) que puede pedir un diálogo de acción. */
export type CampoDialogo =
  | {
      tipo: "textarea";
      nombre: string;
      etiqueta: string;
      requerido?: boolean;
      placeholder?: string;
      ayuda?: string;
      valorInicial?: string;
      maximo?: number;
    }
  | {
      tipo: "texto";
      nombre: string;
      etiqueta: string;
      requerido?: boolean;
      placeholder?: string;
      ayuda?: string;
      valorInicial?: string;
      maximo?: number;
    }
  | { tipo: "fecha"; nombre: string; etiqueta: string; requerido?: boolean; ayuda?: string; valorInicial?: string }
  | { tipo: "casilla"; nombre: string; etiqueta: string; descripcion?: string };

export type AvisoDialogo = { tono: "info" | "warning" | "danger" | "success"; titulo: string; texto?: React.ReactNode };

export type DialogoAccionProps = {
  /** Server Action con la firma de `useActionState`. */
  accion: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
  /** Botón que abre el diálogo. */
  trigger: React.ReactElement;
  titulo: string;
  descripcion?: React.ReactNode;
  confirmar: string;
  /** `danger` para rechazos y bajas. */
  tono?: "primary" | "danger";
  /** Datos ocultos que viajan con el formulario (ids, decisión). */
  ocultos: Record<string, string>;
  campos?: CampoDialogo[];
  aviso?: AvisoDialogo;
  /** Contenido libre debajo del aviso (resúmenes, listas). */
  children?: React.ReactNode;
  /** Ancho del diálogo. */
  size?: "sm" | "md" | "lg";
};

/**
 * Diálogo con formulario para acciones de revisión (aprobar, rechazar, observar, dar de baja).
 * El estado se reinicia cada vez que se abre (el formulario se monta de nuevo) y se cierra solo
 * cuando la acción termina bien; los errores quedan visibles junto a cada campo y lo escrito se
 * conserva (el envío no reinicia el formulario).
 */
export function DialogoAccion({ trigger, size = "sm", ...props }: DialogoAccionProps) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, setPendiente] = useState(false);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (!pendiente) setAbierto(v);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size={size} showClose={false}>
        <FormularioDialogo {...props} onPendiente={setPendiente} onExito={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioDialogo({
  accion,
  titulo,
  descripcion,
  confirmar,
  tono = "primary",
  ocultos,
  campos = [],
  aviso,
  children,
  onPendiente,
  onExito,
}: Omit<DialogoAccionProps, "trigger" | "size"> & { onPendiente: (v: boolean) => void; onExito: () => void }) {
  const id = useId();
  // El aviso de éxito se muestra apenas responde el servidor: la revalidación suele desmontar
  // este diálogo (p. ej. el botón «Aprobar» desaparece al quedar aprobado) antes de que corran
  // los efectos de `useAccion`. Los errores no revalidan, así que esos los avisa `useAccion`.
  const accionConAviso = useCallback(
    async (previo: EstadoAccion, formData: FormData) => {
      const resultado = await accion(previo, formData);
      if (resultado.ok && resultado.mensaje) toast.success(resultado.mensaje);
      return resultado;
    },
    [accion],
  );
  const [estado, despachar, pendiente] = useAccion(accionConAviso, { alExito: onExito, silenciarExito: true });

  useEffect(() => {
    onPendiente(pendiente);
  }, [pendiente, onPendiente]);

  const Icono = tono === "danger" ? TriangleAlert : CircleHelp;
  const error = (nombre: string) => estado.errores?.[nombre]?.[0];

  return (
    <form onSubmit={enviarSinReiniciar(despachar)} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="flex-row items-start gap-4 pr-6">
        <span
          aria-hidden
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
            tono === "danger" ? "bg-danger-soft text-danger ring-red-200" : "bg-azul-50 text-azul-600 ring-azul-100",
          )}
        >
          <Icono className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion ? (
            <DialogDescription>{descripcion}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{titulo}</DialogDescription>
          )}
        </div>
      </DialogHeader>

      {Object.entries(ocultos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}

      <DialogBody className="flex flex-col gap-4 empty:hidden">
        {aviso ? (
          <Alert tone={aviso.tono} title={aviso.titulo}>
            {aviso.texto}
          </Alert>
        ) : null}
        {children}
        {campos.map((campo) => {
          const cid = `${id}-${campo.nombre}`;
          if (campo.tipo === "casilla") {
            return (
              <div key={campo.nombre} className="flex flex-col gap-1.5">
                <Checkbox
                  id={cid}
                  name={campo.nombre}
                  label={campo.etiqueta}
                  description={campo.descripcion}
                  aria-invalid={error(campo.nombre) ? true : undefined}
                />
                {error(campo.nombre) ? (
                  <p role="alert" className="text-[13px] font-medium text-danger">
                    {error(campo.nombre)}
                  </p>
                ) : null}
              </div>
            );
          }
          return (
            <Field
              key={campo.nombre}
              htmlFor={cid}
              label={campo.etiqueta}
              hint={campo.ayuda}
              required={campo.requerido}
              error={error(campo.nombre)}
            >
              {campo.tipo === "textarea" ? (
                <Textarea
                  id={cid}
                  name={campo.nombre}
                  rows={3}
                  required={campo.requerido}
                  placeholder={campo.placeholder}
                  defaultValue={campo.valorInicial}
                  maxLength={campo.maximo ?? 2000}
                />
              ) : campo.tipo === "fecha" ? (
                <Input id={cid} name={campo.nombre} type="date" required={campo.requerido} defaultValue={campo.valorInicial} />
              ) : (
                <Input
                  id={cid}
                  name={campo.nombre}
                  required={campo.requerido}
                  placeholder={campo.placeholder}
                  defaultValue={campo.valorInicial}
                  maxLength={campo.maximo ?? 200}
                  autoComplete="off"
                />
              )}
            </Field>
          );
        })}
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No se pudo completar la acción">
            <span className="whitespace-pre-line">{estado.mensaje}</span>
          </Alert>
        ) : null}
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pendiente}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" variant={tono === "danger" ? "danger" : "primary"} loading={pendiente}>
          {pendiente ? "Procesando…" : confirmar}
        </Button>
      </DialogFooter>
    </form>
  );
}
