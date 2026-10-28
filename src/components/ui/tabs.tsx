"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />;
}

type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List> & {
  /** `pills`: segmentado sobre fondo gris (por defecto). `line`: subrayado. */
  variant?: "pills" | "line";
};

export function TabsList({ className, variant = "pills", ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "group/tabs inline-flex w-fit max-w-full items-center overflow-x-auto overflow-y-hidden",
        variant === "pills" && "gap-1 rounded-xl bg-muted p-1",
        variant === "line" && "w-full gap-5 shadow-[inset_0_-1px_0_var(--color-border)]",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all",
        "hover:text-foreground focus-visible:outline-offset-[-2px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        // pills
        "group-data-[variant=pills]/tabs:h-8 group-data-[variant=pills]/tabs:rounded-lg group-data-[variant=pills]/tabs:px-3",
        "group-data-[variant=pills]/tabs:data-[state=active]:bg-card group-data-[variant=pills]/tabs:data-[state=active]:text-azul-700 group-data-[variant=pills]/tabs:data-[state=active]:shadow-[0_1px_3px_rgb(10_26_63/0.14)]",
        // line
        "group-data-[variant=line]/tabs:h-10 group-data-[variant=line]/tabs:border-b-2 group-data-[variant=line]/tabs:border-transparent",
        "group-data-[variant=line]/tabs:data-[state=active]:border-primary group-data-[variant=line]/tabs:data-[state=active]:text-azul-700",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none data-[state=active]:animate-fade-in", className)}
      {...props}
    />
  );
}
