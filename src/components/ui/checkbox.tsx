import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Texto del label. Si se omite, se renderiza solo la casilla (asociala con un `<Label htmlFor>`). */
  label?: React.ReactNode;
  /** Texto secundario debajo del label. */
  description?: React.ReactNode;
  wrapperClassName?: string;
};

/** Casilla nativa con estilo de marca (funciona sin JS y dentro de `<form>`). */
export function Checkbox({ className, label, description, wrapperClassName, disabled, ...props }: CheckboxProps) {
  const box = (
    <span className="relative inline-flex size-[18px] shrink-0">
      <input
        type="checkbox"
        data-slot="checkbox"
        disabled={disabled}
        className={cn(
          "peer size-full cursor-pointer appearance-none rounded-[5px] border border-input bg-card shadow-xs transition-colors",
          "hover:border-azul-500 checked:border-primary checked:bg-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "aria-invalid:border-danger disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-muted",
          className,
        )}
        {...props}
      />
      <Check
        aria-hidden
        strokeWidth={3.2}
        className="pointer-events-none absolute inset-0 m-auto size-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
      />
    </span>
  );

  if (!label) return box;

  return (
    <label
      className={cn(
        "group inline-flex cursor-pointer items-start gap-2.5 text-sm text-foreground",
        disabled && "cursor-not-allowed opacity-60",
        wrapperClassName,
      )}
    >
      <span className="mt-px">{box}</span>
      <span className="flex flex-col gap-0.5">
        <span className="leading-snug font-medium">{label}</span>
        {description ? <span className="text-[13px] leading-snug text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}
