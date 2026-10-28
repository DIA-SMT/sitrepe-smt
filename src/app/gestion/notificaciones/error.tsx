"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ServerCrash } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ErrorNotificaciones({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <EmptyState
      icon={ServerCrash}
      title="No pudimos cargar las notificaciones"
      description={
        <>
          Puede ser un problema momentáneo de conexión con la base de datos. Probá de nuevo en unos segundos.
          {digest ? <span className="mt-2 block font-mono text-xs">Código: {digest}</span> : null}
        </>
      }
      action={
        <>
          <Button onClick={() => retry()}>
            <RotateCcw aria-hidden /> Reintentar
          </Button>
          <Button asChild variant="outline">
            <Link href="/gestion">Ir al panel</Link>
          </Button>
        </>
      }
    />
  );
}
