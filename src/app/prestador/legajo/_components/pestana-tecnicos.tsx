import Link from "next/link";
import { ExternalLink, FileText, GraduationCap, Mail, Phone, Star, Trash2, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ESTADO_DOCUMENTO, ESTADO_TECNICO, ESTADO_TRAMITE } from "@/lib/domain/etiquetas";
import { formatFecha } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { eliminarTecnico } from "../actions";
import { ultimoTramiteDe } from "../_lib/vinculos";
import { AccionConfirmada } from "./accion-confirmada";
import { FormTecnico } from "./form-tecnico";
import type { DocumentoLegajo, OpcionTecnico, TecnicoLegajo, TramiteTecnico } from "./tipos";

type PestanaTecnicosProps = {
  empresaId: string;
  tecnicos: TecnicoLegajo[];
  documentos: DocumentoLegajo[];
  /** Trámites de alta de asesores (todos los estados salvo borrador), del más reciente al más antiguo. */
  tramitesTecnico: TramiteTecnico[];
  aprobados: OpcionTecnico[];
  bloqueo: string | null;
};

const ORDEN_ESTADO: Record<TecnicoLegajo["estado"], number> = { aprobado: 0, pendiente: 1, rechazado: 2, baja: 3 };

export function PestanaTecnicos({ empresaId, tecnicos, documentos, tramitesTecnico, aprobados, bloqueo }: PestanaTecnicosProps) {
  const ordenados = [...tecnicos].sort(
    (a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || Number(b.es_representante) - Number(a.es_representante),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Asesores y representantes técnicos</h2>
          <p className="text-sm text-muted-foreground">
            Profesionales con título terciario o universitario que firman los certificados de la empresa.
          </p>
        </div>
        <FormTecnico empresaId={empresaId} aprobados={aprobados} bloqueado={bloqueo} />
      </div>

      <Alert tone="info" title="Solo firman los asesores aprobados (Art. 5.º)">
        Cada alta o reemplazo de asesor se presenta como trámite con el título autenticado. La memoria técnica se
        actualiza ante cada cambio de técnico.
      </Alert>

      {ordenados.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Todavía no registraste asesores técnicos"
          description="Agregá a tu representante técnico con su título autenticado para poder emitir certificados."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ordenados.map((t) => {
            const nombre = `${t.nombre} ${t.apellido}`;
            const titulos = documentos.filter((d) => d.tecnico_id === t.id);
            const tramite = ultimoTramiteDe(tramitesTecnico, "tecnico_id", t.id);
            // resolver_tramite no cambia el estado del asesor al rechazar: sigue "pendiente" pero sin efecto.
            const solicitudRechazada = t.estado === "pendiente" && tramite?.estado === "rechazado";
            const solicitudObservada = t.estado === "pendiente" && tramite?.estado === "observado";
            const inactivo = t.estado === "baja" || t.estado === "rechazado" || solicitudRechazada;
            return (
              <li key={t.id}>
                <Card className={cn("h-full gap-4 p-5", inactivo && "bg-subtle/60")}>
                  <div className="flex items-start gap-3">
                    <Avatar nombre={nombre} size="lg" className={cn(inactivo && "opacity-60 grayscale")} />
                    <div className="min-w-0 flex-1">
                      <p className="font-display leading-snug font-semibold break-words">{nombre}</p>
                      <p className="flex items-start gap-1.5 text-[13px] text-muted-foreground">
                        <GraduationCap className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        <span className="break-words">{t.titulo}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {solicitudRechazada ? (
                          <StatusBadge label="Solicitud rechazada" tone="rojo" size="sm" />
                        ) : solicitudObservada ? (
                          <StatusBadge label="Solicitud observada" tone="ambar" size="sm" pulse />
                        ) : (
                          <EstadoBadge mapa={ESTADO_TECNICO} valor={t.estado} size="sm" pulse={t.estado === "pendiente"} />
                        )}
                        {t.es_representante ? (
                          <Badge tone="violeta" size="sm">
                            <Star aria-hidden />
                            Representante
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                    <div>
                      <dt className="text-muted-foreground">DNI</dt>
                      <dd className="font-medium nums-tabular">{t.dni}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Matrícula</dt>
                      <dd className="font-medium">{t.matricula ?? "—"}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Institución</dt>
                      <dd className="font-medium break-words">{t.institucion ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t.estado === "baja" ? "Baja" : "Alta"}</dt>
                      <dd className="font-medium">
                        {(t.estado === "baja" ? t.fecha_baja : t.fecha_alta)
                          ? formatFecha(t.estado === "baja" ? t.fecha_baja : t.fecha_alta)
                          : t.estado === "pendiente"
                            ? solicitudRechazada
                              ? "Sin efecto"
                              : "En revisión"
                            : "—"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Contacto</dt>
                      <dd className="flex flex-col gap-0.5 font-medium">
                        {t.email ? (
                          <a href={`mailto:${t.email}`} className="flex items-center gap-1 truncate text-azul-700 hover:underline">
                            <Mail className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{t.email}</span>
                          </a>
                        ) : null}
                        {t.telefono ? (
                          <a href={`tel:${t.telefono}`} className="flex items-center gap-1 text-azul-700 hover:underline">
                            <Phone className="size-3.5 shrink-0" aria-hidden />
                            {t.telefono}
                          </a>
                        ) : null}
                        {!t.email && !t.telefono ? "—" : null}
                      </dd>
                    </div>
                  </dl>

                  {titulos.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {titulos.map((d) => (
                        <li key={d.id ?? d.path}>
                          <a
                            href={`/prestador/legajo/documento/${d.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-[13px] transition-colors hover:border-azul-200 hover:bg-azul-50/60"
                          >
                            <FileText className="size-4 shrink-0 text-azul-600" aria-hidden />
                            <span className="min-w-0 flex-1 truncate font-medium">{d.nombre_archivo ?? "Título"}</span>
                            <EstadoBadge mapa={ESTADO_DOCUMENTO} valor={d.estado} size="sm" />
                            <ExternalLink className="size-3.5 shrink-0 text-muted-foreground group-hover:text-azul-600" aria-hidden />
                            <span className="sr-only">(se abre en una pestaña nueva)</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : t.estado !== "baja" ? (
                    <p className="rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-amber-900">
                      Sin título cargado. Subilo desde la pestaña Documentación.
                    </p>
                  ) : null}

                  {t.observaciones && t.estado === "rechazado" ? (
                    <Alert tone="danger" title="Observaciones de la Dirección">
                      {t.observaciones}
                    </Alert>
                  ) : null}
                  {(solicitudRechazada || solicitudObservada) && tramite?.observaciones ? (
                    <Alert
                      tone={solicitudRechazada ? "danger" : "warning"}
                      title={solicitudRechazada ? "Motivo del rechazo" : "Observaciones de la Dirección"}
                    >
                      <span className="whitespace-pre-line">{tramite.observaciones}</span>
                    </Alert>
                  ) : null}

                  {t.estado === "pendiente" ? (
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      {tramite ? (
                        <Link
                          href={`/prestador/tramites/${tramite.id}`}
                          className="text-[13px] font-medium text-azul-700 hover:underline"
                        >
                          {solicitudObservada
                            ? `Responder observaciones (${tramite.codigo ?? "trámite"})`
                            : `Trámite ${tramite.codigo ?? ""} · ${ESTADO_TRAMITE[tramite.estado].label.toLowerCase()}`}
                        </Link>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">En revisión por la Dirección</span>
                      )}
                      <AccionConfirmada
                        accion={eliminarTecnico}
                        campos={{ id: t.id }}
                        titulo={`¿Eliminar a ${nombre}?`}
                        descripcion={
                          solicitudRechazada
                            ? "La solicitud fue rechazada: se borran sus datos y el título cargado. Podés volver a presentarlo con la documentación correcta."
                            : "Se borran sus datos y el título cargado. Si la solicitud ya está en revisión, avisale a la Dirección que desistís del alta."
                        }
                        confirmar="Sí, eliminar"
                        trigger={
                          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger">
                            <Trash2 aria-hidden />
                            Eliminar
                          </Button>
                        }
                      />
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
