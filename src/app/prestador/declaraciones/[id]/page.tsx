import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  FilePlus2,
  FileSignature,
  History,
  MessageSquareWarning,
  Scale,
  Send,
  ShieldCheck,
  Stamp,
  TriangleAlert,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getSesion, requerirEmpresa } from "@/lib/auth";
import { getRubros } from "@/lib/data/catalogos";
import {
  type CertificadoPlanilla,
  type DeclaracionVista,
  getAntelacion,
  getCertificadosDeDeclaracion,
  getDeclaracion,
  getEstablecimientosPorIds,
  getProductosAprobados,
  getSiguienteNumeroCertificado,
  getTecnicosAprobados,
  getVencimientoTanqueDias,
} from "@/lib/data/declaraciones";
import { ESTADO_DECLARACION, TIPO_SERVICIO } from "@/lib/domain/etiquetas";
import { formatFechaHora, formatRelativo, isoAFechaHoraLocal } from "@/lib/domain/formato";
import { habilitacionPara } from "../_lib/habilitacion";
import { type Antelacion, ahoraMs, problemasDeCertificado, type Problema, type TipoServicio, UNIDADES, type Unidad } from "../_lib/reglas";
import type { ServicioEditable } from "../_lib/tipos";
import { BotonEliminarDeclaracion } from "./_components/boton-eliminar-declaracion";
import { PlanillaProvider } from "./_components/contexto-planilla";
import { EtapasDeclaracion } from "./_components/etapas-declaracion";
import { FormularioServicio } from "./_components/formulario-servicio";
import { type Chequeo, PanelPresentacion } from "./_components/panel-presentacion";
import { PlanillaEditable, PlanillaLectura } from "./_components/planilla";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sesion = await getSesion();
  const declaracion = sesion?.empresa ? await getDeclaracion(sesion.empresa.id, id) : null;
  return { title: declaracion?.codigo ? `Declaración ${declaracion.codigo}` : "Declaración" };
}

// -----------------------------------------------------------------------------
// Cálculos (fuera de los componentes: usan la hora actual)
// -----------------------------------------------------------------------------

const EDITABLES = new Set<CertificadoPlanilla["estado"]>(["borrador", "observado"]);

function esUnidad(valor: string): valor is Unidad {
  return (UNIDADES as readonly string[]).includes(valor);
}

function evaluarPlanilla(tipo: TipoServicio, certificados: CertificadoPlanilla[], antelacion: Antelacion) {
  const ahora = ahoraMs();
  const pendientes = certificados.filter((c) => EDITABLES.has(c.estado));
  const problemas: Record<string, Problema[]> = {};
  for (const c of pendientes) {
    problemas[c.id] = problemasDeCertificado(
      {
        tipo,
        firmado: c.firmado,
        fechaServicio: c.fechaServicio,
        cantidadProductos: c.productos.length,
        analisisCompletos: Boolean(c.analisisBacteriologico && c.analisisFisicoquimico),
      },
      antelacion,
      ahora,
    );
  }
  const cuantos = (...codigos: Problema["codigo"][]) =>
    pendientes.filter((c) => problemas[c.id].some((p) => codigos.includes(p.codigo))).length;
  return { pendientes, problemas, cuantos };
}

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

function aEditable(c: CertificadoPlanilla, establecimiento: { nombre: string; domicilio: string } | undefined): ServicioEditable {
  return {
    id: c.id,
    numero: c.numero,
    establecimiento: c.establecimientoId
      ? {
          id: c.establecimientoId,
          nombre: establecimiento?.nombre ?? "Establecimiento vinculado",
          domicilio: establecimiento?.domicilio ?? c.domicilio,
        }
      : null,
    cliente: c.cliente,
    clienteCuit: c.clienteCuit ?? "",
    domicilio: c.domicilio,
    rubroId: c.rubroId !== null ? String(c.rubroId) : "",
    rubroNombre: c.rubroNombre,
    superficie: c.superficieM2 !== null ? String(c.superficieM2) : "",
    capacidad: c.capacidadLitros !== null ? String(c.capacidadLitros) : "",
    fechaLocal: c.fechaServicio ? isoAFechaHoraLocal(c.fechaServicio) : "",
    tecnicoId: c.tecnicoId ?? "",
    tecnicoNombre: c.tecnicoNombre,
    laboratorio: c.laboratorio ?? "",
    analisisBacteriologico: c.analisisBacteriologico,
    analisisFisicoquimico: c.analisisFisicoquimico,
    productos: c.productos.map((p) => ({
      productoId: p.productoId,
      cantidad: String(p.cantidad),
      unidad: esUnidad(p.unidad) ? p.unidad : "ml",
      nombre: p.nombre,
    })),
    firmado: c.firmado,
    observacion: c.estado === "observado" ? c.observaciones : null,
  };
}

