"use client";

import { useState } from "react";
import { IdCard, Mail, Phone, Save, UserRound } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { useAccion } from "@/components/shared/use-accion";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { actualizarPerfil } from "../actions";

type DatosPerfil = { nombre: string; apellido: string; dni: string; telefono: string };

/** Datos personales editables de la cuenta (nombre, apellido, DNI y teléfono). */
export function FormDatos({ inicial, email }: { inicial: DatosPerfil; email: string }) {
  // Lo último enviado: React reinicia el formulario al terminar la acción y así no se pierde lo escrito si hubo
  // errores. Al guardar bien se vuelve a los datos del servidor (ya normalizados, p. ej. el DNI sin puntos).
  const [enviado, setEnviado] = useState<DatosPerfil | null>(null);
  const [estado, accion] = useAccion(actualizarPerfil, { alExito: () => setEnviado(null) });
  const valores = enviado ?? inicial;
  const error = (campo: keyof DatosPerfil) => estado.errores?.[campo]?.[0];

  return (
    <form
      action={accion}
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        setEnviado({
          nombre: String(fd.get("nombre") ?? ""),
          apellido: String(fd.get("apellido") ?? ""),
          dni: String(fd.get("dni") ?? ""),
          telefono: String(fd.get("telefono") ?? ""),
        });
      }}
      noValidate
      className="grid gap-5 sm:grid-cols-2"
    >
      <Field htmlFor="perfil-nombre" label="Nombre" required error={error("nombre")}>
        <Input
          id="perfil-nombre"
          name="nombre"
          autoComplete="given-name"
          defaultValue={valores.nombre}
          leading={<UserRound aria-hidden />}
        />
      </Field>
      <Field htmlFor="perfil-apellido" label="Apellido" required error={error("apellido")}>
        <Input id="perfil-apellido" name="apellido" autoComplete="family-name" defaultValue={valores.apellido} />
      </Field>
      <Field htmlFor="perfil-dni" label="DNI" hint="Sin puntos. Se usa para identificarte en actas y firmas." error={error("dni")}>
        <Input
          id="perfil-dni"
          name="dni"
          inputMode="numeric"
          autoComplete="off"
          placeholder="30123456"
          defaultValue={valores.dni}
          leading={<IdCard aria-hidden />}
        />
      </Field>
      <Field htmlFor="perfil-telefono" label="Teléfono" hint="Con código de área." error={error("telefono")}>
        <Input
          id="perfil-telefono"
          name="telefono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="381 4123456"
          defaultValue={valores.telefono}
          leading={<Phone aria-hidden />}
        />
      </Field>
      <Field
        htmlFor="perfil-email"
        label="Correo electrónico"
        hint="Es tu usuario para ingresar. Para cambiarlo, comunicate con la Dirección de Salud Ambiental."
        className="sm:col-span-2"
      >
        <Input id="perfil-email" value={email} readOnly disabled leading={<Mail aria-hidden />} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton pendingText="Guardando…">
          <Save aria-hidden />
          Guardar cambios
        </SubmitButton>
      </div>
    </form>
  );
}
