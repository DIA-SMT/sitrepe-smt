import { cn } from "@/lib/utils";

export type LabelProps = React.ComponentProps<"label"> & {
  /** Muestra un asterisco de campo obligatorio. */
  required?: boolean;
};

export function Label({ className, required = false, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        "inline-flex items-center gap-1 text-sm leading-none font-medium text-foreground select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span className="text-danger" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}
