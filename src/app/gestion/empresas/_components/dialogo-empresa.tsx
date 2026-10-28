"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAccion } from "@/components/shared/use-accion";
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
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { EstadoAccion } from "@/lib/acciones";
import { ESTADO_EMPRESA } from "@/lib/domain/etiquetas";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import { enviarSinReiniciar } from "../../_components/formulario";
import { actualizarEmpresa, crearEmpresa } from "../actions";

export type ValoresEmpresa = Pick<
  Tables<"empresas">,
  | "numero_registro"
  | "nombre_comercial"
  | "titular"
  | "tipo_persona"
  | "cuit"
  | "email"
  | "telefono"
  | "domicilio_oficina"
  | "domicilio_deposito"
  | "habilitacion_comercial"
  | "resolucion_dsa"
  | "habilita_fumigacion"
  | "habilita_tanques"
  | "estado"
  | "fecha_habilitacion"
  | "vencimiento_habilitacion"
  | "ultima_inspeccion_deposito"
  | "observaciones"
>;

type Props =
  | { modo: "crear"; valores?: undefined; empresaId?: undefined; className?: string }
  | { modo: "editar"; valores: ValoresEmpresa; empresaId: string; className?: string };

const ESTADOS_ALTA: Enums<"estado_empresa">[] = ["en_tramite", "habilitada", "observada", "suspendida"];
const ESTADOS_EDICION: Enums<"estado_empresa">[] = ["habilitada", "observada", "suspendida", "baja"];

