import type { Metadata } from "next";
import Link from "next/link";
import { FilePenLine, History } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Alert } from "@/components/ui/alert";
import { requerirStaff } from "@/lib/auth";
import {
  MOTIVOS_ACTA,
  antecedentesActas,
  datosParaNuevaActa,
  fechaHoraLocalActual,
  listarInspectores,
  situacionEstablecimiento,
  textoParam,
  valorPermitido,
  type MotivoActa,
} from "@/lib/data/intimaciones";
import { ESTADO_ACTA, ESTADO_NOTIFICACION, MOTIVO_ACTA } from "@/lib/domain/etiquetas";
import { formatFecha } from "@/lib/domain/formato";
import { FormActa, type InspeccionVinculada, type NotificacionVinculada } from "../_components/form-acta";

export const metadata: Metadata = {
  title: "Labrar acta",
  description: "Acta de infracción con plantilla por motivo y normativa sugerida.",
};

type NuevaActaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NuevaActaPage({ searchParams }: NuevaActaPageProps) {
  const sesion = await requerirStaff();
  const params = await searchParams;

  const [datos, inspectores] = await Promise.all([
    datosParaNuevaActa({
      establecimiento: textoParam(params.establecimiento),
      empresa: textoParam(params.empresa),
      inspeccion: textoParam(params.inspeccion),
      notificacion: textoParam(params.notificacion),
    }),
    listarInspectores(),
  ]);
  const [antecedentes, situacion] = await Promise.all([
    antecedentesActas({ establecimientoId: datos.establecimiento?.id, empresaId: datos.empresa?.id }),
    situacionEstablecimiento(datos.establecimiento?.id),
  ]);

  // Solo se vincula una notificación que siga abierta (emitida o notificada).
  const n = datos.notificacion;
  const notificacionAbierta = n?.id && (n.estado === "emitida" || n.estado === "notificada");
  const notificacion: NotificacionVinculada | null =
    n?.id && notificacionAbierta
      ? {
          id: n.id,
          numero: n.numero,
          tipo: n.tipo,
          notificada_at: n.notificada_at,
          vence_at: n.vence_at,
          persona_notificada: n.persona_notificada,
          dni_notificado: n.dni_notificado,
          razon_social: n.razon_social,
          vencida: n.estado_efectivo === "vencida",
        }
      : null;
  const i = datos.inspeccion;
  const inspeccion: InspeccionVinculada | null = i?.id
    ? { id: i.id, codigo: i.codigo, tipo: i.tipo, fecha_programada: i.fecha_programada }
    : null;

  // Motivo: el pedido en la URL o el que surge de la notificación o de la situación del establecimiento.
  const motivo: MotivoActa =
    valorPermitido(params.motivo, MOTIVOS_ACTA) ??
    (notificacion?.vencida
      ? "incumplimiento_notificacion"
      : situacion?.estado_fumigacion === "vencido"
        ? "certificado_vencido"
        : situacion?.estado_fumigacion === "sin_certificado"
          ? "sin_certificado"
          : situacion?.estado_tanque === "vencido" || situacion?.estado_tanque === "sin_certificado"
            ? "tanque_sin_limpieza"
            : "sin_certificado");
  const inspectorPorDefecto = inspectores.some((x) => x.id === sesion.userId) ? sesion.userId : null;

  return (
    <>
      <PageHeader
        title="Labrar acta de infracción"
        description="Completá el presunto infractor y los hechos constatados. El N.º lo asigna el sistema y, si viene de una notificación, la cierra como «Acta labrada»."
        icon={FilePenLine}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Actas", href: "/gestion/actas" },
          { label: "Labrar acta" },
        ]}
      />

      {n && !notificacionAbierta ? (
        <Alert tone="warning" title={`La notificación N.º ${n.numero ?? ""} no está abierta`} className="mb-6">
          Está en estado{" "}
          <EstadoBadge mapa={ESTADO_NOTIFICACION} valor={n.estado_efectivo} size="sm" className="mx-1 align-middle" />, por lo
          que el acta no se vinculará a ella.{" "}
          <Link href={`/gestion/notificaciones/${n.id}`} className="font-medium text-azul-700 hover:underline">
            Ver notificación
          </Link>
        </Alert>
      ) : null}

      {antecedentes.length > 0 ? (
        <Alert
          tone="info"
          icon={<History />}
          title={
            antecedentes.length === 1
              ? "Hay 1 acta anterior para este infractor"
              : `Hay ${antecedentes.length}${antecedentes.length === 5 ? " o más" : ""} actas anteriores para este infractor`
          }
          className="mb-6"
        >
          <ul className="mt-1 flex flex-col gap-1">
            {antecedentes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/gestion/actas/${a.id}`} className="font-mono text-[13px] font-semibold text-azul-700 hover:underline">
                  {a.numero}
                </Link>
                <span className="text-muted-foreground">
                  {formatFecha(a.fecha)} · {a.motivo ? MOTIVO_ACTA[a.motivo].label : "—"}
                </span>
                <EstadoBadge mapa={ESTADO_ACTA} valor={a.estado} size="sm" />
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <FormActa
        establecimientoInicial={datos.establecimiento}
        empresaInicial={datos.empresa}
        notificacion={notificacion}
        inspeccion={inspeccion}
        motivoInicial={motivo}
        inspectores={inspectores}
        inspectorPorDefecto={inspectorPorDefecto}
        ahoraLocal={fechaHoraLocalActual()}
        vencimientoFumigacion={
          situacion?.id && situacion.estado_fumigacion === "vencido" && situacion.fumigacion_vencimiento
            ? { establecimientoId: situacion.id, fecha: situacion.fumigacion_vencimiento }
            : null
        }
      />
    </>
  );
}
