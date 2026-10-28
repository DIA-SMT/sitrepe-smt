"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copia un texto (CBU, N.º de cuenta, importe) al portapapeles. */
export function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(t);
  }, [copiado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success(`${etiqueta} copiado`);
    } catch {
      toast.error(`No se pudo copiar el ${etiqueta.toLowerCase()}. Seleccionalo y copialo a mano.`);
    }
  };

  return (
    <Button
      type="button"
      variant={copiado ? "secondary" : "outline"}
      size="sm"
      onClick={copiar}
      aria-label={`Copiar ${etiqueta}`}
      className="shrink-0"
    >
      {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copiado ? "Copiado" : "Copiar"}
    </Button>
  );
}
