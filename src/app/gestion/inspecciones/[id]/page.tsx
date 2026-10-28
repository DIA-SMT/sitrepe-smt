import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BellRing,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  DoorClosed,
  FilePenLine,
  MapPin,
  Navigation,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { Mapa } from "@/components/mapa/mapa";
import { peorEstado, type PuntoMapa } from "@/components/mapa/tipos";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { getContextoInspeccion, getInspeccion, getInspectores, uuidValido } from "@/lib/data/fiscalizacion";
import {
  ESTADO_ACTA,
  ESTADO_INSPECCION,
  MOTIVO_ACTA,
  RESULTADO_INSPECCION,
  TIPO_INSPECCION,
} from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, hoyISO } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { DialogoCancelar, DialogoReprogramar } from "../_components/acciones-inspeccion";
import { ALCANCE_TIPO, checklistPara, etiquetaItem, leerChecklist } from "../_components/checklist";
import {
  hrefComoLlegar,
  TarjetaCertificado,
  TarjetaDenuncia,
  TarjetaEmpresa,
  TarjetaEstablecimiento,
} from "../_components/contexto";
import { FormResultado } from "../_components/form-resultado";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const valido = uuidValido(id);
  const insp = valido ? await getInspeccion(valido) : null;
  return { title: insp?.codigo ? `Inspección ${insp.codigo}` : "Inspección" };
}

type Contexto = Awaited<ReturnType<typeof getContextoInspeccion>>;

/** Motivo sugerido para el acta según el tipo de inspección y lo que se sabe del lugar. */
function motivoSugerido(tipo: Enums<"tipo_inspeccion">, ctx: Contexto): Enums<"motivo_acta"> | null {
  const est = ctx.establecimiento;
  switch (tipo) {
    case "muestreo_servicio":
      return "servicio_irregular";
    case "control_vencimiento":
    case "reinspeccion":
      if (est?.estado_fumigacion === "vencido") return "certificado_vencido";
      if (est?.estado_fumigacion === "sin_certificado") return "sin_certificado";
      if (est?.estado_tanque === "vencido" || est?.estado_tanque === "sin_certificado") return "tanque_sin_limpieza";
      return null;
    case "denuncia":
      switch (ctx.denuncia?.tipo) {
        case "empresa_no_habilitada":
          return "empresa_no_habilitada";
        case "establecimiento_sin_certificado":
          return "sin_certificado";
        case "tanque_sin_limpieza":
          return "tanque_sin_limpieza";
        case "servicio_mal_realizado":
          return "servicio_irregular";
        default:
          return null;
      }
    default:
      return null;
  }
}

const ESTILO_RESULTADO: Record<Enums<"resultado_inspeccion">, { icono: typeof CheckCircle2; caja: string; texto: string }> = {
  conforme: { icono: CheckCircle2, caja: "border-emerald-200 bg-emerald-50", texto: "text-emerald-800" },
  no_conforme: { icono: XCircle, caja: "border-red-200 bg-red-50", texto: "text-red-800" },
  ausente: { icono: DoorClosed, caja: "border-amber-200 bg-amber-50", texto: "text-amber-900" },
};

