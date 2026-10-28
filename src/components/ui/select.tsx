import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClasses } from "./input";

export type SelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  /** Opción inicial vacía y deshabilitada (p. ej. "Seleccioná una opción"). */
  placeholder?: string;
  /** Clases del contenedor (usar para el ancho: `className` se aplica al `<select>`). */
  wrapperClassName?: string;
  size?: "sm" | "md";
};

/** `<select>` nativo con estilo de marca. Accesible y compatible con formularios sin JS. */
export function Select({
  className,
  wrapperClassName,
  placeholder,
  children,
  size = "md",
  defaultValue,
  value,
  ...props
}: SelectProps) {
  const controlled = value !== undefined;
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <select
        data-slot="select"
        className={cn(
          controlClasses,
          "cursor-pointer appearance-none pr-9 pl-3 [&:has(option[value='']:checked)]:text-muted-foreground [&>option]:text-foreground",
          size === "sm" ? "h-8 text-[13px]" : "h-10",
          className,
        )}
        {...(controlled ? { value } : { defaultValue: defaultValue ?? (placeholder ? "" : undefined) })}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
