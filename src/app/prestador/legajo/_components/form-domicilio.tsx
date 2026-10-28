"use client";

import { useState } from "react";
import { MapPinned, Send } from "lucide-react";
import { SubirArchivo } from "@/components/shared/subir-archivo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { solicitarCambioDomicilio } from "../actions";
import { ErrorCampo } from "./error-campo";
import { useEnvio } from "./use-envio";

type FormDomicilioProps = {
  empresaId: string;
  oficinaActual: string | null;
  depositoActual: string | null;
  /** Si hay un motivo de bloqueo (p. ej. una solicitud en curso), el botón queda deshabilitado. */
  bloqueado?: string | null;
};

/** Solicitud de cambio de domicilio de oficina o depósito (Art. 6.º: requiere libre deuda). */
export function FormDomicilio({ empresaId, oficinaActual, depositoActual, bloqueado }: FormDomicilioProps) {
  const [abierto, setAbierto] = useState(false);
  const [nombreLibreDeuda, setNombreLibreDeuda] = useState("");
  const { pendiente, onSubmit, error, reiniciar } = useEnvio(solicitarCambioDomicilio, { alExito: () => setAbierto(false) });

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        setAbierto(v);
        if (v) {
          setNombreLibreDeuda("");
          reiniciar();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={Boolean(bloqueado)} title={bloqueado ?? undefined}>
          <MapPinned aria-hidden />
          Solicitar cambio
        </Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Solicitar cambio de domicilio</DialogTitle>
            <DialogDescription>
              Completá solo el domicilio que cambia. La Dirección actualizará el legajo cuando apruebe la solicitud.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-5">
            <Alert tone="warning" title="Requiere libre deuda municipal (Art. 6.º)">
              El cambio de domicilio de la oficina o del depósito de químicos solo se aprueba si la empresa no registra
              deudas con la Municipalidad. El nuevo depósito debe tener espacio exclusivo y puede ser inspeccionado.
            </Alert>
            <Field
              htmlFor="dom-oficina"
              label="Nuevo domicilio de la oficina"
              hint={`Actual: ${oficinaActual ?? "sin declarar"}. Dejalo vacío si no cambia.`}
              error={error("domicilio_oficina")}
            >
              <Input id="dom-oficina" name="domicilio_oficina" autoComplete="street-address" placeholder="Calle, número y barrio" maxLength={200} />
            </Field>
            <Field
              htmlFor="dom-deposito"
              label="Nuevo domicilio del depósito de químicos"
              hint={`Actual: ${depositoActual ?? "sin declarar"}. Dejalo vacío si no cambia.`}
              error={error("domicilio_deposito")}
            >
              <Input id="dom-deposito" name="domicilio_deposito" placeholder="Calle, número y barrio" maxLength={200} />
            </Field>
            <Field htmlFor="dom-motivo" label="Motivo del cambio" required error={error("motivo")}>
              <Textarea
                id="dom-motivo"
                name="motivo"
                rows={3}
                required
                minLength={10}
                maxLength={600}
                placeholder="Ej.: mudanza de la oficina comercial a un local propio."
              />
            </Field>
            <div className="grid gap-2">
              <SubirArchivo
                name="libre_deuda_path"
                bucket="documentos"
                carpeta={[empresaId, "legajo"]}
                label="Certificado de libre deuda (opcional)"
                hint="Si ya lo tenés, adjuntalo para agilizar la revisión. PDF, JPG o PNG de hasta 10 MB."
                onSubido={(_ruta, archivo) => setNombreLibreDeuda(archivo.name)}
              />
              <input type="hidden" name="libre_deuda_nombre" value={nombreLibreDeuda} />
              <ErrorCampo mensaje={error("libre_deuda_path")} />
            </div>
            <div className="grid gap-2">
              <Checkbox
                name="acepta_libre_deuda"
                required
                label="Declaro que la empresa no registra deudas con la Municipalidad"
                description="La Dirección verificará el libre deuda antes de aprobar el cambio."
              />
              <ErrorCampo mensaje={error("acepta_libre_deuda")} />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={pendiente}>
              {pendiente ? null : <Send aria-hidden />}
              Presentar solicitud
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
