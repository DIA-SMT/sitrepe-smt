import { cn } from "@/lib/utils";

type SeparatorProps = React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
  /** Si es puramente visual (por defecto) no se anuncia a lectores de pantalla. */
  decorative?: boolean;
  /** Texto centrado opcional ("o", "Datos del técnico"…). Solo horizontal. */
  label?: React.ReactNode;
};

export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  label,
  ...props
}: SeparatorProps) {
  const a11y = decorative
    ? { role: "none" as const }
    : { role: "separator" as const, "aria-orientation": orientation };

  if (label && orientation === "horizontal") {
    return (
      <div data-slot="separator" className={cn("flex items-center gap-3", className)} {...a11y} {...props}>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return (
    <div
      data-slot="separator"
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full min-h-4 w-px self-stretch",
        className,
      )}
      {...a11y}
      {...props}
    />
  );
}