export default async function InspeccionPage({ params }: Props) {
  const sesion = await requerirStaff();
  const { id: idParam } = await params;
  const id = uuidValido(idParam);
  if (!id) notFound();
  const insp = await getInspeccion(id);
  if (!insp || !insp.id || !insp.tipo || !insp.estado) notFound();

  const [ctx, inspectores] = await Promise.all([getContextoInspeccion(insp), getInspectores()]);
  const tipo = insp.tipo;
  const est = ctx.establecimiento;
  const items = checklistPara(tipo, { tieneTanque: est?.tiene_tanque ?? false });
  const hoy = hoyISO();
  const esDeposito = tipo === "deposito_anual" || tipo === "habilitacion";

  const motivo = motivoSugerido(tipo, ctx);
  const actaParams = new URLSearchParams({ inspeccion: insp.id });
  if (insp.establecimiento_id) actaParams.set("establecimiento", insp.establecimiento_id);
  if (insp.empresa_id) actaParams.set("empresa", insp.empresa_id);
  if (motivo) actaParams.set("motivo", motivo);
  const hrefActa = `/gestion/actas/nueva?${actaParams}`;

  const reinspParams = new URLSearchParams({ tipo: "reinspeccion" });
  if (insp.establecimiento_id) reinspParams.set("establecimiento", insp.establecimiento_id);
  if (insp.empresa_id) reinspParams.set("empresa", insp.empresa_id);
  const hrefReinspeccion = `/gestion/inspecciones/nueva?${reinspParams}`;

  const lugarTitulo = insp.establecimiento_nombre ?? insp.empresa_nombre ?? "Lugar sin identificar";
  const lugarDomicilio = esDeposito
    ? (ctx.empresa?.domicilio_deposito ?? insp.establecimiento_domicilio)
    : (insp.establecimiento_domicilio ?? ctx.certificado?.domicilio ?? ctx.empresa?.domicilio_deposito);
  const llegar = hrefComoLlegar({ lat: esDeposito ? null : est?.lat, lng: esDeposito ? null : est?.lng, domicilio: lugarDomicilio });
  const noConforme = insp.estado === "realizada" && (insp.resultado === "no_conforme" || insp.resultado === "ausente");

  const puntos: PuntoMapa[] = [];
  if (typeof insp.lat === "number" && typeof insp.lng === "number") {
    puntos.push({ id: "inspeccion", lat: insp.lat, lng: insp.lng, titulo: "Ubicación registrada", subtitulo: formatFechaHora(insp.realizada_at), estado: "info" });
  }
  if (est?.id && typeof est.lat === "number" && typeof est.lng === "number") {
    puntos.push({
      id: est.id,
      lat: est.lat,
      lng: est.lng,
      titulo: est.nombre ?? "Establecimiento",
      subtitulo: est.domicilio,
      estado: peorEstado(est.estado_fumigacion, est.estado_tanque),
      href: `/gestion/establecimientos/${est.id}`,
    });
  }

  const historia: TimelineItem[] = [];
  if (insp.created_at) {
    historia.push({
      date: insp.created_at,
      title: "Inspección programada",
      description: `Para el ${formatFecha(insp.fecha_programada)}${insp.inspector_nombre ? ` · ${insp.inspector_nombre}` : ""}`,
      tone: "azul",
      icon: CalendarCheck,
    });
  }
  if (insp.estado === "realizada" && insp.realizada_at) {
    const r = insp.resultado ? RESULTADO_INSPECCION[insp.resultado] : null;
    historia.push({
      date: insp.realizada_at,
      title: `Inspección realizada${r ? `: ${r.label.toLowerCase()}` : ""}`,
      tone: insp.resultado === "conforme" ? "verde" : insp.resultado === "ausente" ? "ambar" : "rojo",
      icon: ShieldCheck,
    });
  }
  if (insp.estado === "cancelada" && insp.updated_at) {
    historia.push({ date: insp.updated_at, title: "Inspección cancelada", tone: "neutral" });
  }
  for (const a of ctx.actas) {
    if (a.fecha) {
      historia.push({
        id: a.id ?? undefined,
        date: a.fecha,
        title: `Acta ${a.numero ?? ""} labrada`,
        description: a.motivo ? MOTIVO_ACTA[a.motivo].label : undefined,
        tone: "violeta",
        icon: FilePenLine,
      });
    }
  }
  historia.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const lugarRapido = (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card lg:hidden">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
          <MapPin className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display font-semibold text-foreground">{lugarTitulo}</p>
          {lugarDomicilio ? <p className="text-sm text-muted-foreground">{lugarDomicilio}</p> : null}
        </div>
      </div>
      {llegar ? (
        <Button asChild variant="outline" className="w-full">
          <a href={llegar} target="_blank" rel="noreferrer">
            <Navigation aria-hidden /> Cómo llegar
          </a>
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <PageHeader
        title={`Inspección ${insp.codigo ?? ""}`}
        description={`${TIPO_INSPECCION[tipo].label} · ${lugarTitulo}`}
        icon={ShieldCheck}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Inspecciones", href: "/gestion/inspecciones" },
          { label: insp.codigo ?? "Inspección" },
        ]}
        actions={
          insp.estado === "programada" ? (
            <>
              <DialogoReprogramar
                inspeccionId={insp.id}
                fechaActual={insp.fecha_programada ?? hoy}
                fechaMinima={hoy}
                inspectorActual={insp.inspector_id}
                inspectorActualNombre={insp.inspector_nombre}
                inspectores={inspectores}
              />
              <DialogoCancelar inspeccionId={insp.id} codigo={insp.codigo} />
            </>
          ) : noConforme ? (
            <>
              {insp.establecimiento_id ? (
                <Button asChild variant="outline">
                  <Link href={`/gestion/notificaciones/nueva?establecimiento=${insp.establecimiento_id}`}>
                    <BellRing aria-hidden /> Notificar
                  </Link>
                </Button>
              ) : null}
              {insp.resultado === "no_conforme" ? (
                <Button asChild variant="sol">
                  <Link href={hrefActa}>
                    <FilePenLine aria-hidden /> Labrar acta
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href={hrefReinspeccion}>
                    <CalendarPlus aria-hidden /> Programar nueva visita
                  </Link>
                </Button>
              )}
            </>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={TIPO_INSPECCION} valor={tipo} />
          <EstadoBadge mapa={ESTADO_INSPECCION} valor={insp.estado} pulse={insp.estado === "programada"} />
          {insp.resultado ? <EstadoBadge mapa={RESULTADO_INSPECCION} valor={insp.resultado} /> : null}
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <CalendarCheck className="size-3.5" aria-hidden /> {formatFecha(insp.fecha_programada)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden /> {insp.inspector_nombre ?? "Sin inspector asignado"}
          </span>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {lugarRapido}

          {insp.estado === "programada" ? (
            <>
              {insp.fecha_programada && insp.fecha_programada > hoy ? (
                <Alert tone="info" title={`Programada para el ${formatFecha(insp.fecha_programada)}`}>
                  Si la visita se adelanta, podés registrar el resultado igual.
                </Alert>
              ) : insp.fecha_programada && insp.fecha_programada < hoy ? (
                <Alert tone="warning" title="Inspección atrasada">
                  Estaba programada para el {formatFecha(insp.fecha_programada)}. Registrá el resultado o reprogramala.
                </Alert>
              ) : null}
              {insp.inspector_id && insp.inspector_id !== sesion.userId ? (
                <Alert tone="info" title={`Asignada a ${insp.inspector_nombre ?? "otra persona"}`}>
                  Podés registrar el resultado si la hiciste vos: la auditoría deja constancia de tu usuario.
                </Alert>
              ) : null}
              {insp.observaciones ? (
                <Alert tone="info" title="Indicaciones para la visita" icon={<ClipboardList />}>
                  <p className="whitespace-pre-line">{insp.observaciones}</p>
                </Alert>
              ) : null}
              <SectionCard title="Registrar resultado" description={ALCANCE_TIPO[tipo]} icon={ClipboardList}>
                <FormResultado inspeccionId={insp.id} items={items} />
              </SectionCard>
            </>
          ) : null}

          {insp.estado === "realizada" && insp.resultado ? (
            <ResultadoRegistrado insp={insp} resultado={insp.resultado} hrefActa={hrefActa} hrefReinspeccion={hrefReinspeccion} puntos={puntos} />
          ) : null}

          {insp.estado === "cancelada" ? (
            <Alert tone="warning" title="Inspección cancelada">
              <p className="whitespace-pre-line">{insp.observaciones ?? "Sin motivo registrado."}</p>
            </Alert>
          ) : null}

          {ctx.actas.length > 0 ? (
            <SectionCard title="Actas labradas" icon={FilePenLine} flush>
              <ul className="divide-y divide-border">
                {ctx.actas.map((a) => (
                  <li key={a.id ?? a.numero} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
                    <div className="min-w-0">
                      <Link href={`/gestion/actas/${a.id}`} className="font-medium text-foreground hover:text-azul-700">
                        Acta {a.numero}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {a.motivo ? MOTIVO_ACTA[a.motivo].label : "—"} · {formatFecha(a.fecha)}
                      </p>
                    </div>
                    <EstadoBadge mapa={ESTADO_ACTA} valor={a.estado} size="sm" />
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {historia.length > 0 ? (
            <SectionCard title="Historial" icon={CalendarCheck}>
              <Timeline items={historia} />
            </SectionCard>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="Datos del lugar y antecedentes">
          {est && !esDeposito ? <TarjetaEstablecimiento establecimiento={est} /> : null}
          {puntos.length > 0 && !(insp.estado === "realizada" && puntos.some((p) => p.id === "inspeccion")) ? (
            <Mapa puntos={puntos} ajustar leyenda={false} altoClassName="h-56" titulo="Ubicación del establecimiento" />
          ) : null}
          {ctx.certificado ? <TarjetaCertificado certificado={ctx.certificado} /> : null}
          {ctx.empresa ? <TarjetaEmpresa empresa={ctx.empresa} deposito={esDeposito} /> : null}
          {ctx.denuncia ? <TarjetaDenuncia denuncia={ctx.denuncia} /> : null}
        </aside>
      </div>
    </>
  );
}

function ResultadoRegistrado({
  insp,
  resultado,
  hrefActa,
  hrefReinspeccion,
  puntos,
}: {
  insp: NonNullable<Awaited<ReturnType<typeof getInspeccion>>>;
  resultado: Enums<"resultado_inspeccion">;
  hrefActa: string;
  hrefReinspeccion: string;
  puntos: PuntoMapa[];
}) {
  const estilo = ESTILO_RESULTADO[resultado];
  const Icono = estilo.icono;
  const checklist = leerChecklist(insp.checklist);
  const inspeccionPunto = puntos.find((p) => p.id === "inspeccion");

  return (
    <SectionCard title="Resultado" icon={ShieldCheck}>
      <div className="flex flex-col gap-6">
        <div className={cn("flex items-center gap-4 rounded-2xl border p-4", estilo.caja)}>
          <Icono className={cn("size-10 shrink-0", estilo.texto)} aria-hidden />
          <div>
            <p className={cn("font-display text-xl font-semibold", estilo.texto)}>{RESULTADO_INSPECCION[resultado].label}</p>
            <p className="text-sm text-foreground/75">
              Realizada el {formatFechaHora(insp.realizada_at)}
              {insp.inspector_nombre ? ` · ${insp.inspector_nombre}` : ""}
            </p>
          </div>
        </div>

        {resultado !== "conforme" ? (
          <Alert
            tone={resultado === "no_conforme" ? "danger" : "warning"}
            title={resultado === "no_conforme" ? "Se constataron irregularidades" : "No se pudo inspeccionar"}
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild size="sm" variant="outline">
                  <Link href={hrefReinspeccion}>
                    <CalendarPlus aria-hidden /> Reinspección
                  </Link>
                </Button>
                <Button asChild size="sm" variant={resultado === "no_conforme" ? "sol" : "outline"}>
                  <Link href={hrefActa}>
                    <FilePenLine aria-hidden /> Labrar acta
                  </Link>
                </Button>
              </div>
            }
          >
            {resultado === "no_conforme"
              ? "Labrá el acta de infracción (Código de Faltas, Ord. 758/82) o programá una reinspección."
              : "Programá una nueva visita para completar el control o, si corresponde, labrá el acta."}
          </Alert>
        ) : null}

        {checklist.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Verificaciones</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {checklist.map((c) => (
                <li
                  key={c.clave}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
                    c.cumple ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/60",
                  )}
                >
                  {c.cumple ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
                  )}
                  <span>
                    <span className="sr-only">{c.cumple ? "Cumple: " : "No cumple: "}</span>
                    {etiquetaItem(c.clave)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Observaciones</p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
            {insp.observaciones ?? <span className="text-muted-foreground">Sin observaciones.</span>}
          </p>
        </div>

        {inspeccionPunto ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ubicación registrada</p>
            <Mapa puntos={puntos} ajustar altoClassName="h-60" titulo="Ubicación registrada en la inspección" leyenda={false} />
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
