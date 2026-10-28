"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Droplets, MapPinned, Save, Store, Users } from "lucide-react";
import { SelectorUbicacion } from "@/components/mapa/selector-ubicacion";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PERIODICIDAD } from "@/lib/domain/etiquetas";
import type { Enums } from "@/lib/supabase/database.types";
import { actualizarEstablecimiento, crearEstablecimiento } from "../actions";

export type ValoresEstablecimiento = {
  id?: string;
  nombre: string;
  nombre_fantasia: string | null;
  cuit: string | null;
  domicilio: string;
  barrio: string | null;
  zona: string | null;
  lat: number | null;
  lng: number | null;
  rubro_id: number | null;
  tiene_tanque: boolean;
  afluencia_publico: boolean;
  telefono: string | null;
  email: string | null;
};

type Rubro = { id: number; nombre: string; grupo: string; periodicidad: Enums<"periodicidad"> };

type FormEstablecimientoProps = {
  inicial?: ValoresEstablecimiento;
  rubros: Rubro[];
  zonas: readonly string[];
  barrios: string[];
  cancelarHref: string;
};

function Bloque({ titulo, icono: Icono, children }: { titulo: string; icono: typeof Store; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <legend className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-azul-50 text-azul-600 ring-1 ring-azul-100">
          <Icono className="size-4" />
        </span>
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

export function FormEstablecimiento({ inicial, rubros, zonas, barrios, cancelarHref }: FormEstablecimientoProps) {
  const id = useId();
  const router = useRouter();
  const editando = Boolean(inicial?.id);
  const [, startTransition] = useTransition();
  const [estado, accion, pendiente] = useAccion(editando ? actualizarEstablecimiento : crearEstablecimiento, {
    alExito: (e) => {
      const destino = e.datos?.id ?? inicial?.id;
      if (destino) router.push(`/gestion/establecimientos/${destino}`);
    },
  });
  const err = (campo: string) => estado.errores?.[campo]?.[0];
  const duplicado = estado.errores?.duplicado?.[0];

  const grupos = new Map<string, Rubro[]>();
  for (const r of rubros) {
    const lista = grupos.get(r.grupo) ?? [];
    lista.push(r);
    grupos.set(r.grupo, lista);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      {inicial?.id ? <input type="hidden" name="id" value={inicial.id} /> : null}

      <Bloque titulo="Identificación" icono={Store}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor={`${id}-nombre`} label="Nombre o razón social" required error={err("nombre")} className="sm:col-span-2">
            <Input id={`${id}-nombre`} name="nombre" defaultValue={inicial?.nombre ?? ""} maxLength={200} autoComplete="organization" required />
          </Field>
          <Field htmlFor={`${id}-fantasia`} label="Nombre de fantasía" error={err("nombre_fantasia")}>
            <Input id={`${id}-fantasia`} name="nombre_fantasia" defaultValue={inicial?.nombre_fantasia ?? ""} maxLength={200} />
          </Field>
          <Field htmlFor={`${id}-cuit`} label="CUIT" error={err("cuit")} hint="Opcional. 11 dígitos, con o sin guiones.">
            <Input id={`${id}-cuit`} name="cuit" inputMode="numeric" defaultValue={inicial?.cuit ?? ""} placeholder="30-12345678-9" maxLength={13} />
          </Field>
          <Field
            htmlFor={`${id}-rubro`}
            label="Rubro (Anexo, Ord. 2681/98)"
            error={err("rubro_id")}
            hint="Define la periodicidad de la fumigación."
            className="sm:col-span-2"
          >
            <Select id={`${id}-rubro`} name="rubro_id" defaultValue={inicial?.rubro_id ? String(inicial.rubro_id) : ""}>
              <option value="">Sin rubro asignado</option>
              {[...grupos.entries()].map(([grupo, lista]) => (
                <optgroup key={grupo} label={grupo}>
                  {lista.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} · {PERIODICIDAD[r.periodicidad].label.toLowerCase()}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>
      </Bloque>

      <Bloque titulo="Domicilio y ubicación" icono={MapPinned}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor={`${id}-domicilio`} label="Domicilio" required error={err("domicilio")} className="sm:col-span-2">
            <Input
              id={`${id}-domicilio`}
              name="domicilio"
              defaultValue={inicial?.domicilio ?? ""}
              placeholder="Ej.: 24 de Septiembre 650"
              maxLength={300}
              autoComplete="street-address"
              required
            />
          </Field>
          {duplicado ? (
            <div className="sm:col-span-2">
              <Alert tone="warning" title="Domicilio ya registrado">
                <p>Revisá que no sea el mismo establecimiento. Si es otro local en el mismo domicilio, confirmalo:</p>
                <Checkbox name="forzar" label="Es otro establecimiento en el mismo domicilio" wrapperClassName="mt-2" />
                <p className="mt-2">
                  <a href={`/gestion/establecimientos/${duplicado}`} target="_blank" rel="noreferrer" className="font-medium text-azul-700 underline">
                    Ver el establecimiento existente
                  </a>
                </p>
              </Alert>
            </div>
          ) : null}
          <Field htmlFor={`${id}-barrio`} label="Barrio" error={err("barrio")}>
            <Input id={`${id}-barrio`} name="barrio" list={`${id}-barrios`} defaultValue={inicial?.barrio ?? ""} maxLength={120} />
          </Field>
          <datalist id={`${id}-barrios`}>
            {barrios.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <Field htmlFor={`${id}-zona`} label="Zona" error={err("zona")}>
            <Select id={`${id}-zona`} name="zona" defaultValue={inicial?.zona ?? ""}>
              <option value="">Sin zona</option>
              {zonas.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
              {inicial?.zona && !zonas.includes(inicial.zona) ? (
                <option value={inicial.zona}>{inicial.zona} (cargada anteriormente)</option>
              ) : null}
            </Select>
          </Field>
        </div>
        <SelectorUbicacion latInicial={inicial?.lat} lngInicial={inicial?.lng} errorLat={err("lat")} errorLng={err("lng")} />
      </Bloque>

      <Bloque titulo="Obligaciones" icono={Droplets}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <Checkbox
              name="tiene_tanque"
              defaultChecked={inicial?.tiene_tanque ?? false}
              label="Tiene tanque de reserva o cisterna"
              description="Debe limpiarse y desinfectarse cada 180 días (Ord. 2004/92)."
            />
          </div>
          <div className="rounded-xl border border-border p-4">
            <Checkbox
              name="afluencia_publico"
              defaultChecked={inicial?.afluencia_publico ?? true}
              label="Con afluencia de público"
              description="Alcanzado por la obligación de limpieza de tanques."
            />
          </div>
        </div>
      </Bloque>

      <Bloque titulo="Contacto" icono={Users}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor={`${id}-telefono`} label="Teléfono" error={err("telefono")}>
            <Input id={`${id}-telefono`} name="telefono" type="tel" defaultValue={inicial?.telefono ?? ""} maxLength={60} autoComplete="tel" />
          </Field>
          <Field htmlFor={`${id}-email`} label="Correo electrónico" error={err("email")}>
            <Input id={`${id}-email`} name="email" type="email" defaultValue={inicial?.email ?? ""} autoComplete="email" />
          </Field>
        </div>
      </Bloque>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => router.push(cancelarHref)}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" loading={pendiente}>
          {pendiente ? null : <Save aria-hidden />}
          {pendiente ? "Guardando…" : editando ? "Guardar cambios" : "Agregar al padrón"}
        </Button>
      </div>
    </form>
  );
}
