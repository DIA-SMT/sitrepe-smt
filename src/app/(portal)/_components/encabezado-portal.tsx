import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandGlow, PetalDecor } from "@/components/brand/petal-decor";
import { cn } from "@/lib/utils";

type Miga = { label: string; href?: string };

type EncabezadoPortalProps = {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  /** Texto chico sobre el título (sección del portal). */
  antetitulo?: string;
  icono?: LucideIcon;
  /** Migas de pan después de "Inicio". */
  migas?: Miga[];
  /** Acciones, badges o buscadores debajo de la descripción. */
  children?: React.ReactNode;
  /** Contenido a la derecha en pantallas grandes (ilustración, tarjeta resumen). */
  aside?: React.ReactNode;
  className?: string;
};

/**
 * Banda de encabezado de las páginas internas del portal. Se extiende por detrás del encabezado
 * "vidrio" (73 px) para que el degradé se vea continuo.
 */
export function EncabezadoPortal({
  titulo,
  descripcion,
  antetitulo,
  icono: Icono,
  migas = [],
  children,
  aside,
  className,
}: EncabezadoPortalProps) {
  const todas: Miga[] = [{ label: "Inicio", href: "/" }, ...migas];
  return (
    <section className={cn("relative -mt-[73px] overflow-hidden border-b border-border bg-gradient-brand-soft pt-[73px]", className)}>
      <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-azul-600 opacity-60" />
      <BrandGlow tone="light" />
      <PetalDecor variant="corner" tone="light" animated className="h-56 opacity-80 sm:h-72" />

      <div
        className={cn(
          "relative mx-auto grid max-w-7xl gap-8 px-4 pt-8 pb-10 sm:px-6 sm:pt-10 sm:pb-14 lg:px-8",
          aside && "lg:grid-cols-[1.4fr_1fr] lg:items-center",
        )}
      >
        <div className="flex min-w-0 animate-fade-up flex-col gap-4">
          <nav aria-label="Migas de pan">
            <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
              {todas.map((m, i) => {
                const ultima = i === todas.length - 1;
                return (
                  <li key={`${m.label}-${i}`} className="flex items-center gap-1">
                    {m.href && !ultima ? (
                      <Link href={m.href} className="rounded-sm transition-colors hover:text-azul-700">
                        {m.label}
                      </Link>
                    ) : (
                      <span
                        aria-current={ultima ? "page" : undefined}
                        className={cn(ultima && "block max-w-[14rem] truncate font-medium text-foreground sm:max-w-md")}
                      >
                        {m.label}
                      </span>
                    )}
                    {!ultima ? <ChevronRight className="size-3.5 text-noche-300" aria-hidden /> : null}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="flex items-start gap-4">
            {Icono ? (
              <span
                aria-hidden
                className="relative hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-brand sm:flex"
              >
                <Icono className="size-7" strokeWidth={1.8} />
                <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-sol-400 ring-2 ring-white" />
              </span>
            ) : null}
            <div className="flex min-w-0 flex-col gap-2">
              {antetitulo ? (
                <p className="font-display text-xs font-semibold tracking-[0.14em] text-azul-600 uppercase">{antetitulo}</p>
              ) : null}
              <h1 className="font-display text-3xl leading-[1.1] font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
                {titulo}
              </h1>
              {descripcion ? (
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-[17px]">{descripcion}</p>
              ) : null}
            </div>
          </div>

          {children ? <div className="mt-1">{children}</div> : null}
        </div>

        {aside ? <div className="relative animate-fade-up [animation-delay:120ms]">{aside}</div> : null}
      </div>
    </section>
  );
}

/** Encabezado de sección dentro de una página del portal. */
export function TituloSeccion({
  antetitulo,
  titulo,
  descripcion,
  id,
  className,
  claro = false,
}: {
  antetitulo?: string;
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  id?: string;
  className?: string;
  /** Para fondos oscuros. */
  claro?: boolean;
}) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-2", className)}>
      {antetitulo ? (
        <p
          className={cn(
            "font-display text-xs font-semibold tracking-[0.14em] uppercase",
            claro ? "text-celeste-300" : "text-azul-600",
          )}
        >
          {antetitulo}
        </p>
      ) : null}
      <h2
        id={id}
        className={cn(
          "scroll-mt-28 font-display text-2xl leading-tight font-semibold tracking-tight sm:text-3xl",
          claro ? "text-white" : "text-foreground",
        )}
      >
        {titulo}
      </h2>
      {descripcion ? (
        <p className={cn("text-[15px] leading-relaxed sm:text-base", claro ? "text-noche-200" : "text-muted-foreground")}>
          {descripcion}
        </p>
      ) : null}
    </div>
  );
}
