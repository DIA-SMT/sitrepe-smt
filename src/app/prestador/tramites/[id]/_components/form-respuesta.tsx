"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { SubirArchivo } from "@/components/shared/subir-archivo";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TIPO_DOCUMENTO } from "@/lib/domain/etiquetas";
import type { Enums } from "@/lib/supabase/database.types";
import { ErrorCampo } from "../../../legajo/_components/error-campo";
import { useEnvio } from "../../../legajo/_components/use-envio";
import { responderObservaciones } from "../../actions";

export type ValoresRespuesta = {
  domicilio_oficina?: string | null;
  domicilio_deposito?: string | null;
  motivo?: string | null;
  categoria?: string | null;
  dosis?: string | null;
  concentracion_uso?: string | null;
  precauciones?: string | null;
};

type FormRespuestaProps = {
  tramiteId: string;
  tipo: Enums<"tipo_tramite">;
  empresaId: string;
  valores: ValoresRespuesta;
};

const TIPOS_ADJUNTO = (Object.keys(TIPO_DOCUMENTO) as Enums<"tipo_documento">[]).filter((t) => t !== "analisis_agua");

/** Corrección de un trámite observado y nueva presentación ante la Dirección. */
export function FormRespuesta({ tramiteId, tipo, empresaId, valores }: FormRespuestaProps) {
  const [nombreAdjunto, setNombreAdjunto] = useState("");
  const { pendiente, onSubmit, error } = useEnvio(responderObservaciones);

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <input type="hidden" name="id" value={tramiteId} />

      {tipo === "cambio_domicilio" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="resp-oficina" label="Nuevo domicilio de la oficina" error={error("domicilio_oficina")}>
            <Input id="resp-oficina" name="domicilio_oficina" maxLength={200} defaultValue={valores.domicilio_oficina ?? ""} />
          </Field>
          <Field htmlFor="resp-deposito" label="Nuevo domicilio del depósito" error={error("domicilio_deposito")}>
            <Input id="resp-deposito" name="domicilio_deposito" maxLength={200} defaultValue={valores.domicilio_deposito ?? ""} />
          </Field>
          <Field htmlFor="resp-motivo" label="Motivo del cambio" required error={error("motivo")} className="sm:col-span-2">
            <Textarea id="resp-motivo" name="motivo" rows={2} required minLength={10} maxLength={600} defaultValue={valores.motivo ?? ""} />
          </Field>
        </div>
      ) : null}

      {tipo === "renovacion" ? (
        <Field htmlFor="resp-categoria" label="Categoría declarada" required error={error("categoria")} className="sm:max-w-xs">
          <Select id="resp-categoria" name="categoria" required defaultValue={valores.categoria ?? ""}>
            <option value="" disabled>
              Seleccioná la categoría
            </option>
            <option value="A">Categoría A</option>
            <option value="B">Categoría B</option>
            <option value="C">Categoría C</option>
          </Select>
        </Field>
      ) : null}

      {tipo === "alta_producto" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="resp-dosis" label="Dosis de aplicación" required error={error("dosis")}>
            <Input id="resp-dosis" name="dosis" required maxLength={200} defaultValue={valores.dosis ?? ""} />
          </Field>
          <Field htmlFor="resp-concentracion" label="Concentración de uso" error={error("concentracion_uso")}>
            <Input id="resp-concentracion" name="concentracion_uso" maxLength={200} defaultValue={valores.concentracion_uso ?? ""} />
          </Field>
          <Field htmlFor="resp-precauciones" label="Precauciones y protección personal" error={error("precauciones")} className="sm:col-span-2">
            <Textarea id="resp-precauciones" name="precauciones" rows={3} maxLength={1500} defaultValue={valores.precauciones ?? ""} />
          </Field>
        </div>
      ) : null}

      <Field
        htmlFor="resp-texto"
        label="Respuesta a la Dirección"
        required
        hint="Contá qué corregiste o aclarás sobre cada observación."
        error={error("respuesta")}
      >
        <Textarea id="resp-texto" name="respuesta" rows={4} required minLength={10} maxLength={2000} />
      </Field>

      <fieldset className="grid gap-4 rounded-xl border border-dashed border-border-strong p-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <legend className="px-1 text-sm font-medium">Documentación adicional (opcional)</legend>
        <Field htmlFor="resp-adjunto-tipo" label="Tipo de documento" error={error("adjunto_tipo")}>
          <Select id="resp-adjunto-tipo" name="adjunto_tipo" defaultValue="">
            <option value="">Sin adjunto</option>
            {TIPOS_ADJUNTO.map((t) => (
              <option key={t} value={t}>
                {TIPO_DOCUMENTO[t].label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid content-start gap-2">
          <SubirArchivo
            name="adjunto_path"
            bucket="documentos"
            carpeta={[empresaId, "legajo"]}
            label="Archivo"
            onSubido={(_ruta, archivo) => setNombreAdjunto(archivo.name)}
          />
          <input type="hidden" name="adjunto_nombre" value={nombreAdjunto} />
          <ErrorCampo mensaje={error("adjunto_path")} />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={pendiente}>
          {pendiente ? null : <Send aria-hidden />}
          Volver a presentar
        </Button>
        <p className="text-[13px] text-muted-foreground">El trámite vuelve a la bandeja de la Dirección con tu respuesta.</p>
      </div>
    </form>
  );
}
