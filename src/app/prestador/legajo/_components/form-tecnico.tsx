"use client";

import { useState } from "react";
import { Send, UserPlus } from "lucide-react";
import { SubirArchivo } from "@/components/shared/subir-archivo";
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
import { agregarTecnico } from "../actions";
import { ErrorCampo } from "./error-campo";
import { useEnvio } from "./use-envio";

type FormTecnicoProps = {
  empresaId: string;
  /** Asesores aprobados que pueden ser reemplazados (se dan de baja al aprobarse el alta). */
  aprobados: { id: string; nombre: string }[];
  bloqueado?: string | null;
};

/** Alta de un asesor técnico: datos personales, título autenticado y trámite de cambio de técnico. */
export function FormTecnico({ empresaId, aprobados, bloqueado }: FormTecnicoProps) {
  const [abierto, setAbierto] = useState(false);
  const [nombreTitulo, setNombreTitulo] = useState("");
  const { pendiente, onSubmit, error, reiniciar } = useEnvio(agregarTecnico, { alExito: () => setAbierto(false) });

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        setAbierto(v);
        if (v) {
          setNombreTitulo("");
          reiniciar();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={Boolean(bloqueado)} title={bloqueado ?? undefined}>
          <UserPlus aria-hidden />
          Agregar asesor técnico
        </Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Agregar asesor técnico</DialogTitle>
            <DialogDescription>
              Se presentará un trámite de cambio de técnico. Mientras la Dirección lo revisa, el asesor figura como
              pendiente y todavía no puede firmar certificados.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="tec-nombre" label="Nombre" required error={error("nombre")}>
                <Input id="tec-nombre" name="nombre" required maxLength={80} autoComplete="given-name" />
              </Field>
              <Field htmlFor="tec-apellido" label="Apellido" required error={error("apellido")}>
                <Input id="tec-apellido" name="apellido" required maxLength={80} autoComplete="family-name" />
              </Field>
              <Field htmlFor="tec-dni" label="DNI" required hint="Sin puntos." error={error("dni")}>
                <Input id="tec-dni" name="dni" required inputMode="numeric" maxLength={10} placeholder="30123456" />
              </Field>
              <Field htmlFor="tec-matricula" label="Matrícula profesional" error={error("matricula")}>
                <Input id="tec-matricula" name="matricula" maxLength={60} placeholder="Ej.: MP 1234" />
              </Field>
              <Field
                htmlFor="tec-titulo"
                label="Título"
                required
                hint="Terciario o universitario (Art. 5.º)."
                error={error("titulo")}
                className="sm:col-span-2"
              >
                <Input id="tec-titulo" name="titulo" required maxLength={160} placeholder="Ej.: Ingeniero Agrónomo" />
              </Field>
              <Field htmlFor="tec-institucion" label="Institución que lo otorgó" error={error("institucion")} className="sm:col-span-2">
                <Input id="tec-institucion" name="institucion" maxLength={160} placeholder="Ej.: Universidad Nacional de Tucumán" />
              </Field>
              <Field htmlFor="tec-email" label="Correo electrónico" error={error("email")}>
                <Input id="tec-email" name="email" type="email" maxLength={160} autoComplete="email" />
              </Field>
              <Field htmlFor="tec-telefono" label="Teléfono" error={error("telefono")}>
                <Input id="tec-telefono" name="telefono" type="tel" maxLength={40} autoComplete="tel" />
              </Field>
            </div>

            <Checkbox
              name="es_representante"
              label="Es el representante técnico de la empresa"
              description="Responsable técnico ante la Dirección y firmante habitual de los certificados."
            />

            {aprobados.length > 0 ? (
              <Field
                htmlFor="tec-reemplaza"
                label="Reemplaza a (opcional)"
                hint="Si elegís un asesor, quedará dado de baja cuando la Dirección apruebe este alta."
                error={error("reemplaza_a")}
              >
                <Select id="tec-reemplaza" name="reemplaza_a" defaultValue="">
                  <option value="">No reemplaza a nadie</option>
                  {aprobados.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <div className="grid gap-2">
              <SubirArchivo
                name="titulo_path"
                bucket="documentos"
                carpeta={[empresaId, "legajo"]}
                label="Título autenticado"
                required
                hint="Copia del título con la autenticación legible. PDF, JPG o PNG de hasta 10 MB."
                onSubido={(_ruta, archivo) => setNombreTitulo(archivo.name)}
              />
              <input type="hidden" name="titulo_nombre" value={nombreTitulo} />
              <ErrorCampo mensaje={error("titulo_path")} />
            </div>

            <Alert tone="info">
              Al aprobarse, el asesor podrá firmar certificados. Para que pueda ingresar a la plataforma con su propio
              usuario, pedile a la Dirección que le habilite una cuenta de asesor técnico.
            </Alert>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={pendiente}>
              {pendiente ? null : <Send aria-hidden />}
              Presentar alta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
