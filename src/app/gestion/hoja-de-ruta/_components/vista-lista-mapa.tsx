"use client";

import { useState } from "react";
import { List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lista y mapa: en pantallas grandes se ven lado a lado (mapa fijo al hacer scroll);
 * en el celular se alterna entre una y otra.
 */
export function VistaListaMapa({
  lista,
  mapa,
  cantidadMapa,
}: {
  lista: React.ReactNode;
  mapa: React.ReactNode;
  cantidadMapa?: number;
}) {
  const [vista, setVista] = useState<"lista" | "mapa">("lista");
  const opciones = [
    { valor: "lista" as const, label: "Lista", icono: List },
    { valor: "mapa" as const, label: cantidadMapa !== undefined ? `Mapa (${cantidadMapa})` : "Mapa", icono: MapIcon },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Elegí cómo ver los resultados" className="inline-flex w-fit gap-1 rounded-xl bg-muted p-1 xl:hidden">
        {opciones.map((o) => {
          const Icono = o.icono;
          const activa = vista === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={activa}
              onClick={() => setVista(o.valor)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all",
                activa ? "bg-card text-azul-700 shadow-[0_1px_3px_rgb(10_26_63/0.14)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icono className="size-4" aria-hidden />
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] xl:items-start">
        <div className={cn("min-w-0", vista === "mapa" && "hidden xl:block")}>{lista}</div>
        <div className={cn("min-w-0 xl:sticky xl:top-24", vista === "lista" && "hidden xl:block")}>{mapa}</div>
      </div>
    </div>
  );
}
