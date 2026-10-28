"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { anularCertificado } from "../actions";

const MOTIVOS_FRECUENTES = [
  "Certificado emitido con datos erróneos a pedido de la empresa.",
  "El servicio no se realizó.",
  "Inspección por muestreo no conforme.",
];

/** Diálogo para anular un certificado con motivo (solo administración y control). */
export function AnularCertificado({
  certificadoId,
  numero,
  timbrado,
  liquidacionEnCurso,
}: {
  certificadoId: string;
  numero: string;
  timbrado: boolean;
  /** Código de la liquidación pendiente o informada que incluye al certificado (si la hay). */
  liquidacionEnCurso: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [estado, accion, pendiente] = useAccion(anularCertificado, {
    alExito: () => {
      setAbierto(false);
      setMotivo("");
    },
  });
  const [estadoAlAbrir, setEstadoAlAbrir] = useState(estado);
  const respuestaNueva = estado !== estadoAlAbrir && !estado.ok;
  const errorMotivo = respuestaNueva ? estado.errores?.motivo?.[0] : undefined;
  const errorGeneral = respuestaNueva && !estado.errores ? estado.mensaje : undefined;

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        if (v) setEstadoAlAbrir(estado);
        setAbierto(v);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="danger">
          <Ban aria-hidden />
          Anular certificado
        </Button>
      </DialogTrigger>
      <DialogContent size="md">
        <form action={accion} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>¿Anular el certificado N.º {numero}?</DialogTitle>
            <DialogDescription>
              El código QR dejará de validarlo en la verificación pública y la empresa lo verá como anulado. Esta acción no se puede
              deshacer y queda registrada en la auditoría.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <input type="hidden" name="certificado_id" value={certificadoId} />
            {timbrado ? (
              <Alert tone="warning" title="El certificado ya está timbrado">
                El arancel pagado no se reintegra automáticamente. Si corresponde, gestioná la devolución por separado.
              </Alert>
            ) : liquidacionEnCurso ? (
              <Alert tone="warning" title={`Está incluido en la liquidación ${liquidacionEnCurso}`}>
                La liquidación sigue en curso y su importe no se recalcula: al verificar el pago, este certificado no se
                timbra. Revisá la liquidación antes de conciliarla.
              </Alert>
            ) : null}
            <Field
              htmlFor="motivo-anulacion"
              label="Motivo de la anulación"
              required
              hint="La empresa lo verá en el certificado."
              error={errorMotivo}
            >
              <Textarea
                id="motivo-anulacion"
                name="motivo"
                rows={4}
                required
                minLength={10}
                maxLength={1000}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explicá por qué se anula el certificado."
              />
            </Field>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Motivos frecuentes</p>
              <div className="flex flex-wrap gap-2">
                {MOTIVOS_FRECUENTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className="rounded-full border border-border bg-card px-3 py-1 text-left text-xs text-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {errorGeneral ? (
              <Alert tone="danger" title="No se pudo anular el certificado">
                <span className="whitespace-pre-line">{errorGeneral}</span>
              </Alert>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton variant="danger" pendingText="Anulando…">
              <Ban aria-hidden />
              Sí, anular
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
