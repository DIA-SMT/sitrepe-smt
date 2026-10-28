import { Badge, type BadgeTone } from "@/components/ui/badge";

const TONO: Record<string, BadgeTone> = { Ia: "rojo", Ib: "rojo", II: "ambar", III: "azul", IV: "verde" };
const DESCRIPCION: Record<string, string> = {
  Ia: "Sumamente peligroso",
  Ib: "Muy peligroso",
  II: "Moderadamente peligroso",
  III: "Poco peligroso",
  IV: "Normalmente no ofrece peligro",
};

/** Categoría toxicológica (clasificación OMS) con su color de banda. */
export function BadgeToxicidad({ categoria, size = "sm" }: { categoria: string | null; size?: "sm" | "md" }) {
  if (!categoria) return <span className="text-xs text-muted-foreground">Sin categoría</span>;
  return (
    <Badge tone={TONO[categoria] ?? "neutral"} size={size} dot title={DESCRIPCION[categoria]}>
      Clase {categoria}
      <span className="sr-only">: {DESCRIPCION[categoria] ?? "categoría toxicológica"}</span>
    </Badge>
  );
}
