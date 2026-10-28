"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CircleCheck,
  Copy,
  Droplets,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Send,
  ShieldCheck,
  SprayCan,
  TriangleAlert,
  UserRound,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cuitValido, normalizarCuit } from "@/lib/domain/cuit";
import { hoyISO } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { solicitarInscripcion } from "../actions";

type Valores = {
  nombre_comercial: string;
  titular: string;
  tipo_persona: "humana" | "juridica";
  cuit: string;
  cuit_confirmado: boolean;
  email: string;
  telefono: string;
  domicilio_oficina: string;
  domicilio_deposito: string;
  deposito_exclusivo: boolean;
  habilitacion_numero: string;
  habilitacion_anio: string;
  habilita_tanques: boolean;
  acepta_ordenanza: boolean;
  observaciones: string;
};

type Campo = keyof Valores;
type Errores = Partial<Record<Campo, string>>;

type Paso = { titulo: string; descripcion: string; icon: LucideIcon; campos: Campo[] };

const PASOS: Paso[] = [
  {
    titulo: "Empresa",
    descripcion: "Identificación del titular, CUIT y datos de contacto (Art. 4.º).",
    icon: Building2,
    campos: ["nombre_comercial", "titular", "tipo_persona", "cuit", "cuit_confirmado", "email", "telefono"],
  },
  {
    titulo: "Domicilios",
    descripcion: "Oficina y depósito de productos químicos con espacio exclusivo (Art. 6.º).",
    icon: MapPin,
    campos: ["domicilio_oficina", "domicilio_deposito", "deposito_exclusivo"],
  },
  {
    titulo: "Habilitación y servicios",
    descripcion: "Habilitación comercial municipal y servicios que vas a prestar.",
    icon: BadgeCheck,
    campos: ["habilitacion_numero", "habilitacion_anio", "habilita_tanques"],
  },
  {
    titulo: "Declaración jurada",
    descripcion: "Revisá los datos y confirmá la declaración para enviar la solicitud.",
    icon: ShieldCheck,
    campos: ["acepta_ordenanza", "observaciones"],
  },
];

const ULTIMO = PASOS.length - 1;

const TIPOS_PERSONA = [
  { valor: "humana", titulo: "Persona humana", texto: "Titular con nombre y apellido.", icon: UserRound },
  { valor: "juridica", titulo: "Persona jurídica", texto: "Sociedad (S.A., S.R.L., S.A.S., cooperativa…).", icon: Landmark },
] as const;

const soloDigitos = (v: string) => v.replace(/\D/g, "");
const cantidadDigitos = (v: string) => soloDigitos(v).length;

function validarPaso(paso: number, v: Valores): Errores {
  const e: Errores = {};
  if (paso === 0) {
    if (v.nombre_comercial.trim().length < 2) e.nombre_comercial = "Ingresá el nombre comercial.";
    if (v.titular.trim().length < 3)
      e.titular = v.tipo_persona === "juridica" ? "Ingresá la razón social." : "Ingresá el nombre y apellido del titular.";
    const normalizado = normalizarCuit(v.cuit);
    if (!v.cuit.trim()) e.cuit = "Ingresá el CUIT.";
    else if (!normalizado) e.cuit = "El CUIT debe tener 11 dígitos (con o sin guiones).";
    else if (!cuitValido(normalizado) && !v.cuit_confirmado)
      e.cuit = "El dígito verificador no coincide. Revisá el número o confirmá que es correcto.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Ingresá un correo válido.";
    if (!/^[\d+()\-\s]{6,30}$/.test(v.telefono.trim()) || cantidadDigitos(v.telefono) < 6)
      e.telefono = "Ingresá un teléfono de contacto válido (con código de área).";
  }
  if (paso === 1) {
    if (v.domicilio_oficina.trim().length < 6) e.domicilio_oficina = "Ingresá el domicilio de la oficina (calle, número y barrio).";
    if (v.domicilio_deposito.trim().length < 6) e.domicilio_deposito = "Ingresá el domicilio del depósito de químicos.";
    if (!v.deposito_exclusivo) e.deposito_exclusivo = "Declará que el depósito tiene un espacio exclusivo para químicos (Art. 6.º).";
  }
  if (paso === 2) {
    if (!/^\d{1,7}$/.test(v.habilitacion_numero.trim())) e.habilitacion_numero = "Ingresá solo el número de la habilitación comercial.";
    const anio = Number(v.habilitacion_anio);
    // Año en hora de Tucumán (igual que la validación del servidor).
    const actual = Number(hoyISO().slice(0, 4));
    if (!/^\d{4}$/.test(v.habilitacion_anio.trim())) e.habilitacion_anio = "Ingresá el año (4 dígitos).";
    else if (anio < 1980 || anio > actual) e.habilitacion_anio = `Ingresá un año entre 1980 y ${actual}.`;
  }
  if (paso === 3) {
    if (!v.acepta_ordenanza) e.acepta_ordenanza = "Tenés que aceptar la declaración jurada para enviar la solicitud.";
  }
  return e;
}

