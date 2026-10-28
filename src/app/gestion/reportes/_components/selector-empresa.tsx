"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Building2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OpcionEmpresa = { id: string; etiqueta: string; actividad: number };

/** Selector de empresa (escribe `?empresa=` en la URL). Las empresas con actividad en el mes aparecen primero. */
export function SelectorEmpresa({
  valor,
  opciones,
  className,
}: {
  valor: string | null;
  opciones: OpcionEmpresa[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, startTransition] = useTransition();

  const cambiar = (id: string) => {
    const nuevos = new URLSearchParams(params.toString());
    if (id) nuevos.set("empresa", id);
    else nuevos.delete("empresa");
    startTransition(() => router.push(`${pathname}${nuevos.size ? `?${nuevos}` : ""}`, { scroll: false }));
  };

  const conActividad = opciones.filter((o) => o.actividad > 0);
  const sinActividad = opciones.filter((o) => o.actividad === 0);

  return (
    <label className={cn("flex min-w-0 items-center gap-2", pendiente && "opacity-75", className)} aria-busy={pendiente}>
      <span
        aria-hidden
        className="hidden size-8 shrink-0 items-center justify-center rounded-xl bg-celeste-50 text-celeste-700 ring-1 ring-celeste-200 sm:flex"
      >
        <Building2 className="size-4" />
      </span>
      <span className="sr-only">Empresa</span>
      <Select
        value={valor ?? ""}
        onChange={(e) => cambiar(e.target.value)}
        disabled={pendiente}
        wrapperClassName="min-w-0 sm:w-80"
      >
        <option value="">Todas las empresas (resumen)</option>
        {conActividad.length > 0 ? (
          <optgroup label="Con certificados en el mes">
            {conActividad.map((o) => (
              <option key={o.id} value={o.id}>
                {o.etiqueta} · {o.actividad}
              </option>
            ))}
          </optgroup>
        ) : null}
        {sinActividad.length > 0 ? (
          <optgroup label="Sin certificados en el mes">
            {sinActividad.map((o) => (
              <option key={o.id} value={o.id}>
                {o.etiqueta}
              </option>
            ))}
          </optgroup>
        ) : null}
      </Select>
    </label>
  );
}
