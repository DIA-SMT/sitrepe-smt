import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Ban,
  BellRing,
  Building2,
  Check,
  ClipboardList,
  FilePenLine,
  Gavel,
  History,
  Link2,
  PenLine,
  Printer,
  Scale,
  ShieldCheck,
  Store,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { antecedentesActas, instanteActual, obtenerActa } from "@/lib/data/intimaciones";
import {
  ESTADO_ACTA,
  ESTADO_EMPRESA,
  ESTADO_NOTIFICACION,
  MOTIVO_ACTA,
  RESULTADO_INSPECCION,
  TIPO_INSPECCION,
} from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatHora } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { AccionesActa } from "../_components/acciones-acta";

type ActaPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: ActaPageProps): Promise<Metadata> {
  const { id } = await params;
  const datos = await obtenerActa(id).catch(() => null);
  return { title: datos?.acta.numero ? `Acta N.º ${datos.acta.numero}` : "Acta de infracción" };
}

export default async function ActaPage({ params }: ActaPageProps) {
  const sesion = await requerirStaff();
  const { id } = await params;
  const datos = await obtenerActa(id);
  if (!datos) notFound();

  const { acta: a, infractor, notificacion, inspeccion } = datos;
  const antecedentes = await antecedentesActas({
    establecimientoId: a.establecimiento_id,
    empresaId: a.empresa_id,
    excluir: id,
  });
  const numero = a.numero ?? "s/n";
  const estado = a.estado ?? "labrada";
  const ahora = instanteActual();
  const puedeGestionar = sesion.perfil.rol === "admin" || sesion.perfil.rol === "control";
  const nombreInfractor = infractor.establecimiento?.nombre ?? infractor.empresa?.nombre_comercial ?? "Sin identificar";
  const normas = (a.normativa ?? "")
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <>
      <PageHeader
        title={`Acta N.º ${numero}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span className="font-medium text-foreground">{nombreInfractor}</span>
            <span aria-hidden>·</span>
            <span>
              {formatFecha(a.fecha)} a las {formatHora(a.fecha)}
            </span>
          </span>
        }
        icon={FilePenLine}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Actas", href: "/gestion/actas" },
          { label: numero },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href={`/imprimir/acta/${id}`}>
              <Printer aria-hidden /> Imprimir
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_ACTA} valor={estado} size="lg" />
          <EstadoBadge mapa={MOTIVO_ACTA} valor={a.motivo} size="lg" />
        </div>
      </PageHeader>

      <Circuito estado={estado} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <SectionCard title="Hechos constatados" icon={ClipboardList}>
            <blockquote className="relative rounded-xl border-l-4 border-azul-500 bg-gradient-brand-soft px-5 py-4 text-[15px] leading-relaxed whitespace-pre-line text-foreground">
              {a.descripcion}
            </blockquote>
            <div className="mt-5 flex flex-col gap-2">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <Scale className="size-3.5" aria-hidden /> Normativa infringida
              </p>
              {normas.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {normas.map((t) => (
                    <li
                      key={t}
                      className="rounded-lg bg-noche-50 px-2.5 py-1.5 text-[13px] leading-snug text-noche-800 ring-1 ring-noche-100"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No se indicó.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Presunto infractor" icon={infractor.establecimiento ? Store : Building2}>
            <div className="flex flex-col gap-6">
              {infractor.establecimiento ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Store className="size-4 text-azul-600" aria-hidden /> Establecimiento
                    </p>
                    <Link
                      href={`/gestion/establecimientos/${infractor.establecimiento.id}`}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-azul-700 hover:underline"
                    >
                      Ver ficha <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                  <KeyValue
                    items={[
                      { label: "Nombre", value: infractor.establecimiento.nombre },
                      { label: "Nombre de fantasía", value: infractor.establecimiento.nombre_fantasia },
                      { label: "CUIT", value: infractor.establecimiento.cuit },
                      { label: "Rubro", value: infractor.establecimiento.rubro },
                      {
                        label: "Domicilio",
                        value: [infractor.establecimiento.domicilio, infractor.establecimiento.barrio].filter(Boolean).join(" · "),
                        full: true,
                      },
                    ]}
                  />
                </div>
              ) : null}
              {infractor.empresa ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Building2 className="size-4 text-azul-600" aria-hidden /> Empresa prestadora
                    </p>
                    <Link
                      href={`/gestion/empresas/${infractor.empresa.id}`}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-azul-700 hover:underline"
                    >
                      Ver legajo <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                  <KeyValue
                    items={[
                      { label: "Nombre comercial", value: infractor.empresa.nombre_comercial },
                      { label: "Titular", value: infractor.empresa.titular },
                      { label: "CUIT", value: infractor.empresa.cuit },
                      {
                        label: "Registro",
                        value: infractor.empresa.numero_registro ? `N.º ${infractor.empresa.numero_registro}` : null,
                      },
                      {
                        label: "Estado",
                        value: <EstadoBadge mapa={ESTADO_EMPRESA} valor={infractor.empresa.estado} size="sm" />,
                      },
                      { label: "Oficina", value: infractor.empresa.domicilio_oficina },
                    ]}
                  />
                </div>
              ) : null}
              {!infractor.establecimiento && !infractor.empresa ? (
                <p className="text-sm text-muted-foreground">No hay datos del infractor vinculados.</p>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Acciones" icon={Gavel}>
            <AccionesActa id={id} numero={numero} estado={estado} puedeGestionar={puedeGestionar} />
          </SectionCard>

          <SectionCard title="Datos del acta" icon={FilePenLine}>
            <KeyValue
              columns={1}
              items={[
                { label: "Fecha y hora", value: formatFechaHora(a.fecha) },
                { label: "Inspector/a actuante", value: a.inspector_nombre },
                { label: "Registrada", value: formatFechaHora(a.created_at) },
                {
                  label: "Última modificación",
                  value: a.updated_at && a.updated_at !== a.created_at ? formatFechaHora(a.updated_at) : null,
                },
              ]}
            />
          </SectionCard>

          <SectionCard title="Actuaciones vinculadas" icon={Link2} flush={Boolean(notificacion || inspeccion)}>
            {notificacion || inspeccion ? (
              <ul className="divide-y divide-border">
                {notificacion ? (
                  <li>
                    <Link
                      href={`/gestion/notificaciones/${notificacion.id}`}
                      className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/50"
                    >
                      <BellRing className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">Notificación N.º {notificacion.numero}</span>
                        <span className="block text-xs text-muted-foreground">
                          {notificacion.vence_at
                            ? `${new Date(notificacion.vence_at).getTime() < ahora ? "Venció" : "Vence"} el ${formatFecha(notificacion.vence_at)}`
                            : "Sin notificar (sin plazo corriendo)"}
                        </span>
                      </span>
                      <EstadoBadge mapa={ESTADO_NOTIFICACION} valor={notificacion.estado_efectivo} size="sm" />
                    </Link>
                  </li>
                ) : null}
                {inspeccion ? (
                  <li>
                    <Link
                      href={`/gestion/inspecciones/${inspeccion.id}`}
                      className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/50"
                    >
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">Inspección {inspeccion.codigo}</span>
                        <span className="block text-xs text-muted-foreground">
                          {inspeccion.tipo ? TIPO_INSPECCION[inspeccion.tipo].label : "Inspección"} ·{" "}
                          {formatFecha(inspeccion.realizada_at ?? inspeccion.fecha_programada)}
                        </span>
                      </span>
                      {inspeccion.resultado ? (
                        <EstadoBadge mapa={RESULTADO_INSPECCION} valor={inspeccion.resultado} size="sm" />
                      ) : null}
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Acta labrada en forma directa, sin notificación ni inspección previa.</p>
            )}
          </SectionCard>

          <SectionCard title="Antecedentes del infractor" icon={History} flush={antecedentes.length > 0}>
            {antecedentes.length === 0 ? (
              <EmptyState compact icon={History} title="Sin actas anteriores" description="Es la primera acta registrada." />
            ) : (
              <ul className="divide-y divide-border">
                {antecedentes.map((x) => (
                  <li key={x.id}>
                    <Link
                      href={`/gestion/actas/${x.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-azul-50/50"
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-[13px] font-semibold text-azul-700">{x.numero}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatFecha(x.fecha)} · {x.motivo ? MOTIVO_ACTA[x.motivo].label : "—"}
                        </span>
                      </span>
                      <EstadoBadge mapa={ESTADO_ACTA} valor={x.estado} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

/** Circuito del acta: labrada → elevada al Tribunal → resuelta (o anulada). */
function Circuito({ estado }: { estado: string }) {
  const pasos = [
    { clave: "labrada", titulo: "Labrada", detalle: "Constatación en terreno", icono: PenLine },
    { clave: "elevada", titulo: "Elevada", detalle: "Tribunal Municipal de Faltas", icono: Gavel },
    { clave: "resuelta", titulo: "Resuelta", detalle: "Resolución registrada", icono: Check },
  ];
  const anulada = estado === "anulada";
  const actual = pasos.findIndex((p) => p.clave === estado);

  if (anulada) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-border bg-subtle px-5 py-4 shadow-card">
        <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-noche-100 text-noche-600">
          <Ban className="size-5" />
        </span>
        <div>
          <p className="font-display font-semibold text-foreground">Acta anulada</p>
          <p className="text-[13px] text-muted-foreground">No produce efectos. Si correspondía, labrá una nueva con los datos correctos.</p>
        </div>
      </div>
    );
  }

  return (
    <nav aria-label="Circuito del acta" className="rounded-card border border-border bg-card px-4 py-4 shadow-card sm:px-6">
      <ol className="flex items-start">
        {pasos.map((p, i) => {
          const hecho = i < actual || (i === actual && p.clave === "resuelta");
          const enCurso = i === actual && p.clave !== "resuelta";
          const Icono = p.icono;
          return (
            <li key={p.clave} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === actual ? "step" : undefined}>
              {i > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-5 right-1/2 h-0.5 w-full -translate-y-1/2",
                    i <= actual ? "bg-linear-to-r from-azul-600 to-celeste-400" : "bg-border",
                  )}
                />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex size-10 items-center justify-center rounded-full ring-4 transition-colors",
                  hecho && "bg-emerald-600 text-white ring-emerald-100",
                  enCurso && "bg-gradient-brand text-white shadow-brand ring-azul-100",
                  !hecho && !enCurso && "bg-card text-noche-400 ring-noche-100",
                )}
              >
                {hecho ? <Check className="size-5" /> : <Icono className="size-5" />}
              </span>
              <span className={cn("mt-2 text-sm font-semibold", i <= actual ? "text-foreground" : "text-muted-foreground")}>
                {p.titulo}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{p.detalle}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
