"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { SubirArchivo } from "@/components/shared/subir-archivo";
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
import { TIPO_DOCUMENTO } from "@/lib/domain/etiquetas";
import { hoyISO } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";
import { subirDocumento } from "../actions";
import { ErrorCampo } from "./error-campo";
import { useEnvio } from "./use-envio";

type TipoDocumento = Enums<"tipo_documento">;

/** Tipos que se cargan desde otros circuitos (análisis de agua: certificados de tanques). */
const TIPOS_EXCLUIDOS: TipoDocumento[] = ["analisis_agua"];

/** Tipos que suelen tener vencimiento propio. */
const CON_VENCIMIENTO: TipoDocumento[] = ["carnet_sanidad", "habilitacion_comercial", "libre_deuda", "seguro", "constancia_cuit"];

type FormDocumentoProps = {
  empresaId: string;
  tecnicos: { id: string; nombre: string }[];
  tipoInicial?: TipoDocumento;
  /** Botón que abre el diálogo. */
  trigger: React.ReactElement;
};

/** Carga de un documento al legajo digital (queda pendiente de revisión por la Dirección). */
export function FormDocumento({ empresaId, tecnicos, tipoInicial, trigger }: FormDocumentoProps) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<string>(tipoInicial ?? "");
  const [nombre, setNombre] = useState("");
  const { pendiente, onSubmit, error, reiniciar } = useEnvio(subirDocumento, { alExito: () => setAbierto(false) });

  const tipos = (Object.keys(TIPO_DOCUMENTO) as TipoDocumento[]).filter((t) => !TIPOS_EXCLUIDOS.includes(t));
  const mostrarTecnico = tipo === "titulo_tecnico" && tecnicos.length > 0;
  const sugerirVencimiento = CON_VENCIMIENTO.includes(tipo as TipoDocumento);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        setAbierto(v);
        if (v) {
          setTipo(tipoInicial ?? "");
          setNombre("");
          reiniciar();
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="md">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{tipoInicial ? `Subir ${TIPO_DOCUMENTO[tipoInicial].label.toLowerCase()}` : "Subir documento"}</DialogTitle>
            <DialogDescription>
              El documento queda pendiente hasta que la Dirección lo revise. Podés eliminarlo mientras esté pendiente.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-5">
            <Field htmlFor="doc-tipo" label="Tipo de documento" required error={error("tipo")}>
              <Select
                id="doc-tipo"
                name="tipo"
                required
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="" disabled>
                  Seleccioná el tipo
                </option>
                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_DOCUMENTO[t].label}
                  </option>
                ))}
              </Select>
            </Field>

            {mostrarTecnico ? (
              <Field htmlFor="doc-tecnico" label="Asesor técnico" hint="A quién corresponde el título." error={error("tecnico_id")}>
                <Select id="doc-tecnico" name="tecnico_id" defaultValue="">
                  <option value="">Sin asociar</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <Field
              htmlFor="doc-vence"
              label="Fecha de vencimiento"
              hint={sugerirVencimiento ? "Este documento suele vencer: indicá la fecha para recibir avisos." : "Opcional."}
              error={error("vence")}
            >
              <Input id="doc-vence" name="vence" type="date" min={hoyISO()} />
            </Field>

            <div className="grid gap-2">
              <SubirArchivo
                name="path"
                bucket="documentos"
                carpeta={[empresaId, "legajo"]}
                label="Archivo"
                required
                onSubido={(_ruta, archivo) => setNombre(archivo.name)}
              />
              <input type="hidden" name="nombre_archivo" value={nombre} />
              <ErrorCampo mensaje={error("path")} />
            </div>

            <Field htmlFor="doc-obs" label="Aclaraciones para la Dirección" hint="Opcional." error={error("observaciones")}>
              <Textarea id="doc-obs" name="observaciones" rows={2} maxLength={300} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={pendiente}>
              {pendiente ? null : <Upload aria-hidden />}
              Cargar documento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
