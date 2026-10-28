"use client";

import Link from "next/link";
import { startTransition, useMemo, useRef, useState } from "react";
import {
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  CircleCheckBig,
  ExternalLink,
  FileX2,
  FlaskConical,
  Gavel,
  ListChecks,
  MessageSquareWarning,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { SectionCard } from "@/components/shared/section-card";
import { SubmitButton } from "@/components/shared/submit-button";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { CertificadoEnControl } from "@/lib/data/control";
import { ESTADO_CERTIFICADO } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatLitros, formatNumero, formatSuperficie } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { IconoVerificacion, LeyendaVerificaciones, ListaVerificaciones } from "../../_components/verificacion";
import { aprobarControl, rechazarDeclaracion } from "../actions";

type Decision = { observar: boolean; motivo: string };
type Filtro = "todos" | "fallas" | "ok";

const MOTIVO_MINIMO = 5;
/** Igual que LARGO_MAXIMO_MOTIVO de src/lib/data/control.ts (no se importa: ese módulo es server-only). */
const MOTIVO_MAXIMO = 1500;

export type PanelControlProps = {
  declaracionId: string;
  codigo: string;
  /** Solo admin/control y con la planilla presentada. */
  editable: boolean;
  /** Admin/control con la planilla presentada u observada (rechazar_declaracion admite ambos estados). */
  rechazable: boolean;
  /** Resultado de rpc empresa_habilitada. */
  empresaHabilitada: boolean | null;
  certificados: CertificadoEnControl[];
};

function decisionesSugeridas(certificados: CertificadoEnControl[]): Record<string, Decision> {
  return Object.fromEntries(
    certificados.map((c) => [
      c.id,
      { observar: c.sugerencia === "observar", motivo: c.sugerencia === "observar" ? c.motivoSugerido : "" },
    ]),
  );
}

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

