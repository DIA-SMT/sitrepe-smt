"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export type SubmitButtonProps = Omit<ButtonProps, "type" | "asChild" | "loading"> & {
  /** Texto mientras se envía (por defecto, el mismo contenido). */
  pendingText?: React.ReactNode;
};

/** Botón de envío que muestra un spinner y se deshabilita mientras el formulario está pendiente. */
export function SubmitButton({ children, pendingText, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending || undefined} {...props}>
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
