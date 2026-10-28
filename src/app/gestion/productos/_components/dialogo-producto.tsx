"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { FlaskConical, Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { EstadoAccion } from "@/lib/acciones";
import { CLASE_PRODUCTO } from "@/lib/domain/etiquetas";
import { Constants, type Tables } from "@/lib/supabase/database.types";
import { enviarSinReiniciar } from "../../_components/formulario";
import { guardarProducto } from "../actions";

export type ValoresProducto = Pick<
  Tables<"productos">,
  | "id"
  | "nombre_comercial"
  | "principio_activo"
  | "concentracion"
  | "clase"
  | "formulacion"
  | "organismo"
  | "registro_numero"
  | "categoria_toxicologica"
  | "antidoto"
  | "precauciones"
  | "plazo_reingreso_horas"
  | "activo"
>;

const CATEGORIAS = [
  { valor: "Ia", label: "Ia · Sumamente peligroso (banda roja)" },
  { valor: "Ib", label: "Ib · Muy peligroso (banda roja)" },
  { valor: "II", label: "II · Moderadamente peligroso (banda amarilla)" },
  { valor: "III", label: "III · Poco peligroso (banda azul)" },
  { valor: "IV", label: "IV · Normalmente no ofrece peligro (banda verde)" },
];

/** Alta o edición de un producto domisanitario del catálogo. */
export function DialogoProducto({ producto, compacto = false }: { producto?: ValoresProducto; compacto?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, setPendiente] = useState(false);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (!pendiente) setAbierto(v);
      }}
    >
      <DialogTrigger asChild>
        {producto ? (
          <Button variant="ghost" size={compacto ? "icon-sm" : "sm"} aria-label={`Editar ${producto.nombre_comercial}`}>
            <Pencil aria-hidden />
            {compacto ? null : "Editar"}
          </Button>
        ) : (
          <Button>
            <FlaskConical aria-hidden />
            Nuevo producto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="lg">
        <FormularioProducto producto={producto} onPendiente={setPendiente} onCerrar={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioProducto({
  producto: p,
  onPendiente,
  onCerrar,
}: {
  producto?: ValoresProducto;
  onPendiente: (v: boolean) => void;
  onCerrar: () => void;
}) {
  const id = useId();
  // Aviso al responder el servidor: el diálogo puede desmontarse con la revalidación
  // (p. ej. el alta desde el estado vacío del catálogo).
  const accion = useCallback(async (previo: EstadoAccion, formData: FormData) => {
    const resultado = await guardarProducto(previo, formData);
    if (resultado.ok && resultado.mensaje) toast.success(resultado.mensaje);
    return resultado;
  }, []);
  const [estado, despachar, pendiente] = useAccion(accion, { alExito: onCerrar, silenciarExito: true });
  useEffect(() => {
    onPendiente(pendiente);
  }, [pendiente, onPendiente]);

  const error = (campo: string) => estado.errores?.[campo]?.[0];
  const f = (campo: string) => `${id}-${campo}`;

  return (
    <form onSubmit={enviarSinReiniciar(despachar)} className="flex min-h-0 flex-1 flex-col">
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <DialogHeader>
        <DialogTitle>{p ? "Editar producto" : "Nuevo producto domisanitario"}</DialogTitle>
        <DialogDescription>
          Solo se admiten productos con registro vigente en ANMAT o SENASA. Los datos se muestran en los certificados y en la
          verificación pública.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="flex flex-col gap-5">
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No se pudo guardar el producto">
            {estado.mensaje}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor={f("nombre")} label="Nombre comercial" required error={error("nombre_comercial")}>
            <Input id={f("nombre")} name="nombre_comercial" defaultValue={p?.nombre_comercial ?? ""} required maxLength={200} />
          </Field>
          <Field htmlFor={f("principio")} label="Principio activo" required error={error("principio_activo")}>
            <Input id={f("principio")} name="principio_activo" defaultValue={p?.principio_activo ?? ""} required maxLength={200} />
          </Field>
          <Field htmlFor={f("concentracion")} label="Concentración" hint="Ej.: 10 %" error={error("concentracion")}>
            <Input id={f("concentracion")} name="concentracion" defaultValue={p?.concentracion ?? ""} maxLength={60} />
          </Field>
          <Field htmlFor={f("formulacion")} label="Formulación" hint="Ej.: concentrado emulsionable, gel, cebo" error={error("formulacion")}>
            <Input id={f("formulacion")} name="formulacion" defaultValue={p?.formulacion ?? ""} maxLength={120} />
          </Field>
          <Field htmlFor={f("clase")} label="Clase" required error={error("clase")}>
            <Select id={f("clase")} name="clase" defaultValue={p?.clase ?? ""} placeholder="Elegí la clase" required>
              {Constants.public.Enums.clase_producto.map((c) => (
                <option key={c} value={c}>
                  {CLASE_PRODUCTO[c].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor={f("toxicidad")} label="Categoría toxicológica" error={error("categoria_toxicologica")}>
            <Select id={f("toxicidad")} name="categoria_toxicologica" defaultValue={p?.categoria_toxicologica ?? ""}>
              <option value="">Sin categoría informada</option>
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor={f("organismo")} label="Organismo de registro" required error={error("organismo")}>
            <Select id={f("organismo")} name="organismo" defaultValue={p?.organismo ?? "ANMAT"} required>
              {Constants.public.Enums.organismo_registro.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor={f("registro")} label="N.º de registro" required error={error("registro_numero")}>
            <Input id={f("registro")} name="registro_numero" defaultValue={p?.registro_numero ?? ""} required maxLength={60} />
          </Field>
          <Field
            htmlFor={f("reingreso")}
            label="Plazo de reingreso (horas)"
            required
            hint="Se informa al cliente en el certificado."
            error={error("plazo_reingreso_horas")}
          >
            <Input
              id={f("reingreso")}
              name="plazo_reingreso_horas"
              type="number"
              min={0}
              max={720}
              step={1}
              inputMode="numeric"
              defaultValue={p?.plazo_reingreso_horas ?? 2}
              required
            />
          </Field>
          <Field htmlFor={f("antidoto")} label="Antídoto" error={error("antidoto")}>
            <Input id={f("antidoto")} name="antidoto" defaultValue={p?.antidoto ?? ""} maxLength={300} />
          </Field>
          <Field htmlFor={f("precauciones")} label="Precauciones" error={error("precauciones")} className="sm:col-span-2">
            <Textarea id={f("precauciones")} name="precauciones" rows={3} defaultValue={p?.precauciones ?? ""} maxLength={2000} />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              name="activo"
              defaultChecked={p?.activo ?? true}
              label="Producto activo"
              description="Los productos inactivos no se ofrecen en nuevas memorias técnicas ni declaraciones."
            />
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pendiente}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pendiente}>
          {pendiente ? "Guardando…" : p ? "Guardar cambios" : "Agregar al catálogo"}
        </Button>
      </DialogFooter>
    </form>
  );
}