/** Alta o edición de una empresa del padrón (Administración y Control). */
export function DialogoEmpresa(props: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const editar = props.modo === "editar";

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (!pendiente) setAbierto(v);
      }}
    >
      <DialogTrigger asChild>
        {editar ? (
          <Button variant="outline" className={props.className}>
            <Pencil aria-hidden />
            Editar datos
          </Button>
        ) : (
          <Button className={props.className}>
            <Building2 aria-hidden />
            Nueva empresa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="lg">
        <FormularioEmpresa {...props} onPendiente={setPendiente} onCerrar={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioEmpresa(props: Props & { onPendiente: (v: boolean) => void; onCerrar: () => void }) {
  const router = useRouter();
  const id = useId();
  const editar = props.modo === "editar";
  const v = props.valores;
  const { onPendiente, onCerrar } = props;
  // Aviso y navegación al responder el servidor (el diálogo puede desmontarse con la revalidación,
  // p. ej. el alta desde el estado vacío del padrón).
  const accion = useCallback(
    async (previo: EstadoAccion<{ id: string }>, formData: FormData) => {
      const resultado = await (editar ? actualizarEmpresa : crearEmpresa)(previo, formData);
      if (resultado.ok) {
        if (resultado.mensaje) toast.success(resultado.mensaje);
        if (!editar && resultado.datos?.id) router.push(`/gestion/empresas/${resultado.datos.id}`);
      }
      return resultado;
    },
    [editar, router],
  );
  const [estado, despachar, pendiente] = useAccion(accion, { alExito: onCerrar, silenciarExito: true });

  useEffect(() => {
    onPendiente(pendiente);
  }, [pendiente, onPendiente]);

  const error = (campo: string) => estado.errores?.[campo]?.[0];
  const f = (campo: string) => `${id}-${campo}`;

  const opcionesEstado = editar
    ? [...new Set<Enums<"estado_empresa">>([...(v && !ESTADOS_EDICION.includes(v.estado) ? [v.estado] : []), ...ESTADOS_EDICION])]
    : ESTADOS_ALTA;

  return (
    <form onSubmit={enviarSinReiniciar(despachar)} className="flex min-h-0 flex-1 flex-col">
      {editar ? <input type="hidden" name="id" value={props.empresaId} /> : null}
      <DialogHeader>
        <DialogTitle>{editar ? "Editar datos de la empresa" : "Nueva empresa en el padrón"}</DialogTitle>
        <DialogDescription>
          {editar
            ? "Los cambios quedan registrados en la auditoría del legajo."
            : "Registrá una empresa existente o en trámite. Los datos mínimos son los del listado oficial (Anexo II)."}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="flex flex-col gap-6">
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No se pudieron guardar los datos">
            {estado.mensaje}
          </Alert>
        ) : null}

        <fieldset className="grid gap-4 sm:grid-cols-6">
          <legend className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Identificación</legend>
          <Field htmlFor={f("nombre")} label="Nombre comercial" required error={error("nombre_comercial")} className="sm:col-span-4">
            <Input id={f("nombre")} name="nombre_comercial" defaultValue={v?.nombre_comercial ?? ""} required maxLength={200} />
          </Field>
          <Field htmlFor={f("numero")} label="N.º de registro" hint="Se asigna al aprobar la inscripción." error={error("numero_registro")} className="sm:col-span-2">
            <Input id={f("numero")} name="numero_registro" inputMode="numeric" defaultValue={v?.numero_registro ?? ""} />
          </Field>
          <Field htmlFor={f("titular")} label="Titular o razón social" error={error("titular")} className="sm:col-span-4">
            <Input id={f("titular")} name="titular" defaultValue={v?.titular ?? ""} maxLength={200} />
          </Field>
          <Field htmlFor={f("persona")} label="Tipo de persona" required error={error("tipo_persona")} className="sm:col-span-2">
            <Select id={f("persona")} name="tipo_persona" defaultValue={v?.tipo_persona ?? "humana"}>
              <option value="humana">Humana</option>
              <option value="juridica">Jurídica</option>
            </Select>
          </Field>
          <Field htmlFor={f("cuit")} label="CUIT" required hint="11 dígitos, con o sin guiones." error={error("cuit")} className="sm:col-span-3">
            <Input id={f("cuit")} name="cuit" inputMode="numeric" defaultValue={v?.cuit ?? ""} required placeholder="20-12345678-9" />
          </Field>
          <Field htmlFor={f("email")} label="Correo electrónico" error={error("email")} className="sm:col-span-3">
            <Input id={f("email")} name="email" type="email" defaultValue={v?.email ?? ""} autoComplete="off" />
          </Field>
          <Field htmlFor={f("telefono")} label="Teléfono" error={error("telefono")} className="sm:col-span-3">
            <Input id={f("telefono")} name="telefono" type="tel" defaultValue={v?.telefono ?? ""} />
          </Field>
        </fieldset>

        <Separator />

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Domicilios (Art. 6.º)</legend>
          <Field htmlFor={f("oficina")} label="Oficina" error={error("domicilio_oficina")}>
            <Input id={f("oficina")} name="domicilio_oficina" defaultValue={v?.domicilio_oficina ?? ""} />
          </Field>
          <Field htmlFor={f("deposito")} label="Depósito de químicos" error={error("domicilio_deposito")}>
            <Input id={f("deposito")} name="domicilio_deposito" defaultValue={v?.domicilio_deposito ?? ""} />
          </Field>
        </fieldset>

        <Separator />

        <fieldset className="grid gap-4 sm:grid-cols-6">
          <legend className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Habilitación</legend>
          <Field
            htmlFor={f("shn")}
            label="Habilitación comercial"
            hint="Formato N/SHN/AAAA."
            error={error("habilitacion_comercial")}
            className="sm:col-span-3"
          >
            <Input id={f("shn")} name="habilitacion_comercial" defaultValue={v?.habilitacion_comercial ?? ""} placeholder="9256/SHN/2025" />
          </Field>
          <Field
            htmlFor={f("dsa")}
            label="Resolución DSA"
            hint="Formato 000/DSA/AAAA. Es única por empresa."
            error={error("resolucion_dsa")}
            className="sm:col-span-3"
          >
            <Input id={f("dsa")} name="resolucion_dsa" defaultValue={v?.resolucion_dsa ?? ""} placeholder="070/DSA/2026" />
          </Field>
          <div className="flex flex-col gap-2 sm:col-span-6">
            <span className="text-sm font-medium text-foreground">Actividades habilitadas</span>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
              <Checkbox
                name="habilita_fumigacion"
                defaultChecked={v?.habilita_fumigacion ?? true}
                label="Fumigación y desinfección (F)"
                description="Ord. 2681/98"
                aria-invalid={error("habilita_fumigacion") ? true : undefined}
              />
              <Checkbox
                name="habilita_tanques"
                defaultChecked={v?.habilita_tanques ?? false}
                label="Limpieza de tanques (T)"
                description="Ord. 2004/92 (t.o. 3098/01)"
              />
            </div>
            {error("habilita_fumigacion") ? (
              <p role="alert" className="text-[13px] font-medium text-danger">
                {error("habilita_fumigacion")}
              </p>
            ) : null}
          </div>
          <Field htmlFor={f("estado")} label="Estado" required error={error("estado")} className="sm:col-span-2">
            <Select id={f("estado")} name="estado" defaultValue={v?.estado ?? "en_tramite"}>
              {opcionesEstado.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_EMPRESA[e].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor={f("alta")} label="Fecha de habilitación" error={error("fecha_habilitacion")} className="sm:col-span-2">
            <Input id={f("alta")} name="fecha_habilitacion" type="date" defaultValue={v?.fecha_habilitacion ?? ""} />
          </Field>
          <Field
            htmlFor={f("vence")}
            label="Vencimiento"
            hint="Renovación anual (31/03)."
            error={error("vencimiento_habilitacion")}
            className="sm:col-span-2"
          >
            <Input id={f("vence")} name="vencimiento_habilitacion" type="date" defaultValue={v?.vencimiento_habilitacion ?? ""} />
          </Field>
          <Field
            htmlFor={f("deposito-insp")}
            label="Última inspección de depósito"
            hint="Se actualiza sola con cada inspección anual conforme."
            error={error("ultima_inspeccion_deposito")}
            className="sm:col-span-3"
          >
            <Input id={f("deposito-insp")} name="ultima_inspeccion_deposito" type="date" defaultValue={v?.ultima_inspeccion_deposito ?? ""} />
          </Field>
        </fieldset>

        <Field
          htmlFor={f("obs")}
          label="Observaciones"
          hint="Inconsistencias de datos u otras notas internas: se marcan con un ícono en el padrón."
          error={error("observaciones")}
        >
          <Textarea id={f("obs")} name="observaciones" rows={3} defaultValue={v?.observaciones ?? ""} maxLength={2000} />
        </Field>
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pendiente}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pendiente}>
          {pendiente ? "Guardando…" : editar ? "Guardar cambios" : "Registrar empresa"}
        </Button>
      </DialogFooter>
    </form>
  );
}
