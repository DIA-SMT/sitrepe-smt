"use client";

import { useState } from "react";
import { FileCheck2 } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubirArchivo } from "@/components/shared/subir-archivo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { formatFecha } from "@/lib/domain/formato";
import { presentarRenovacion } from "../actions";
import { ESTADO_PLAZO, type EstadoPlazo } from "../_lib/plazos";
import { ErrorCampo } from "./error-campo";
import { useEnvio } from "./use-envio";

type OpcionAnio = { anio: number; limite: string; estado: EstadoPlazo };

type FormRenovacionProps = {
  empresaId: string;
  opciones: OpcionAnio[];
  sugerido: number;
};

const CATEGORIAS = [
  { valor: "A", label: "Categoría A" },
  { valor: "B", label: "Categoría B" },
  { valor: "C", label: "Categoría C" },
];

/** DDJJ anual de categorización + libre deuda (Art. 8.º). */
export function FormRenovacion({ empresaId, opciones, sugerido }: FormRenovacionProps) {
  const [anio, setAnio] = useState(String(sugerido));
  const [nombreDdjj, setNombreDdjj] = useState("");
  const [nombreLibre, setNombreLibre] = useState("");
  const { pendiente, onSubmit, error } = useEnvio(presentarRenovacion);

  const seleccion = opciones.find((o) => String(o.anio) === anio) ?? null;
  const plazo = seleccion ? ESTADO_PLAZO[seleccion.estado] : null;

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="ren-anio" label="Año declarado" required error={error("anio")}>
          <Select id="ren-anio" name="anio" required value={anio} onChange={(e) => setAnio(e.target.value)}>
            {opciones.map((o) => (
              <option key={o.anio} value={o.anio}>
                DDJJ {o.anio}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor="ren-categoria"
          label="Categoría declarada"
          required
          hint="La que corresponde según el formulario de la DDJJ."
          error={error("categoria")}
        >
          <Select id="ren-categoria" name="categoria" required placeholder="Seleccioná la categoría">
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {seleccion && plazo ? (
        <div
          className="flex flex-col gap-2 rounded-xl border border-border bg-subtle px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          aria-live="polite"
        >
          <p className="text-muted-foreground">
            Plazo para la DDJJ {seleccion.anio}: <span className="font-medium text-foreground">hasta el {formatFecha(seleccion.limite)}</span>.{" "}
            {plazo.detalle}
          </p>
          <StatusBadge label={plazo.label} tone={plazo.tono} />
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <SubirArchivo
            name="ddjj_path"
            bucket="documentos"
            carpeta={[empresaId, "legajo"]}
            label="DDJJ anual firmada"
            required
            onSubido={(_ruta, archivo) => setNombreDdjj(archivo.name)}
          />
          <input type="hidden" name="ddjj_nombre" value={nombreDdjj} />
          <ErrorCampo mensaje={error("ddjj_path")} />
        </div>
        <div className="grid content-start gap-2">
          <SubirArchivo
            name="libre_deuda_path"
            bucket="documentos"
            carpeta={[empresaId, "legajo"]}
            label="Certificado de libre deuda"
            required
            onSubido={(_ruta, archivo) => setNombreLibre(archivo.name)}
          />
          <input type="hidden" name="libre_deuda_nombre" value={nombreLibre} />
          <ErrorCampo mensaje={error("libre_deuda_path")} />
        </div>
      </div>

      <div className="grid gap-2">
        <Checkbox
          name="libre_deuda"
          required
          label="Declaro bajo juramento que los datos son correctos y que la empresa no registra deudas con la Municipalidad"
          description="La falsedad de la declaración puede dar lugar a la suspensión de la habilitación."
        />
        <ErrorCampo mensaje={error("libre_deuda")} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={pendiente}>
          {pendiente ? null : <FileCheck2 aria-hidden />}
          Presentar renovación
        </Button>
        <p className="text-[13px] text-muted-foreground">Se genera un trámite con número para su seguimiento.</p>
      </div>
    </form>
  );
}
