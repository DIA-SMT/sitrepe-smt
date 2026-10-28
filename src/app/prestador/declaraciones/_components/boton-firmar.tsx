"use client";

import { FileSignature } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { firmarCertificados } from "../actions";

/** Firma digital del asesor técnico (Art. 5.º, Ord. 2681/98) con confirmación. */
export function BotonFirmar({
  ids,
  etiqueta,
  titulo,
  variante = "secondary",
  tamanio = "sm",
  deshabilitado = false,
  alFirmar,
}: {
  ids: string[];
  etiqueta: string;
  titulo: string;
  variante?: "secondary" | "primary";
  tamanio?: "sm" | "md" | "lg";
  deshabilitado?: boolean;
  /** Se llama después de una firma exitosa (p. ej. para limpiar una selección). */
  alFirmar?: () => void;
}) {
  const varios = ids.length !== 1;
  return (
    <ConfirmDialog
      tone="primary"
      trigger={
        <Button variant={variante} size={tamanio} disabled={deshabilitado || ids.length === 0}>
          <FileSignature aria-hidden />
          {etiqueta}
        </Button>
      }
      title={titulo}
      description={
        <>
          Como asesor técnico registrado en el padrón, certificás que {varios ? "los servicios se realizan" : "el servicio se realiza"}{" "}
          bajo tu dirección técnica, con los productos y las cantidades declaradas, y asumís la responsabilidad técnica que fija
          el Art. 5.º de la Ord. 2681/98. La firma queda registrada con fecha, hora y huella digital de los datos del servicio: si
          después se modifican (N.º, cliente, domicilio, rubro, superficie o capacidad, fecha, asesor o productos), pierde validez y tenés
          que volver a firmar.
        </>
      }
      confirmLabel={varios ? `Firmar ${ids.length} certificados` : "Firmar certificado"}
      onConfirm={async () => {
        const r = await firmarCertificados(ids);
        if (r.ok) {
          toast.success(r.mensaje);
          alFirmar?.();
        } else {
          toast.error(r.mensaje ?? "No se pudo firmar.");
        }
      }}
    />
  );
}
