"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, BadgeCheck, CircleX, Hash, Landmark, Stamp, TriangleAlert } from "lucide-react";
import { SubirArchivo } from "@/components/shared/subir-archivo";
import { SubmitButton } from "@/components/shared/submit-button";
import { useAccion } from "@/components/shared/use-accion";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EstadoAccion } from "@/lib/acciones";
import { enviarSinReiniciar } from "@/app/prestador/pagos/_components/enviar-sin-reiniciar";
import {
  anularLiquidacionStaff,
  rechazarPago,
  registrarPagoRecibido,
  verificarPago,
  type SelloAsignado,
} from "../actions";

type Props = {
  pagoId: string;
  codigo: string;
  estado: string | null;
  /** El pago tiene fecha de pago (informada por la empresa o registrada por el área). */
  tieneFechaPago: boolean;
  /** Primera carpeta del comprobante: id de la empresa o "staff". */
  carpetaComprobante: string;
  importe: string;
  cuenta: string;
  cantidadCertificados: number;
  medios: { valor: string; label: string }[];
  hoy: string;
};

/**
 * Acciones de conciliación (solo Administración y Control): verificar y timbrar, rechazar con motivo,
 * registrar el pago de una liquidación no informada y anular. Se mantiene montado aunque cambie el
 * estado para poder mostrar los sellos asignados después de verificar.
 */
export function AccionesConciliacion(props: Props) {
  const { estado, tieneFechaPago } = props;
  const verificable = estado === "informado" || (estado === "pendiente" && tieneFechaPago);
  const registrable = estado === "pendiente" && !tieneFechaPago;
  // Solo se rechaza un pago que alguien informó o registró; una liquidación sin pago se anula.
  const rechazable = verificable;
  const anulable = estado === "pendiente" || estado === "rechazado";

  return (
    <div className="flex flex-col gap-2 empty:hidden sm:flex-row sm:flex-wrap sm:items-center">
      <DialogoVerificar {...props} mostrarBoton={verificable} />
      <DialogoRegistrar {...props} mostrarBoton={registrable} />
      {/* Montados siempre: si se desmontaran junto con el cambio de estado, se perdería el aviso del resultado. */}
      <DialogoRechazar pagoId={props.pagoId} codigo={props.codigo} mostrarBoton={rechazable} />
      <DialogoAnular pagoId={props.pagoId} codigo={props.codigo} mostrarBoton={anulable} />
    </div>
  );
}

/* --- Sellos asignados ------------------------------------------------------ */

