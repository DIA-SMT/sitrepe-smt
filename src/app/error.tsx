"use client";

import { useEffect } from "react";
import Link from "next/link";
import { House, LifeBuoy, RefreshCw, ServerCrash } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BrandStripe, PetalDecor } from "@/components/brand/petal-decor";
import { Button } from "@/components/ui/button";
import { APP } from "@/lib/config";

/** Identificador del error del servidor (para informarlo a soporte), si existe. */
function codigoError(error: unknown): string | null {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") return error.digest;
  return null;
}

/** Error inesperado fuera de las áreas de gestión y de prestadores (portal, acceso, perfil…). */
export default function ErrorGlobal({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const codigo = codigoError(error);

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-gradient-brand-soft">
      <BrandStripe className="h-[3px]" />
      <div aria-hidden className="bg-dots mask-fade pointer-events-none absolute inset-0 -z-10 text-azul-600 opacity-60" />
      <PetalDecor variant="scatter" tone="light" className="-z-10 opacity-80" />

      <header className="mx-auto flex w-full max-w-5xl items-center px-4 py-5 sm:px-6">
        <Link href="/" className="rounded-md" aria-label={`${APP.nombre} · Inicio`}>
          <Logo height={38} />
        </Link>
      </header>

      <main id="contenido" className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
        <div
          role="alert"
          className="w-full max-w-lg rounded-panel border border-border bg-card p-6 text-center shadow-elevated sm:p-10 animate-fade-up"
        >
          <span
            aria-hidden
            className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-50 text-danger ring-1 ring-red-200"
          >
            <ServerCrash className="size-8" strokeWidth={1.8} />
            <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-sol-400 ring-2 ring-card" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Algo no salió como esperábamos
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Tuvimos un problema al mostrar esta página. Probá de nuevo en unos segundos; si sigue pasando, avisanos.
          </p>
          {codigo ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 font-mono text-xs text-noche-600">
              Código: {codigo}
            </p>
          ) : null}
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => retry()}>
              <RefreshCw aria-hidden />
              Reintentar
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/">
                <House aria-hidden />
                Ir al inicio
              </Link>
            </Button>
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <LifeBuoy className="size-3.5 text-azul-600" aria-hidden />
            <a href={`mailto:${APP.contacto.email}`} className="font-medium text-azul-700 underline-offset-2 hover:underline">
              {APP.contacto.email}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
