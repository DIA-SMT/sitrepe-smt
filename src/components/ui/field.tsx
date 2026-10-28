import { Children, cloneElement, isValidElement } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

export type FieldProps = {
  /** Id del control asociado. Se usa para vincular label, ayuda y error. */
  htmlFor?: string;
  label?: React.ReactNode;
  /** Texto de ayuda debajo del control. */
  hint?: React.ReactNode;
  /** Mensaje de error (activa `aria-invalid` en el control). */
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

type AriaProps = {
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Agrupa label + control + ayuda + error. Si el hijo es un único elemento,
 * le agrega automáticamente `aria-invalid` y `aria-describedby`.
 */
export function Field({ htmlFor, label, hint, error, required, className, children }: FieldProps) {
  const hintId = htmlFor && hint ? `${htmlFor}-ayuda` : undefined;
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  let control = children;
  if (Children.count(children) === 1 && isValidElement<AriaProps>(children)) {
    control = cloneElement(children, {
      "aria-invalid": error ? true : children.props["aria-invalid"],
      "aria-describedby":
        [children.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
    });
  }

  return (
    <div data-slot="field" className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-[13px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {hint && error ? (
        <p id={hintId} className="sr-only">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-[13px] leading-snug font-medium text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
