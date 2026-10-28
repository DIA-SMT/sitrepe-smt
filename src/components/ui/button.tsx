import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium select-none",
    "transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-brand hover:bg-primary-hover hover:shadow-[0_10px_24px_-10px_rgb(0_102_255/0.7)]",
        secondary:
          "bg-azul-50 text-azul-700 ring-1 ring-azul-100 ring-inset hover:bg-azul-100 hover:text-azul-800",
        outline:
          "border border-border-strong bg-card text-foreground shadow-xs hover:border-azul-300 hover:bg-azul-50/60 hover:text-azul-800",
        ghost: "text-foreground hover:bg-muted",
        danger:
          "bg-danger text-danger-foreground shadow-[0_8px_20px_-10px_rgb(208_48_63/0.8)] hover:bg-[#b42333]",
        sol: "bg-sol-400 text-noche-950 shadow-[0_8px_20px_-10px_rgb(203_147_8/0.9)] hover:bg-sol-300",
        link: "h-auto rounded-sm px-0 text-primary underline-offset-4 hover:text-primary-hover hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-10 px-4 text-sm",
        lg: "h-12 rounded-xl px-6 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8 rounded-lg",
      },
    },
    compoundVariants: [{ variant: "link", class: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza el hijo (p. ej. un `<Link>`) con los estilos del botón. */
    asChild?: boolean;
    /** Muestra un spinner y deshabilita el botón. */
    loading?: boolean;
  };

/**
 * Botón base. Variantes: primary · secondary · outline · ghost · danger · sol · link.
 * Tamaños: sm · md · lg · icon · icon-sm.
 */
export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
