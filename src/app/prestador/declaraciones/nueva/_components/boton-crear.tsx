"use client";

import { ArrowRight } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { useAccion } from "@/components/shared/use-accion";
import { crearDeclaracion } from "../../actions";

/** Crea la planilla del tipo indicado y lleva a su detalle (la acción redirige). */
export function BotonCrear({ tipo, etiqueta, variante = "primary" }: { tipo: "fumigacion" | "tanque"; etiqueta: string; variante?: "primary" | "secondary" }) {
  const [, accion] = useAccion(crearDeclaracion);
  return (
    <form action={accion}>
      <input type="hidden" name="tipo" value={tipo} />
      <SubmitButton size="lg" variant={variante} className="w-full sm:w-auto" pendingText="Creando planilla…">
        {etiqueta}
        <ArrowRight aria-hidden />
      </SubmitButton>
    </form>
  );
}
