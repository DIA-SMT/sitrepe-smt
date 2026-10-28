"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, LogIn, Mail, QrCode } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { estadoInicial } from "@/lib/acciones";
import { iniciarSesion } from "@/lib/auth-actions";
import { CampoClave } from "../../_components/campo-clave";
import { mensajeAuth } from "../../_components/mensaje-auth";

/** Formulario de ingreso. Si las credenciales son correctas, la acción redirige al área del usuario. */
export function FormIngreso({ siguiente }: { siguiente: string | null }) {
  const [estado, accion] = useActionState(iniciarSesion, estadoInicial);
  // Conserva el correo cuando React reinicia el formulario después de un intento fallido.
  const [email, setEmail] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <form
        action={accion}
        onSubmit={(e) => setEmail(String(new FormData(e.currentTarget).get("email") ?? ""))}
        noValidate
        className="flex flex-col gap-5"
      >
        {siguiente ? <input type="hidden" name="siguiente" value={siguiente} /> : null}

        {estado.mensaje && !estado.ok ? (
          <Alert tone="danger" title="No pudimos iniciar sesión">
            {mensajeAuth(estado.mensaje)}
          </Alert>
        ) : null}

        <Field htmlFor="email" label="Correo electrónico" error={estado.errores?.email?.[0]}>
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

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/recuperar"
              className="rounded-sm text-[13px] font-medium text-azul-700 underline-offset-2 hover:text-azul-800 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Field htmlFor="password" error={estado.errores?.password?.[0]}>
            <CampoClave id="password" name="password" autoComplete="current-password" placeholder="Tu contraseña" />
          </Field>
        </div>

        <SubmitButton size="lg" className="w-full" pendingText="Ingresando…">
          <LogIn aria-hidden />
          Ingresar
        </SubmitButton>
      </form>

      <Separator label="o" />

      <div className="group relative overflow-hidden rounded-2xl border border-azul-100 bg-azul-50/60 p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-azul-600 shadow-xs ring-1 ring-azul-100"
          >
            <Building2 className="size-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-semibold text-foreground">¿Tu empresa todavía no tiene cuenta?</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Creala en minutos y solicitá la inscripción en el registro de prestadores.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="mt-3 w-full">
          <Link href="/registro">
            Crear cuenta de prestador
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </Button>
      </div>

      <p className="flex items-center justify-center gap-2 text-center text-[13px] text-muted-foreground">
        <QrCode className="size-4 shrink-0 text-azul-600" aria-hidden />
        <span>
          ¿Sos vecino o vecina?{" "}
          <Link href="/verificar" className="font-semibold text-azul-700 underline-offset-2 hover:underline">
            Verificá un certificado
          </Link>{" "}
          sin crear una cuenta.
        </span>
      </p>
    </div>
  );
}
