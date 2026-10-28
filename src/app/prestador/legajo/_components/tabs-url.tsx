"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

type TabsUrlProps = {
  /** Pestaña indicada por la URL al renderizar en el servidor (ya validada). */
  valorInicial: string;
  /** Valores válidos de pestaña (los demás valores de la URL se ignoran). */
  valores: readonly string[];
  /** Parámetro de la URL donde se refleja la pestaña activa. */
  parametro?: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Pestañas cuyo valor se refleja en la URL (`?tab=`) sin recargar la página, para poder
 * compartir o enlazar una pestaña concreta. Si un enlace cambia la pestaña de la URL, se
 * sincroniza sin remontar el contenido (los formularios abiertos conservan su estado).
 *
 * Se sigue el parámetro con `useSearchParams` (Next sincroniza `history.replaceState`), así un
 * enlace a la misma pestaña que se renderizó en el servidor también la activa aunque el usuario
 * haya cambiado de pestaña a mano.
 */
export function TabsUrl({ valorInicial, valores, parametro = "tab", className, children }: TabsUrlProps) {
  const params = useSearchParams();
  const enUrl = params.get(parametro);
  const [valor, setValor] = useState(valorInicial);
  const [urlPrevia, setUrlPrevia] = useState(enUrl);
  if (enUrl !== urlPrevia) {
    setUrlPrevia(enUrl);
    if (enUrl && valores.includes(enUrl)) setValor(enUrl);
  }

  const cambiar = (nuevo: string) => {
    setValor(nuevo);
    const siguientes = new URLSearchParams(window.location.search);
    siguientes.set(parametro, nuevo);
    window.history.replaceState(null, "", `${window.location.pathname}?${siguientes.toString()}`);
  };

  return (
    <Tabs value={valor} onValueChange={cambiar} className={className}>
      {children}
    </Tabs>
  );
}
