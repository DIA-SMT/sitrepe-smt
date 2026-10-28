"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Info } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OpcionEstablecimiento, OpcionPersona } from "@/lib/data/fiscalizacion";
import { ESTADO_EMPRESA, TIPO_INSPECCION } from "@/lib/domain/etiquetas";
import type { Enums } from "@/lib/supabase/database.types";
import { Constants } from "@/lib/supabase/database.types";
import { SelectorEstablecimiento } from "../../establecimientos/_components/selector-establecimiento";
import { crearInspeccion } from "../actions";
import { ALCANCE_TIPO } from "./checklist";

type TipoInspeccion = Enums<"tipo_inspeccion">;

type FormNuevaInspeccionProps = {
  tipoInicial: TipoInspeccion;
  fechaInicial: string;
  fechaMinima: string;
  inspectores: OpcionPersona[];
  inspectorInicial: string;
  empresas: { id: string; nombre_comercial: string; numero_registro: number | null; estado: Enums<"estado_empresa"> }[];
  empresaInicial: string | null;
  establecimientoInicial: OpcionEstablecimiento | null;
  certificadoId: string | null;
  denunciaId: string | null;
  /** El certificado fija el lugar y la empresa (inspección por muestreo). */
  lugarFijo: boolean;
  cancelarHref: string;
};

const SOLO_EMPRESA: TipoInspeccion[] = ["deposito_anual", "habilitacion"];

export function FormNuevaInspeccion({
  tipoInicial,
  fechaInicial,
  fechaMinima,
  inspectores,
  inspectorInicial,
  empresas,
  empresaInicial,
  establecimientoInicial,
  certificadoId,
  denunciaId,
  lugarFijo,
  cancelarHref,
}: FormNuevaInspeccionProps) {
  const id = useId();
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoInspeccion>(tipoInicial);
  const [, startTransition] = useTransition();
  const [estado, accion, pendiente] = useAccion(crearInspeccion, {
    alExito: (e) => {
      if (e.datos?.id) router.push(`/gestion/inspecciones/${e.datos.id}`);
    },
  });
  const err = (campo: string) => estado.errores?.[campo]?.[0];
  const soloEmpresa = SOLO_EMPRESA.includes(tipo);

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
      {certificadoId ? <input type="hidden" name="certificado_id" value={certificadoId} /> : null}
      {denunciaId ? <input type="hidden" name="denuncia_id" value={denunciaId} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor={`${id}-tipo`} label="Tipo de inspección" required error={err("tipo")} className="sm:col-span-2">
          <Select
            id={`${id}-tipo`}
            name="tipo"
            value={tipo}
            onChange={(e) => {
              const valor = Constants.public.Enums.tipo_inspeccion.find((t) => t === e.target.value);
              if (valor) setTipo(valor);
            }}
          >
            {Constants.public.Enums.tipo_inspeccion.map((t) => (
              <option key={t} value={t}>
                {TIPO_INSPECCION[t].label}
              </option>
            ))}
          </Select>
        </Field>
        <p className="-mt-3 flex items-start gap-2 rounded-xl bg-azul-50/70 px-3 py-2.5 text-[13px] leading-snug text-azul-900 ring-1 ring-azul-100 sm:col-span-2">
          <Info className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
          {ALCANCE_TIPO[tipo]}
        </p>

        <Field
          htmlFor={`${id}-fecha`}
          label="Fecha programada"
          required
          error={err("fecha_programada")}
          hint="Hoy o una fecha futura."
        >
          <Input
            id={`${id}-fecha`}
            name="fecha_programada"
            type="date"
            min={fechaMinima}
            defaultValue={fechaInicial < fechaMinima ? fechaMinima : fechaInicial}
            required
          />
        </Field>

        <Field
          htmlFor={`${id}-inspector`}
          label="Inspector/a asignado/a"
          error={err("inspector_id")}
          hint={inspectores.length === 0 ? "No hay usuarios con rol inspector: podés asignarla más tarde." : undefined}
        >
          <Select id={`${id}-inspector`} name="inspector_id" defaultValue={inspectorInicial}>
            <option value="">Sin asignar</option>
            {inspectores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {lugarFijo ? (
        <p className="flex items-start gap-2 rounded-xl border border-dashed border-border-strong px-3 py-2.5 text-[13px] text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          El lugar y la empresa surgen del certificado del servicio declarado.
        </p>
      ) : (
        <div className="grid gap-5">
          {soloEmpresa ? null : (
            <div className="flex flex-col gap-2">
              <Label id={`${id}-est-label`} required={!soloEmpresa}>
                Establecimiento
              </Label>
              <SelectorEstablecimiento
                inicial={establecimientoInicial}
                labelId={`${id}-est-label`}
                invalido={Boolean(err("establecimiento_id"))}
              />
              {err("establecimiento_id") ? (
                <p role="alert" className="text-[13px] font-medium text-danger">
                  {err("establecimiento_id")}
                </p>
              ) : null}
            </div>
          )}

          <Field
            htmlFor={`${id}-empresa`}
            label={soloEmpresa ? "Empresa prestadora" : "Empresa prestadora (opcional)"}
            required={soloEmpresa}
            error={err("empresa_id")}
            hint={
              soloEmpresa
                ? "Se inspeccionan la oficina y el depósito declarados en su legajo."
                : "Indicala si la inspección controla un servicio de una empresa en particular."
            }
          >
            <Select id={`${id}-empresa`} name="empresa_id" defaultValue={empresaInicial ?? ""}>
              <option value="">{soloEmpresa ? "Elegí una empresa" : "Ninguna en particular"}</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.numero_registro ? `N.º ${e.numero_registro} · ` : ""}
                  {e.nombre_comercial}
                  {e.estado !== "habilitada" ? ` (${ESTADO_EMPRESA[e.estado].label.toLowerCase()})` : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      <Field
        htmlFor={`${id}-obs`}
        label="Indicaciones para la visita"
        error={err("observaciones")}
        hint="Opcional: horario de atención, persona de contacto, qué revisar con atención…"
      >
        <Textarea id={`${id}-obs`} name="observaciones" rows={3} maxLength={2000} />
      </Field>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => router.push(cancelarHref)}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" loading={pendiente}>
          {pendiente ? null : <CalendarPlus aria-hidden />}
          {pendiente ? "Programando…" : "Programar inspección"}
        </Button>
      </div>
    </form>
  );
}
