"use client";

import Link from "next/link";
import { Ban, CircleCheckBig, Gavel, Info, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogoFormulario } from "../../notificaciones/_components/dialogo-formulario";
import { cambiarEstadoActa } from "../actions";

type AccionesActaProps = {
  id: string;
  numero: string;
  estado: string;
  /** Solo Control y Administración elevan, resuelven o anulan. */
  puedeGestionar: boolean;
};

/** Acciones sobre un acta según su estado y el rol del usuario. */
export function AccionesActa({ id, numero, estado, puedeGestionar }: AccionesActaProps) {
  const abierta = estado === "labrada" || estado === "elevada";

  return (
    <div className="flex flex-col gap-2">
      {puedeGestionar && estado === "labrada" ? (
        <DialogoFormulario
          title="Elevar al Tribunal Municipal de Faltas"
          description={`El acta N.º ${numero} pasa a «Elevada». Imprimí el original firmado para adjuntarlo a la elevación.`}
          icon={Gavel}
          submitLabel="Elevar acta"
          accion={cambiarEstadoActa}
          hiddenFields={{ id, estado: "elevada" }}
          trigger={
            <Button className="w-full justify-start">
              <Gavel aria-hidden /> Elevar al Tribunal de Faltas
            </Button>
          }
        />
      ) : null}

      {puedeGestionar && estado === "elevada" ? (
        <DialogoFormulario
          title="Registrar la resolución"
          description={`Marcá el acta N.º ${numero} como resuelta por el Tribunal Municipal de Faltas.`}
          icon={CircleCheckBig}
          submitLabel="Marcar resuelta"
          accion={cambiarEstadoActa}
          hiddenFields={{ id, estado: "resuelta" }}
          trigger={
            <Button className="w-full justify-start">
              <CircleCheckBig aria-hidden /> Registrar resolución
            </Button>
          }
        />
      ) : null}

      <Button asChild variant="outline" className="w-full justify-start">
        <Link href={`/imprimir/acta/${id}`}>
          <Printer aria-hidden /> Imprimir acta
        </Link>
      </Button>

      {puedeGestionar && abierta ? (
        <DialogoFormulario
          tone="danger"
          title={`¿Anular el acta N.º ${numero}?`}
          description={
            <>
              {estado === "elevada"
                ? "El acta ya fue elevada: anulala solo si el Tribunal lo dispuso o hubo un error material. No se puede deshacer."
                : "Anulala si hubo un error material; después podés labrar una nueva. No se puede deshacer."}{" "}
              Si el acta había cerrado una notificación, esa notificación vuelve a quedar abierta.
            </>
          }
          icon={Ban}
          submitLabel="Sí, anular"
          accion={cambiarEstadoActa}
          hiddenFields={{ id, estado: "anulada" }}
          trigger={
            <Button variant="ghost" className="w-full justify-start text-danger">
              <Ban aria-hidden /> Anular acta
            </Button>
          }
        />
      ) : null}

      {!puedeGestionar && abierta ? (
        <p className="mt-1 flex items-start gap-2 rounded-xl bg-subtle p-3 text-[13px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
          La elevación al Tribunal, la resolución y la anulación las registra Control o Administración.
        </p>
      ) : null}
    </div>
  );
}
