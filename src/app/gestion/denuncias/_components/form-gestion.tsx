"use client";

import { useId, useState, useTransition } from "react";
import { Hand, Save } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OpcionEstablecimiento, OpcionPersona } from "@/lib/data/fiscalizacion";
import { ESTADO_DENUNCIA, TIPO_DENUNCIA } from "@/lib/domain/etiquetas";
import type { Enums } from "@/lib/supabase/database.types";
import { Constants } from "@/lib/supabase/database.types";
import { SelectorEstablecimiento } from "../../establecimientos/_components/selector-establecimiento";
import { actualizarDenuncia, tomarDenuncia } from "../actions";

type FormGestionDenunciaProps = {
  denuncia: {
    id: string;
    estado: Enums<"estado_denuncia">;
    tipo: Enums<"tipo_denuncia">;
    asignada_a: string | null;
    empresa_id: string | null;
    respuesta: string | null;
  };
  establecimiento: OpcionEstablecimiento | null;
  inspectores: OpcionPersona[];
  empresas: { id: string; nombre_comercial: string; numero_registro: number | null }[];
};

/** Gestión interna de la denuncia: estado, asignación, vínculos y respuesta al vecino. */
export function FormGestionDenuncia({ denuncia, establecimiento, inspectores, empresas }: FormGestionDenunciaProps) {
  const id = useId();
  const [estadoDenuncia, setEstadoDenuncia] = useState(denuncia.estado);
  const [respuesta, setRespuesta] = useState(denuncia.respuesta ?? "");
  const [, startTransition] = useTransition();
  const [estado, accion, pendiente] = useAccion(actualizarDenuncia);
  const err = (campo: string) => estado.errores?.[campo]?.[0];
  const cierra = estadoDenuncia === "cerrada" || estadoDenuncia === "desestimada";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <input type="hidden" name="id" value={denuncia.id} />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
        <Field htmlFor={`${id}-estado`} label="Estado" required error={err("estado")}>
          <Select
            id={`${id}-estado`}
            name="estado"
            value={estadoDenuncia}
            onChange={(e) => {
              const valor = Constants.public.Enums.estado_denuncia.find((v) => v === e.target.value);
              if (valor) setEstadoDenuncia(valor);
            }}
          >
            {Constants.public.Enums.estado_denuncia.map((v) => (
              <option key={v} value={v}>
                {ESTADO_DENUNCIA[v].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor={`${id}-tipo`} label="Tipo" required error={err("tipo")} hint="Reclasificala si el vecino eligió mal.">
          <Select id={`${id}-tipo`} name="tipo" defaultValue={denuncia.tipo}>
            {Constants.public.Enums.tipo_denuncia.map((v) => (
              <option key={v} value={v}>
                {TIPO_DENUNCIA[v].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor={`${id}-asignada`} label="Asignada a" error={err("asignada_a")}>
          <Select id={`${id}-asignada`} name="asignada_a" defaultValue={denuncia.asignada_a ?? ""}>
            <option value="">Sin asignar</option>
            {inspectores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
            {denuncia.asignada_a && !inspectores.some((p) => p.id === denuncia.asignada_a) ? (
              <option value={denuncia.asignada_a}>Asignación actual (otro rol)</option>
            ) : null}
          </Select>
        </Field>
        <Field htmlFor={`${id}-empresa`} label="Empresa vinculada" error={err("empresa_id")}>
          <Select id={`${id}-empresa`} name="empresa_id" defaultValue={denuncia.empresa_id ?? ""}>
            <option value="">Ninguna</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.numero_registro ? `N.º ${e.numero_registro} · ` : ""}
                {e.nombre_comercial}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Label id={`${id}-est-label`}>Establecimiento vinculado</Label>
        <SelectorEstablecimiento
          inicial={establecimiento}
          labelId={`${id}-est-label`}
          invalido={Boolean(err("establecimiento_id"))}
        />
      </div>

      <Field
        htmlFor={`${id}-respuesta`}
        label="Respuesta al vecino"
        required={cierra}
        error={err("respuesta")}
        hint="La ve quien denunció al consultar con el código. Escribila en lenguaje claro."
      >
        <Textarea
          id={`${id}-respuesta`}
          name="respuesta"
          rows={4}
          maxLength={2000}
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          placeholder="Ej.: Se inspeccionó el lugar y se intimó al responsable a presentar el certificado."
        />
      </Field>

      <Button type="submit" loading={pendiente} className="w-full sm:w-auto lg:w-full">
        {pendiente ? null : <Save aria-hidden />}
        {pendiente ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

/** Botón rápido para asignarse una denuncia sin asignar. */
export function BotonTomarDenuncia({ denunciaId }: { denunciaId: string }) {
  const [, startTransition] = useTransition();
  const [, accion, pendiente] = useAccion(tomarDenuncia);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
    >
      <input type="hidden" name="id" value={denunciaId} />
      <Button type="submit" variant="outline" loading={pendiente}>
        {pendiente ? null : <Hand aria-hidden />}
        Asignármela
      </Button>
    </form>
  );
}
