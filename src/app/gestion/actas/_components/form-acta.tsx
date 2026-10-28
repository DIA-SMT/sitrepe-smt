"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Bug,
  CalendarX,
  CircleEllipsis,
  Droplets,
  FilePenLine,
  FileX,
  Link2,
  RotateCcw,
  Scale,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EntidadOpcion, Inspector } from "@/lib/data/intimaciones";
import { MOTIVO_ACTA, TIPO_INSPECCION } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";
import { BuscadorEntidad } from "../../notificaciones/_components/buscador-entidad";
import { GrupoOpciones, type OpcionTarjeta } from "../../notificaciones/_components/grupo-opciones";
import { crearActa } from "../actions";
import { type ContextoPlantilla, descripcionSugerida, normativaSugerida } from "./plantillas";

type Motivo = Enums<"motivo_acta">;

const ICONOS: Record<Motivo, OpcionTarjeta<Motivo>["icono"]> = {
  certificado_vencido: CalendarX,
  sin_certificado: FileX,
  empresa_no_habilitada: ShieldX,
  incumplimiento_notificacion: BellRing,
  tanque_sin_limpieza: Droplets,
  servicio_irregular: Bug,
  otro: CircleEllipsis,
};

const DESCRIPCIONES: Record<Motivo, string> = {
  certificado_vencido: "El certificado de fumigación exhibido está vencido.",
  sin_certificado: "No exhibe certificado de fumigación vigente.",
  empresa_no_habilitada: "Servicio prestado por una empresa sin habilitación.",
  incumplimiento_notificacion: "Venció el plazo de una notificación sin cumplirla.",
  tanque_sin_limpieza: "Tanques sin limpieza ni análisis de agua vigentes.",
  servicio_irregular: "Irregularidades constatadas durante un servicio.",
  otro: "Otra infracción a la normativa de salud ambiental.",
};

const OPCIONES_MOTIVO: OpcionTarjeta<Motivo>[] = (Object.keys(MOTIVO_ACTA) as Motivo[]).map((m) => ({
  valor: m,
  titulo: MOTIVO_ACTA[m].label,
  descripcion: DESCRIPCIONES[m],
  icono: ICONOS[m],
  tono: m === "incumplimiento_notificacion" ? "ambar" : m === "tanque_sin_limpieza" ? "celeste" : m === "otro" ? "neutral" : "rojo",
}));

export type NotificacionVinculada = {
  id: string;
  numero: string | null;
  tipo: Enums<"tipo_notificacion"> | null;
  notificada_at: string | null;
  vence_at: string | null;
  persona_notificada: string | null;
  dni_notificado: string | null;
  razon_social: string | null;
  /** Si el plazo ya venció (estado efectivo «vencida»): recién ahí corresponde el acta por incumplimiento. */
  vencida: boolean;
};

export type InspeccionVinculada = {
  id: string;
  codigo: string | null;
  tipo: Enums<"tipo_inspeccion"> | null;
  fecha_programada: string | null;
};

type FormActaProps = {
  establecimientoInicial: EntidadOpcion | null;
  empresaInicial: EntidadOpcion | null;
  notificacion: NotificacionVinculada | null;
  inspeccion: InspeccionVinculada | null;
  motivoInicial: Motivo;
  inspectores: Inspector[];
  inspectorPorDefecto: string | null;
  ahoraLocal: string;
  /** Vencimiento de fumigación conocido del establecimiento precargado (para completar la plantilla). */
  vencimientoFumigacion?: { establecimientoId: string; fecha: string } | null;
};

