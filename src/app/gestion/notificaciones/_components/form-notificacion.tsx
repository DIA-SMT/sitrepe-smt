"use client";

import { startTransition, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Bug,
  CalendarClock,
  Droplets,
  FileText,
  HandHelping,
  MessageSquareText,
  Send,
  Store,
  Timer,
  UserRound,
} from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EntidadOpcion, Inspector } from "@/lib/data/intimaciones";
import { PLAZO_NOTIFICACION, TIPO_NOTIFICACION } from "@/lib/domain/etiquetas";
import { fechaHoraLocalAISO, formatFechaHora, isoAFechaHoraLocal } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { crearNotificacion } from "../actions";
import { BuscadorEntidad, type TipoEntidad } from "./buscador-entidad";
import { sumarDiasHabiles } from "./dias-habiles";
import { GrupoOpciones, type OpcionTarjeta } from "./grupo-opciones";
import { DESCRIPCION_TIPO, DIAS_HABILES_PLAZO, EXPLICACION_PLAZO } from "./textos";
import { VistaPreviaNotificacion } from "./vista-previa-notificacion";

type Tipo = Enums<"tipo_notificacion">;
type Plazo = Enums<"plazo_notificacion">;

const OPCIONES_TIPO: OpcionTarjeta<Tipo>[] = [
  { valor: "tanques", titulo: TIPO_NOTIFICACION.tanques.label, descripcion: DESCRIPCION_TIPO.tanques, icono: Droplets, tono: "celeste" },
  { valor: "fumigacion", titulo: TIPO_NOTIFICACION.fumigacion.label, descripcion: DESCRIPCION_TIPO.fumigacion, icono: Bug, tono: "azul" },
  {
    valor: "documentacion",
    titulo: TIPO_NOTIFICACION.documentacion.label,
    descripcion: DESCRIPCION_TIPO.documentacion,
    icono: FileText,
    tono: "violeta",
  },
  { valor: "general", titulo: TIPO_NOTIFICACION.general.label, descripcion: DESCRIPCION_TIPO.general, icono: MessageSquareText, tono: "neutral" },
];

const OPCIONES_PLAZO: OpcionTarjeta<Plazo>[] = [
  {
    valor: "cinco_dias_habiles",
    titulo: PLAZO_NOTIFICACION.cinco_dias_habiles.label,
    descripcion: EXPLICACION_PLAZO.cinco_dias_habiles,
    icono: CalendarClock,
    tono: "azul",
  },
  {
    valor: "cuarenta_ocho_horas_habiles",
    titulo: PLAZO_NOTIFICACION.cuarenta_ocho_horas_habiles.label,
    descripcion: EXPLICACION_PLAZO.cuarenta_ocho_horas_habiles,
    icono: Timer,
    tono: "ambar",
  },
];

type FormNotificacionProps = {
  establecimientoInicial: EntidadOpcion | null;
  empresaInicial: EntidadOpcion | null;
  tipoInicial: Tipo;
  plazoInicial: Plazo;
  inspectores: Inspector[];
  inspectorPorDefecto: string | null;
  feriados: string[];
  /** Fecha y hora actual en formato datetime-local (Tucumán). */
  ahoraLocal: string;
  anio: number;
};

type Datos = {
  razon_social: string;
  rubro: string;
  cuit: string;
  domicilio: string;
  orden_trabajo: string;
  observaciones: string;
  persona_notificada: string;
  dni_notificado: string;
  notificada_at: string;
};

function datosDe(e: EntidadOpcion | null): Pick<Datos, "razon_social" | "rubro" | "cuit" | "domicilio"> {
  return {
    razon_social: e?.nombre ?? "",
    rubro: e?.rubro ?? "",
    cuit: e?.cuit ?? "",
    domicilio: e?.domicilio ?? "",
  };
}

