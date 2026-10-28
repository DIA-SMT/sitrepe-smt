"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LogIn, Menu, QrCode, X } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Logo } from "@/components/brand/logo";
import { BrandStripe } from "@/components/brand/petal-decor";
import { Button } from "@/components/ui/button";
import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";
import { esRutaActiva, navPortal } from "./nav";

/** En la barra de escritorio se omiten "Inicio" (lo cubre el logo) y "Verificar" (es un CTA). */
const linksEscritorio = navPortal.filter((l) => l.href !== "/" && l.href !== "/verificar");

/** Encabezado del portal público: se vuelve "vidrio" al hacer scroll. */
export function PortalHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [conScroll, setConScroll] = useState(false);
  const [abierto, setAbierto] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const nuevo = y > 12;
    if (nuevo !== conScroll) setConScroll(nuevo);
  });

  return (
    <header
      className={cn(
        "no-print sticky top-0 z-40 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300",
        conScroll
          ? "glass border-b border-border/70 shadow-[0_10px_30px_-18px_rgb(10_26_63/0.35)]"
          : "border-b border-transparent bg-transparent",
        className,
      )}
    >
      <BrandStripe className="h-[3px]" />
      <div className="mx-auto flex h-[70px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3 rounded-lg" aria-label={`${APP.nombre} · Inicio`}>
          <Logo size="sm" height={36} priority />
          <span aria-hidden className="hidden h-8 w-px bg-border-strong sm:block" />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-lg font-bold tracking-tight text-foreground">{APP.nombre}</span>
            <span className="mt-1 text-[11px] font-medium text-muted-foreground">Salud Ambiental</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="ml-4 hidden items-center gap-0.5 xl:flex">
          {linksEscritorio.map((l) => {
            const activo = esRutaActiva(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activo ? "text-azul-700" : "text-noche-600 hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {l.label}
                {activo ? (
                  <motion.span
                    layoutId="portal-nav-activo"
                    className="absolute inset-x-3 -bottom-[3px] h-[2px] rounded-full bg-linear-to-r from-azul-600 to-celeste-400"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link href="/verificar">
              <QrCode aria-hidden />
              Verificar certificado
            </Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/ingresar">
              <LogIn aria-hidden />
              Ingresar
            </Link>
          </Button>

          <DialogPrimitive.Root open={abierto} onOpenChange={setAbierto}>
            <DialogPrimitive.Trigger asChild>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted xl:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="size-5" aria-hidden />
              </button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-noche-950/40 backdrop-blur-[2px] data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in xl:hidden" />
              <DialogPrimitive.Content
                aria-describedby={undefined}
                className="fixed inset-x-3 top-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-panel border border-border bg-card p-4 shadow-elevated outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in sm:inset-x-auto sm:right-4 sm:w-[380px] xl:hidden"
              >
                <div className="flex items-center justify-between gap-3 pb-3">
                  <DialogPrimitive.Title className="font-display text-base font-semibold text-foreground">
                    {APP.nombre} · Menú
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close
                    aria-label="Cerrar menú"
                    className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-5" aria-hidden />
                  </DialogPrimitive.Close>
                </div>
                <nav aria-label="Principal (móvil)">
                  <ul className="flex flex-col gap-1">
                    {navPortal.map((l) => {
                      const Icon = l.icon;
                      const activo = esRutaActiva(pathname, l.href);
                      return (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            onClick={() => setAbierto(false)}
                            aria-current={activo ? "page" : undefined}
                            className={cn(
                              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                              activo ? "bg-azul-50 text-azul-800" : "text-foreground hover:bg-muted",
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "flex size-8 items-center justify-center rounded-lg",
                                activo ? "bg-white text-azul-600 shadow-xs" : "bg-muted text-noche-500 group-hover:text-azul-600",
                              )}
                            >
                              <Icon className="size-4" />
                            </span>
                            {l.label}
                            <ArrowRight className="ml-auto size-4 text-noche-300" aria-hidden />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
                  <Button asChild variant="outline">
                    <Link href="/verificar" onClick={() => setAbierto(false)}>
                      <QrCode aria-hidden />
                      Verificar
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/ingresar" onClick={() => setAbierto(false)}>
                      <LogIn aria-hidden />
                      Ingresar
                    </Link>
                  </Button>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </div>
    </header>
  );
}
