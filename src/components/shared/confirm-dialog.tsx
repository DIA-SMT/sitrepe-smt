"use client";

import { useState, useTransition } from "react";
import { TriangleAlert, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SubmitButton } from "./submit-button";

export type ConfirmDialogProps = {
  /** Elemento que abre el diálogo (se usa con `asChild`: pasá un `<Button>`). */
  trigger: React.ReactElement;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` para acciones destructivas (anular, rechazar, dar de baja). */
  tone?: "danger" | "primary";
  /** Callback del lado del cliente. El diálogo se cierra al terminar. */
  onConfirm?: () => void | Promise<void>;
  /** Server action (o función) que recibe el FormData del formulario del diálogo. */
  action?: (formData: FormData) => void | Promise<void>;
  /** Campos ocultos a enviar con `action` (p. ej. `{ id: "…" }`). */
  hiddenFields?: Record<string, string>;
  /** Contenido extra dentro del formulario (p. ej. un textarea de motivo). */
  children?: React.ReactNode;
};

/** Diálogo de confirmación para acciones sensibles. Admite callback o envío de formulario. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  onConfirm,
  action,
  hiddenFields,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const Icono = tone === "danger" ? TriangleAlert : CircleHelp;

  const encabezado = (
    <DialogHeader className="flex-row items-start gap-4 pb-5">
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
        {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
      </div>
    </DialogHeader>
  );

  const cancelar = (
    <DialogClose asChild>
      <Button variant="outline" disabled={pending}>
        {cancelLabel}
      </Button>
    </DialogClose>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="sm" showClose={false}>
        {action ? (
          <form
            action={async (formData) => {
              await action(formData);
              setOpen(false);
            }}
            className="flex flex-col"
          >
            {encabezado}
            {hiddenFields
              ? Object.entries(hiddenFields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))
              : null}
            <div className="px-6 pb-5 empty:hidden">{children}</div>
            <DialogFooter>
              {cancelar}
              <SubmitButton variant={tone === "danger" ? "danger" : "primary"}>{confirmLabel}</SubmitButton>
            </DialogFooter>
          </form>
        ) : (
          <>
            {encabezado}
            <div className="px-6 pb-5 empty:hidden">{children}</div>
            <DialogFooter>
              {cancelar}
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    await onConfirm?.();
                    setOpen(false);
                  })
                }
              >
                {confirmLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
