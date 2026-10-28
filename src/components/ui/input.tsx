import { cn } from "@/lib/utils";

/** Clases compartidas por los controles de formulario (input, select, textarea). */
export const controlClasses = cn(
  "w-full min-w-0 rounded-control border border-input bg-card text-sm text-foreground shadow-xs",
  "transition-[border-color,box-shadow,background-color] duration-150 outline-none",
  "placeholder:text-muted-foreground/90",
  "hover:border-noche-500",
  "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15",
  "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/15",
  "disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-muted disabled:text-muted-foreground",
  "[&[readonly]]:bg-subtle",
);

export type InputProps = React.ComponentProps<"input"> & {
  /** Contenido a la izquierda (ícono, prefijo). Decorativo: usar `aria-hidden` en íconos. */
  leading?: React.ReactNode;
  /** Contenido a la derecha (ícono, sufijo, unidad). */
  trailing?: React.ReactNode;
  /** Clases del contenedor cuando hay `leading`/`trailing`. */
  wrapperClassName?: string;
};

export function Input({ className, type = "text", leading, trailing, wrapperClassName, ...props }: InputProps) {
  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        controlClasses,
        "h-10 px-3",
        "file:mr-3 file:h-7 file:rounded-md file:border-0 file:bg-azul-50 file:px-2.5 file:text-xs file:font-medium file:text-azul-700",
        type === "file" && "py-1.5",
        leading ? "pl-9" : null,
        trailing ? "pr-10" : null,
        className,
      )}
      {...props}
    />
  );

  if (!leading && !trailing) return input;

  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      {leading ? (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground [&_svg]:size-4">
          {leading}
        </span>
      ) : null}
      {input}
      {trailing ? (
        <span className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground [&_svg]:size-4">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}