/** Bandeja de verificación de una planilla: matriz de controles por certificado y resolución. */
export function PanelControl({
  declaracionId,
  codigo,
  editable,
  rechazable,
  empresaHabilitada,
  certificados,
}: PanelControlProps) {
  const controlables = useMemo(
    () => (editable ? certificados.filter((c) => c.estado === "declarado") : []),
    [editable, certificados],
  );
  const idsControlables = useMemo(() => new Set(controlables.map((c) => c.id)), [controlables]);

  const [decisiones, setDecisiones] = useState<Record<string, Decision>>(() => decisionesSugeridas(controlables));
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set());
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const formRef = useRef<HTMLFormElement>(null);
  const [estado, accion, pendiente] = useAccion(aprobarControl);
  const [estadoAlAbrir, setEstadoAlAbrir] = useState(estado);

  const observados = controlables
    .filter((c) => decisiones[c.id]?.observar)
    .map((c) => ({ certificado_id: c.id, numero: c.numero, motivo: (decisiones[c.id]?.motivo ?? "").trim() }));
  const sinMotivo = observados.filter((o) => o.motivo.length < MOTIVO_MINIMO).length;
  const aControlar = controlables.length - observados.length;

  const conFallas = certificados.filter((c) => c.sugerencia === "observar").length;
  const visibles = certificados.filter(
    (c) => filtro === "todos" || (filtro === "fallas" ? c.sugerencia === "observar" : c.sugerencia === "ok"),
  );

  const alternar = (id: string) =>
    setAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  const cambiarDecision = (c: CertificadoEnControl, observar: boolean) =>
    setDecisiones((prev) => {
      const actual = prev[c.id] ?? { observar: false, motivo: "" };
      return {
        ...prev,
        [c.id]: { observar, motivo: observar && !actual.motivo.trim() ? c.motivoSugerido : actual.motivo },
      };
    });

  const cambiarMotivo = (id: string, motivo: string) =>
    setDecisiones((prev) => ({ ...prev, [id]: { observar: prev[id]?.observar ?? true, motivo } }));

  const aplicarSugerencias = () => setDecisiones(decisionesSugeridas(controlables));
  const marcarTodoOk = () =>
    setDecisiones((prev) =>
      Object.fromEntries(controlables.map((c) => [c.id, { observar: false, motivo: prev[c.id]?.motivo ?? "" }])),
    );

  const confirmar = () => {
    const form = formRef.current;
    if (!form) return;
    const datos = new FormData(form);
    startTransition(() => accion(datos));
  };

  const errorAprobacion = !estado.ok && estado !== estadoAlAbrir ? (estado.mensaje ?? null) : null;

  let bloqueo: string | null = null;
  if (empresaHabilitada === false) bloqueo = "La empresa no está habilitada: corresponde rechazar la planilla.";
  else if (sinMotivo > 0)
    bloqueo = `Completá el motivo de ${plural(sinMotivo, "certificado observado", "certificados observados")}.`;

  const filtros: { valor: Filtro; label: string; cantidad: number }[] = [
    { valor: "todos", label: "Todos", cantidad: certificados.length },
    { valor: "fallas", label: "Con fallas", cantidad: conFallas },
    { valor: "ok", label: "Sin fallas", cantidad: certificados.length - conFallas },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Certificados de la planilla"
        description={
          editable
            ? "Verificaciones automáticas por certificado. Marcá cuáles observar y con qué motivo."
            : "Verificaciones automáticas calculadas sobre los datos actuales de cada certificado."
        }
        icon={ListChecks}
        flush
        actions={
          <div role="group" aria-label="Filtrar certificados" className="inline-flex rounded-xl bg-muted p-1">
            {filtros.map((f) => (
              <button
                key={f.valor}
                type="button"
                aria-pressed={filtro === f.valor}
                onClick={() => setFiltro(f.valor)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-all",
                  filtro === f.valor
                    ? "bg-card text-azul-700 shadow-[0_1px_3px_rgb(10_26_63/0.14)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                    filtro === f.valor ? "bg-azul-50 text-azul-700" : "bg-card/70 text-muted-foreground",
                    f.valor === "fallas" && f.cantidad > 0 && "bg-red-50 text-red-700",
                  )}
                >
                  {f.cantidad}
                </span>
              </button>
            ))}
          </div>
        }
      >
        <div className="flex flex-col gap-3 border-b border-border bg-subtle/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <LeyendaVerificaciones />
          {editable && controlables.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={aplicarSugerencias}>
                <Wand2 aria-hidden />
                Aplicar sugerencias
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={marcarTodoOk}>
                <CheckCheck aria-hidden />
                Marcar todos OK
              </Button>
            </div>
          ) : null}
        </div>

        {visibles.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              compact
              icon={certificados.length === 0 ? FileX2 : Sparkles}
              title={certificados.length === 0 ? "La planilla no tiene certificados" : "No hay certificados con este filtro"}
              description={
                certificados.length === 0
                  ? "La empresa no cargó certificados en esta planilla."
                  : filtro === "fallas"
                    ? "Ningún certificado tiene fallas en las verificaciones automáticas."
                    : "Todos los certificados tienen alguna verificación con fallas."
              }
            />
          </div>
        ) : (
          <>
            <div
              aria-hidden
              className="hidden gap-5 border-b border-border bg-subtle px-6 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase xl:flex"
            >
              <div className="grid flex-1 grid-cols-[8rem_minmax(0,1fr)_8.5rem] gap-x-4">
                <span>Certificado</span>
                <span>Servicio</span>
                <span>Fechas</span>
              </div>
              <span className="w-[9.5rem]">Verificaciones</span>
              <span className="w-[11rem] text-right">Decisión</span>
            </div>
            <ol aria-label="Certificados de la planilla" className="divide-y divide-border">
              {visibles.map((c) => (
                <FilaCertificado
                  key={c.id}
                  certificado={c}
                  controlable={idsControlables.has(c.id)}
                  decision={decisiones[c.id] ?? { observar: false, motivo: "" }}
                  abierto={abiertos.has(c.id)}
                  onAlternar={() => alternar(c.id)}
                  onDecision={(observar) => cambiarDecision(c, observar)}
                  onMotivo={(motivo) => cambiarMotivo(c.id, motivo)}
                />
              ))}
            </ol>
          </>
        )}
      </SectionCard>

      {editable ? (
        <SectionCard
          title="Resolución del control"
          description={`Confirmá el resultado de la planilla ${codigo}. La empresa lo verá en su panel.`}
          icon={Gavel}
          footer={
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <RechazarPlanilla declaracionId={declaracionId} codigo={codigo} empresaHabilitada={empresaHabilitada} />
              <ConfirmarAprobacion
                aControlar={aControlar}
                observados={observados}
                bloqueo={bloqueo}
                pendiente={pendiente}
                error={errorAprobacion}
                onAbrir={() => setEstadoAlAbrir(estado)}
                onConfirmar={confirmar}
              />
            </div>
          }
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="grid grid-cols-2 gap-3">
              <TileResultado
                icono={CircleCheckBig}
                tono="verde"
                valor={aControlar}
                etiqueta="Quedan controlados"
                detalle="Habilitados para pagar el timbrado"
              />
              <TileResultado
                icono={MessageSquareWarning}
                tono="ambar"
                valor={observados.length}
                etiqueta="Se observan"
                detalle="Vuelven a la empresa para corregir"
              />
            </div>
            <form ref={formRef} action={accion} className="flex flex-col gap-3">
              <input type="hidden" name="declaracion_id" value={declaracionId} />
              <input
                type="hidden"
                name="observados"
                value={JSON.stringify(observados.map(({ certificado_id, motivo }) => ({ certificado_id, motivo })))}
              />
              <Field
                htmlFor="observaciones-control"
                label="Observaciones generales"
                hint="Opcional. Quedan registradas en la planilla y las ve la empresa."
                error={estado.errores?.observaciones?.[0]}
              >
                <Textarea
                  id="observaciones-control"
                  name="observaciones"
                  rows={3}
                  maxLength={2000}
                  placeholder="Ej.: Recordá consignar el rubro según el Anexo en los próximos servicios."
                />
              </Field>
            </form>
          </div>
          {bloqueo ? (
            <Alert tone={empresaHabilitada === false ? "danger" : "warning"} className="mt-5" title="Todavía no podés aprobar">
              {bloqueo}
            </Alert>
          ) : observados.length > 0 ? (
            <Alert tone="info" className="mt-5">
              Al aprobar, la planilla queda <strong>observada</strong>: los certificados sin observaciones quedan controlados y
              los observados vuelven a la empresa con el motivo para que los corrija y presente de nuevo.
            </Alert>
          ) : null}
        </SectionCard>
      ) : rechazable ? (
        <SectionCard
          title="¿La empresa no corrige la planilla?"
          description="Mientras esté observada, podés rechazarla: se anulan sus certificados sin pago asociado."
          icon={Gavel}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Usalo solo si la empresa no va a corregir los certificados observados o si la planilla no debió presentarse.
            </p>
            <RechazarPlanilla declaracionId={declaracionId} codigo={codigo} empresaHabilitada={empresaHabilitada} />
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------- */

function FilaCertificado({
  certificado: c,
  controlable,
  decision,
  abierto,
  onAlternar,
  onDecision,
  onMotivo,
}: {
  certificado: CertificadoEnControl;
  controlable: boolean;
  decision: Decision;
  abierto: boolean;
  onAlternar: () => void;
  onDecision: (observar: boolean) => void;
  onMotivo: (motivo: string) => void;
}) {
  const observar = controlable && decision.observar;
  const evaluadas = c.verificaciones.filter((v) => v.estado !== "na");
  const correctas = evaluadas.filter((v) => v.estado === "ok").length;
  const fallas = c.verificaciones.filter((v) => v.estado === "falla").length;
  const avisos = c.verificaciones.filter((v) => v.estado === "aviso").length;
  const detalleId = `detalle-${c.id}`;
  const motivoId = `motivo-${c.id}`;
  const motivoCorto = decision.motivo.trim().length < MOTIVO_MINIMO;
  const mostrarObservacion = !controlable && c.estado === "observado" && !!c.observaciones;
  const mostrarAnulacion = c.estado === "anulado" && !!c.anulado_motivo;

  return (
    <li
      className={cn(
        "relative px-5 py-4 transition-colors sm:px-6",
        observar ? "bg-amber-50/60" : "hover:bg-azul-50/30",
        c.estado === "anulado" && "opacity-75",
      )}
    >
      {observar || (controlable && fallas > 0) ? (
        <span
          aria-hidden
          className={cn("absolute inset-y-0 left-0 w-1", observar ? "bg-amber-400" : "bg-red-400")}
        />
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
        <div className="grid min-w-0 flex-1 gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-[8rem_minmax(0,1fr)_8.5rem]">
          {/* Certificado */}
          <div className="flex min-w-0 flex-col gap-1 sm:col-span-2 xl:col-span-1">
            <span className="sr-only">Certificado</span>
            <Link
              href={`/gestion/certificados/${c.id}`}
              className="w-fit rounded-sm font-display text-[15px] font-semibold text-foreground transition-colors hover:text-azul-700"
            >
              N.º {c.numero}
            </Link>
            {c.establecimiento_nombre ? (
              <span className="truncate text-xs text-muted-foreground" title={c.establecimiento_nombre}>
                {c.establecimiento_nombre}
              </span>
            ) : null}
          </div>

          {/* Servicio */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="sr-only">Servicio</span>
            <p className="font-medium text-foreground">{c.cliente}</p>
            <p className="text-[13px] text-muted-foreground">{c.domicilio}</p>
            <p className="text-xs text-muted-foreground">
              {c.rubro ? c.rubro : <span className="font-medium text-red-700">Sin rubro</span>}
              {" · "}
              {c.tipo === "tanque" ? formatLitros(c.capacidad_litros) : formatSuperficie(c.superficie_m2)}
            </p>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-1 sm:gap-1.5">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Servicio</span>
              <span className="nums-tabular font-medium">{c.fecha_servicio ? formatFechaHora(c.fecha_servicio) : "Sin fecha"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Vence</span>
              <span className="nums-tabular">
                {c.fecha_vencimiento ? formatFecha(c.fecha_vencimiento) : c.periodicidad === "unica_vez" ? "Única vez" : "Sin fecha"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 md:flex-col md:items-end xl:flex-row xl:items-start xl:gap-5">
          {/* Verificaciones */}
          <div className="flex min-w-0 flex-col gap-1.5 xl:w-[9.5rem]">
            <span className="sr-only">Verificaciones</span>
            <button
              type="button"
              onClick={onAlternar}
              aria-expanded={abierto}
              aria-controls={detalleId}
              className="-m-1 grid w-fit grid-cols-4 gap-1.5 rounded-xl p-1 transition-colors hover:bg-azul-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="sr-only">{abierto ? "Ocultar" : "Ver"} el detalle de las verificaciones del N.º {c.numero}:</span>
              {c.verificaciones.map((v) => (
                <IconoVerificacion key={v.clave} verificacion={v} />
              ))}
            </button>
            <p className="text-xs text-muted-foreground">
              {correctas} de {evaluadas.length} correctas
              {fallas > 0 ? <span className="font-medium text-red-700"> · {plural(fallas, "falla", "fallas")}</span> : null}
              {avisos > 0 ? <span className="font-medium text-amber-800"> · {plural(avisos, "aviso", "avisos")}</span> : null}
            </p>
          </div>

          {/* Decisión */}
          <div className="flex flex-col items-end gap-2 xl:w-[11rem]">
            {controlable ? (
              <ToggleDecision numero={c.numero} observar={decision.observar} onCambio={onDecision} />
            ) : (
              <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAlternar}
              aria-expanded={abierto}
              aria-controls={detalleId}
              className="text-muted-foreground"
            >
              {abierto ? "Ocultar detalle" : "Ver detalle"}
              <ChevronDown aria-hidden className={cn("transition-transform duration-200", abierto && "rotate-180")} />
            </Button>
          </div>
        </div>
      </div>

      {/* El contenedor siempre existe para que aria-controls apunte a un elemento real. */}
      <div
        id={detalleId}
        hidden={!(abierto || observar || mostrarObservacion || mostrarAnulacion)}
        className="mt-4 flex animate-fade-in flex-col gap-4"
      >
        {abierto ? (
          <>
            <ListaVerificaciones verificaciones={c.verificaciones} />
            {c.tipo === "tanque" ? <AnalisisAgua certificado={c} /> : null}
            {c.productos.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Productos aplicados</p>
                <ul className="flex flex-wrap gap-2">
                  {c.productos.map((p) => (
                    <li
                      key={p.producto_id || p.nombre}
                      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] leading-tight"
                    >
                      <span className="font-medium text-foreground">{p.nombre}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {p.organismo} {p.registro} · {formatNumero(p.cantidad, 3)} {p.unidad}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}

        {observar ? (
          <div className="rounded-xl border border-amber-200 bg-card p-4">
            <Field
              htmlFor={motivoId}
              label={`Motivo de la observación del N.º ${c.numero}`}
              required
              hint="La empresa lo verá en el certificado para corregirlo antes de volver a presentar la planilla."
              error={motivoCorto ? `Indicá el motivo (al menos ${MOTIVO_MINIMO} caracteres).` : null}
            >
              <Textarea
                id={motivoId}
                rows={3}
                maxLength={MOTIVO_MAXIMO}
                value={decision.motivo}
                onChange={(e) => onMotivo(e.target.value)}
                placeholder="Ej.: El rubro no coincide con la actividad del establecimiento."
              />
            </Field>
            {c.motivoSugerido && decision.motivo.trim() !== c.motivoSugerido ? (
              <Button type="button" variant="link" size="sm" className="mt-2" onClick={() => onMotivo(c.motivoSugerido)}>
                <Wand2 aria-hidden />
                Usar el motivo sugerido por las verificaciones
              </Button>
            ) : null}
          </div>
        ) : null}

        {mostrarObservacion ? (
          <Alert tone="warning" title="Observación del área">
            {c.observaciones}
          </Alert>
        ) : null}
        {mostrarAnulacion ? (
          <Alert tone="danger" title="Certificado anulado">
            {c.anulado_motivo}
          </Alert>
        ) : null}
      </div>
    </li>
  );
}

/** Enlaces a los análisis del agua adjuntos (tanques, Ord. 2004/92). */
function AnalisisAgua({ certificado: c }: { certificado: CertificadoEnControl }) {
  const archivos = [
    { clave: "bacteriologico", titulo: "Análisis bacteriológico", url: c.analisis.bacteriologico },
    { clave: "fisicoquimico", titulo: "Análisis físico-químico", url: c.analisis.fisicoquimico },
  ] as const;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Análisis del agua{c.laboratorio ? ` · ${c.laboratorio}` : ""}
      </p>
      <ul className="flex flex-wrap gap-2">
        {archivos.map((a) => (
          <li key={a.clave}>
            {a.url ? (
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-celeste-200 bg-celeste-50 px-2.5 py-1.5 text-[13px] font-medium text-celeste-800 transition-colors hover:border-celeste-300 hover:bg-celeste-100"
              >
                <FlaskConical className="size-3.5" aria-hidden />
                {a.titulo}
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-2.5 py-1.5 text-[13px] text-muted-foreground">
                <FileX2 className="size-3.5" aria-hidden />
                {a.titulo}: no disponible
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToggleDecision({
  numero,
  observar,
  onCambio,
}: {
  numero: string;
  observar: boolean;
  onCambio: (observar: boolean) => void;
}) {
  const base =
    "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";
  return (
    <div role="group" aria-label={`Decisión para el certificado N.º ${numero}`} className="inline-flex rounded-xl bg-muted p-1">
      <button
        type="button"
        aria-pressed={!observar}
        onClick={() => onCambio(false)}
        className={cn(base, !observar ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
      >
        <Check className="size-3.5" strokeWidth={2.8} aria-hidden />
        OK
      </button>
      <button
        type="button"
        aria-pressed={observar}
        onClick={() => onCambio(true)}
        className={cn(base, observar ? "bg-sol-400 text-noche-950 shadow-sm" : "text-muted-foreground hover:text-foreground")}
      >
        <MessageSquareWarning className="size-3.5" aria-hidden />
        Observar
      </button>
    </div>
  );
}

function TileResultado({
  icono: Icono,
  tono,
  valor,
  etiqueta,
  detalle,
}: {
  icono: LucideIcon;
  tono: "verde" | "ambar";
  valor: number;
  etiqueta: string;
  detalle: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 overflow-hidden rounded-xl border p-4",
        tono === "verde" ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          tono === "verde" ? "bg-emerald-600 text-white" : "bg-sol-400 text-noche-950",
        )}
      >
        <Icono className="size-[18px]" />
      </span>
      <p className="font-display text-3xl leading-none font-semibold tabular-nums text-foreground">{valor}</p>
      <div>
        <p className="text-sm font-semibold text-foreground">{etiqueta}</p>
        <p className="text-xs leading-snug text-muted-foreground">{detalle}</p>
      </div>
    </div>
  );
}

function ConfirmarAprobacion({
  aControlar,
  observados,
  bloqueo,
  pendiente,
  error,
  onAbrir,
  onConfirmar,
}: {
  aControlar: number;
  observados: { certificado_id: string; numero: string; motivo: string }[];
  bloqueo: string | null;
  pendiente: boolean;
  error: string | null;
  onAbrir: () => void;
  onConfirmar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const hayObservados = observados.length > 0;
  const etiqueta = hayObservados
    ? `Aprobar con ${plural(observados.length, "observado", "observados")}`
    : "Aprobar control";

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        if (v) onAbrir();
        setAbierto(v);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="lg" disabled={!!bloqueo} className="w-full sm:w-auto">
          <CircleCheckBig aria-hidden />
          {etiqueta}
        </Button>
      </DialogTrigger>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{hayObservados ? "¿Aprobar el control con observaciones?" : "¿Aprobar el control de la planilla?"}</DialogTitle>
          <DialogDescription>
            {plural(aControlar, "certificado queda controlado", "certificados quedan controlados")} y la empresa podrá pagar el
            timbrado.
            {hayObservados
              ? ` ${plural(observados.length, "certificado vuelve", "certificados vuelven")} a la empresa con el motivo indicado.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          {hayObservados ? (
            <ul className="flex flex-col gap-2">
              {observados.map((o) => (
                <li key={o.certificado_id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm">
                  <p className="font-semibold text-foreground">N.º {o.numero}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{o.motivo}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-900">
              <CheckCheck className="size-4 shrink-0" aria-hidden />
              Todos los certificados pasan el control.
            </p>
          )}
          {error ? (
            <Alert tone="danger" title="No se pudo registrar el control">
              <span className="whitespace-pre-line">{error}</span>
            </Alert>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pendiente}>
              Volver a revisar
            </Button>
          </DialogClose>
          <Button type="button" loading={pendiente} onClick={onConfirmar}>
            {pendiente ? "Registrando…" : "Confirmar control"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MOTIVOS_RAPIDOS = [
  "La empresa no está habilitada para prestar el servicio.",
  "La planilla se presentó fuera del plazo de 24 a 48 horas de antelación.",
  "Los certificados no corresponden a servicios declarados por la empresa.",
];

function RechazarPlanilla({
  declaracionId,
  codigo,
  empresaHabilitada,
}: {
  declaracionId: string;
  codigo: string;
  empresaHabilitada: boolean | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [estado, accion, pendiente] = useAccion(rechazarDeclaracion);
  const [estadoAlAbrir, setEstadoAlAbrir] = useState(estado);
  const respuestaNueva = estado !== estadoAlAbrir && !estado.ok;
  const errorMotivo = respuestaNueva ? estado.errores?.motivo?.[0] : undefined;
  const errorGeneral = respuestaNueva && !estado.errores ? estado.mensaje : undefined;

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        if (v) {
          setEstadoAlAbrir(estado);
          if (!motivo && empresaHabilitada === false) setMotivo(MOTIVOS_RAPIDOS[0]);
        }
        setAbierto(v);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={empresaHabilitada === false ? "danger" : "outline"}
          className={cn(
            "w-full sm:w-auto",
            empresaHabilitada !== false && "border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800",
          )}
        >
          <Ban aria-hidden />
          Rechazar planilla
        </Button>
      </DialogTrigger>
      <DialogContent size="md">
        <form action={accion} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>Rechazar la planilla {codigo}</DialogTitle>
            <DialogDescription>
              Se anulan todos los certificados de la planilla que no tengan un pago asociado. La empresa deberá cargar una nueva
              planilla.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <input type="hidden" name="declaracion_id" value={declaracionId} />
            <Field
              htmlFor="motivo-rechazo"
              label="Motivo del rechazo"
              required
              hint="La empresa lo verá en su panel. Queda registrado en la auditoría."
              error={errorMotivo}
            >
              <Textarea
                id="motivo-rechazo"
                name="motivo"
                rows={4}
                required
                minLength={10}
                maxLength={1000}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explicá por qué se rechaza la planilla."
              />
            </Field>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Motivos frecuentes</p>
              <div className="flex flex-wrap gap-2">
                {MOTIVOS_RAPIDOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className="rounded-full border border-border bg-card px-3 py-1 text-left text-xs text-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {errorGeneral ? (
              <Alert tone="danger" title="No se pudo rechazar la planilla">
                <span className="whitespace-pre-line">{errorGeneral}</span>
              </Alert>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton variant="danger" pendingText="Rechazando…">
              <Ban aria-hidden />
              Rechazar planilla
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
