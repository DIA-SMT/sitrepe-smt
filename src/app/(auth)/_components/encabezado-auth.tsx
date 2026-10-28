import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EncabezadoAuthProps = {
  icon: LucideIcon;
  /** Texto chico arriba del título. */
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  className?: string;
};

/** Encabezado de las tarjetas de acceso: ícono de marca, título (h1) y bajada. */
export function EncabezadoAuth({ icon: Icon, eyebrow, title, description, className }: EncabezadoAuthProps) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 pt-1 animate-fade-in", className)}>
      <span
        aria-hidden
        className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-brand"
      >
        <Icon className="size-6" strokeWidth={1.9} />
        <span className="absolute -top-1 -right-1 size-3 rounded-full bg-sol-400 ring-2 ring-card" />
      </span>
      <div className="flex flex-col gap-1.5">
        {eyebrow ? (
          <p className="font-display text-xs font-semibold tracking-[0.12em] text-azul-600 uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-2xl leading-tight font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
    </header>
  );
}
