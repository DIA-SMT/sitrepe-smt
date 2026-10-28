"use client";

import Link from "next/link";
import { Ban, CircleCheckBig, FilePenLine, HandHelping, Printer, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { anularNotificacion, marcarCumplida, registrarNotificacion } from "../actions";
import { DialogoFormulario } from "./dialogo-formulario";
import { InputFechaHoraActual } from "./input-fecha-hora-actual";

type AccionesNotificacionProps = {
  id: string;
  numero: string;
  /** Estado efectivo (incluye "vencida"). */
  estado: string;
  establecimientoId: string | null;
  empresaId: string | null;
  /** Disposición: barra de botones (encabezado) o lista apilada (panel lateral). */
  variante?: "barra" | "panel";
};

/** Acciones de seguimiento de una notificación según su estado. */
export function AccionesNotificacion({
  id,
  numero,
  estado,
  establecimientoId,
  empresaId,
  variante = "barra",
}: AccionesNotificacionProps) {
  const abierta = estado === "emitida" || estado === "notificada" || estado === "vencida";
  const ancho = variante === "panel" ? "w-full justify-start" : undefined;

  const paramsActa = new URLSearchParams({ notificacion: id, motivo: "incumplimiento_notificacion" });
  if (establecimientoId) paramsActa.set("establecimiento", establecimientoId);
  if (empresaId) paramsActa.set("empresa", empresaId);

  return (
    <div className={variante === "panel" ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2"}>
      {estado === "emitida" ? (
        <DialogoFormulario
          title="Registrar la notificación"
          description="Indicá quién la recibió y cuándo. El vencimiento se calcula en días hábiles desde ese momento."
          icon={HandHelping}
          submitLabel="Registrar"
          accion={registrarNotificacion}
          hiddenFields={{ id }}
          trigger={
            <Button className={ancho}>
              <HandHelping aria-hidden /> Registrar notificación
            </Button>
          }
        >
          {(errores) => (
            <>
              <Field htmlFor="reg-persona" label="Persona notificada" required error={errores?.persona_notificada?.[0]}>
                <Input
                  id="reg-persona"
                  name="persona_notificada"
                  placeholder="Nombre y apellido"
                  leading={<UserRound aria-hidden />}
                  autoComplete="off"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field htmlFor="reg-dni" label="DNI" required error={errores?.dni_notificado?.[0]}>
                  <Input id="reg-dni" name="dni_notificado" inputMode="numeric" placeholder="Sin puntos" autoComplete="off" />
                </Field>
                <Field htmlFor="reg-fecha" label="Fecha y hora" required error={errores?.notificada_at?.[0]}>
                  <InputFechaHoraActual id="reg-fecha" name="notificada_at" />
                </Field>
              </div>
            </>
          )}
        </DialogoFormulario>
      ) : null}

      {estado === "vencida" ? (
        <Button asChild variant="danger" className={ancho}>
          <Link href={`/gestion/actas/nueva?${paramsActa}`}>
            <FilePenLine aria-hidden /> Labrar acta por incumplimiento
          </Link>
        </Button>
      ) : null}

      {abierta ? (
        <DialogoFormulario
          title="Marcar como cumplida"
          description={`Registrá que se presentó la documentación requerida por la notificación N.º ${numero}.`}
          icon={CircleCheckBig}
          submitLabel="Marcar cumplida"
          accion={marcarCumplida}
          hiddenFields={{ id }}
          trigger={
            <Button variant={estado === "vencida" ? "outline" : "secondary"} className={ancho}>
              <CircleCheckBig aria-hidden /> Marcar cumplida
            </Button>
          }
        >
          {(errores) => (
            <Field
              htmlFor="cum-fecha"
              label="Fecha y hora de presentación"
              required
              error={errores?.cumplida_at?.[0]}
              hint={estado === "vencida" ? "Se presentó fuera de término: queda registrado con su fecha real." : undefined}
            >
              <InputFechaHoraActual id="cum-fecha" name="cumplida_at" />
            </Field>
          )}
        </DialogoFormulario>
      ) : null}

      <Button asChild variant="outline" className={ancho}>
        <Link href={`/imprimir/notificacion/${id}`}>
          <Printer aria-hidden /> Imprimir
        </Link>
      </Button>

      {abierta ? (
        <DialogoFormulario
          tone="danger"
          title={`¿Anular la notificación N.º ${numero}?`}
          description="Queda registrada como anulada con el motivo que indiques. No se puede deshacer."
          icon={Ban}
          submitLabel="Sí, anular"
          accion={anularNotificacion}
          hiddenFields={{ id }}
          trigger={
            <Button variant="ghost" className={variante === "panel" ? "w-full justify-start text-danger" : "text-danger"}>
              <Ban aria-hidden /> Anular
            </Button>
          }
        >
          {(errores) => (
            <Field htmlFor="anu-motivo" label="Motivo" required error={errores?.motivo?.[0]}>
              <Textarea id="anu-motivo" name="motivo" rows={3} placeholder="Ej.: error en el domicilio del establecimiento." />
            </Field>
          )}
        </DialogoFormulario>
      ) : null}

      {estado === "notificada" ? (
        <p className="w-full text-xs leading-snug text-muted-foreground">
          El acta por incumplimiento se habilita cuando vence el plazo sin que se presente la documentación.
        </p>
      ) : null}
    </div>
  );
}