function lineaDeTiempo(d: DeclaracionVista, estado: NonNullable<DeclaracionVista["estado"]>): TimelineItem[] {
  const items: TimelineItem[] = [];
  if (d.created_at) items.push({ id: "creada", date: d.created_at, title: "Planilla creada", tone: "neutral", icon: FilePlus2 });
  const reenviada = Boolean(d.presentada_at && d.controlada_at && Date.parse(d.presentada_at) > Date.parse(d.controlada_at));
  if (d.presentada_at) {
    items.push({
      id: "presentada",
      date: d.presentada_at,
      title: reenviada ? "Presentada nuevamente" : "Presentada ante Control de Empresas",
      description: reenviada ? "Con las correcciones de lo observado." : "Quedó a la espera del control del área.",
      tone: "azul",
      icon: Send,
    });
  }
  if (d.controlada_at) {
    const control =
      estado === "controlada"
        ? { title: "Controlada por el área", tone: "verde" as const, icon: ShieldCheck }
        : estado === "rechazada"
          ? { title: "Rechazada por el área", tone: "rojo" as const, icon: TriangleAlert }
          : { title: "Observada por el área", tone: "ambar" as const, icon: MessageSquareWarning };
    items.push({ id: "control", date: d.controlada_at, description: d.observaciones ?? undefined, ...control });
  }
  // Más reciente primero (se compara el instante: PostgREST no siempre devuelve la misma cantidad de decimales).
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// -----------------------------------------------------------------------------
// Página
// -----------------------------------------------------------------------------

export default async function DeclaracionPage({ params }: Props) {
  const sesion = await requerirEmpresa();
  const { id } = await params;
  const empresa = sesion.empresa;

  const declaracion = await getDeclaracion(empresa.id, id);
  if (!declaracion?.id) notFound();

  const declaracionId = declaracion.id;
  const estado = declaracion.estado ?? "borrador";
  const tipo: TipoServicio = declaracion.tipo ?? "fumigacion";
  const codigo = declaracion.codigo ?? "Declaración";
  const editable = estado === "borrador" || estado === "observada";

  const [certificados, antelacion] = await Promise.all([
    getCertificadosDeDeclaracion(empresa.id, declaracionId),
    getAntelacion(),
  ]);

  const total = certificados.length;
  const firmados = certificados.filter((c) => c.firmado).length;
  const observados = certificados.filter((c) => c.estado === "observado").length;
  const timbrados = certificados.filter((c) => c.estado === "timbrado").length;
  const controlados = certificados.filter((c) => c.estado === "controlado" || c.estado === "timbrado").length;
  const anulados = certificados.filter((c) => c.estado === "anulado").length;
  const primerServicio = declaracion.primer_servicio;
  const esTecnico = sesion.perfil.rol === "tecnico" && Boolean(sesion.perfil.tecnico_id);

  const encabezado = (
    <PageHeader
      title={`Declaración ${codigo}`}
      icon={ClipboardList}
      breadcrumb={[
        { label: "Inicio", href: "/prestador" },
        { label: "Declaraciones", href: "/prestador/declaraciones" },
        { label: codigo },
      ]}
      description={`Planilla de ${TIPO_SERVICIO[tipo].label.toLowerCase()} · creada ${formatRelativo(declaracion.created_at)}`}
      actions={
        editable && estado === "borrador" ? (
          <BotonEliminarDeclaracion id={declaracionId} codigo={codigo} servicios={total} />
        ) : estado === "controlada" ? (
          <Button asChild variant="sol">
            <Link href="/prestador/pagos">
              <Stamp aria-hidden />
              Pagar el timbrado
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <EstadoBadge mapa={ESTADO_DECLARACION} valor={estado} size="lg" pulse={estado === "presentada"} />
        <EstadoBadge mapa={TIPO_SERVICIO} valor={tipo} size="lg" />
        {declaracion.presentada_at ? (
          <span className="text-[13px] text-muted-foreground">Presentada el {formatFechaHora(declaracion.presentada_at)}</span>
        ) : null}
      </div>
    </PageHeader>
  );

  const historial = (
    <SectionCard title="Historial" description="Movimientos de la planilla" icon={History}>
      <Timeline items={lineaDeTiempo(declaracion, estado)} />
    </SectionCard>
  );

  // ---------------------------------------------------------------------------
  // Solo lectura: presentada, controlada o rechazada
  // ---------------------------------------------------------------------------
  if (!editable) {
    return (
      <div className="flex flex-col gap-6">
        {encabezado}
        <EtapasDeclaracion
          estado={estado}
          tipo={tipo}
          antelacion={antelacion}
          certificados={total - anulados}
          timbrados={timbrados}
        />

        {estado === "presentada" ? (
          <Alert tone="info" title="En revisión por Control de Empresas">
            El área coteja cada certificado con la planilla, el rubro y el vencimiento. Si encuentra algo para corregir, la
            declaración vuelve como observada y te avisamos.
          </Alert>
        ) : null}
        {estado === "controlada" ? (
          <Alert
            tone="success"
            title="Planilla controlada"
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/prestador/pagos">Ir a pagos</Link>
              </Button>
            }
          >
            Los certificados controlados quedan listos para liquidar el timbrado. Una vez verificado el pago, se sellan
            digitalmente y pasan a ser válidos.
          </Alert>
        ) : null}
        {estado === "rechazada" ? (
          <Alert tone="danger" title="Declaración rechazada">
            {declaracion.observaciones ?? "El área de Control de Empresas rechazó la planilla."} Los certificados sin pagar
            quedaron anulados: si corresponde, cargá una nueva declaración.
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Servicios declarados" value={total} icon={ClipboardList} />
          <StatCard label="Controlados" value={controlados} icon={ShieldCheck} tone="celeste" hint={`de ${total - anulados} vigentes`} />
          <StatCard label="Timbrados" value={timbrados} icon={BadgeCheck} tone="verde" hint="válidos frente al cliente" />
          <StatCard
            label="Primer servicio"
            value={primerServicio ? formatFechaHora(primerServicio) : "—"}
            icon={CalendarClock}
            tone="neutral"
            hint={primerServicio ? formatRelativo(primerServicio) : undefined}
          />
        </div>

        <SectionCard
          title="Certificados de la planilla"
          description="Estado de cada certificado. Desde acá podés verlos o imprimir sus ejemplares."
          icon={BadgeCheck}
          flush
        >
          {total > 0 ? (
            <PlanillaLectura tipo={tipo} certificados={certificados} />
          ) : (
            <EmptyState compact icon={ClipboardList} title="La planilla no tiene certificados" className="m-5 border-0" />
          )}
        </SectionCard>

        {historial}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Editable: borrador u observada
  // ---------------------------------------------------------------------------
  const [rubros, tecnicos, productos, numeroSugerido, establecimientos, diasTanque] = await Promise.all([
    getRubros(),
    getTecnicosAprobados(empresa.id),
    getProductosAprobados(empresa.id),
    getSiguienteNumeroCertificado(empresa.id, tipo),
    getEstablecimientosPorIds(certificados.flatMap((c) => (c.establecimientoId ? [c.establecimientoId] : []))),
    getVencimientoTanqueDias(),
  ]);

  const { pendientes, problemas, cuantos } = evaluarPlanilla(tipo, certificados, antelacion);
  const habilitacion = habilitacionPara(empresa, tipo);
  const n = pendientes.length;
  const sinFirma = cuantos("sin_firma");
  const fueraDePlazo = cuantos("fuera_de_plazo", "tanque_no_realizado");
  const incompletos = cuantos("sin_productos", "sin_analisis");

  const chequeos: Chequeo[] = [
    {
      id: "servicios",
      ok: n > 0,
      titulo: n > 0 ? `${plural(n, "servicio", "servicios")} para presentar` : "Cargá al menos un servicio",
      detalle: n > 0 ? "Cada uno con rubro del Anexo y fecha." : "Usá “Agregar servicio”.",
    },
    {
      id: "firmas",
      ok: n > 0 && sinFirma === 0,
      titulo: "Firma del asesor técnico",
      detalle: n === 0 ? "Sin servicios cargados." : sinFirma === 0 ? "Todos firmados." : `Faltan ${plural(sinFirma, "firma", "firmas")}.`,
    },
    {
      id: "plazo",
      ok: n > 0 && fueraDePlazo === 0,
      titulo: tipo === "fumigacion" ? `Entre ${antelacion.minHoras} y ${antelacion.maxHoras} h antes` : "Limpiezas ya realizadas",
      detalle:
        n === 0
          ? "Sin servicios cargados."
          : fueraDePlazo === 0
            ? "Todas las fechas están en regla."
            : `${plural(fueraDePlazo, "servicio fuera de plazo", "servicios fuera de plazo")}: corregí la fecha.`,
    },
    {
      id: "datos",
      ok: n > 0 && incompletos === 0,
      titulo: tipo === "fumigacion" ? "Productos aplicados" : "Análisis del agua adjuntos",
      detalle:
        n === 0
          ? "Sin servicios cargados."
          : incompletos === 0
            ? "Completo."
            : `${plural(incompletos, "servicio incompleto", "servicios incompletos")}.`,
    },
    { id: "habilitacion", ok: habilitacion.ok, titulo: habilitacion.titulo, detalle: habilitacion.detalle },
  ];

  // Solo firma el asesor asignado y, además, aprobado por la Dirección (si no, la RPC lo rechazaría).
  const tecnicoAprobado = esTecnico && tecnicos.some((t) => t.id === sesion.perfil.tecnico_id);
  const firmables = tecnicoAprobado
    ? pendientes.filter((c) => c.tecnicoId === sesion.perfil.tecnico_id && !c.firmado).map((c) => c.id)
    : [];
  const porEstablecimiento = new Map(establecimientos.map((e) => [e.id, e]));
  const servicios: Record<string, ServicioEditable> = Object.fromEntries(
    pendientes.map((c) => [c.id, aEditable(c, c.establecimientoId ? porEstablecimiento.get(c.establecimientoId) : undefined)]),
  );

  return (
    <PlanillaProvider
      value={{
        declaracionId,
        empresaId: empresa.id,
        tipo,
        antelacion,
        diasTanque,
        numeroSugerido,
        rubros: rubros.map((r) => ({ id: r.id, nombre: r.nombre, grupo: r.grupo, periodicidad: r.periodicidad })),
        tecnicos: tecnicos.map((t) => ({
          id: t.id,
          nombre: `${t.nombre} ${t.apellido}`,
          detalle: [t.titulo, t.matricula ? `Mat. ${t.matricula}` : null].filter(Boolean).join(" · ") || null,
          esRepresentante: t.es_representante,
        })),
        productos: productos.map((p) => ({
          id: p.producto_id,
          nombre: p.producto_nombre ?? "Producto",
          principioActivo: p.principio_activo,
          clase: p.clase,
          organismo: p.organismo,
          registro: p.registro_numero,
          plazoReingresoHoras: p.plazo_reingreso_horas,
          dosis: p.dosis,
        })),
      }}
    >
      <div className="flex flex-col gap-6">
        {encabezado}
        <EtapasDeclaracion
          estado={estado}
          tipo={tipo}
          antelacion={antelacion}
          certificados={total - anulados}
          timbrados={timbrados}
        />

        {estado === "observada" ? (
          <Alert tone="warning" title="El área de Control observó la planilla">
            {declaracion.observaciones ? <p className="mb-1">{declaracion.observaciones}</p> : null}
            <p>
              Corregí {observados === 1 ? "el certificado observado" : `los ${observados} certificados observados`} (están
              resaltados abajo) y volvé a presentar. Los certificados ya controlados siguen su curso.
            </p>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Servicios en la planilla" value={total} icon={ClipboardList} hint={total ? `${n} para presentar` : "Todavía sin cargar"} />
          <StatCard
            label="Firmados por el asesor"
            value={`${firmados} de ${total}`}
            icon={FileSignature}
            tone={total > 0 && firmados === total ? "verde" : "ambar"}
            hint={sinFirma ? `${plural(sinFirma, "pendiente", "pendientes")} de firma` : "Sin firmas pendientes"}
            href={esTecnico ? "/prestador/firmas" : undefined}
          />
          <StatCard
            label="Observados"
            value={observados}
            icon={MessageSquareWarning}
            tone={observados > 0 ? "rojo" : "neutral"}
            hint={observados > 0 ? "Requieren corrección" : "Sin observaciones"}
          />
          <StatCard
            label="Primer servicio"
            value={primerServicio ? formatFechaHora(primerServicio) : "—"}
            icon={CalendarClock}
            tone="celeste"
            hint={primerServicio ? formatRelativo(primerServicio) : "Cargá un servicio para verlo"}
          />
        </div>

        <PanelPresentacion
          declaracionId={declaracionId}
          codigo={codigo}
          reenvio={estado === "observada"}
          chequeos={chequeos}
          firmables={firmables}
        />

        <SectionCard
          title="Planilla de trabajos"
          description={
            tipo === "fumigacion"
              ? "Una fila por servicio: domicilio, cliente, superficie, rubro, productos y fecha (Art. 9.º a)."
              : "Una fila por limpieza de tanque, con capacidad y análisis del agua (Ord. 2004/92)."
          }
          icon={ClipboardList}
          flush
          actions={total > 0 ? <FormularioServicio /> : null}
          footer={
            total > 0 ? (
              <span className="text-[13px] text-muted-foreground">
                {esTecnico
                  ? "Firmás desde esta planilla o desde Firmas pendientes."
                  : "Cada asesor técnico firma sus certificados desde su usuario, en “Firmas pendientes”."}
              </span>
            ) : null
          }
        >
          {total > 0 ? (
            <PlanillaEditable
              tipo={tipo}
              certificados={certificados}
              problemas={problemas}
              firmables={firmables}
              servicios={servicios}
            />
          ) : (
            <div className="p-5 sm:p-6">
              <EmptyState
                icon={ClipboardList}
                title="La planilla está vacía"
                description={
                  tipo === "fumigacion"
                    ? `Cargá cada servicio que vas a realizar entre ${antelacion.minHoras} y ${antelacion.maxHoras} horas desde ahora. El vencimiento se calcula solo, según el rubro.`
                    : "Cargá cada limpieza de tanque ya realizada, con su capacidad y los análisis del agua."
                }
                action={<FormularioServicio disparador="vacio" />}
              />
            </div>
          )}
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Reglas de la planilla" description="Lo que controla el sistema al presentar" icon={Scale}>
            <ul className="flex flex-col gap-3 text-sm">
              {(tipo === "fumigacion"
                ? [
                    `Presentá la planilla entre ${antelacion.minHoras} y ${antelacion.maxHoras} horas antes de cada servicio (Art. 9.º a, Ord. 2681/98).`,
                    "El rubro sale del Anexo y define el vencimiento: no hace falta calcularlo.",
                    "Firma el asesor o representante técnico registrado, no el titular de la empresa (Art. 5.º).",
                    "Solo productos aprobados en tu memoria técnica, con su cantidad aplicada.",
                  ]
                : [
                    "Declarás la limpieza una vez realizada, con la capacidad del tanque.",
                    "Adjuntá los análisis bacteriológico y físico-químico del agua tomados después de la limpieza.",
                    `El certificado vence a los ${diasTanque} días (Ord. 2004/92, t.o. Ord. 3098/01).`,
                    "Firma el asesor o representante técnico registrado (Art. 5.º).",
                  ]
              ).map((regla) => (
                <li key={regla} className="flex items-start gap-2.5">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sol-400 ring-2 ring-sol-100" />
                  <span className="text-foreground/85">{regla}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
          {historial}
        </div>
      </div>
    </PlanillaProvider>
  );
}