export function FormActa({
  establecimientoInicial,
  empresaInicial,
  notificacion: notificacionInicial,
  inspeccion: inspeccionInicial,
  motivoInicial,
  inspectores,
  inspectorPorDefecto,
  ahoraLocal,
  vencimientoFumigacion,
}: FormActaProps) {
  const router = useRouter();

  const contexto = (
    est: EntidadOpcion | null,
    emp: EntidadOpcion | null,
    notif: NotificacionVinculada | null,
  ): ContextoPlantilla => ({
    establecimiento: est ? { nombre: est.nombre, domicilio: est.domicilio, rubro: est.rubro } : null,
    empresa: emp ? { nombre: emp.nombre, cuit: emp.cuit } : null,
    notificacion: notif,
    vencimientoFumigacion:
      est && vencimientoFumigacion?.establecimientoId === est.id ? vencimientoFumigacion.fecha : null,
  });

  const [establecimiento, setEstablecimiento] = useState(establecimientoInicial);
  const [empresa, setEmpresa] = useState(empresaInicial);
  const [notificacion, setNotificacion] = useState(notificacionInicial);
  const [inspeccion, setInspeccion] = useState(inspeccionInicial);
  const [motivo, setMotivo] = useState<Motivo>(motivoInicial);
  const [descripcion, setDescripcion] = useState(() =>
    descripcionSugerida(motivoInicial, contexto(establecimientoInicial, empresaInicial, notificacionInicial)),
  );
  const [normativa, setNormativa] = useState(() =>
    normativaSugerida(motivoInicial, contexto(establecimientoInicial, empresaInicial, notificacionInicial)),
  );
  // Últimos textos sugeridos: si el usuario no los editó, se actualizan solos al cambiar datos.
  const [descripcionAuto, setDescripcionAuto] = useState(descripcion);
  const [normativaAuto, setNormativaAuto] = useState(normativa);
  const [fecha, setFecha] = useState(ahoraLocal);
  const [inspector, setInspector] = useState(inspectorPorDefecto ?? "");

  const [estado, despachar, pendiente] = useAccion<{ id: string }>(crearActa, {
    alExito: (e) => {
      if (e.datos?.id) router.push(`/gestion/actas/${e.datos.id}`);
    },
  });
  const err = (campo: string) => estado.errores?.[campo]?.[0];

  /** Recalcula las sugerencias y reemplaza los textos que el usuario no tocó. */
  const actualizarSugerencias = (cambios: {
    motivo?: Motivo;
    establecimiento?: EntidadOpcion | null;
    empresa?: EntidadOpcion | null;
    notificacion?: NotificacionVinculada | null;
  }) => {
    const m = cambios.motivo ?? motivo;
    const ctx = contexto(
      cambios.establecimiento !== undefined ? cambios.establecimiento : establecimiento,
      cambios.empresa !== undefined ? cambios.empresa : empresa,
      cambios.notificacion !== undefined ? cambios.notificacion : notificacion,
    );
    const nuevaDescripcion = descripcionSugerida(m, ctx);
    const nuevaNormativa = normativaSugerida(m, ctx);
    if (!descripcion.trim() || descripcion === descripcionAuto) setDescripcion(nuevaDescripcion);
    if (!normativa.trim() || normativa === normativaAuto) setNormativa(nuevaNormativa);
    setDescripcionAuto(nuevaDescripcion);
    setNormativaAuto(nuevaNormativa);
  };

  const plantillaActual = descripcionSugerida(motivo, contexto(establecimiento, empresa, notificacion));
  const faltanDatos = /\[[^\]]+\]/.test(descripcion);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => despachar(fd));
      }}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        {/* Infractor */}
        <SectionCard
          title="Presunto infractor"
          description="Indicá el establecimiento inspeccionado, la empresa prestadora involucrada, o ambos."
          icon={Users}
        >
          <div className="grid gap-5">
            <BuscadorEntidad
              tipo="establecimiento"
              name="establecimiento_id"
              label="Establecimiento"
              hint={
                <>
                  Si no figura en el padrón,{" "}
                  <Link href="/gestion/establecimientos" className="font-medium text-azul-700 hover:underline">
                    dalo de alta en Establecimientos
                  </Link>{" "}
                  y volvé a esta pantalla.
                </>
              }
              valor={establecimiento}
              onCambio={(op) => {
                setEstablecimiento(op);
                actualizarSugerencias({ establecimiento: op });
              }}
              error={err("establecimiento_id")}
            />
            <BuscadorEntidad
              tipo="empresa"
              name="empresa_id"
              label="Empresa prestadora"
              hint="Opcional: para servicios irregulares o certificados de empresas observadas."
              valor={empresa}
              onCambio={(op) => {
                setEmpresa(op);
                actualizarSugerencias({ empresa: op });
              }}
              error={err("empresa_id")}
            />
          </div>
        </SectionCard>

        {/* Vinculaciones */}
        {notificacion || inspeccion ? (
          <SectionCard title="Actuaciones vinculadas" description="El acta queda asociada a estas actuaciones." icon={Link2}>
            <input type="hidden" name="notificacion_id" value={notificacion?.id ?? ""} />
            <input type="hidden" name="inspeccion_id" value={inspeccion?.id ?? ""} />
            <ul className="flex flex-col gap-2.5">
              {notificacion ? (
                <li className="flex items-start gap-3 rounded-xl border border-amber-200 bg-warning-soft p-3.5">
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-warning ring-1 ring-amber-200">
                    <BellRing className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link
                      href={`/gestion/notificaciones/${notificacion.id}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      Notificación N.º {notificacion.numero}
                    </Link>
                    <p className="text-[13px] text-muted-foreground">
                      {notificacion.razon_social}
                      {!notificacion.vence_at
                        ? " · sin notificar"
                        : notificacion.vencida
                          ? ` · venció el ${formatFecha(notificacion.vence_at)}`
                          : ` · vence el ${formatFecha(notificacion.vence_at)}`}
                    </p>
                    <p className="mt-1 text-xs text-amber-900/80">Al labrar el acta, la notificación pasa a «Acta labrada».</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Desvincular la notificación"
                    onClick={() => {
                      setNotificacion(null);
                      actualizarSugerencias({ notificacion: null });
                    }}
                  >
                    <X aria-hidden />
                  </Button>
                </li>
              ) : null}
              {inspeccion ? (
                <li className="flex items-start gap-3 rounded-xl border border-azul-100 bg-azul-50/60 p-3.5">
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-azul-600 ring-1 ring-azul-100">
                    <ShieldCheck className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/gestion/inspecciones/${inspeccion.id}`} className="font-semibold text-foreground hover:underline">
                      Inspección {inspeccion.codigo}
                    </Link>
                    <p className="text-[13px] text-muted-foreground">
                      {inspeccion.tipo ? TIPO_INSPECCION[inspeccion.tipo].label : "Inspección"}
                      {inspeccion.fecha_programada ? ` · ${formatFecha(inspeccion.fecha_programada)}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Desvincular la inspección"
                    onClick={() => setInspeccion(null)}
                  >
                    <X aria-hidden />
                  </Button>
                </li>
              ) : null}
            </ul>
          </SectionCard>
        ) : (
          <>
            <input type="hidden" name="notificacion_id" value="" />
            <input type="hidden" name="inspeccion_id" value="" />
          </>
        )}

        {/* Infracción */}
        <SectionCard title="Infracción constatada" description="Elegí el motivo: te sugerimos el texto y la normativa." icon={FilePenLine}>
          <div className="flex flex-col gap-6">
            <GrupoOpciones
              name="motivo"
              legend="Motivo"
              opciones={OPCIONES_MOTIVO}
              valor={motivo}
              onCambio={(m) => {
                setMotivo(m);
                actualizarSugerencias({ motivo: m });
              }}
              columnas={2}
              error={err("motivo")}
              required
            />

            {motivo === "incumplimiento_notificacion" && notificacion && !notificacion.vencida ? (
              <Alert tone="warning" title="El plazo de la notificación todavía no venció">
                {notificacion.vence_at
                  ? `Vence el ${formatFechaHora(notificacion.vence_at)}. Hasta entonces no corresponde el acta por incumplimiento: elegí otro motivo o esperá el vencimiento.`
                  : "La notificación todavía no se entregó: registrá la notificación y esperá el vencimiento del plazo."}
              </Alert>
            ) : null}
            {motivo === "incumplimiento_notificacion" && !notificacion ? (
              <Alert tone="info">
                Para el acta por incumplimiento conviene labrarla desde la notificación vencida: así queda vinculada y se
                cierra sola.{" "}
                <Link href="/gestion/notificaciones?estado=vencida" className="font-medium text-azul-700 hover:underline">
                  Ver notificaciones vencidas
                </Link>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2">
              <Field
                htmlFor="descripcion"
                label="Hechos constatados"
                required
                error={err("descripcion")}
                hint="Redactá en forma clara y objetiva: qué se constató, dónde y cuándo."
              >
                <Textarea
                  id="descripcion"
                  name="descripcion"
                  rows={6}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-2">
                {faltanDatos ? (
                  <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-warning">
                    <TriangleAlert className="size-3.5" aria-hidden /> Completá los datos entre corchetes.
                  </p>
                ) : (
                  <span className="text-xs text-muted-foreground">{descripcion.length} / 4000</span>
                )}
                {descripcion !== plantillaActual ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDescripcion(plantillaActual);
                      setDescripcionAuto(plantillaActual);
                    }}
                  >
                    <RotateCcw aria-hidden /> Usar texto sugerido
                  </Button>
                ) : null}
              </div>
            </div>

            <Field
              htmlFor="normativa"
              label="Normativa infringida"
              error={err("normativa")}
              hint="Sugerida según el motivo; podés ajustarla."
            >
              <Input
                id="normativa"
                name="normativa"
                value={normativa}
                onChange={(e) => setNormativa(e.target.value)}
                leading={<Scale aria-hidden />}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="fecha" label="Fecha y hora del acta" required error={err("fecha")}>
                <Input
                  id="fecha"
                  name="fecha"
                  type="datetime-local"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </Field>
              <Field htmlFor="inspector_id" label="Inspector/a actuante" error={err("inspector_id")}>
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
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button asChild variant="ghost">
            <Link href={notificacionInicial ? `/gestion/notificaciones/${notificacionInicial.id}` : "/gestion/actas"}>
              Cancelar
            </Link>
          </Button>
          {/* Tras labrarla se navega al detalle: el botón queda bloqueado para no labrar un acta duplicada. */}
          <Button type="submit" size="lg" variant="danger" loading={pendiente || estado.ok}>
            {pendiente || estado.ok ? null : <FilePenLine aria-hidden />}
            Labrar acta
          </Button>
        </div>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24" aria-label="Circuito del acta">
        <div className="relative overflow-hidden rounded-card bg-noche p-5 text-white shadow-elevated">
          <span aria-hidden className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-azul-500/30 blur-3xl" />
          <p className="relative text-xs font-semibold tracking-[0.14em] text-celeste-300 uppercase">Circuito</p>
          <h2 className="relative mt-1 font-display text-lg font-semibold">Qué pasa después</h2>
          <ol className="relative mt-4 flex flex-col gap-4">
            {[
              { t: "Labrada", d: "Se numera sola (ACTA-año-N.º) y se imprime para la firma del presunto infractor." },
              { t: "Elevada", d: "Control o Administración la eleva al Tribunal Municipal de Faltas (Art. 2.º, Ord. 2681/98)." },
              { t: "Resuelta", d: "Se registra la resolución del Tribunal (Código de Faltas, Ord. 758/82)." },
            ].map((p, i) => (
              <li key={p.t} className="flex gap-3">
                <span
                  className={
                    i === 0
                      ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-sol-400 text-xs font-bold text-noche-950"
                      : "flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-white/20"
                  }
                >
                  {i + 1}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{p.t}</span>
                  <span className="text-[13px] leading-snug text-noche-200">{p.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-card border border-border bg-card p-4 text-[13px] leading-relaxed text-muted-foreground shadow-card">
          <p className="font-medium text-foreground">Antes de labrar</p>
          <p className="mt-1">
            Verificá los datos del infractor y que el texto no tenga datos pendientes. El acta queda registrada en la auditoría:
            para corregirla hay que anularla y labrar una nueva.
          </p>
        </div>
      </aside>
    </form>
  );
}
