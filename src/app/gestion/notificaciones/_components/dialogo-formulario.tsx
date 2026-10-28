"use client";

import { startTransition, useState } from "react";
import { CircleHelp, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import type { EstadoAccion } from "@/lib/acciones";
import { cn } from "@/lib/utils";

type Errores = EstadoAccion["errores"];

export type DialogoFormularioProps = {
  /** Botón que abre el diálogo (se usa con `asChild`). */
  trigger: React.ReactElement;
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** `danger` para anulaciones; `primary` para el resto. */
  tone?: "primary" | "danger";
  submitLabel: string;
  /** Server Action que devuelve EstadoAccion. */
  accion: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
  hiddenFields?: Record<string, string>;
  /** Campos del formulario; reciben los errores de validación por campo. */
  children?: (errores: Errores) => React.ReactNode;
};

/**
 * Diálogo con formulario para acciones de seguimiento (registrar, cumplir,
 * anular, elevar…). Muestra toasts con el resultado y se cierra al terminar bien.
 * Se envía con `onSubmit` (no con `action`) para que un error de validación no
 * borre lo que ya se escribió.
 */
export function DialogoFormulario({
  trigger,
  title,
  description,
  icon,
  tone = "primary",
  submitLabel,
  accion,
  hiddenFields,
  children,
}: DialogoFormularioProps) {
  const [abierto, setAbierto] = useState(false);
  // Los errores de un intento anterior no se muestran al volver a abrir el diálogo.
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [estado, despachar, pendiente] = useAccion(accion, { alExito: () => setAbierto(false) });
  const Icono = icon ?? (tone === "danger" ? TriangleAlert : CircleHelp);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        if (v) setMostrarErrores(false);
        setAbierto(v);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="md">
        <form
          noValidate
          className="flex min-h-0 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            setMostrarErrores(true);
            startTransition(() => despachar(datos));
          }}
        >
          <DialogHeader className="flex-row items-start gap-4 pb-2">
            <span
              aria-hidden
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
                tone === "danger" ? "bg-danger-soft text-danger ring-red-200" : "bg-azul-50 text-azul-600 ring-azul-100",
              )}
            >
              <Icono className="size-5" />
            </span>
            <div className="flex flex-col gap-1.5">
              <DialogTitle>{title}</DialogTitle>
              {description ? (
                <DialogDescription>{description}</DialogDescription>
              ) : (
                <DialogDescription className="sr-only">{title}</DialogDescription>
              )}
            </div>
          </DialogHeader>
          {hiddenFields
            ? Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
            : null}
          {children ? (
            <DialogBody className="flex flex-col gap-4 pb-5">
              {children(mostrarErrores ? estado.errores : undefined)}
            </DialogBody>
          ) : (
            <div className="pb-4" />
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} loading={pendiente}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
