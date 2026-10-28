import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellPlus, Store } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { requerirStaff } from "@/lib/auth";
import {
  PLAZOS_NOTIFICACION,
  TIPOS_NOTIFICACION,
  desplazarFecha,
  feriadosEntre,
  fechaHoraLocalActual,
  listarInspectores,
  notificacionesAbiertasDe,
  obtenerEmpresaOpcion,
  obtenerEstablecimientoOpcion,
  situacionEstablecimiento,
  textoParam,
  valorPermitido,
  type TipoNotificacion,
} from "@/lib/data/intimaciones";
import { ESTADO_NOTIFICACION } from "@/lib/domain/etiquetas";
import { formatFecha, hoyISO } from "@/lib/domain/formato";
import { FormNotificacion } from "../_components/form-notificacion";
import { SituacionEstablecimiento } from "../_components/situacion-establecimiento";

export const metadata: Metadata = {
  title: "Nueva notificación",
  description: "Emití una notificación con plazo según el modelo vigente de la Dirección de Salud Ambiental.",
};

type NuevaNotificacionPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NuevaNotificacionPage({ searchParams }: NuevaNotificacionPageProps) {
  const sesion = await requerirStaff();
  const params = await searchParams;
  const hoy = hoyISO();

  const [establecimiento, empresa, inspectores, feriados] = await Promise.all([
    obtenerEstablecimientoOpcion(textoParam(params.establecimiento)),
    obtenerEmpresaOpcion(textoParam(params.empresa)),
    listarInspectores(),
    feriadosEntre(desplazarFecha(hoy, -60), desplazarFecha(hoy, 120)),
  ]);
  const [situacion, abiertas] = await Promise.all([
    situacionEstablecimiento(establecimiento?.id),
    establecimiento ? notificacionesAbiertasDe(establecimiento.id) : Promise.resolve([]),
  ]);

  // Tipo sugerido: el pedido en la URL o el que surge de la situación del establecimiento.
  const tipoSugerido: TipoNotificacion =
    valorPermitido(params.tipo, TIPOS_NOTIFICACION) ??
    (situacion && (situacion.estado_tanque === "vencido" || situacion.estado_tanque === "sin_certificado")
      ? "tanques"
      : situacion && (situacion.estado_fumigacion === "vencido" || situacion.estado_fumigacion === "sin_certificado")
        ? "fumigacion"
        : empresa && !establecimiento
          ? "documentacion"
          : "tanques");
  const plazo = valorPermitido(params.plazo, PLAZOS_NOTIFICACION) ?? "cinco_dias_habiles";
  const inspectorPorDefecto = inspectores.some((i) => i.id === sesion.userId) ? sesion.userId : null;

  return (
    <>
      <PageHeader
        title="Nueva notificación"
        description="Completá el destinatario y el plazo. El N.º (ciclo-talonario) y el vencimiento en días hábiles los asigna el sistema."
        icon={BellPlus}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Notificaciones", href: "/gestion/notificaciones" },
          { label: "Nueva" },
        ]}
      />

      {abiertas.length > 0 ? (
        <Alert tone="warning" title="Este establecimiento ya tiene notificaciones abiertas" className="mb-6">
          <ul className="mt-1 flex flex-col gap-1.5">
            {abiertas.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/gestion/notificaciones/${n.id}`} className="font-mono font-semibold text-azul-700 hover:underline">
                  N.º {n.numero}
                </Link>
                <EstadoBadge mapa={ESTADO_NOTIFICACION} valor={n.estado_efectivo} size="sm" />
                <span className="text-muted-foreground">emitida el {formatFecha(n.created_at)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">Revisalas antes de emitir otra por el mismo motivo.</p>
        </Alert>
      ) : null}

      {situacion ? (
        <SectionCard
          className="mb-6"
          title={`Situación de ${situacion.nombre ?? "el establecimiento"}`}
          description="Según los certificados timbrados registrados en la plataforma."
          icon={Store}
          actions={
            <Link
              href={`/gestion/notificaciones?establecimiento=${situacion.id}`}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-azul-700 hover:underline"
            >
              Historial de notificaciones <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        >
          <SituacionEstablecimiento s={situacion} />
        </SectionCard>
      ) : null}

      <FormNotificacion
        establecimientoInicial={establecimiento}
        empresaInicial={empresa}
        tipoInicial={tipoSugerido}
        plazoInicial={plazo}
        inspectores={inspectores}
        inspectorPorDefecto={inspectorPorDefecto}
        feriados={feriados}
        ahoraLocal={fechaHoraLocalActual()}
        anio={Number(hoy.slice(0, 4))}
      />
    </>
  );
}
