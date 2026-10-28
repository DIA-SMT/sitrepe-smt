import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  Ban,
  CheckCircle2,
  DoorClosed,
  DoorOpen,
  ExternalLink,
  GraduationCap,
  History,
  RotateCcw,
  UsersRound,
} from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requerirStaff } from "@/lib/auth";
import { getCapacitacion, listarInscripciones } from "@/lib/data/admin";
import { ESTADO_CAPACITACION, MODALIDAD_CAPACITACION } from "@/lib/domain/etiquetas";
import { formatFechaHora, formatFechaLarga, formatNumero, formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { AccionConfirmada, BotonAccion } from "../../configuracion/_compartido/acciones-cliente";
import { cambiarEstadoCapacitacion } from "../actions";
import { BarraCupo } from "../_components/cupo";
import { DialogoCapacitacion } from "../_components/dialogo-capacitacion";
import { FechaCapacitacion, horarioCapacitacion } from "../_components/tarjeta-capacitacion";
import { type FilaInscripto, TablaInscriptos } from "./_components/tabla-inscriptos";

type Props = { params: Promise<{ id: string }> };

/** ¿La capacitación ya empezó? (se evalúa en cada request: la página es dinámica). */
function yaComenzo(fechaInicio: string): boolean {
  return new Date(fechaInicio).getTime() <= Date.now();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await getCapacitacion(id);
  return { title: c ? c.titulo : "Capacitación no encontrada" };
}

export default async function CapacitacionDetallePage({ params }: Props) {
  const sesion = await requerirStaff();
  const { id } = await params;
  const [capacitacion, inscripciones] = await Promise.all([getCapacitacion(id), listarInscripciones(id)]);
  if (!capacitacion) notFound();
  const c = capacitacion;
  const puedeEditar = sesion.perfil.rol === "admin" || sesion.perfil.rol === "control";
  const esAdmin = sesion.perfil.rol === "admin";

  const inscriptos = inscripciones.length;
  const presentes = inscripciones.filter((i) => i.asistio).length;
  const certificados = inscripciones.filter((i) => i.asistio && i.certificado_codigo).length;
  const pctAsistencia = inscriptos ? Math.round((presentes / inscriptos) * 100) : 0;
  const comenzo = yaComenzo(c.fecha_inicio);

  const filas: FilaInscripto[] = inscripciones.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    dni: i.dni,
    email: i.email,
    empresa: i.empresa?.nombre_comercial ?? i.empresa_texto ?? null,
    empresaId: i.empresa?.id ?? null,
    creado: i.created_at,
    asistio: i.asistio,
    certificado: i.certificado_codigo,
  }));

  const botonEstado = (estado: "abierta" | "cerrada" | "finalizada", etiqueta: string, icono: React.ReactNode) => (
    <BotonAccion accion={cambiarEstadoCapacitacion} campos={{ id: c.id, estado }} variant="outline">
      {icono}
      {etiqueta}
    </BotonAccion>
  );

  return (
    <>
      <PageHeader
        title={c.titulo}
        description={c.destinatarios ? `Dirigida a: ${c.destinatarios}` : undefined}
        icon={GraduationCap}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Capacitaciones", href: "/gestion/capacitaciones" },
          { label: "Detalle" },
        ]}
        actions={
          <>
            {esAdmin ? (
              <Button asChild variant="ghost">
                <Link href={`/gestion/auditoria?tabla=capacitaciones&registro=${c.id}`}>
                  <History aria-hidden />
                  Historial
                </Link>
              </Button>
            ) : null}
            {puedeEditar ? (
              <>
                {c.estado === "abierta"
                  ? botonEstado("cerrada", "Cerrar inscripción", <DoorClosed aria-hidden />)
                  : null}
                {c.estado === "cerrada" && !comenzo
                  ? botonEstado("abierta", "Reabrir inscripción", <DoorOpen aria-hidden />)
                  : null}
                {c.estado === "cerrada" && comenzo
                  ? botonEstado("finalizada", "Marcar finalizada", <CheckCircle2 aria-hidden />)
                  : null}
                {c.estado === "cancelada" ? botonEstado("cerrada", "Reactivar", <RotateCcw aria-hidden />) : null}
                {c.estado === "abierta" || c.estado === "cerrada" ? (
                  <AccionConfirmada
                    accion={cambiarEstadoCapacitacion}
                    campos={{ id: c.id, estado: "cancelada" }}
                    titulo="¿Cancelar la capacitación?"
                    descripcion={
                      inscriptos > 0
                        ? `Hay ${inscriptos} ${inscriptos === 1 ? "persona inscripta" : "personas inscriptas"}: avisales por correo. La capacitación deja de mostrarse en el portal.`
                        : "Deja de mostrarse en el portal. Podés reactivarla después."
                    }
                    confirmar="Sí, cancelar"
                    trigger={
                      <Button variant="ghost" className="text-danger hover:bg-danger-soft">
                        <Ban aria-hidden />
                        Cancelar
                      </Button>
                    }
                  />
                ) : null}
                <DialogoCapacitacion modo="editar" capacitacion={c} />
              </>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_CAPACITACION} valor={c.estado} size="lg" pulse={c.estado === "abierta"} />
          <EstadoBadge mapa={MODALIDAD_CAPACITACION} valor={c.modalidad} size="lg" />
          <span className="text-[13px] text-muted-foreground">
            {comenzo ? `Comenzó ${formatRelativo(c.fecha_inicio)}` : `Comienza ${formatRelativo(c.fecha_inicio)}`}
          </span>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6">
        {c.estado === "cancelada" ? (
          <Alert role="status" tone="warning" title="Capacitación cancelada">
            No se muestra en el portal ni admite inscripciones. Podés reactivarla si se reprograma.
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <SectionCard title="Datos de la capacitación" icon={GraduationCap}>
            <div className="flex flex-col gap-6 sm:flex-row">
              <FechaCapacitacion
                fecha={c.fecha_inicio}
                apagada={c.estado === "cancelada" || c.estado === "finalizada"}
                className="w-20"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-5">
                <KeyValue
                  items={[
                    { label: "Fecha", value: formatFechaLarga(c.fecha_inicio) },
                    {
                      label: "Horario",
                      value: horarioCapacitacion(c.fecha_inicio, c.duracion_horas),
                    },
                    {
                      label: c.modalidad === "virtual" ? "Plataforma" : "Lugar",
                      value: c.lugar,
                    },
                    {
                      label: "Cupo",
                      value: c.cupo ? `${formatNumero(c.cupo, 0)} personas` : "Sin límite",
                    },
                    {
                      label: "Destinatarios",
                      value: c.destinatarios,
                      full: true,
                    },
                  ]}
                />
                <div className="rounded-xl border border-border bg-subtle p-4">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Descripción</p>
                  <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-foreground">{c.descripcion}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Creada el {formatFechaHora(c.created_at)} · actualizada {formatRelativo(c.updated_at)}
                </p>
              </div>
            </div>
          </SectionCard>

          <Card className="relative gap-5 overflow-hidden p-6">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full bg-celeste-300/25 blur-2xl"
            />
            <div className="relative">
              <p className="text-sm font-medium text-muted-foreground">Ocupación del cupo</p>
              <p className="mt-1 font-display text-4xl font-semibold tracking-tight text-foreground nums-tabular">
                {inscriptos}
                {c.cupo ? <span className="text-xl text-muted-foreground"> / {c.cupo}</span> : null}
              </p>
            </div>
            <BarraCupo inscriptos={inscriptos} cupo={c.cupo} size="lg" className="relative" />
            <div className="relative grid grid-cols-2 gap-3">
              <Indicador
                icono={UsersRound}
                valor={presentes}
                etiqueta="Presentes"
                detalle={`${pctAsistencia} % de asistencia`}
                tono="verde"
              />
              <Indicador
                icono={Award}
                valor={certificados}
                etiqueta="Certificados"
                detalle="Códigos emitidos"
                tono="violeta"
              />
            </div>
            <p className="relative text-xs leading-relaxed text-muted-foreground">
              Al marcar la asistencia, el sistema asigna a cada persona un código de certificado (CAP-AAAA-NNNNNN).
            </p>
          </Card>
        </div>

        <SectionCard
          title="Inscriptos"
          description={
            inscriptos
              ? `${inscriptos} ${inscriptos === 1 ? "persona" : "personas"} · ${presentes} ${presentes === 1 ? "presente" : "presentes"}`
              : "Sin inscripciones todavía"
          }
          icon={UsersRound}
          flush
        >
          <TablaInscriptos
            inscriptos={filas}
            capacitacionId={c.id}
            titulo={c.titulo}
            puedeEditar={puedeEditar}
            permiteAsistencia={c.estado !== "cancelada"}
          />
        </SectionCard>

        <div className="flex justify-end">
          <Button asChild variant="link">
            <Link href="/capacitaciones" target="_blank" rel="noopener">
              Ver capacitaciones en el portal
              <ExternalLink aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

function Indicador({
  icono: Icono,
  valor,
  etiqueta,
  detalle,
  tono,
}: {
  icono: React.ComponentType<{ className?: string }>;
  valor: number;
  etiqueta: string;
  detalle: string;
  tono: "verde" | "violeta";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
      <span
        aria-hidden
        className={cn(
          "flex size-8 items-center justify-center rounded-lg ring-1",
          tono === "verde"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : "bg-violet-50 text-violet-700 ring-violet-200",
        )}
      >
        <Icono className="size-4" />
      </span>
      <p className="mt-1 font-display text-2xl leading-none font-semibold text-foreground nums-tabular">{valor}</p>
      <p className="text-[13px] font-medium text-foreground">{etiqueta}</p>
      <p className="text-xs text-muted-foreground">{detalle}</p>
    </div>
  );
}
