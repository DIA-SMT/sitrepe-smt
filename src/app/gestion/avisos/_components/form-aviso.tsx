"use client";

import { useId, useMemo, useState } from "react";
import { Building, Building2, Megaphone, Search, Send } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ESTADO_EMPRESA } from "@/lib/domain/etiquetas";
import { Constants, type Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { useEnvio } from "../../configuracion/_compartido/use-envio";
import { enviarAviso } from "../actions";
import { ESTILO_NIVEL, type NivelAviso } from "./niveles";

type OpcionEmpresa = Pick<Tables<"empresas">, "id" | "nombre_comercial" | "numero_registro" | "estado" | "cuit">;

const MAX_CUERPO = 2000;

/** Redacción de un aviso con vista previa de cómo lo verá la empresa. */
export function FormAviso({ empresas, empresaInicial }: { empresas: OpcionEmpresa[]; empresaInicial?: string }) {
  const id = useId();
  const inicialValida = empresas.some((e) => e.id === empresaInicial) ? empresaInicial : undefined;
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [nivel, setNivel] = useState<NivelAviso>("info");
  const [destino, setDestino] = useState<"todas" | "empresa">(inicialValida ? "empresa" : "todas");
  const [empresaId, setEmpresaId] = useState(inicialValida ?? "");
  const [filtro, setFiltro] = useState("");

  const [estado, despachar, pendiente] = useAccion(enviarAviso, {
    alExito: () => {
      setTitulo("");
      setCuerpo("");
      setNivel("info");
    },
  });
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];
  const f = (campo: string) => `${id}-${campo}`;

  const habilitadas = empresas.filter((e) => e.estado === "habilitada").length;
  const empresa = empresas.find((e) => e.id === empresaId);
  const opciones = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    if (!t) return empresas;
    return empresas.filter(
      (e) =>
        e.id === empresaId ||
        e.nombre_comercial.toLowerCase().includes(t) ||
        e.cuit.includes(t) ||
        String(e.numero_registro ?? "").includes(t),
    );
  }, [empresas, filtro, empresaId]);

  const estilo = ESTILO_NIVEL[nivel];
  const IconoNivel = estilo.icono;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="destino" value={destino} />
      <input type="hidden" name="nivel" value={nivel} />

      {estado.mensaje && !estado.ok && !estado.errores ? (
        <Alert tone="danger" title="No se pudo enviar el aviso">
          {estado.mensaje}
        </Alert>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Destinatario</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <OpcionTarjeta
            activa={destino === "todas"}
            onClick={() => setDestino("todas")}
            icono={<Building2 className="size-5" aria-hidden />}
            titulo="Todas las empresas"
            detalle={`${empresas.length} en el padrón · ${habilitadas} habilitadas`}
          />
          <OpcionTarjeta
            activa={destino === "empresa"}
            onClick={() => setDestino("empresa")}
            icono={<Building className="size-5" aria-hidden />}
            titulo="Una empresa"
            detalle={empresa ? empresa.nombre_comercial : "Elegila del padrón"}
          />
        </div>
      </fieldset>

      {destino === "empresa" ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-subtle p-3 animate-fade-in">
          <Input
            type="search"
            aria-label="Filtrar empresas"
            placeholder="Filtrá por nombre, CUIT o N.º de registro"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            leading={<Search aria-hidden />}
          />
          <Field htmlFor={f("empresa")} label="Empresa" required error={error("empresa_id")}>
            <Select
              id={f("empresa")}
              name="empresa_id"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              placeholder={opciones.length ? "Seleccioná una empresa" : "Ninguna empresa coincide"}
            >
              {opciones.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.numero_registro ? `N.º ${e.numero_registro} · ` : ""}
                  {e.nombre_comercial}
                  {e.estado !== "habilitada" ? ` (${ESTADO_EMPRESA[e.estado].label.toLowerCase()})` : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Nivel</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {Constants.public.Enums.nivel_aviso.map((n) => {
            const e = ESTILO_NIVEL[n];
            const Icono = e.icono;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={nivel === n}
                onClick={() => setNivel(n)}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  nivel === n ? cn(e.borde, e.fondo, "shadow-xs ring-1 ring-inset", e.borde) : "border-border bg-card hover:border-border-strong",
                )}
              >
                <span className={cn("flex size-7 items-center justify-center rounded-lg ring-1", e.icon)}>
                  <Icono className="size-4" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-foreground">{e.etiqueta}</span>
                <span className="text-xs leading-snug text-muted-foreground">{e.ayuda}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field htmlFor={f("titulo")} label="Título" required error={error("titulo")}>
        <Input
          id={f("titulo")}
          name="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={120}
          placeholder="Ej.: Vencimiento de la DDJJ anual"
          required
        />
      </Field>

      <Field
        htmlFor={f("cuerpo")}
        label="Mensaje"
        required
        error={error("cuerpo")}
        hint={`${cuerpo.length}/${MAX_CUERPO} caracteres. Las empresas lo leen en su panel, sección Avisos.`}
      >
        <Textarea
          id={f("cuerpo")}
          name="cuerpo"
          rows={5}
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          maxLength={MAX_CUERPO}
          placeholder="Escribí el mensaje con los datos concretos: qué, hasta cuándo y cómo cumplir."
          required
        />
      </Field>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Así lo verá la empresa</p>
        <div className={cn("relative flex gap-3 overflow-hidden rounded-xl border bg-card p-4 shadow-xs", estilo.borde)}>
          <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", estilo.acento)} />
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg ring-1", estilo.icon)}>
            <IconoNivel className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={cn("font-semibold leading-snug", titulo ? "text-foreground" : "text-muted-foreground/60")}>
              {titulo || "Título del aviso"}
            </p>
            <p
              className={cn(
                "mt-1 text-sm leading-relaxed whitespace-pre-line",
                cuerpo ? "text-foreground/85" : "text-muted-foreground/60",
              )}
            >
              {cuerpo || "El mensaje aparece acá."}
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" size="lg" loading={pendiente} variant={nivel === "urgente" ? "danger" : "primary"}>
        {pendiente ? null : <Send aria-hidden />}
        {destino === "todas" ? "Enviar a todas las empresas" : empresa ? `Enviar a ${empresa.nombre_comercial}` : "Enviar aviso"}
      </Button>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Megaphone className="size-3.5 text-azul-600" aria-hidden />
        El envío queda registrado en la auditoría con tu usuario.
      </p>
    </form>
  );
}

function OpcionTarjeta({
  activa,
  onClick,
  icono,
  titulo,
  detalle,
}: {
  activa: boolean;
  onClick: () => void;
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        activa ? "border-azul-300 bg-azul-50/70 ring-1 ring-azul-300 ring-inset" : "border-border bg-card hover:border-border-strong",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          activa ? "bg-gradient-brand text-white shadow-brand" : "bg-muted text-muted-foreground",
        )}
      >
        {icono}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold text-foreground">{titulo}</span>
        <span className="truncate text-xs text-muted-foreground">{detalle}</span>
      </span>
    </button>
  );
}
