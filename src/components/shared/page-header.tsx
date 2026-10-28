import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = { label: string; href?: string };

export type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Botones/acciones a la derecha. */
  actions?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
  /** Contenido extra debajo (badges de estado, metadatos…). */
  children?: React.ReactNode;
  className?: string;
};

/** Encabezado de página: migas, ícono, título, descripción y acciones. */
export function PageHeader({ title, description, icon: Icon, actions, breadcrumb, children, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 pb-6", className)}>
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav aria-label="Migas de pan" className="no-print">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
            {breadcrumb.map((item, i) => {
              const last = i === breadcrumb.length - 1;
              return (
                <li key={`${item.label}-${i}`} className="flex items-center gap-1">
                  {item.href && !last ? (
                    <Link href={item.href} className="rounded-sm transition-colors hover:text-azul-700">
                      {item.label}
                    </Link>
                  ) : (
                    <span aria-current={last ? "page" : undefined} className={cn(last && "font-medium text-foreground")}>
                      {item.label}
                    </span>
                  )}
                  {!last ? <ChevronRight className="size-3.5 text-noche-300" aria-hidden /> : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {Icon ? (
            <span
              aria-hidden
              className="relative hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-brand sm:flex"
            >
              <Icon className="size-6" strokeWidth={1.9} />
              <span className="absolute -top-1 -right-1 size-3 rounded-full bg-sol-400 ring-2 ring-background" />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-display text-2xl leading-tight font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              {title}
            </h1>
            {description ? <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}
