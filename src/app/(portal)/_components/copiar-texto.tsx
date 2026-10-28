"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

type CopiarTextoProps = {
  /** Texto a copiar. Si empieza con "/", se copia como URL absoluta del sitio actual. */
  texto: string;
  /** Texto del botón (si se omite, botón de ícono). */
  etiqueta?: string;
  /** Qué se copia, para el lector de pantalla y el aviso ("el código", "el CBU"…). */
  descripcion?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

/** Botón que copia un texto al portapapeles con confirmación visual y aviso. */
export function CopiarTexto({ texto, etiqueta, descripcion = "el texto", variant = "outline", size, className }: CopiarTextoProps) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2200);
    return () => clearTimeout(t);
  }, [copiado]);

  async function copiar() {
    // Una ruta relativa ("/noticias/…") se completa con el dominio desde el que se navega.
    const valor = texto.startsWith("/") ? new URL(texto, window.location.origin).toString() : texto;
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      toast.success(`Copiaste ${descripcion}`, { description: valor });
    } catch {
      toast.error("No se pudo copiar", { description: "Seleccioná el texto y copialo manualmente." });
    }
  }

  const Icono = copiado ? Check : Copy;
  return (
    <Button
      type="button"
      variant={variant}
      size={size ?? (etiqueta ? "sm" : "icon-sm")}
      onClick={copiar}
      className={className}
      aria-label={etiqueta ? undefined : `Copiar ${descripcion}`}
    >
      <Icono aria-hidden className={copiado ? "text-success" : undefined} />
      {etiqueta ? (copiado ? "¡Copiado!" : etiqueta) : null}
      <span className="sr-only" aria-live="polite">
        {copiado ? "Copiado al portapapeles" : ""}
      </span>
    </Button>
  );
}
