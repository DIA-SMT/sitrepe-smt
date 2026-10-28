"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopiarTextoProps = {
  texto: string;
  /** Texto del botón. */
  etiqueta?: string;
  /** Mensaje del toast al copiar. */
  mensaje?: string;
  className?: string;
};

/** Botón que copia un texto al portapapeles (URL de verificación, códigos). */
export function CopiarTexto({ texto, etiqueta = "Copiar", mensaje = "Copiado al portapapeles", className }: CopiarTextoProps) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success(mensaje);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiado(false), 2200);
    } catch {
      toast.error("No se pudo copiar", { description: "Seleccioná el texto y copialo manualmente." });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copiar}
      className={cn(copiado && "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-50", className)}
    >
      {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite">{copiado ? "¡Copiado!" : etiqueta}</span>
    </Button>
  );
}
