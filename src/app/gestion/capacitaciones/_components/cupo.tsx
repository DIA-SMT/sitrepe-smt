import { cn } from "@/lib/utils";

type TonoCupo = "azul" | "verde" | "ambar" | "rojo";

/** Ocupación del cupo: tono según qué tan llena está (verde, ámbar, rojo al completarse). */
export function tonoCupo(inscriptos: number, cupo: number | null): TonoCupo {
  if (!cupo) return "azul";
  const pct = inscriptos / cupo;
  if (pct >= 1) return "rojo";
  if (pct >= 0.8) return "ambar";
  return "verde";
}

const TONOS: Record<TonoCupo, { barra: string; pista: string }> = {
  azul: { barra: "bg-linear-to-r from-azul-600 to-celeste-400", pista: "bg-azul-100" },
  verde: { barra: "bg-linear-to-r from-emerald-500 to-celeste-400", pista: "bg-emerald-100" },
  ambar: { barra: "bg-linear-to-r from-amber-500 to-sol-400", pista: "bg-amber-100" },
  rojo: { barra: "bg-red-500", pista: "bg-red-100" },
};

/** Barra de cupo: "23 de 40 inscriptos · 17 vacantes". Sin cupo, muestra solo los inscriptos. */
export function BarraCupo({
  inscriptos,
  cupo,
  size = "md",
  className,
}: {
  inscriptos: number;
  cupo: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const vacantes = cupo === null ? null : Math.max(0, cupo - inscriptos);
  const pct = cupo ? Math.min(100, (inscriptos / cupo) * 100) : inscriptos > 0 ? 100 : 0;
  const tono = TONOS[tonoCupo(inscriptos, cupo)];
  const texto = `${inscriptos.toLocaleString("es-AR")}${cupo !== null ? ` de ${cupo.toLocaleString("es-AR")}` : ""} ${
    inscriptos === 1 ? "inscripto" : "inscriptos"
  }`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium text-foreground nums-tabular">{texto}</span>
        <span className={cn("text-xs nums-tabular", vacantes === 0 ? "font-semibold text-danger" : "text-muted-foreground")}>
          {vacantes === null
            ? "Sin límite de cupo"
            : vacantes === 0
              ? "Cupo completo"
              : `${vacantes} ${vacantes === 1 ? "vacante" : "vacantes"}`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={cupo === null ? texto : `Ocupación del cupo: ${texto}`}
        aria-valuemin={0}
        aria-valuemax={cupo ?? Math.max(inscriptos, 1)}
        aria-valuenow={inscriptos}
        className={cn(
          "relative w-full overflow-hidden rounded-full",
          cupo === null ? "bg-azul-50" : tono.pista,
          size === "sm" && "h-1.5",
          size === "md" && "h-2.5",
          size === "lg" && "h-3.5",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            cupo === null ? "bg-[repeating-linear-gradient(135deg,var(--color-azul-200)_0_6px,var(--color-azul-100)_6px_12px)]" : tono.barra,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
