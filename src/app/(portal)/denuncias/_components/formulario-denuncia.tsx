"use client";

import { useCallback, useId, useState } from "react";
import {
  Building2,
  CircleCheck,
  Droplets,
  EyeOff,
  FileWarning,
  MessageSquareWarning,
  PackageOpen,
  Lock,
  RotateCcw,
  Send,
  ShieldAlert,
  Store,
  type LucideIcon,
} from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { useAccion } from "@/components/shared/use-accion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TIPO_DENUNCIA } from "@/lib/domain/etiquetas";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { CopiarTexto } from "../../_components/copiar-texto";
import { enviarSinReiniciar } from "../../_lib/formulario";
import { crearDenuncia } from "../actions";

type TipoDenuncia = Enums<"tipo_denuncia">;

const TIPOS: { valor: TipoDenuncia; ayuda: string; icono: LucideIcon }[] = [
  { valor: "empresa_no_habilitada", ayuda: "Fumiga sin figurar en el listado oficial.", icono: ShieldAlert },
  { valor: "servicio_mal_realizado", ayuda: "Sin protección, productos dudosos o sin certificado.", icono: FileWarning },
  { valor: "establecimiento_sin_certificado", ayuda: "Comercio, escuela o edificio sin control al día.", icono: Store },
  { valor: "envases_descartados", ayuda: "Envases de productos tirados en la vía pública.", icono: PackageOpen },
  { valor: "tanque_sin_limpieza", ayuda: "Tanques o cisternas de uso público sin limpieza.", icono: Droplets },
  { valor: "otro", ayuda: "Otra situación vinculada al control de plagas.", icono: MessageSquareWarning },
];

const MAX_DESCRIPCION = 4000;

type Props = {
  /** Nombres de las empresas habilitadas, para sugerir al escribir. */
  empresas: string[];
  /** Avisa el código creado (para precargar la consulta de estado). */
  alCrear?: (codigo: string) => void;
};

/** Formulario público de denuncias (con opción anónima). */
export function FormularioDenuncia({ empresas, alCrear }: Props) {
  const [intento, setIntento] = useState(0);
  const [codigo, setCodigo] = useState<string | null>(null);

  if (codigo) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center" role="status">
        <span className="flex size-20 animate-pop-in items-center justify-center rounded-full bg-success-soft text-success ring-8 ring-emerald-50">
          <CircleCheck className="size-10" aria-hidden />
        </span>
        <div>
          <h3 className="font-display text-2xl font-semibold text-foreground">Recibimos tu denuncia</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            La Dirección de Salud Ambiental la va a analizar y, si corresponde, programará una inspección. Guardá este código
            para consultar cómo avanza:
          </p>
        </div>
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-azul-200 bg-azul-50/60 px-5 py-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-azul-700 uppercase">Código de seguimiento</p>
          <p className="font-mono text-2xl font-bold tracking-wider text-foreground sm:text-3xl">{codigo}</p>
          <CopiarTexto texto={codigo} etiqueta="Copiar código" descripcion="el código de la denuncia" variant="primary" />
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setCodigo(null);
            setIntento((n) => n + 1);
          }}
        >
          <RotateCcw aria-hidden />
          Hacer otra denuncia
        </Button>
      </div>
    );
  }

  return (
    <Formulario
      key={intento}
      empresas={empresas}
      alExito={(c) => {
        setCodigo(c);
        alCrear?.(c);
      }}
    />
  );
}