function aFormData(v: Valores): FormData {
  const fd = new FormData();
  for (const [clave, valor] of Object.entries(v)) {
    fd.set(clave, typeof valor === "boolean" ? (valor ? "on" : "") : valor);
  }
  return fd;
}

/* --- Piezas de UI -------------------------------------------------------- */

function IndicadorPasos({
  paso,
  maxAlcanzado,
  bloqueado,
  onIr,
}: {
  paso: number;
  maxAlcanzado: number;
  /** Mientras se envía la solicitud no se puede cambiar de paso. */
  bloqueado: boolean;
  onIr: (i: number) => void;
}) {
  return (
    <nav aria-label="Pasos de la solicitud" className="border-b border-border px-5 py-4 sm:px-6">
      {/* Móvil: texto + barra */}
      <div className="flex flex-col gap-2 sm:hidden">
        <p className="text-[13px] font-medium text-muted-foreground">
          Paso {paso + 1} de {PASOS.length} · <span className="font-semibold text-foreground">{PASOS[paso].titulo}</span>
        </p>
        <Progress value={paso + 1} max={PASOS.length} size="sm" />
      </div>
      {/* Escritorio: pasos con íconos */}
      <ol className="hidden grid-cols-4 gap-3 sm:grid">
        {PASOS.map((p, i) => {
          const hecho = i < paso;
          const activo = i === paso;
          const navegable = !bloqueado && i <= maxAlcanzado && i !== paso;
          const Icono = p.icon;
          return (
            <li key={p.titulo} className="relative">
              {i < ULTIMO ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-5 left-[calc(50%+1.5rem)] h-0.5 w-[calc(100%-3rem+0.75rem)] rounded-full transition-colors duration-500",
                    i < paso ? "bg-linear-to-r from-azul-600 to-celeste-400" : "bg-border",
                  )}
                />
              ) : null}
              <button
                type="button"
                onClick={() => onIr(i)}
                disabled={!navegable}
                aria-current={activo ? "step" : undefined}
                className="group flex w-full flex-col items-center gap-2 rounded-xl px-1 py-0.5 text-center disabled:cursor-default"
              >
                <span
                  className={cn(
                    "relative z-10 flex size-10 items-center justify-center rounded-full ring-4 transition-all duration-300",
                    activo && "bg-gradient-brand text-white shadow-brand ring-azul-100",
                    hecho && "bg-emerald-500 text-white ring-emerald-100 group-enabled:group-hover:scale-105",
                    !activo && !hecho && "bg-card text-noche-400 ring-muted",
                  )}
                >
                  {hecho ? <Check className="size-5" strokeWidth={2.6} aria-hidden /> : <Icono className="size-5" aria-hidden />}
                </span>
                <span
                  className={cn(
                    "text-xs leading-tight font-medium",
                    activo ? "text-azul-700" : hecho ? "text-foreground group-enabled:group-hover:text-azul-700" : "text-muted-foreground",
                  )}
                >
                  <span className="sr-only">
                    Paso {i + 1}
                    {hecho ? " (completo)" : ""}:{" "}
                  </span>
                  {p.titulo}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function TarjetaServicio({
  icon: Icon,
  titulo,
  norma,
  texto,
  activo,
  bloqueado,
  onCambiar,
  id,
}: {
  icon: LucideIcon;
  titulo: string;
  norma: string;
  texto: string;
  activo: boolean;
  bloqueado?: boolean;
  onCambiar?: (v: boolean) => void;
  id: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "relative flex gap-3.5 rounded-2xl border p-4 transition-[border-color,background-color,box-shadow] duration-200",
        activo ? "border-azul-300 bg-azul-50/60 shadow-xs" : "border-border-strong bg-card hover:border-azul-200",
        bloqueado ? "cursor-default" : "cursor-pointer has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/15",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
          activo ? "bg-gradient-brand text-white shadow-brand" : "bg-muted text-noche-500",
        )}
      >
        <Icon className="size-5" strokeWidth={1.9} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[15px] font-semibold text-foreground">{titulo}</span>
          {bloqueado ? (
            <Badge tone="azul" size="sm">
              Incluido
            </Badge>
          ) : activo ? (
            <Badge tone="verde" size="sm" dot>
              Solicitado
            </Badge>
          ) : null}
        </span>
        <span className="text-[13px] leading-snug text-muted-foreground">{texto}</span>
        <span className="text-xs font-medium text-azul-700">{norma}</span>
      </span>
      <span className="pt-0.5">
        <Checkbox
          id={id}
          checked={activo}
          disabled={bloqueado}
          onChange={(e) => onCambiar?.(e.currentTarget.checked)}
          aria-describedby={`${id}-desc`}
        />
        <span id={`${id}-desc`} className="sr-only">
          {bloqueado ? "Servicio incluido en toda inscripción." : "Marcá para solicitar también este servicio."}
        </span>
      </span>
    </label>
  );
}

function Resumen({
  titulo,
  icon: Icon,
  onEditar,
  bloqueado,
  items,
}: {
  titulo: string;
  icon: LucideIcon;
  onEditar: () => void;
  bloqueado: boolean;
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-subtle/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
          <Icon className="size-4 text-azul-600" aria-hidden />
          {titulo}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEditar}
          disabled={bloqueado}
          aria-label={`Editar ${titulo.toLowerCase()}`}
        >
          <Pencil aria-hidden />
          Editar
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{it.label}</dt>
            <dd className="text-sm font-medium break-words text-foreground">{it.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* --- Asistente ---------------------------------------------------------- */

export type AsistenteInscripcionProps = {
  /** Correo de la cuenta (valor inicial del correo de la empresa). */
  emailCuenta: string;
  /** Nombre y apellido de la cuenta (valor inicial del titular). */
  nombreCuenta: string;
};

/** Solicitud de inscripción en el registro de prestadores, en cuatro pasos. */
export function AsistenteInscripcion({ emailCuenta, nombreCuenta }: AsistenteInscripcionProps) {
  const [estado, despachar, pendiente] = useAccion(solicitarInscripcion);
  const reducirMovimiento = useReducedMotion();
  const [paso, setPaso] = useState(0);
  const [maxAlcanzado, setMaxAlcanzado] = useState(0);
  const [errores, setErrores] = useState<Errores>({});
  // Campos editados desde la última respuesta del servidor (para ocultar sus errores ya corregidos).
  const [editados, setEditados] = useState<ReadonlySet<Campo>>(new Set());
  const [estadoVisto, setEstadoVisto] = useState(estado);
  const [v, setV] = useState<Valores>({
    nombre_comercial: "",
    titular: nombreCuenta,
    tipo_persona: "humana",
    cuit: "",
    cuit_confirmado: false,
    email: emailCuenta,
    telefono: "",
    domicilio_oficina: "",
    domicilio_deposito: "",
    deposito_exclusivo: false,
    habilitacion_numero: "",
    habilitacion_anio: "",
    habilita_tanques: false,
    acepta_ordenanza: false,
    observaciones: "",
  });

  // Respuesta nueva del servidor: llevar al primer paso con errores.
  if (estado !== estadoVisto) {
    setEstadoVisto(estado);
    setEditados(new Set());
    const conError = PASOS.findIndex((p) => p.campos.some((c) => (estado.errores?.[c]?.length ?? 0) > 0));
    if (conError >= 0) setPaso(conError);
  }

  const titulo = useRef<HTMLHeadingElement>(null);
  const montado = useRef(false);
  useEffect(() => {
    if (!montado.current) {
      montado.current = true;
      return;
    }
    titulo.current?.focus();
  }, [paso]);

  const error = (c: Campo): string | undefined => errores[c] ?? (editados.has(c) ? undefined : estado.errores?.[c]?.[0]);

  function cambiar<K extends Campo>(campo: K, valor: Valores[K]) {
    setV((prev) => {
      const sig = { ...prev, [campo]: valor };
      if (campo === "cuit") sig.cuit_confirmado = false;
      return sig;
    });
    // Confirmar el CUIT también resuelve el error del campo CUIT.
    const afectados: Campo[] = campo === "cuit_confirmado" ? ["cuit_confirmado", "cuit"] : [campo];
    setErrores((prev) => {
      if (!afectados.some((c) => prev[c])) return prev;
      const sig = { ...prev };
      for (const c of afectados) delete sig[c];
      return sig;
    });
    setEditados((prev) => (afectados.every((c) => prev.has(c)) ? prev : new Set([...prev, ...afectados])));
  }

  function irA(i: number) {
    setErrores({});
    setPaso(i);
  }

  function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pendiente) return;
    const errs = validarPaso(paso, v);
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      const primero = PASOS[paso].campos.find((c) => errs[c]);
      if (primero) document.getElementById(`insc-${primero}`)?.focus();
      return;
    }
    if (paso < ULTIMO) {
      setErrores({});
      setPaso(paso + 1);
      setMaxAlcanzado((m) => Math.max(m, paso + 1));
      return;
    }
    // Último paso: revalidar todo antes de enviar.
    for (let i = 0; i < PASOS.length; i++) {
      const errsPaso = validarPaso(i, v);
      if (Object.keys(errsPaso).length > 0) {
        setErrores(errsPaso);
        setPaso(i);
        return;
      }
    }
    const fd = aFormData(v);
    // La acción de useActionState se despacha dentro de una transición; `pendiente` refleja el envío
    // (deshabilita la navegación entre pasos y muestra el spinner del botón).
    startTransition(() => despachar(fd));
  }

  const cuitNormalizado = normalizarCuit(v.cuit);
  const cuitOk = cuitNormalizado ? cuitValido(cuitNormalizado) : null;
  const habilitacion =
    v.habilitacion_numero && v.habilitacion_anio ? `${Number(v.habilitacion_numero) || v.habilitacion_numero}/SHN/${v.habilitacion_anio}` : null;
  const P = PASOS[paso];
  const errorGeneral = estado.mensaje && !estado.ok && !estado.errores ? estado.mensaje : null;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      <IndicadorPasos paso={paso} maxAlcanzado={maxAlcanzado} bloqueado={pendiente} onIr={irA} />

      <form onSubmit={alEnviar} noValidate aria-describedby="insc-paso-desc">
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <p className="font-display text-xs font-semibold tracking-[0.12em] text-azul-600 uppercase">
            Paso {paso + 1} de {PASOS.length}
          </p>
          <h2 ref={titulo} tabIndex={-1} className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground outline-none">
            {P.titulo}
          </h2>
          <p id="insc-paso-desc" className="mt-1 text-sm text-muted-foreground">
            {P.descripcion}
          </p>
          {errorGeneral ? (
            <Alert tone="danger" title="No pudimos enviar la solicitud" className="mt-4">
              <span className="whitespace-pre-line">{errorGeneral}</span>
            </Alert>
          ) : null}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={paso}
            initial={{ opacity: 0, x: reducirMovimiento ? 0 : 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducirMovimiento ? 0 : -18 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="px-5 py-5 sm:px-6 sm:py-6"
          >
            {paso === 0 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  htmlFor="insc-nombre_comercial"
                  label="Nombre comercial"
                  required
                  hint="Como figura en tu publicidad y en los certificados."
                  error={error("nombre_comercial")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="insc-nombre_comercial"
                    name="nombre_comercial"
                    autoComplete="organization"
                    placeholder="Ej.: Fumigaciones del Norte"
                    maxLength={120}
                    value={v.nombre_comercial}
                    onChange={(e) => cambiar("nombre_comercial", e.currentTarget.value)}
                    leading={<Building2 aria-hidden />}
                  />
                </Field>

                <fieldset className="flex flex-col gap-2 sm:col-span-2">
                  <legend className="mb-2 inline-flex items-center gap-1 text-sm leading-none font-medium text-foreground">
                    Tipo de persona
                    <span className="text-danger" aria-hidden>
                      *
                    </span>
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {TIPOS_PERSONA.map((op) => {
                      const elegido = v.tipo_persona === op.valor;
                      return (
                        <label
                          key={op.valor}
                          className={cn(
                            "relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-[border-color,background-color,box-shadow] duration-150",
                            "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/15",
                            elegido ? "border-azul-500 bg-azul-50/70 ring-1 ring-azul-500" : "border-border-strong hover:border-azul-300",
                          )}
                        >
                          <input
                            type="radio"
                            name="tipo_persona"
                            value={op.valor}
                            checked={elegido}
                            onChange={() => cambiar("tipo_persona", op.valor)}
                            className="sr-only"
                          />
                          <span
                            aria-hidden
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                              elegido ? "bg-azul-600 text-white" : "bg-muted text-noche-500",
                            )}
                          >
                            <op.icon className="size-[18px]" />
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5 pr-6">
                            <span className="text-sm font-semibold text-foreground">{op.titulo}</span>
                            <span className="text-[13px] leading-snug text-muted-foreground">{op.texto}</span>
                          </span>
                          {elegido ? (
                            <CircleCheck className="absolute top-3 right-3 size-[18px] text-azul-600" aria-hidden />
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <Field
                  htmlFor="insc-titular"
                  label={v.tipo_persona === "juridica" ? "Razón social" : "Titular (nombre y apellido)"}
                  required
                  hint={v.tipo_persona === "juridica" ? "Tal como figura en ARCA." : "Persona responsable ante la Dirección."}
                  error={error("titular")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="insc-titular"
                    name="titular"
                    autoComplete={v.tipo_persona === "juridica" ? "organization" : "name"}
                    placeholder={v.tipo_persona === "juridica" ? "Ej.: Fumigaciones del Norte S.R.L." : "Ej.: María José Pérez"}
                    maxLength={160}
                    value={v.titular}
                    onChange={(e) => cambiar("titular", e.currentTarget.value)}
                  />
                </Field>

                <div className="flex flex-col gap-3 sm:col-span-2">
                  <Field
                    htmlFor="insc-cuit"
                    label="CUIT"
                    required
                    hint={
                      cuitOk === true ? (
                        <span className="inline-flex items-center gap-1 font-medium text-success">
                          <CircleCheck className="size-3.5" aria-hidden /> CUIT válido: {cuitNormalizado}
                        </span>
                      ) : (
                        "11 dígitos, con o sin guiones. Lo normalizamos al formato 20-12345678-9."
                      )
                    }
                    error={error("cuit")}
                  >
                    <Input
                      id="insc-cuit"
                      name="cuit"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="30-12345678-9"
                      maxLength={13}
                      className="nums-tabular"
                      value={v.cuit}
                      onChange={(e) => cambiar("cuit", e.currentTarget.value)}
                      onBlur={() => {
                        const n = normalizarCuit(v.cuit);
                        if (n && n !== v.cuit) setV((prev) => ({ ...prev, cuit: n }));
                      }}
                      trailing={
                        cuitOk === true ? (
                          <CircleCheck className="text-success" aria-hidden />
                        ) : cuitOk === false ? (
                          <TriangleAlert className="text-warning" aria-hidden />
                        ) : null
                      }
                    />
                  </Field>
                  {cuitOk === false ? (
                    <Alert tone="warning" title="El dígito verificador no coincide">
                      <p>
                        El CUIT {cuitNormalizado} no pasa la validación. Revisalo con tu constancia de ARCA; si es correcto,
                        confirmalo para continuar.
                      </p>
                      <Checkbox
                        id="insc-cuit_confirmado"
                        wrapperClassName="mt-3"
                        checked={v.cuit_confirmado}
                        onChange={(e) => cambiar("cuit_confirmado", e.currentTarget.checked)}
                        label="Revisé el número y es correcto"
                      />
                    </Alert>
                  ) : null}
                </div>

                <Field htmlFor="insc-email" label="Correo de la empresa" required error={error("email")}>
                  <Input
                    id="insc-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={160}
                    value={v.email}
                    onChange={(e) => cambiar("email", e.currentTarget.value)}
                    leading={<Mail aria-hidden />}
                  />
                </Field>
                <Field htmlFor="insc-telefono" label="Teléfono" required hint="Con código de área." error={error("telefono")}>
                  <Input
                    id="insc-telefono"
                    name="telefono"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="381 4123456"
                    maxLength={30}
                    value={v.telefono}
                    onChange={(e) => cambiar("telefono", e.currentTarget.value)}
                    leading={<Phone aria-hidden />}
                  />
                </Field>
              </div>
            ) : null}

            {paso === 1 ? (
              <div className="flex flex-col gap-5">
                <Field
                  htmlFor="insc-domicilio_oficina"
                  label="Domicilio de la oficina"
                  required
                  hint="Calle, número, piso/oficina y barrio. Es donde la Dirección te notifica."
                  error={error("domicilio_oficina")}
                >
                  <Input
                    id="insc-domicilio_oficina"
                    name="domicilio_oficina"
                    autoComplete="street-address"
                    placeholder="Ej.: San Juan 1234, Barrio Centro"
                    maxLength={200}
                    value={v.domicilio_oficina}
                    onChange={(e) => cambiar("domicilio_oficina", e.currentTarget.value)}
                    leading={<Building2 aria-hidden />}
                  />
                </Field>

                <div className="flex flex-col gap-2">
                  <Field
                    htmlFor="insc-domicilio_deposito"
                    label="Domicilio del depósito de químicos"
                    required
                    hint="Lugar donde guardás los productos y equipos. Se inspecciona una vez por año (Art. 10.º d)."
                    error={error("domicilio_deposito")}
                  >
                    <Input
                      id="insc-domicilio_deposito"
                      name="domicilio_deposito"
                      placeholder="Ej.: Av. Brígido Terán 850, galpón 3"
                      maxLength={200}
                      value={v.domicilio_deposito}
                      onChange={(e) => cambiar("domicilio_deposito", e.currentTarget.value)}
                      leading={<Warehouse aria-hidden />}
                    />
                  </Field>
                  {v.domicilio_oficina.trim() && v.domicilio_oficina !== v.domicilio_deposito ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="w-fit"
                      onClick={() => cambiar("domicilio_deposito", v.domicilio_oficina)}
                    >
                      <Copy aria-hidden />
                      Usar el mismo domicilio de la oficina
                    </Button>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "rounded-2xl border p-4 transition-colors",
                    error("deposito_exclusivo") ? "border-red-200 bg-danger-soft" : "border-azul-100 bg-azul-50/60",
                  )}
                >
                  <Checkbox
                    id="insc-deposito_exclusivo"
                    checked={v.deposito_exclusivo}
                    onChange={(e) => cambiar("deposito_exclusivo", e.currentTarget.checked)}
                    aria-invalid={error("deposito_exclusivo") ? true : undefined}
                    aria-describedby={error("deposito_exclusivo") ? "insc-deposito_exclusivo-error" : undefined}
                    label="El depósito cuenta con un espacio exclusivo para productos químicos"
                    description="Ord. 2681/98, Art. 6.º: la empresa debe tener local de oficina y depósito de químicos con espacio exclusivo, ambos declarados. Un cambio de domicilio posterior requiere libre deuda."
                  />
                  {error("deposito_exclusivo") ? (
                    <p id="insc-deposito_exclusivo-error" role="alert" className="mt-2 pl-7 text-[13px] font-medium text-danger">
                      {error("deposito_exclusivo")}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {paso === 2 ? (
              <div className="flex flex-col gap-6">
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 inline-flex items-center gap-1 text-sm leading-none font-medium text-foreground">
                    Habilitación comercial municipal
                    <span className="text-danger" aria-hidden>
                      *
                    </span>
                  </legend>
                  <div className="flex items-center gap-2">
                    <Input
                      id="insc-habilitacion_numero"
                      name="habilitacion_numero"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="N.º"
                      aria-label="Número de habilitación comercial"
                      aria-invalid={error("habilitacion_numero") ? true : undefined}
                      aria-describedby={error("habilitacion_numero") ? "insc-habilitacion-ayuda insc-habilitacion-error" : "insc-habilitacion-ayuda"}
                      maxLength={7}
                      className="nums-tabular"
                      wrapperClassName="flex-1"
                      value={v.habilitacion_numero}
                      onChange={(e) => cambiar("habilitacion_numero", soloDigitos(e.currentTarget.value))}
                    />
                    <span className="shrink-0 rounded-lg bg-muted px-2.5 py-2 font-mono text-sm font-semibold text-noche-600" aria-hidden>
                      /SHN/
                    </span>
                    <Input
                      id="insc-habilitacion_anio"
                      name="habilitacion_anio"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Año"
                      aria-label="Año de la habilitación comercial"
                      aria-invalid={error("habilitacion_anio") ? true : undefined}
                      aria-describedby={error("habilitacion_anio") ? "insc-habilitacion-ayuda insc-habilitacion-error" : "insc-habilitacion-ayuda"}
                      maxLength={4}
                      className="nums-tabular w-24"
                      value={v.habilitacion_anio}
                      onChange={(e) => cambiar("habilitacion_anio", soloDigitos(e.currentTarget.value))}
                    />
                  </div>
                  <p id="insc-habilitacion-ayuda" className="text-[13px] leading-snug text-muted-foreground">
                    Como figura en tu habilitación comercial (Secretaría de Hacienda), por ejemplo 10052/SHN/2026.
                    {habilitacion ? (
                      <>
                        {" "}
                        Vas a declarar:{" "}
                        <strong className="font-mono font-semibold text-azul-700">{habilitacion}</strong>
                      </>
                    ) : null}
                  </p>
                  {error("habilitacion_numero") || error("habilitacion_anio") ? (
                    <p id="insc-habilitacion-error" role="alert" className="text-[13px] font-medium text-danger">
                      {error("habilitacion_numero") ?? error("habilitacion_anio")}
                    </p>
                  ) : null}
                </fieldset>

                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-1 text-sm font-medium text-foreground">Servicios que vas a prestar</legend>
                  <TarjetaServicio
                    id="insc-fumigacion"
                    icon={SprayCan}
                    titulo="Fumigación, desinfección y control de plagas"
                    norma="Ord. 2681/98 (t.o. Ord. 3737/06)"
                    texto="Desratización, desinsectación y desinfección en todos los rubros del Anexo. Se incluye en toda inscripción."
                    activo
                    bloqueado
                  />
                  <TarjetaServicio
                    id="insc-habilita_tanques"
                    icon={Droplets}
                    titulo="Limpieza y desinfección de tanques"
                    norma="Ord. 2004/92 (t.o. Ord. 3098/01)"
                    texto="Tanques de reserva y cisternas, con certificado cada 180 días. Opcional."
                    activo={v.habilita_tanques}
                    onCambiar={(valor) => cambiar("habilita_tanques", valor)}
                  />
                </fieldset>
              </div>
            ) : null}

            {paso === 3 ? (
              <div className="flex flex-col gap-4">
                <Resumen
                  titulo="Empresa"
                  icon={Building2}
                  onEditar={() => irA(0)}
                  bloqueado={pendiente}
                  items={[
                    { label: "Nombre comercial", value: v.nombre_comercial },
                    { label: v.tipo_persona === "juridica" ? "Razón social" : "Titular", value: v.titular },
                    { label: "Tipo de persona", value: v.tipo_persona === "juridica" ? "Persona jurídica" : "Persona humana" },
                    {
                      label: "CUIT",
                      value: (
                        <span className="inline-flex items-center gap-1.5 nums-tabular">
                          {cuitNormalizado ?? v.cuit}
                          {cuitOk === false ? (
                            <Badge tone="ambar" size="sm">
                              Confirmado por vos
                            </Badge>
                          ) : null}
                        </span>
                      ),
                    },
                    { label: "Correo", value: v.email },
                    { label: "Teléfono", value: v.telefono },
                  ]}
                />
                <Resumen
                  titulo="Domicilios"
                  icon={MapPin}
                  onEditar={() => irA(1)}
                  bloqueado={pendiente}
                  items={[
                    { label: "Oficina", value: v.domicilio_oficina },
                    { label: "Depósito de químicos", value: v.domicilio_deposito },
                  ]}
                />
                <Resumen
                  titulo="Habilitación y servicios"
                  icon={BadgeCheck}
                  onEditar={() => irA(2)}
                  bloqueado={pendiente}
                  items={[
                    { label: "Habilitación comercial", value: <span className="font-mono">{habilitacion}</span> },
                    {
                      label: "Servicios",
                      value: (
                        <span className="flex flex-wrap gap-1.5">
                          <Badge tone="azul" size="sm">
                            Fumigación
                          </Badge>
                          {v.habilita_tanques ? (
                            <Badge tone="celeste" size="sm">
                              Limpieza de tanques
                            </Badge>
                          ) : null}
                        </span>
                      ),
                    },
                  ]}
                />

                <Field
                  htmlFor="insc-observaciones"
                  label="Comentarios para la Dirección"
                  hint="Opcional. Por ejemplo, horarios para coordinar la inspección."
                  error={error("observaciones")}
                >
                  <Textarea
                    id="insc-observaciones"
                    name="observaciones"
                    rows={3}
                    maxLength={160}
                    value={v.observaciones}
                    onChange={(e) => cambiar("observaciones", e.currentTarget.value)}
                  />
                </Field>

                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-4 sm:p-5",
                    error("acepta_ordenanza") ? "border-red-200 bg-danger-soft" : "ring-gradient-brand",
                  )}
                >
                  <p className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                    <ShieldCheck className="size-4 text-azul-600" aria-hidden />
                    Declaración jurada
                  </p>
                  <ul className="mb-4 flex list-disc flex-col gap-1 pl-5 text-[13px] leading-relaxed text-noche-600">
                    <li>Conozco la Ordenanza N.º 2681/98 (t.o. Ord. 3737/06) y me comprometo a cumplirla.</li>
                    <li>Cuento con oficina y depósito de químicos con espacio exclusivo (Art. 6.º).</li>
                    <li>
                      Cuento con el equipo mínimo: titular con carnet de sanidad, mochila pulverizadora y equipo completo de
                      seguridad (Art. 7.º).
                    </li>
                    <li>Voy a declarar cada servicio entre 24 y 48 horas antes de realizarlo (Art. 9.º).</li>
                    <li>Los datos de esta solicitud son verdaderos.</li>
                  </ul>
                  <Checkbox
                    id="insc-acepta_ordenanza"
                    checked={v.acepta_ordenanza}
                    onChange={(e) => cambiar("acepta_ordenanza", e.currentTarget.checked)}
                    aria-invalid={error("acepta_ordenanza") ? true : undefined}
                    aria-describedby={error("acepta_ordenanza") ? "insc-acepta_ordenanza-error" : undefined}
                    label="Acepto y firmo esta declaración jurada"
                  />
                  {error("acepta_ordenanza") ? (
                    <p id="insc-acepta_ordenanza-error" role="alert" className="mt-2 pl-7 text-[13px] font-medium text-danger">
                      {error("acepta_ordenanza")}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-subtle/70 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => irA(paso - 1)}
            disabled={paso === 0 || pendiente}
            className={cn(paso === 0 && "invisible")}
          >
            <ArrowLeft aria-hidden />
            Anterior
          </Button>
          {paso < ULTIMO ? (
            <Button type="submit">
              Siguiente
              <ArrowRight aria-hidden />
            </Button>
          ) : (
            // El envío no usa `<form action>` (se arma el FormData con los cuatro pasos), así que el estado
            // pendiente sale de useActionState y no de useFormStatus (SubmitButton no lo vería).
            <Button type="submit" variant="sol" loading={pendiente}>
              {pendiente ? null : <Send aria-hidden />}
              {pendiente ? "Enviando solicitud…" : "Enviar solicitud"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
