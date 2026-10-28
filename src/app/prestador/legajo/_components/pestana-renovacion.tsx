import Link from "next/link";
import { CalendarCheck2, CalendarClock, FileSignature, History } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { ESTADO_EMPRESA, ESTADO_TRAMITE, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaLarga } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { booleano, leerDatos, numero, texto } from "../../tramites/_lib/datos";
import { ESTADO_PLAZO, aniosDeclarables, textoDias } from "../_lib/plazos";
import { FormRenovacion } from "./form-renovacion";
import type { EmpresaLegajo, Renovacion } from "./tipos";

type PestanaRenovacionProps = {
  empresa: EmpresaLegajo;
  empresaId: string;
  hoy: string;
  renovaciones: Renovacion[];
  bloqueo: string | null;
};

const PASOS = [
  { titulo: "Completá la DDJJ", detalle: "Año declarado y categoría de la empresa." },
  { titulo: "Adjuntá la documentación", detalle: "DDJJ firmada y certificado de libre deuda." },
  { titulo: "La Dirección resuelve", detalle: "Al aprobarse, la habilitación se extiende hasta el 31/3 del año subsiguiente." },
];

export function PestanaRenovacion({ empresa, empresaId, hoy, renovaciones, bloqueo }: PestanaRenovacionProps) {
  const ultima = renovaciones[0] ?? null;
  const enCurso = renovaciones.find((r) => r.estado === "presentado" || r.estado === "observado") ?? null;
  const aprobados = renovaciones
    .filter((r) => r.estado === "aprobado")
    .map((r) => numero(leerDatos(r.datos), "anio"))
    .filter((a): a is number => a !== null);
  const { opciones, sugerido } = aniosDeclarables(hoy, aprobados);
  const plazoSugerido = opciones.find((o) => o.anio === sugerido) ?? null;
  const dias = empresa.dias_para_vencer;
  const estadoEmpresa = etiqueta(ESTADO_EMPRESA, empresa.estado_efectivo ?? empresa.estado);

  let aviso: React.ReactNode = null;
  if (bloqueo) {
    aviso = <Alert tone="danger" title="No podés presentar la renovación">{bloqueo}</Alert>;
  } else if (empresa.estado === "en_tramite") {
    aviso = (
      <Alert tone="info" title="Tu inscripción está en trámite">
        La renovación anual se presenta una vez que la Dirección apruebe la inscripción y habilite a la empresa.
      </Alert>
    );
  } else if (enCurso) {
    aviso = (
      <Alert
        tone={enCurso.estado === "observado" ? "warning" : "info"}
        title={enCurso.estado === "observado" ? "Tu renovación tiene observaciones" : "Tu renovación está en revisión"}
      >
        {enCurso.estado === "observado"
          ? `La Dirección hizo observaciones a la DDJJ (${enCurso.codigo ?? "trámite"}). Respondelas para que pueda resolverla.`
          : `La Dirección está revisando la DDJJ y el libre deuda (${enCurso.codigo ?? "trámite"}). Te avisaremos cuando la resuelva.`}{" "}
        <Link href={`/prestador/tramites/${enCurso.id}`} className="font-medium text-azul-700 underline-offset-4 hover:underline">
          {enCurso.estado === "observado" ? "Responder observaciones" : "Ver trámite"}
        </Link>
      </Alert>
    );
  } else if (opciones.length === 0 || sugerido === null) {
    aviso = (
      <Alert tone="success" title="Estás al día">
        Ya tenés aprobadas las DDJJ que se pueden presentar en este momento.
      </Alert>
    );
  }

  const historial: TimelineItem[] = renovaciones.map((r) => {
    const d = leerDatos(r.datos);
    const est = etiqueta(ESTADO_TRAMITE, r.estado);
    const anio = numero(d, "anio");
    const categoria = texto(d, "categoria");
    return {
      id: r.id,
      date: r.resuelto_at ?? r.presentado_at ?? r.created_at,
      title: (
        <Link href={`/prestador/tramites/${r.id}`} className="hover:text-azul-700 hover:underline">
          DDJJ {anio ?? "anual"} · {r.codigo ?? "trámite"}
        </Link>
      ),
      description: (
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge label={est.label} tone={est.tono} size="sm" />
          {categoria ? <span>Categoría {categoria}</span> : null}
          {booleano(d, "libre_deuda") ? <span>Con libre deuda</span> : null}
        </span>
      ),
      tone: r.estado === "aprobado" ? "verde" : r.estado === "rechazado" ? "rojo" : r.estado === "observado" ? "ambar" : "azul",
      icon: r.estado === "aprobado" ? CalendarCheck2 : FileSignature,
    };
  });

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <SectionCard
        className="lg:col-span-3"
        title="Declaración Jurada Anual de Categorización"
        description="Renovación anual de la habilitación con DDJJ y libre deuda (Art. 8.º, Ord. 2681/98)."
        icon={FileSignature}
      >
        <ol className="mb-6 grid gap-3 sm:grid-cols-3">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="relative rounded-xl border border-border bg-subtle/60 p-3.5">
              <span
                aria-hidden
                className="mb-2 flex size-7 items-center justify-center rounded-full bg-gradient-brand font-display text-xs font-semibold text-white shadow-brand"
              >
                {i + 1}
              </span>
              <p className="text-sm font-semibold">{p.titulo}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{p.detalle}</p>
            </li>
          ))}
        </ol>
        {aviso ?? (
          <FormRenovacion
            empresaId={empresaId}
            opciones={opciones.map((o) => ({ anio: o.anio, limite: o.limite, estado: o.estado }))}
            sugerido={sugerido ?? opciones[0].anio}
          />
        )}
      </SectionCard>

      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card className="relative gap-3 overflow-hidden p-5">
          <span aria-hidden className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-azul-400/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Vencimiento de la habilitación</p>
            <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
              <CalendarClock className="size-5" />
            </span>
          </div>
          <p className="relative font-display text-2xl font-semibold tracking-tight">
            {empresa.vencimiento_habilitacion ? formatFechaLarga(empresa.vencimiento_habilitacion) : "Sin fecha"}
          </p>
          <div className="relative flex flex-wrap items-center gap-2">
            <StatusBadge label={estadoEmpresa.label} tone={estadoEmpresa.tono} />
            {empresa.vencimiento_habilitacion ? (
              <span
                className={cn(
                  "text-[13px] font-medium",
                  dias !== null && dias < 0 ? "text-danger" : dias !== null && dias <= 30 ? "text-warning" : "text-muted-foreground",
                )}
              >
                {textoDias(dias)}
              </span>
            ) : null}
          </div>
          {plazoSugerido && !enCurso ? (
            <p className="relative mt-1 rounded-lg bg-subtle px-3 py-2 text-[13px] text-muted-foreground">
              Próxima presentación: <span className="font-medium text-foreground">DDJJ {plazoSugerido.anio}</span>, del{" "}
              {formatFecha(plazoSugerido.inicio)} al {formatFecha(plazoSugerido.limite)} ·{" "}
              <span className="font-medium">{ESTADO_PLAZO[plazoSugerido.estado].label.toLowerCase()}</span>.
            </p>
          ) : null}
        </Card>

        <SectionCard
          title="Historial de renovaciones"
          description={ultima ? `Última renovación · ${etiqueta(ESTADO_TRAMITE, ultima.estado).label}` : "Sin presentaciones"}
          icon={History}
        >
          {historial.length > 0 ? (
            <Timeline items={historial} />
          ) : (
            <EmptyState
              compact
              icon={History}
              title="Todavía no presentaste renovaciones"
              description="Cuando presentes tu primera DDJJ anual, vas a ver acá su estado."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
