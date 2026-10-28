"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ServerCrash } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

/** Estado de error de las páginas del módulo (se usa desde cada `error.tsx`). */
export function ErrorModulo({ error, retry, titulo }: { error: unknown; retry: () => void; titulo: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;

  return (
    <div className="py-6">
      <EmptyState
        icon={ServerCrash}
        title={titulo}
        description={
          <>
            Ocurrió un problema al consultar la información. Probá de nuevo en unos segundos; si el error persiste,
            comunicate con la Dirección de Salud Ambiental.
            {digest ? <span className="mt-2 block font-mono text-xs text-muted-foreground">Código: {digest}</span> : null}
          </>
        }
        action={
          <>
            <Button onClick={() => retry()}>
              <RotateCcw aria-hidden />
              Reintentar
            </Button>
            <Button asChild variant="outline">
              <Link href="/prestador">Ir al inicio</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
