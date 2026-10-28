import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Eye,
  FileStack,
  FolderCheck,
  Hourglass,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { ESTADO_DOCUMENTO, TIPO_DOCUMENTO, etiqueta } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha, formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { eliminarDocumento } from "../actions";
import { DIAS_AVISO_DOCUMENTO, ESTADO_REQUISITO, type EstadoRequisito } from "../_lib/requisitos";
import { AccionConfirmada } from "./accion-confirmada";
import { FormDocumento } from "./form-documento";
import type { DocumentoLegajo, OpcionTecnico, RequisitoEvaluado } from "./tipos";

type PestanaDocumentacionProps = {
  empresaId: string;
  hoy: string;
  requisitos: RequisitoEvaluado[];
  documentos: DocumentoLegajo[];
  tecnicos: OpcionTecnico[];
  bloqueo: string | null;
};

const ICONO_REQUISITO: Record<EstadoRequisito, { icono: LucideIcon; clase: string }> = {
  cumplido: { icono: CircleCheck, clase: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  por_vencer: { icono: Clock, clase: "bg-sol-100 text-sol-800 ring-sol-300" },
  vencido: { icono: TriangleAlert, clase: "bg-red-50 text-red-600 ring-red-200" },
  en_revision: { icono: Hourglass, clase: "bg-azul-50 text-azul-600 ring-azul-100" },
  rechazado: { icono: CircleX, clase: "bg-red-50 text-red-600 ring-red-200" },
  faltante: { icono: CircleDashed, clase: "bg-noche-50 text-noche-500 ring-noche-200" },
};

export function PestanaDocumentacion({ empresaId, hoy, requisitos, documentos, tecnicos, bloqueo }: PestanaDocumentacionProps) {
  const cumplidos = requisitos.filter((r) => r.estado === "cumplido" || r.estado === "por_vencer").length;
  const porcentaje = requisitos.length > 0 ? Math.round((cumplidos / requisitos.length) * 100) : 0;
  const deshabilitado = Boolean(bloqueo);

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Requisitos del legajo"
        description="Documentación obligatoria para la habilitación y su renovación (Arts. 4.º a 8.º)."
        icon={FolderCheck}
        actions={
          <FormDocumento
            empresaId={empresaId}
            tecnicos={tecnicos}
            trigger={
              <Button size="sm" disabled={deshabilitado}>
                <Upload aria-hidden />
                Subir documento
              </Button>
            }
          />
        }
      >
        <Progress
          label={`${cumplidos} de ${requisitos.length} requisitos aprobados y vigentes`}
          value={porcentaje}
          showValue
          tone={porcentaje === 100 ? "verde" : "azul"}
          className="mb-5"
        />
        <ul className="grid gap-3 md:grid-cols-2">
          {requisitos.map((r) => {
            const { icono: Icono, clase } = ICONO_REQUISITO[r.estado];
            const estado = ESTADO_REQUISITO[r.estado];
            const necesitaCarga = r.estado === "faltante" || r.estado === "vencido" || r.estado === "rechazado" || r.estado === "por_vencer";
            return (
              <li
                key={r.tipo}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-azul-200"
              >
                <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1", clase)}>
                  <Icono className="size-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug font-semibold">
                    {TIPO_DOCUMENTO[r.tipo].label}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">{r.norma}</span>
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{r.detalle}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge label={estado.label} tone={estado.tono} size="sm" />
                    {r.documento?.vence ? (
                      <span className="text-xs text-muted-foreground">Vence el {formatFecha(r.documento.vence)}</span>
                    ) : null}
                  </div>
                  {r.estado === "rechazado" && r.documento?.observaciones ? (
                    <p className="mt-2 rounded-lg bg-danger-soft px-2.5 py-1.5 text-[13px] text-red-800">{r.documento.observaciones}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {r.documento?.id ? (
                    <Button asChild variant="ghost" size="icon-sm">
                      <a
                        href={`/prestador/legajo/documento/${r.documento.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Ver ${TIPO_DOCUMENTO[r.tipo].label} (se abre en una pestaña nueva)`}
                      >
                        <Eye aria-hidden />
                      </a>
                    </Button>
                  ) : null}
                  {necesitaCarga ? (
                    <FormDocumento
                      empresaId={empresaId}
                      tecnicos={tecnicos}
                      tipoInicial={r.tipo}
                      trigger={
                        <Button
                          size="sm"
                          variant={r.estado === "faltante" ? "secondary" : "outline"}
                          disabled={deshabilitado}
                          aria-label={`${r.estado === "faltante" ? "Subir" : "Actualizar"} ${TIPO_DOCUMENTO[r.tipo].label}`}
                        >
                          {r.estado === "faltante" ? <Upload aria-hidden /> : <RefreshCw aria-hidden />}
                          {r.estado === "faltante" ? "Subir" : "Actualizar"}
                        </Button>
                      }
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard
        title="Documentos cargados"
        description={`${documentos.length} documento${documentos.length === 1 ? "" : "s"} en el legajo digital`}
        icon={FileStack}
        flush
      >
        {documentos.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              compact
              icon={FileStack}
              title="Tu legajo todavía no tiene documentos"
              description="Empezá por la constancia de CUIT, el DNI del titular y el título del asesor técnico."
            />
          </div>
        ) : (
          <Table framed={false}>
            <THead>
              <TR>
                <TH>Documento</TH>
                <TH>Estado</TH>
                <TH>Vencimiento</TH>
                <TH>Cargado</TH>
                <TH>
                  <span className="sr-only">Acciones</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {documentos.map((d) => {
                const dias = diasHasta(d.vence, hoy);
                return (
                  <TR key={d.id ?? d.path}>
                    <TD className="min-w-56">
                      <p className="font-medium">{etiqueta(TIPO_DOCUMENTO, d.tipo).label}</p>
                      <p className="max-w-xs truncate text-xs text-muted-foreground" title={d.nombre_archivo ?? undefined}>
                        {d.nombre_archivo}
                        {d.tecnico_nombre ? ` · ${d.tecnico_nombre}` : null}
                      </p>
                      {d.observaciones && d.estado === "rechazado" ? (
                        <p className="mt-1 text-xs text-danger">{d.observaciones}</p>
                      ) : null}
                    </TD>
                    <TD>
                      <EstadoBadge mapa={ESTADO_DOCUMENTO} valor={d.estado} size="sm" />
                    </TD>
                    <TD className="whitespace-nowrap">
                      {d.vence ? (
                        <span
                          className={cn(
                            "nums-tabular",
                            dias !== null && dias < 0 && "font-medium text-danger",
                            dias !== null && dias >= 0 && dias <= DIAS_AVISO_DOCUMENTO && "font-medium text-warning",
                          )}
                        >
                          {formatFecha(d.vence)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sin vencimiento</span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground" title={d.created_at ? formatFecha(d.created_at) : undefined}>
                      {formatRelativo(d.created_at)}
                    </TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <a href={`/prestador/legajo/documento/${d.id}`} target="_blank" rel="noopener noreferrer">
                            <Eye aria-hidden />
                            Ver
                            <span className="sr-only">(se abre en una pestaña nueva)</span>
                          </a>
                        </Button>
                        {d.estado === "pendiente" && d.id ? (
                          <AccionConfirmada
                            accion={eliminarDocumento}
                            campos={{ id: d.id }}
                            titulo="¿Eliminar este documento?"
                            descripcion={`Se borra "${d.nombre_archivo ?? "el archivo"}" del legajo. Podés volver a subirlo cuando quieras.`}
                            confirmar="Sí, eliminar"
                            trigger={
                              <Button variant="ghost" size="icon-sm" aria-label="Eliminar documento" className="text-danger hover:bg-danger-soft hover:text-danger">
                                <Trash2 aria-hidden />
                              </Button>
                            }
                          />
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
