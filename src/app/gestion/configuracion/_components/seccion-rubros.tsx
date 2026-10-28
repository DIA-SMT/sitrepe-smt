import { BadgeCheck, CircleDashed, FileSearch, ListChecks, ShieldCheck } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Rubro } from "@/lib/data/admin";
import { PERIODICIDAD } from "@/lib/domain/etiquetas";
import { cn } from "@/lib/utils";
import { BotonAccion } from "../_compartido/acciones-cliente";
import { cambiarValidacionRubro } from "../actions";
import { DESCRIPCION_GRUPO, GRUPOS_RUBRO } from "./constantes";
import { DialogoRubro } from "./dialogo-rubro";

export function SeccionRubros({ rubros, editable }: { rubros: Rubro[]; editable: boolean }) {
  const validados = rubros.filter((r) => r.validado).length;
  const total = rubros.length;
  const completo = total > 0 && validados === total;
  const grupos = GRUPOS_RUBRO.map((grupo) => ({
    grupo,
    rubros: rubros.filter((r) => r.grupo === grupo),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-card border border-border bg-card p-5 shadow-card sm:p-6">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-celeste-300/25 blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Validación del Anexo</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
                {validados} de {total} rubros validados contra el original
              </p>
            </div>
            <span
              aria-hidden
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                completo
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-sol-100 text-sol-800 ring-1 ring-sol-300",
              )}
            >
              {completo ? <ShieldCheck className="size-5" /> : <FileSearch className="size-5" />}
            </span>
          </div>
          <Progress
            value={validados}
            max={Math.max(total, 1)}
            tone={completo ? "verde" : "sol"}
            size="lg"
            label={completo ? "Anexo completo y validado" : `Faltan ${total - validados} por cotejar`}
            showValue
            className="relative"
          />
        </div>
        {/* Aviso permanente (no un error recién ocurrido): role="note" para que no se anuncie como alerta. */}
        <Alert
          role="note"
          tone={completo ? "success" : "warning"}
          title="El Anexo define el vencimiento de cada certificado"
        >
          Transcribilo completo y cotejalo con el texto original de la Ord. 2681/98 (fojas 237 a 244) antes de usarlo en
          producción. Las actividades que el Anexo no menciona van en el grupo <strong>No tipificada</strong>, con la
          periodicidad que fije el área por similitud.
        </Alert>
      </div>

      {editable ? (
        <div className="flex justify-end">
          <DialogoRubro modo="crear" />
        </div>
      ) : null}

      {grupos.map(({ grupo, rubros: lista }) => {
        const validadosGrupo = lista.filter((r) => r.validado).length;
        return (
          <SectionCard
            key={grupo}
            id={`grupo-${grupo.toLowerCase().replace(/\s+/g, "-")}`}
            title={grupo}
            description={DESCRIPCION_GRUPO[grupo]}
            icon={ListChecks}
            flush
            actions={
              <>
                {lista.length > 0 ? (
                  <Badge tone={validadosGrupo === lista.length ? "verde" : "ambar"} size="sm">
                    {validadosGrupo}/{lista.length} validados
                  </Badge>
                ) : null}
                {editable ? <DialogoRubro modo="crear" grupoInicial={grupo} compacto /> : null}
              </>
            }
          >
            {lista.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">
                {grupo === "No tipificada"
                  ? "Todavía no se declararon actividades no tipificadas."
                  : "No hay rubros cargados en este grupo."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {lista.map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      "flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/40 sm:flex-row sm:items-center sm:px-6",
                      !r.activo && "bg-subtle/60",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className={cn("text-sm font-medium text-foreground", !r.activo && "text-muted-foreground")}>
                        {r.nombre}
                        {r.activo ? null : (
                          <Badge tone="neutral" size="sm" className="ml-2 align-middle">
                            Inactivo
                          </Badge>
                        )}
                      </p>
                      {r.descripcion ? (
                        <p className="text-[13px] leading-snug text-muted-foreground">{r.descripcion}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <EstadoBadge mapa={PERIODICIDAD} valor={r.periodicidad} />
                      {editable ? (
                        <BotonAccion
                          accion={cambiarValidacionRubro}
                          campos={{
                            id: String(r.id),
                            validado: r.validado ? "false" : "true",
                          }}
                          size="sm"
                          variant="ghost"
                          aria-pressed={r.validado}
                          aria-label={
                            r.validado ? `Quitar la validación de ${r.nombre}` : `Marcar ${r.nombre} como validado`
                          }
                          className={cn(
                            "rounded-full",
                            r.validado ? "text-emerald-700 hover:bg-emerald-50" : "text-amber-700 hover:bg-amber-50",
                          )}
                        >
                          {r.validado ? <BadgeCheck aria-hidden /> : <CircleDashed aria-hidden />}
                          {r.validado ? "Validado" : "Sin validar"}
                        </BotonAccion>
                      ) : (
                        <Badge tone={r.validado ? "verde" : "ambar"} size="sm">
                          {r.validado ? <BadgeCheck aria-hidden /> : <CircleDashed aria-hidden />}
                          {r.validado ? "Validado" : "Sin validar"}
                        </Badge>
                      )}
                      {editable ? <DialogoRubro modo="editar" rubro={r} /> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}
