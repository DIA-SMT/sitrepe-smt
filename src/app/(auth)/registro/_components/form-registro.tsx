"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, Mail, MailCheck, RotateCcw, UserPlus, UserRound } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { estadoInicial } from "@/lib/acciones";
import { registrarCuenta } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";
import { CampoClave } from "../../_components/campo-clave";
import { EncabezadoAuth } from "../../_components/encabezado-auth";
import { mensajeAuth } from "../../_components/mensaje-auth";
import { MedidorClave } from "../../_components/medidor-clave";
import { PanelResultado } from "../../_components/panel-resultado";

const PASOS = ["Creá tu cuenta", "Confirmá tu correo", "Inscribí tu empresa"];

function Recorrido({ actual }: { actual: number }) {
  return (
    <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Pasos para operar en la plataforma">
      {PASOS.map((paso, i) => {
        const hecho = i < actual;
        const activo = i === actual;
        return (
          <li key={paso} aria-current={activo ? "step" : undefined} className="flex flex-col gap-1.5">
            <span
              aria-hidden
              className={cn(
                "h-1.5 rounded-full transition-colors duration-500",
                hecho ? "bg-emerald-500" : activo ? "bg-linear-to-r from-azul-600 to-celeste-400" : "bg-muted",
              )}
            />
            <span
              className={cn(
                "text-[11px] leading-tight font-medium sm:text-xs",
                activo ? "text-azul-700" : hecho ? "text-success" : "text-muted-foreground",
              )}
            >
              <span className="sr-only">Paso {i + 1}: </span>
              {paso}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Formulario({ onReiniciar }: { onReiniciar: () => void }) {
  const [estado, accion] = useActionState(registrarCuenta, estadoInicial);
  const [valores, setValores] = useState({ nombre: "", apellido: "", email: "" });
  const [clave, setClave] = useState("");

  if (estado.ok) {
    return (
      <>
        <Recorrido actual={1} />
        <PanelResultado
          icon={MailCheck}
          title="Revisá tu correo"
          tone="info"
          actions={
            <>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/ingresar">
                  Ir a ingresar
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button type="button" variant="ghost" size="lg" className="w-full sm:w-auto" onClick={onReiniciar}>
                <RotateCcw aria-hidden />
                Usar otro correo
              </Button>
            </>
          }
        >
          <p>{estado.mensaje}</p>
          {valores.email ? (
            <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-azul-50 px-3 py-1.5 text-sm font-medium text-azul-800 ring-1 ring-azul-100">
              <Mail className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{valores.email}</span>
            </p>
          ) : null}
          <p className="mt-3 text-[13px]">¿No te llegó? Revisá la carpeta de correo no deseado o esperá unos minutos.</p>
        </PanelResultado>
      </>
    );
  }

  const error = (campo: string) => estado.errores?.[campo]?.[0];

  return (
    <>
      <EncabezadoAuth
        icon={UserPlus}
        eyebrow="Registro de prestadores"
        title="Creá la cuenta de tu empresa"
        description="Con esta cuenta vas a solicitar la inscripción en el registro y, una vez habilitada, gestionar declaraciones, certificados y pagos."
      />
      <Recorrido actual={0} />

      <form
        action={accion}
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          setValores({
            nombre: String(fd.get("nombre") ?? ""),
            apellido: String(fd.get("apellido") ?? ""),
            email: String(fd.get("email") ?? ""),
          });
        }}
        onReset={() => setClave("")}
        noValidate
        className="flex flex-col gap-5"
      >
        <Alert tone="info" icon={<Info />} title="Solo para empresas prestadoras">
          Es para empresas de control de plagas urbanas y de limpieza de tanques. Si sos vecino, no necesitás cuenta: podés
          verificar certificados y hacer denuncias desde el portal.
        </Alert>

        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No pudimos crear la cuenta">
            {mensajeAuth(estado.mensaje)}
          </Alert>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor="nombre" label="Nombre" required error={error("nombre")}>
            <Input
              id="nombre"
              name="nombre"
              autoComplete="given-name"
              defaultValue={valores.nombre}
              leading={<UserRound aria-hidden />}
            />
          </Field>
          <Field htmlFor="apellido" label="Apellido" required error={error("apellido")}>
            <Input id="apellido" name="apellido" autoComplete="family-name" defaultValue={valores.apellido} />
          </Field>
        </div>

        <Field
          htmlFor="email"
          label="Correo electrónico"
          required
          hint="Te vamos a enviar un enlace para confirmarlo."
          error={error("email")}
        >
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="administracion@tuempresa.com"
            defaultValue={valores.email}
            leading={<Mail aria-hidden />}
          />
        </Field>

        <Field htmlFor="password" label="Contraseña" required error={error("password")}>
          <CampoClave
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            onChange={(e) => setClave(e.currentTarget.value)}
          />
        </Field>
        <MedidorClave clave={clave} />
        <Field htmlFor="confirmacion" label="Repetí la contraseña" required error={error("confirmacion")}>
          <CampoClave id="confirmacion" name="confirmacion" autoComplete="new-password" />
        </Field>

        <SubmitButton size="lg" className="w-full" pendingText="Creando la cuenta…">
          <UserPlus aria-hidden />
          Crear cuenta
        </SubmitButton>

        <p className="text-center text-[13px] text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/ingresar" className="font-semibold text-azul-700 underline-offset-2 hover:underline">
            Ingresá
          </Link>
        </p>
      </form>
    </>
  );
}

/** Alta de cuenta de prestador. "Usar otro correo" vuelve a montar el formulario con el estado limpio. */
export function FormRegistro() {
  const [intento, setIntento] = useState(0);
  return <Formulario key={intento} onReiniciar={() => setIntento((i) => i + 1)} />;
}
