"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Mail, MailCheck, RotateCcw, Send } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { estadoInicial } from "@/lib/acciones";
import { solicitarRecuperacion } from "@/lib/auth-actions";
import { EncabezadoAuth } from "../../_components/encabezado-auth";
import { mensajeAuth } from "../../_components/mensaje-auth";
import { PanelResultado } from "../../_components/panel-resultado";

function Formulario({ onReiniciar }: { onReiniciar: () => void }) {
  const [estado, accion] = useActionState(solicitarRecuperacion, estadoInicial);
  const [email, setEmail] = useState("");

  if (estado.ok) {
    return (
      <PanelResultado
        icon={MailCheck}
        title="Revisá tu correo"
        tone="info"
        actions={
          <>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/ingresar">
                <ArrowLeft aria-hidden />
                Volver a ingresar
              </Link>
            </Button>
            <Button type="button" variant="ghost" size="lg" className="w-full sm:w-auto" onClick={onReiniciar}>
              <RotateCcw aria-hidden />
              Enviar de nuevo
            </Button>
          </>
        }
      >
        <p>{estado.mensaje}</p>
        {email ? (
          <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-azul-50 px-3 py-1.5 text-sm font-medium text-azul-800 ring-1 ring-azul-100">
            <Mail className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{email}</span>
          </p>
        ) : null}
        <p className="mt-3 text-[13px]">El enlace se puede usar una sola vez. Si no lo ves, revisá el correo no deseado.</p>
      </PanelResultado>
    );
  }

  return (
    <>
      <EncabezadoAuth
        icon={KeyRound}
        eyebrow="Recuperar acceso"
        title="¿Olvidaste tu contraseña?"
        description="Ingresá el correo de tu cuenta y te enviamos un enlace para elegir una nueva."
      />
      <form
        action={accion}
        onSubmit={(e) => setEmail(String(new FormData(e.currentTarget).get("email") ?? ""))}
        noValidate
        className="flex flex-col gap-5"
      >
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No pudimos enviar el enlace">
            {mensajeAuth(estado.mensaje)}
          </Alert>
        ) : null}

        <Field htmlFor="email" label="Correo electrónico" required error={estado.errores?.email?.[0]}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nombre@empresa.com"
            defaultValue={email}
            leading={<Mail aria-hidden />}
          />
        </Field>

        <SubmitButton size="lg" className="w-full" pendingText="Enviando…">
          <Send aria-hidden />
          Enviar enlace
        </SubmitButton>

        <p className="text-center text-[13px] text-muted-foreground">
          ¿La recordaste?{" "}
          <Link href="/ingresar" className="font-semibold text-azul-700 underline-offset-2 hover:underline">
            Volvé a ingresar
          </Link>
        </p>
      </form>
    </>
  );
}

/** Pedido de enlace de recuperación. "Enviar de nuevo" vuelve a montar el formulario. */
export function FormRecuperar() {
  const [intento, setIntento] = useState(0);
  return <Formulario key={intento} onReiniciar={() => setIntento((i) => i + 1)} />;
}
