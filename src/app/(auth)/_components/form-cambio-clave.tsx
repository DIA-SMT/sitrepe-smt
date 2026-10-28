"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { estadoInicial } from "@/lib/acciones";
import { actualizarClave } from "@/lib/auth-actions";
import { CampoClave } from "./campo-clave";
import { EncabezadoAuth } from "./encabezado-auth";
import { mensajeAuth } from "./mensaje-auth";
import { MedidorClave } from "./medidor-clave";
import { PanelResultado } from "./panel-resultado";

type FormCambioClaveProps =
  | {
      /** Pantalla de /actualizar-clave (después del enlace de recuperación). */
      modo: "recuperacion";
      /** Área del usuario para continuar al terminar. */
      destino: string;
      email: string;
    }
  | {
      /** Sección "Seguridad" de /perfil. */
      modo: "perfil";
    };

/** Formulario de nueva contraseña (usa `actualizarClave`). */
export function FormCambioClave(props: FormCambioClaveProps) {
  const [estado, accion] = useActionState(actualizarClave, estadoInicial);
  const [clave, setClave] = useState("");
  const recuperacion = props.modo === "recuperacion";

  if (recuperacion && estado.ok) {
    return (
      <PanelResultado
        icon={ShieldCheck}
        title="¡Listo! Tu contraseña es nueva"
        actions={
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={props.destino}>
              Ir a mi área
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      >
        {estado.mensaje} La próxima vez ingresá con <strong className="font-semibold text-foreground">{props.email}</strong> y tu
        nueva contraseña.
      </PanelResultado>
    );
  }

  const prefijo = recuperacion ? "clave" : "perfil-clave";

  return (
    <>
      {recuperacion ? (
        <EncabezadoAuth
          icon={KeyRound}
          eyebrow="Seguridad de la cuenta"
          title="Elegí una contraseña nueva"
          description={
            <>
              Estás cambiando la contraseña de <strong className="font-semibold text-foreground">{props.email}</strong>.
            </>
          }
        />
      ) : null}

      <form action={accion} onReset={() => setClave("")} noValidate className="flex flex-col gap-5">
        {estado.mensaje && !estado.ok ? (
          <Alert tone="danger" title="No pudimos cambiar la contraseña">
            {mensajeAuth(estado.mensaje)}
          </Alert>
        ) : null}
        {!recuperacion && estado.ok && estado.mensaje ? (
          <Alert tone="success" title="Contraseña actualizada">
            Desde ahora ingresá con la contraseña nueva.
          </Alert>
        ) : null}

        <Field htmlFor={`${prefijo}-password`} label="Contraseña nueva" required error={estado.errores?.password?.[0]}>
          <CampoClave
            id={`${prefijo}-password`}
            name="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            onChange={(e) => setClave(e.currentTarget.value)}
          />
        </Field>
        <MedidorClave clave={clave} />
        <Field htmlFor={`${prefijo}-confirmacion`} label="Repetí la contraseña" required error={estado.errores?.confirmacion?.[0]}>
          <CampoClave id={`${prefijo}-confirmacion`} name="confirmacion" autoComplete="new-password" />
        </Field>

        <SubmitButton
          size={recuperacion ? "lg" : "md"}
          className={recuperacion ? "w-full" : "w-full sm:w-fit"}
          pendingText="Guardando…"
        >
          <KeyRound aria-hidden />
          {recuperacion ? "Guardar contraseña" : "Cambiar contraseña"}
        </SubmitButton>
      </form>
    </>
  );
}
