"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Parámetros que se descartan al filtrar: la página y el aviso de la última resolución
 * (`resultado`, `dj`, `n`, `id`). La pestaña (`vista`) se conserva, también al limpiar.
 * Versión local de `FiltrosUrl` (src/components/shared): aquel "Limpiar" vuelve a la ruta sin
 * parámetros y hacía perder la pestaña activa.
 */
const DESCARTAR = ["pagina", "resultado", "dj", "n", "id"] as const;

export function FiltrosBandeja({
  tipos,
  className,
}: {
  tipos: { valor: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, startTransition] = useTransition();
  const q = params.get("q") ?? "";
  const tipo = params.get("tipo") ?? "";

  const navegar = (cambios: Record<string, string>) => {
    const nuevos = new URLSearchParams(params.toString());
    for (const clave of DESCARTAR) nuevos.delete(clave);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) nuevos.set(clave, valor);
      else nuevos.delete(clave);
    }
    startTransition(() => router.replace(`${pathname}${nuevos.size ? `?${nuevos}` : ""}`, { scroll: false }));
  };

  return (
    <div
      className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", pendiente && "opacity-70", className)}
      aria-busy={pendiente}
    >
      <Busqueda valor={q} onCambio={(texto) => navegar({ q: texto })} />
      <Select
        aria-label="Tipo de servicio"
        value={tipo}
        onChange={(e) => navegar({ tipo: e.target.value })}
        wrapperClassName="sm:w-52"
      >
        <option value="">Servicio: todos</option>
        {tipos.map((t) => (
          <option key={t.valor} value={t.valor}>
            {t.label}
          </option>
        ))}
      </Select>
      {q || tipo ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => navegar({ q: "", tipo: "" })}>
          <X aria-hidden /> Limpiar
        </Button>
      ) : null}
    </div>
  );
}

function Busqueda({ valor, onCambio }: { valor: string; onCambio: (texto: string) => void }) {
  const [texto, setTexto] = useState(valor);
  // Último texto enviado a la URL: cuando la navegación termina, no se pisa lo que se siguió escribiendo.
  const [enviado, setEnviado] = useState(valor);
  // Si la URL cambia desde afuera (p. ej. "Limpiar" o una pestaña), se sincroniza el texto durante el render.
  const [valorPrevio, setValorPrevio] = useState(valor);
  if (valor !== valorPrevio) {
    setValorPrevio(valor);
    if (valor !== enviado) {
      setEnviado(valor);
      setTexto(valor);
    }
  }
  // `onCambio` cambia en cada render del padre: se guarda en una ref para no reiniciar el temporizador
  // (y no repetir la navegación) mientras la transición está pendiente.
  const onCambioRef = useRef(onCambio);
  useEffect(() => {
    onCambioRef.current = onCambio;
  });
  useEffect(() => {
    const limpio = texto.trim();
    if (limpio === enviado) return;
    const t = setTimeout(() => {
      setEnviado(limpio);
      onCambioRef.current(limpio);
    }, 350);
    return () => clearTimeout(t);
  }, [texto, enviado]);

  return (
    <Input
      type="search"
      aria-label="Buscar planillas por código, empresa o CUIT"
      placeholder="Buscá por código, empresa o CUIT"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      leading={<Search className="size-4" aria-hidden />}
      wrapperClassName="sm:w-72"
    />
  );
}
