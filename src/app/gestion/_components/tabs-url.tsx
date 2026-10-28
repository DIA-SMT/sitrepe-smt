"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type PestanaUrl = {
  valor: string;
  etiqueta: string;
  /** Ícono ya renderizado (elemento), p. ej. `<Users aria-hidden />`. */
  icono?: React.ReactNode;
  /** Número a la derecha de la etiqueta. */
  contador?: number;
  /** Resalta el contador (pendientes de revisión). */
  alerta?: boolean;
};

/**
 * Pestañas que recuerdan la pestaña activa en `?tab=` sin volver a pedir la página
 * (usa `history.replaceState`, integrado con el router de Next.js). El contenido
 * llega como `<TabsContent value>` renderizado en el servidor.
 */
export function TabsUrl({
  pestanas,
  valorInicial,
  parametro = "tab",
  etiqueta,
  children,
  className,
}: {
  pestanas: PestanaUrl[];
  valorInicial: string;
  parametro?: string;
  etiqueta: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [valor, setValor] = useState(valorInicial);

  const cambiar = (nuevo: string) => {
    setValor(nuevo);
    const url = new URL(window.location.href);
    if (nuevo === pestanas[0]?.valor) url.searchParams.delete(parametro);
    else url.searchParams.set(parametro, nuevo);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <Tabs value={valor} onValueChange={cambiar} className={cn("gap-5", className)}>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList variant="line" aria-label={etiqueta} className="min-w-max">
          {pestanas.map((p) => (
            <TabsTrigger key={p.valor} value={p.valor} className="gap-1.5">
              {p.icono}
              {p.etiqueta}
              {p.contador !== undefined && p.contador > 0 ? (
                <span
                  className={cn(
                    "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold nums-tabular",
                    p.alerta ? "bg-sol-400 text-noche-950" : "bg-muted text-muted-foreground",
                  )}
                >
                  {p.contador > 99 ? "99+" : p.contador}
                  {p.alerta ? <span className="sr-only"> pendientes</span> : null}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}
