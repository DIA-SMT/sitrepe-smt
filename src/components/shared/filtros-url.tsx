"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CampoFiltro =
  | { tipo: "busqueda"; nombre: string; placeholder?: string; className?: string }
  | {
      tipo: "select";
      nombre: string;
      etiqueta: string;
      opciones: { valor: string; label: string }[];
      className?: string;
    }
  | { tipo: "fecha"; nombre: string; etiqueta: string; className?: string };

/**
 * Barra de filtros que escribe en los searchParams de la URL (la página, un
 * Server Component, lee `searchParams` y filtra en la consulta). Reinicia la
 * paginación (`pagina`) al cambiar un filtro.
 */
export function FiltrosUrl({ campos, className }: { campos: CampoFiltro[]; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, startTransition] = useTransition();

  const aplicar = (nombre: string, valor: string) => {
    const nuevos = new URLSearchParams(params.toString());
    if (valor) nuevos.set(nombre, valor);
    else nuevos.delete(nombre);
    nuevos.delete("pagina");
    startTransition(() => router.replace(`${pathname}${nuevos.size ? `?${nuevos}` : ""}`, { scroll: false }));
  };

  const hayFiltros = campos.some((c) => params.get(c.nombre));

  return (
    <div
      className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", pendiente && "opacity-70", className)}
      aria-busy={pendiente}
    >
      {campos.map((campo) => {
        if (campo.tipo === "busqueda") {
          return <CampoBusqueda key={campo.nombre} campo={campo} valor={params.get(campo.nombre) ?? ""} onCambio={aplicar} />;
        }
        if (campo.tipo === "select") {
          return (
            <Select
              key={campo.nombre}
              aria-label={campo.etiqueta}
              value={params.get(campo.nombre) ?? ""}
              onChange={(e) => aplicar(campo.nombre, e.target.value)}
              wrapperClassName={cn("sm:w-52", campo.className)}
            >
              <option value="">{campo.etiqueta}: todos</option>
              {campo.opciones.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </Select>
          );
        }
        return (
          <label key={campo.nombre} className={cn("flex items-center gap-2 text-sm text-muted-foreground", campo.className)}>
            <span className="whitespace-nowrap">{campo.etiqueta}</span>
            <Input
              type="date"
              value={params.get(campo.nombre) ?? ""}
              onChange={(e) => aplicar(campo.nombre, e.target.value)}
              className="sm:w-40"
            />
          </label>
        );
      })}
      {hayFiltros ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
        >
          <X aria-hidden /> Limpiar
        </Button>
      ) : null}
    </div>
  );
}

function CampoBusqueda({
  campo,
  valor,
  onCambio,
}: {
  campo: Extract<CampoFiltro, { tipo: "busqueda" }>;
  valor: string;
  onCambio: (nombre: string, valor: string) => void;
}) {
  const [texto, setTexto] = useState(valor);
  // Si la URL cambia desde afuera (p. ej. "Limpiar"), se sincroniza el texto durante el render.
  const [valorPrevio, setValorPrevio] = useState(valor);
  if (valor !== valorPrevio) {
    setValorPrevio(valor);
    setTexto(valor);
  }
  useEffect(() => {
    if (texto === valor) return;
    const t = setTimeout(() => onCambio(campo.nombre, texto.trim()), 350);
    return () => clearTimeout(t);
  }, [texto, valor, campo.nombre, onCambio]);

  return (
    <Input
      type="search"
      aria-label={campo.placeholder ?? "Buscar"}
      placeholder={campo.placeholder ?? "Buscar…"}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      leading={<Search className="size-4" aria-hidden />}
      wrapperClassName={cn("sm:w-72", campo.className)}
    />
  );
}
