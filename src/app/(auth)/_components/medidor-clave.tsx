import { Check, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const CRITERIOS: { id: string; label: string; cumple: (clave: string) => boolean }[] = [
  { id: "largo", label: "8 caracteres o más", cumple: (c) => c.length >= 8 },
  { id: "mayus", label: "Mayúsculas y minúsculas", cumple: (c) => /[a-záéíóúñ]/.test(c) && /[A-ZÁÉÍÓÚÑ]/.test(c) },
  { id: "numero", label: "Al menos un número", cumple: (c) => /\d/.test(c) },
  { id: "simbolo", label: "Un símbolo (!, #, $…)", cumple: (c) => /[^A-Za-z0-9áéíóúñÁÉÍÓÚÑ]/.test(c) },
];

const NIVELES = [
  { label: "Muy débil", tone: "rojo" },
  { label: "Débil", tone: "rojo" },
  { label: "Aceptable", tone: "ambar" },
  { label: "Buena", tone: "azul" },
  { label: "Muy buena", tone: "verde" },
] as const;

/** Indicador de fortaleza de la contraseña (solo orientativo: el mínimo exigido es de 8 caracteres). */
export function MedidorClave({ clave, className }: { clave: string; className?: string }) {
  const cumplidos = CRITERIOS.filter((c) => c.cumple(clave));
  // Sin el largo mínimo, la clave nunca pasa de "Débil".
  const puntaje = clave.length === 0 ? 0 : clave.length < 8 ? Math.min(1, cumplidos.length) : cumplidos.length;
  const nivel = NIVELES[puntaje];

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div aria-live="polite">
        <Progress
          value={clave.length === 0 ? 0 : Math.max(8, puntaje * 25)}
          tone={nivel.tone}
          size="sm"
          label={
            <span className="text-[13px] font-medium text-muted-foreground">
              Seguridad:{" "}
              <span
                className={cn(
                  "font-semibold",
                  clave.length === 0 && "text-muted-foreground",
                  clave.length > 0 && nivel.tone === "rojo" && "text-danger",
                  clave.length > 0 && nivel.tone === "ambar" && "text-warning",
                  clave.length > 0 && nivel.tone === "azul" && "text-azul-700",
                  clave.length > 0 && nivel.tone === "verde" && "text-success",
                )}
              >
                {clave.length === 0 ? "sin datos" : nivel.label}
              </span>
            </span>
          }
        />
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2" aria-label="Recomendaciones para la contraseña">
        {CRITERIOS.map((c) => {
          const ok = c.cumple(clave);
          return (
            <li
              key={c.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                ok ? "text-success" : "text-muted-foreground",
              )}
            >
              {ok ? <Check className="size-3.5" strokeWidth={2.6} aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
              <span>
                {c.label}
                <span className="sr-only">{ok ? " (cumplido)" : " (pendiente)"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
