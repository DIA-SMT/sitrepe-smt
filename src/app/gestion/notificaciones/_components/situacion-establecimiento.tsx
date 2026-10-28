import Link from "next/link";
import { ArrowUpRight, Bug, Droplets } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { ESTADO_OBLIGACION } from "@/lib/domain/etiquetas";
import { formatFecha } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

export type Situacion = {
  id: string | null;
  nombre: string | null;
  estado_fumigacion: string | null;
  fumigacion_vencimiento: string | null;
  fumigacion_empresa: string | null;
  estado_tanque: string | null;
  tanque_vencimiento: string | null;
  tanque_empresa: string | null;
};

/** Estado de fumigación y tanques de un establecimiento (vista v_establecimientos_estado). */
export function SituacionEstablecimiento({
  s,
  className,
  enlace = true,
  apilado = false,
}: {
  s: Situacion;
  className?: string;
  enlace?: boolean;
  /** Una columna (paneles laterales). */
  apilado?: boolean;
}) {
  const filas = [
    {
      icono: Bug,
      titulo: "Fumigación",
      estado: s.estado_fumigacion,
      vence: s.fumigacion_vencimiento,
      empresa: s.fumigacion_empresa,
    },
    {
      icono: Droplets,
      titulo: "Tanques y cisternas",
      estado: s.estado_tanque,
      vence: s.tanque_vencimiento,
      empresa: s.tanque_empresa,
    },
  ];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className={cn("grid gap-2.5", !apilado && "sm:grid-cols-2")}>
        {filas.map((f) => (
          <li key={f.titulo} className="flex items-start gap-3 rounded-xl border border-border bg-subtle/60 p-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-azul-600 ring-1 ring-azul-100"
            >
              <f.icono className="size-[18px]" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-[13px] font-medium text-muted-foreground">{f.titulo}</p>
              <EstadoBadge mapa={ESTADO_OBLIGACION} valor={f.estado} size="sm" />
              {f.vence && f.estado !== "no_aplica" && f.estado !== "sin_certificado" ? (
                <p className="text-xs text-muted-foreground">
                  {f.estado === "vencido" ? "Venció" : "Vence"} el {formatFecha(f.vence)}
                  {f.empresa ? ` · ${f.empresa}` : ""}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {enlace && s.id ? (
        <Link
          href={`/gestion/establecimientos/${s.id}`}
          className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-azul-700 hover:underline"
        >
          Ver ficha del establecimiento <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
