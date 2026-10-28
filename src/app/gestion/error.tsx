"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, LifeBuoy, RefreshCw, TriangleAlert } from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { Button } from "@/components/ui/button";
import { APP } from "@/lib/config";

function codigoError(error: unknown): string | null {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") return error.digest;
  return null;
}

/** Error en una página de gestión: se muestra dentro del shell (barra lateral y superior siguen disponibles). */
export default function ErrorGestion({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const codigo = codigoError(error);
  // Los errores de las capas de datos llegan con el mensaje ya redactado para el usuario (solo visibles en desarrollo).
  const detalle = process.env.NODE_ENV !== "production" && error instanceof Error ? error.message : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-6">
      <div
        role="alert"
        className="relative w-full max-w-xl overflow-hidden rounded-panel border border-border bg-card p-6 shadow-card sm:p-8 animate-fade-up"
      >
        <PetalDecor variant="corner" tone="light" className="h-36 opacity-70" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <span
            aria-hidden
            className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-danger ring-1 ring-red-200"
          >
            <TriangleAlert className="size-7" strokeWidth={1.8} />
            <span className="absolute -top-1 -right-1 size-3 rounded-full bg-sol-400 ring-2 ring-card" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              No pudimos cargar esta sección
            </h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
              Ocurrió un error al consultar la información. Los datos no se modificaron: reintentá y, si el problema sigue,
              informalo a {APP.direccion}.
            </p>
            {detalle ? (
              <p className="mt-3 rounded-lg bg-muted px-3 py-2 font-mono text-xs break-words text-noche-700">{detalle}</p>
            ) : null}
            {codigo ? <p className="mt-3 font-mono text-xs text-muted-foreground">Código: {codigo}</p> : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => retry()}>
                <RefreshCw aria-hidden />
                Reintentar
              </Button>
              <Button asChild variant="outline">
                <Link href="/gestion">
                  <LayoutDashboard aria-hidden />
                  Ir al panel
                </Link>
              </Button>
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <LifeBuoy className="size-3.5 text-azul-600" aria-hidden />
              Soporte:{" "}
              <a href={`mailto:${APP.contacto.email}`} className="font-medium text-azul-700 underline-offset-2 hover:underline">
                {APP.contacto.email}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