export function FormNotificacion({
  establecimientoInicial,
  empresaInicial,
  tipoInicial,
  plazoInicial,
  inspectores,
  inspectorPorDefecto,
  feriados,
  ahoraLocal,
  anio,
}: FormNotificacionProps) {
  const router = useRouter();
  const [modo, setModo] = useState<TipoEntidad>(empresaInicial && !establecimientoInicial ? "empresa" : "establecimiento");
  const [establecimiento, setEstablecimiento] = useState(establecimientoInicial);
  const [empresa, setEmpresa] = useState(empresaInicial);
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [plazo, setPlazo] = useState<Plazo>(plazoInicial);
  const [inspector, setInspector] = useState(inspectorPorDefecto ?? "");
  const [notificarAhora, setNotificarAhora] = useState(false);
  const [datos, setDatos] = useState<Datos>({
    ...datosDe(modo === "empresa" ? empresaInicial : establecimientoInicial),
    orden_trabajo: "",
    observaciones: "",
    persona_notificada: "",
    dni_notificado: "",
    notificada_at: ahoraLocal,
  });

  const [estado, despachar, pendiente] = useAccion<{ id: string }>(crearNotificacion, {
    alExito: (e) => {
      if (e.datos?.id) router.push(`/gestion/notificaciones/${e.datos.id}`);
    },
  });
  const err = (campo: string) => estado.errores?.[campo]?.[0];

  const set = (campo: keyof Datos) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const seleccionarEntidad = (opcion: EntidadOpcion | null) => {
    if (modo === "empresa") setEmpresa(opcion);
    else setEstablecimiento(opcion);
    if (opcion) setDatos((d) => ({ ...d, ...datosDe(opcion) }));
  };

  const cambiarModo = (nuevo: TipoEntidad) => {
    if (nuevo === modo) return;
    setModo(nuevo);
    const entidad = nuevo === "empresa" ? empresa : establecimiento;
    setDatos((d) => ({ ...d, ...datosDe(entidad) }));
    if (nuevo === "empresa" && tipo === "tanques") setTipo("documentacion");
  };

  const feriadosSet = useMemo(() => new Set(feriados), [feriados]);
  const vencimientoPrevisto = useMemo(() => {
    if (!notificarAhora || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(datos.notificada_at)) return null;
    const desde = new Date(fechaHoraLocalAISO(datos.notificada_at)).getTime();
    if (Number.isNaN(desde)) return null;
    return new Date(sumarDiasHabiles(desde, DIAS_HABILES_PLAZO[plazo], feriadosSet)).toISOString();
  }, [notificarAhora, datos.notificada_at, plazo, feriadosSet]);

  const entidadActual = modo === "empresa" ? empresa : establecimiento;
  const requiereObservaciones = tipo === "documentacion" || tipo === "general";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => despachar(fd));
      }}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        {/* 1 · Destinatario */}
        <SectionCard
          title="Destinatario"
          description="Elegí el establecimiento del padrón: los datos se completan solos y podés corregirlos."
          icon={modo === "empresa" ? Building2 : Store}
        >
          <div className="flex flex-col gap-5">
            <div role="group" aria-label="Tipo de destinatario" className="inline-flex w-fit gap-1 rounded-xl bg-muted p-1">
              {(
                [
                  { valor: "establecimiento", label: "Establecimiento", icono: Store },
                  { valor: "empresa", label: "Empresa prestadora", icono: Building2 },
                ] as const
              ).map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  aria-pressed={modo === o.valor}
                  onClick={() => cambiarModo(o.valor)}
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-all",
                    modo === o.valor
                      ? "bg-card text-azul-700 shadow-[0_1px_3px_rgb(10_26_63/0.14)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <o.icono className="size-4" aria-hidden />
                  {o.label}
                </button>
              ))}
            </div>

            {modo === "establecimiento" ? (
              <BuscadorEntidad
                key="establecimiento"
                tipo="establecimiento"
                name="establecimiento_id"
                label="Establecimiento"
                hint={
                  <>
                    Si no figura en el padrón, completá los datos a mano o{" "}
                    <Link href="/gestion/establecimientos" className="font-medium text-azul-700 hover:underline">
                      dalo de alta en Establecimientos
                    </Link>{" "}
                    (lo vas a necesitar si después hay que labrar un acta).
                  </>
                }
                valor={establecimiento}
                onCambio={seleccionarEntidad}
                error={err("establecimiento_id")}
              />
            ) : (
              <BuscadorEntidad
                key="empresa"
                tipo="empresa"
                name="empresa_id"
                label="Empresa prestadora"
                hint="La empresa podrá ver esta notificación desde su panel."
                valor={empresa}
                onCambio={seleccionarEntidad}
                error={err("empresa_id")}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="razon_social" label="Razón social" required error={err("razon_social")} className="sm:col-span-2">
                <Input
                  id="razon_social"
                  name="razon_social"
                  value={datos.razon_social}
                  onChange={set("razon_social")}
                  placeholder="Ej.: Supermercado El Sol S.R.L."
                  autoComplete="off"
                />
              </Field>
              <Field htmlFor="rubro" label="Rubro" error={err("rubro")}>
                <Input id="rubro" name="rubro" value={datos.rubro} onChange={set("rubro")} placeholder="Ej.: Supermercado" />
              </Field>
              <Field htmlFor="cuit" label="CUIT" error={err("cuit")} hint="11 dígitos, con o sin guiones.">
                <Input
                  id="cuit"
                  name="cuit"
                  value={datos.cuit}
                  onChange={set("cuit")}
                  inputMode="numeric"
                  placeholder="30-12345678-9"
                  className="nums-tabular"
                />
              </Field>
              <Field htmlFor="domicilio" label="Domicilio" required error={err("domicilio")} className="sm:col-span-2">
                <Input
                  id="domicilio"
                  name="domicilio"
                  value={datos.domicilio}
                  onChange={set("domicilio")}
                  placeholder="Calle, número y barrio"
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* 2 · Intimación */}
        <SectionCard title="Intimación" description="Qué debe presentar el destinatario y en qué plazo." icon={FileText}>
          <div className="flex flex-col gap-6">
            <GrupoOpciones
              name="tipo"
              legend="Tipo de notificación"
              opciones={OPCIONES_TIPO}
              valor={tipo}
              onCambio={setTipo}
              error={err("tipo")}
              required
            />
            <GrupoOpciones
              name="plazo"
              legend="Plazo"
              opciones={OPCIONES_PLAZO}
              valor={plazo}
              onCambio={setPlazo}
              error={err("plazo")}
              required
            />
            <Alert tone="info" className="py-3">
              El plazo se cuenta en días hábiles (sin sábados, domingos ni feriados) desde el momento en que se entrega la
              notificación. La base calcula y guarda el vencimiento.
            </Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="orden_trabajo" label="O.T. (orden de trabajo)" error={err("orden_trabajo")} hint="Opcional.">
                <Input
                  id="orden_trabajo"
                  name="orden_trabajo"
                  value={datos.orden_trabajo}
                  onChange={set("orden_trabajo")}
                  placeholder="Ej.: OT-1024"
                />
              </Field>
              <Field htmlFor="inspector_id" label="Inspector/a a cargo" error={err("inspector_id")}>
                <Select id="inspector_id" name="inspector_id" value={inspector} onChange={(e) => setInspector(e.target.value)}>
                  <option value="">Yo (usuario actual)</option>
                  {inspectores.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre}
                      {i.rol !== "inspector" ? ` · ${i.rol === "admin" ? "Administración" : "Control"}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                htmlFor="observaciones"
                label="Observaciones"
                required={requiereObservaciones}
                error={err("observaciones")}
                hint={
                  requiereObservaciones
                    ? "Detallá qué documentación o regularización se exige: se imprime en la notificación."
                    : "Se imprimen en la notificación (opcional)."
                }
                className="sm:col-span-2"
              >
                <Textarea
                  id="observaciones"
                  name="observaciones"
                  value={datos.observaciones}
                  onChange={set("observaciones")}
                  rows={3}
                  placeholder="Ej.: Se constató tanque de reserva sin certificado de limpieza a la vista."
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* 3 · Entrega */}
        <SectionCard
          title="Entrega en mano"
          description="Si la entregás ahora, registrá quién la recibe: el plazo empieza a correr en ese momento."
          icon={HandHelping}
        >
          <div className="flex flex-col gap-5">
            <Checkbox
              name="notificar_ahora"
              checked={notificarAhora}
              onChange={(e) => {
                const marcado = e.target.checked;
                setNotificarAhora(marcado);
                // La página puede llevar un rato abierta: si no se tocó la hora, se propone la de este momento.
                if (marcado) {
                  setDatos((d) =>
                    d.notificada_at === ahoraLocal ? { ...d, notificada_at: isoAFechaHoraLocal(new Date()) } : d,
                  );
                }
              }}
              label="Notificar ahora"
              description="Dejala sin marcar para emitirla e imprimirla antes de salir a terreno."
            />
            {notificarAhora ? (
              <div className="grid gap-4 animate-fade-in sm:grid-cols-2">
                <Field htmlFor="persona_notificada" label="Persona notificada" required error={err("persona_notificada")}>
                  <Input
                    id="persona_notificada"
                    name="persona_notificada"
                    value={datos.persona_notificada}
                    onChange={set("persona_notificada")}
                    placeholder="Nombre y apellido"
                    leading={<UserRound aria-hidden />}
                    autoComplete="off"
                  />
                </Field>
                <Field htmlFor="dni_notificado" label="DNI" required error={err("dni_notificado")}>
                  <Input
                    id="dni_notificado"
                    name="dni_notificado"
                    value={datos.dni_notificado}
                    onChange={set("dni_notificado")}
                    inputMode="numeric"
                    placeholder="Sin puntos"
                    className="nums-tabular"
                    autoComplete="off"
                  />
                </Field>
                <Field htmlFor="notificada_at" label="Fecha y hora" required error={err("notificada_at")}>
                  <Input
                    id="notificada_at"
                    name="notificada_at"
                    type="datetime-local"
                    value={datos.notificada_at}
                    onChange={set("notificada_at")}
                  />
                </Field>
                <div className="flex flex-col justify-end">
                  <div className="rounded-xl border border-azul-100 bg-azul-50/70 px-4 py-3 text-sm">
                    <p className="text-xs font-medium tracking-wide text-azul-700 uppercase">Vencimiento previsto</p>
                    <p className="mt-0.5 font-display text-base font-semibold text-azul-900">
                      {vencimientoPrevisto ? formatFechaHora(vencimientoPrevisto) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button asChild variant="ghost">
            <Link href="/gestion/notificaciones">Cancelar</Link>
          </Button>
          {/* Tras emitirla se navega al detalle: el botón queda bloqueado para no consumir otro N.º de talonario. */}
          <Button type="submit" size="lg" loading={pendiente || estado.ok}>
            {pendiente || estado.ok ? null : <Send aria-hidden />}
            {notificarAhora ? "Emitir y notificar" : "Emitir notificación"}
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24" aria-label="Vista previa de la notificación">
        <VistaPreviaNotificacion
          anio={anio}
          tipo={tipo}
          plazo={plazo}
          razonSocial={datos.razon_social}
          rubro={datos.rubro}
          cuit={datos.cuit}
          domicilio={datos.domicilio}
          ordenTrabajo={datos.orden_trabajo}
          observaciones={datos.observaciones}
          entidad={entidadActual}
          vencimiento={vencimientoPrevisto}
        />
      </aside>
    </form>
  );
}