function Formulario({ empresas, alExito }: { empresas: string[]; alExito: (codigo: string) => void }) {
  const id = useId();
  const [anonima, setAnonima] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const manejarExito = useCallback(
    (e: { datos?: { codigo: string } }) => {
      if (e.datos?.codigo) alExito(e.datos.codigo);
    },
    [alExito],
  );
  const [estado, accion] = useAccion(crearDenuncia, { alExito: manejarExito });
  const err = (k: string) => estado.errores?.[k]?.[0];
  const largo = descripcion.trim().length;

  return (
    <form action={accion} onSubmit={enviarSinReiniciar(accion)} noValidate className="flex flex-col gap-6">
      {/* Tipo */}
      <fieldset aria-describedby={err("tipo") ? `${id}-tipo-error` : undefined}>
        <legend className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-foreground">
          ¿Qué querés denunciar?
          <span className="text-danger" aria-hidden>
            *
          </span>
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {TIPOS.map((t, i) => {
            const Icono = t.icono;
            const e = TIPO_DENUNCIA[t.valor];
            return (
              <label
                key={t.valor}
                className={cn(
                  "group relative flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-[border-color,background-color,box-shadow]",
                  "hover:border-azul-300 has-[:checked]:border-azul-500 has-[:checked]:bg-azul-50/70 has-[:checked]:shadow-[0_0_0_3px_rgb(0_102_255/0.12)]",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  err("tipo") && "border-danger/50",
                )}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={t.valor}
                  required={i === 0}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-noche-600 transition-colors group-has-[:checked]:bg-gradient-brand group-has-[:checked]:text-white"
                >
                  <Icono className="size-[18px]" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm leading-snug font-semibold text-foreground">{e.label}</span>
                  <span className="text-[13px] leading-snug text-muted-foreground">{t.ayuda}</span>
                </span>
              </label>
            );
          })}
        </div>
        {err("tipo") ? (
          <p id={`${id}-tipo-error`} role="alert" className="mt-2 text-[13px] font-medium text-danger">
            {err("tipo")}
          </p>
        ) : null}
      </fieldset>

      <Field
        htmlFor={`${id}-descripcion`}
        label="Contanos qué pasó"
        required
        error={err("descripcion")}
        hint="Incluí todo lo que ayude a la inspección: qué viste, cuándo, si hubo olores, personas afectadas, vehículos, etc."
      >
        <Textarea
          id={`${id}-descripcion`}
          name="descripcion"
          rows={5}
          required
          minLength={10}
          maxLength={MAX_DESCRIPCION}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej.: el sábado a la mañana una camioneta sin identificación fumigó el comedor del club sin desalojar el lugar…"
        />
      </Field>
      <p className={cn("-mt-4 text-right text-xs nums-tabular", largo > 0 && largo < 10 ? "text-warning" : "text-muted-foreground")}>
        {largo < 10 ? `Mínimo 10 caracteres · ` : ""}
        {descripcion.length}/{MAX_DESCRIPCION}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor={`${id}-domicilio`} label="Domicilio o lugar del hecho" error={err("domicilio")} hint="Calle, número y barrio.">
          <Input id={`${id}-domicilio`} name="domicilio" autoComplete="off" maxLength={300} placeholder="Ej.: Av. Mate de Luna 2100" />
        </Field>
        <Field
          htmlFor={`${id}-empresa`}
          label="Empresa mencionada"
          error={err("empresa")}
          hint="Si sabés qué empresa hizo el servicio."
        >
          <Input
            id={`${id}-empresa`}
            name="empresa"
            list={empresas.length ? `${id}-empresas` : undefined}
            autoComplete="off"
            maxLength={200}
            leading={<Building2 aria-hidden />}
            placeholder="Nombre comercial"
          />
        </Field>
        {empresas.length ? (
          <datalist id={`${id}-empresas`}>
            {empresas.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-subtle/70 p-4">
        <Checkbox
          name="anonima"
          checked={anonima}
          onChange={(e) => setAnonima(e.target.checked)}
          label={
            <span className="inline-flex items-center gap-1.5">
              <EyeOff className="size-4 text-azul-600" aria-hidden />
              Quiero hacer la denuncia de forma anónima
            </span>
          }
          description="No vamos a pedir ni guardar tus datos. Tené en cuenta que no podremos contactarte para ampliar la información."
        />
      </div>

      {/* Se ocultan (y deshabilitan, para no enviarlos) en lugar de desmontarse: así no se pierde lo escrito
          si la persona marca y desmarca la opción anónima. */}
      <div hidden={anonima} className="grid animate-fade-in gap-4 sm:grid-cols-2">
        <Field htmlFor={`${id}-nombre`} label="Nombre y apellido" required error={anonima ? undefined : err("nombre")}>
          <Input id={`${id}-nombre`} name="nombre" autoComplete="name" maxLength={200} required={!anonima} disabled={anonima} />
        </Field>
        <Field
          htmlFor={`${id}-contacto`}
          label="Teléfono o correo electrónico"
          required
          error={anonima ? undefined : err("contacto")}
          hint="Solo lo usa la Dirección para esta denuncia."
        >
          <Input
            id={`${id}-contacto`}
            name="contacto"
            autoComplete="off"
            maxLength={200}
            required={!anonima}
            disabled={anonima}
            placeholder="Ej.: 381 555-1234 o nombre@correo.com"
          />
        </Field>
      </div>

      {/* Campo trampa para bots (oculto para personas y lectores de pantalla). */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-sitio`}>No completar</label>
        <input id={`${id}-sitio`} type="text" name="sitio_web" tabIndex={-1} autoComplete="off" />
      </div>

      {estado.mensaje && !estado.ok && !estado.errores ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium whitespace-pre-line text-danger">
          {estado.mensaje}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Tus datos solo los ve la Dirección de Salud Ambiental y se usan para gestionar la denuncia.
        </p>
        <SubmitButton size="lg" pendingText="Enviando…" className="shrink-0">
          <Send aria-hidden />
          Enviar denuncia
        </SubmitButton>
      </div>
    </form>
  );
}