function SellosAsignados({ sellos, cerrar }: { sellos: SelloAsignado[]; cerrar: () => void }) {
  return (
    <>
      <DialogHeader className="items-center pb-2 text-center">
        <span
          aria-hidden
          className="relative mb-2 flex size-14 items-center justify-center rounded-2xl bg-success text-white shadow-[0_12px_28px_-12px_rgb(14_124_85/0.9)]"
        >
          <Stamp className="size-7" />
          <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-sol-400 ring-2 ring-card" />
        </span>
        <DialogTitle>Pago verificado</DialogTitle>
        <DialogDescription>
          {sellos.length === 0
            ? "El pago quedó conciliado. No había certificados para timbrar."
            : `Se asignó un sello digital a ${sellos.length === 1 ? "1 certificado" : `${sellos.length} certificados`}.`}
        </DialogDescription>
      </DialogHeader>
      {sellos.length > 0 ? (
        <DialogBody>
          <ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-xl border border-border" role="list">
            {sellos.map((s) => (
              <li key={s.certificadoId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <Link
                  href={`/gestion/certificados/${s.certificadoId}`}
                  className="font-mono font-semibold text-azul-700 hover:underline"
                >
                  N.º {s.numero}
                </Link>
                <Badge tone="verde" variant="solid" size="sm" className="font-mono">
                  {s.sello}
                </Badge>
              </li>
            ))}
          </ul>
        </DialogBody>
      ) : null}
      <DialogFooter>
        <Button type="button" onClick={cerrar}>
          <BadgeCheck aria-hidden />
          Listo
        </Button>
      </DialogFooter>
    </>
  );
}

/* --- Verificar y timbrar --------------------------------------------------- */

function DialogoVerificar({
  pagoId,
  codigo,
  importe,
  cuenta,
  cantidadCertificados,
  mostrarBoton,
}: Props & { mostrarBoton: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [sellos, setSellos] = useState<SelloAsignado[] | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [estado, accion, pendiente] = useAccion(verificarPago, {
    alExito: (e: EstadoAccion<{ sellos: SelloAsignado[] }>) => setSellos(e.datos?.sellos ?? []),
  });

  const cambiar = (v: boolean) => {
    if (pendiente) return;
    setAbierto(v);
    if (!v) setSellos(null);
  };

  if (!mostrarBoton && !abierto) return null;

  return (
    <Dialog open={abierto} onOpenChange={cambiar}>
      {mostrarBoton ? (
        <DialogTrigger asChild>
          <Button size="lg" className="w-full sm:w-auto">
            <Stamp aria-hidden />
            Verificar y timbrar
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent size="sm" showClose={false}>
        {sellos ? (
          <SellosAsignados sellos={sellos} cerrar={() => cambiar(false)} />
        ) : (
          <form action={accion} className="flex flex-col">
            <input type="hidden" name="pago" value={pagoId} />
            <DialogHeader className="flex-row items-start gap-4 pb-4">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100"
              >
                <Landmark className="size-5" />
              </span>
              <div className="flex flex-col gap-1.5">
                <DialogTitle>¿Verificar el pago {codigo}?</DialogTitle>
                <DialogDescription>
                  Confirmás que se acreditaron <strong className="text-foreground">{importe}</strong> en la cuenta{" "}
                  {cuenta}.{" "}
                  {cantidadCertificados > 0
                    ? `Se asignará un sello digital a ${cantidadCertificados === 1 ? "1 certificado" : `${cantidadCertificados} certificados`} y quedarán válidos.`
                    : "El pago quedará conciliado."}
                </DialogDescription>
              </div>
            </DialogHeader>
            <div className="px-6 pb-5">
              <Field
                htmlFor="verificar-observaciones"
                label="Observaciones"
                hint="Opcional. Quedan registradas en la liquidación."
                error={estado.errores?.observaciones?.[0]}
              >
                <Textarea
                  id="verificar-observaciones"
                  name="observaciones"
                  rows={2}
                  maxLength={500}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej.: Acreditado en extracto del 26/10."
                />
              </Field>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pendiente}>
                  Cancelar
                </Button>
              </DialogClose>
              <SubmitButton pendingText="Timbrando…">
                <Stamp aria-hidden />
                Verificar y timbrar
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --- Registrar el pago de una liquidación no informada ---------------------- */

function DialogoRegistrar({
  pagoId,
  codigo,
  importe,
  cuenta,
  carpetaComprobante,
  medios,
  hoy,
  mostrarBoton,
}: Props & { mostrarBoton: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [sellos, setSellos] = useState<SelloAsignado[] | null>(null);
  const [estado, accion, pendiente] = useAccion(registrarPagoRecibido, {
    alExito: (e: EstadoAccion<{ sellos: SelloAsignado[] }>) => setSellos(e.datos?.sellos ?? []),
  });
  const err = (campo: string) => estado.errores?.[campo]?.[0];
  // Campos controlados + envío sin reinicio del formulario: si la acción falla, no se pierde lo cargado
  // (con `<form action>` React devolvería el <select> del medio a la primera opción).
  const [medio, setMedio] = useState(medios[0]?.valor ?? "");
  const [fecha, setFecha] = useState(hoy);
  const [operacion, setOperacion] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const cambiar = (v: boolean) => {
    if (pendiente) return;
    setAbierto(v);
    if (!v) setSellos(null);
  };

  if (!mostrarBoton && !abierto) return null;

  return (
    <Dialog open={abierto} onOpenChange={cambiar}>
      {mostrarBoton ? (
        <DialogTrigger asChild>
          <Button size="lg" className="w-full sm:w-auto">
            <Landmark aria-hidden />
            Registrar pago recibido
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent size="md" showClose={!pendiente && !sellos}>
        {sellos ? (
          <SellosAsignados sellos={sellos} cerrar={() => cambiar(false)} />
        ) : (
          <form
            onSubmit={enviarSinReiniciar(accion, pendiente)}
            aria-busy={pendiente || undefined}
            className="flex min-h-0 flex-col"
            noValidate
          >
            <input type="hidden" name="pago" value={pagoId} />
            <DialogHeader>
              <DialogTitle>Registrar el pago de {codigo}</DialogTitle>
              <DialogDescription>
                La empresa no informó el pago. Si verificaste la acreditación de {importe} en la cuenta {cuenta}, cargá los
                datos y se timbrarán los certificados.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="reg-medio" label="Medio" required error={err("medio")}>
                <Select id="reg-medio" name="medio" value={medio} onChange={(e) => setMedio(e.target.value)}>
                  {medios.map((m) => (
                    <option key={m.valor} value={m.valor}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor="reg-fecha" label="Fecha de pago" required error={err("fecha_pago")}>
                <Input
                  id="reg-fecha"
                  name="fecha_pago"
                  type="date"
                  max={hoy}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </Field>
              <Field htmlFor="reg-operacion" label="N.º de operación" error={err("numero_operacion")} className="sm:col-span-2">
                <Input
                  id="reg-operacion"
                  name="numero_operacion"
                  maxLength={60}
                  autoComplete="off"
                  value={operacion}
                  onChange={(e) => setOperacion(e.target.value)}
                  leading={<Hash aria-hidden />}
                />
              </Field>
              <div className="sm:col-span-2">
                <SubirArchivo
                  name="comprobante"
                  bucket="comprobantes"
                  carpeta={[carpetaComprobante, pagoId]}
                  label="Comprobante"
                  hint="Extracto, boleta o constancia. PDF, JPG o PNG de hasta 10 MB."
                />
                {err("comprobante") ? (
                  <p role="alert" className="mt-1.5 text-[13px] font-medium text-danger">
                    {err("comprobante")}
                  </p>
                ) : null}
              </div>
              <Field htmlFor="reg-obs" label="Observaciones" error={err("observaciones")} className="sm:col-span-2">
                <Textarea
                  id="reg-obs"
                  name="observaciones"
                  rows={2}
                  maxLength={500}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pendiente}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" loading={pendiente}>
                {pendiente ? null : <Stamp aria-hidden />}
                {pendiente ? "Registrando…" : "Registrar y timbrar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --- Rechazar --------------------------------------------------------------- */

type PropsDialogo = { pagoId: string; codigo: string; mostrarBoton: boolean };

function DialogoRechazar({ pagoId, codigo, mostrarBoton }: PropsDialogo) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [estado, accion, pendiente] = useAccion(rechazarPago, { alExito: () => setAbierto(false) });
  const error = estado.errores?.motivo?.[0];

  if (!mostrarBoton && !abierto) return null;

  return (
    <Dialog open={abierto} onOpenChange={(v) => !pendiente && setAbierto(v)}>
      {mostrarBoton ? (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="w-full border-red-200 text-danger hover:border-red-300 hover:bg-danger-soft hover:text-danger sm:w-auto"
          >
            <CircleX aria-hidden />
            Rechazar
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent size="sm" showClose={false}>
        <form action={accion} className="flex flex-col" noValidate>
          <input type="hidden" name="pago" value={pagoId} />
          <DialogHeader className="flex-row items-start gap-4 pb-4">
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger ring-1 ring-red-200"
            >
              <TriangleAlert className="size-5" />
            </span>
            <div className="flex flex-col gap-1.5">
              <DialogTitle>Rechazar el pago {codigo}</DialogTitle>
              <DialogDescription>
                La empresa verá el motivo y podrá volver a informar el pago. Los certificados no se timbran.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="px-6 pb-5">
            <Field
              htmlFor="rechazo-motivo"
              label="Motivo del rechazo"
              required
              error={error}
              hint="Mínimo 10 caracteres. La empresa lo verá tal cual."
            >
              <Textarea
                id="rechazo-motivo"
                name="motivo"
                rows={3}
                minLength={10}
                maxLength={500}
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej.: El importe acreditado no coincide con la liquidación ($ 10.994 en lugar de $ 16.491)."
              />
            </Field>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton variant="danger" pendingText="Rechazando…">
              Rechazar pago
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --- Anular ------------------------------------------------------------------ */

function DialogoAnular({ pagoId, codigo, mostrarBoton }: PropsDialogo) {
  const [abierto, setAbierto] = useState(false);
  const [, accion, pendiente] = useAccion(anularLiquidacionStaff, { alExito: () => setAbierto(false) });

  if (!mostrarBoton && !abierto) return null;

  return (
    <Dialog open={abierto} onOpenChange={(v) => !pendiente && setAbierto(v)}>
      {mostrarBoton ? (
        <DialogTrigger asChild>
          <Button variant="ghost" className="w-full text-muted-foreground hover:text-danger sm:w-auto">
            <Ban aria-hidden />
            Anular liquidación
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent size="sm" showClose={false}>
        <form action={accion} className="flex flex-col">
          <input type="hidden" name="pago" value={pagoId} />
          <DialogHeader className="flex-row items-start gap-4 pb-5">
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger ring-1 ring-red-200"
            >
              <Ban className="size-5" />
            </span>
            <div className="flex flex-col gap-1.5">
              <DialogTitle>¿Anular la liquidación {codigo}?</DialogTitle>
              <DialogDescription>
                Los certificados vinculados quedan liberados para una nueva liquidación. Esta acción queda registrada en la
                auditoría y no se puede deshacer.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton variant="danger" pendingText="Anulando…">
              Sí, anular
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
