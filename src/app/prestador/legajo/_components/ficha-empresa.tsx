import { CalendarClock, FolderCheck, UsersRound } from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { Badge } from "@/components/ui/badge";
import { ESTADO_EMPRESA, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { textoDias } from "../_lib/plazos";
import type { EmpresaLegajo } from "./tipos";

type FichaEmpresaProps = {
  empresa: EmpresaLegajo;
  tecnicosAprobados: number;
  tecnicosPendientes: number;
  requisitosCumplidos: number;
  requisitosTotal: number;
};

/** Encabezado visual del legajo: identidad registral, vigencia y completitud. */
export function FichaEmpresa({
  empresa,
  tecnicosAprobados,
  tecnicosPendientes,
  requisitosCumplidos,
  requisitosTotal,
}: FichaEmpresaProps) {
  const estado = etiqueta(ESTADO_EMPRESA, empresa.estado_efectivo ?? empresa.estado);
  const dias = empresa.dias_para_vencer;
  const tonoVencimiento = dias === null ? "text-noche-200" : dias < 0 ? "text-red-300" : dias <= 30 ? "text-sol-300" : "text-emerald-300";
  const porcentaje = requisitosTotal > 0 ? Math.round((requisitosCumplidos / requisitosTotal) * 100) : 0;

  return (
    <section
      aria-label="Ficha de la empresa"
      className="relative mb-6 overflow-hidden rounded-panel bg-noche p-5 text-white shadow-elevated sm:p-7"
    >
      <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-25" />
      <PetalDecor variant="corner" tone="dark" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 animate-fade-up">
          <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-celeste-300 uppercase">
            Registro de Empresas de Fumigación
            {empresa.numero_registro ? ` · N.º ${empresa.numero_registro}` : " · Inscripción en trámite"}
          </p>
          <h2 className="mt-2 font-display text-2xl leading-tight font-semibold tracking-tight break-words sm:text-3xl">
            {empresa.nombre_comercial ?? "Empresa"}
          </h2>
          <p className="mt-1 text-sm text-noche-200">
            CUIT {empresa.cuit ?? "—"}
            {empresa.titular ? ` · ${empresa.titular}` : null}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={estado.tono} variant="solid" dot>
              {estado.label}
            </Badge>
            {empresa.habilita_fumigacion ? (
              <Badge className="bg-white/10 text-white ring-white/20">Fumigación y desinfección</Badge>
            ) : null}
            {empresa.habilita_tanques ? (
              <Badge className="bg-white/10 text-white ring-white/20">Limpieza de tanques</Badge>
            ) : null}
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
          <div className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <dt className="flex items-center gap-2 text-xs font-medium text-noche-200">
              <CalendarClock className="size-4 text-celeste-300" aria-hidden />
              Habilitación
            </dt>
            <dd className="mt-2">
              <span className="block font-display text-lg font-semibold">
                {empresa.vencimiento_habilitacion ? formatFecha(empresa.vencimiento_habilitacion) : "Sin fecha"}
              </span>
              <span className={cn("text-xs font-medium", tonoVencimiento)}>
                {empresa.vencimiento_habilitacion ? textoDias(dias) : "Se fija al aprobarse la inscripción"}
              </span>
            </dd>
          </div>
          <div className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <dt className="flex items-center gap-2 text-xs font-medium text-noche-200">
              <UsersRound className="size-4 text-celeste-300" aria-hidden />
              Asesores aprobados
            </dt>
            <dd className="mt-2">
              <span className="block font-display text-lg font-semibold nums-tabular">{tecnicosAprobados}</span>
              <span className={cn("text-xs font-medium", tecnicosAprobados === 0 ? "text-sol-300" : "text-noche-200")}>
                {tecnicosPendientes > 0
                  ? `${tecnicosPendientes} pendiente${tecnicosPendientes === 1 ? "" : "s"} de aprobación`
                  : tecnicosAprobados === 0
                    ? "Necesitás al menos uno para operar"
                    : "Habilitados para firmar"}
              </span>
            </dd>
          </div>
          <div className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <dt className="flex items-center gap-2 text-xs font-medium text-noche-200">
              <FolderCheck className="size-4 text-celeste-300" aria-hidden />
              Legajo documental
            </dt>
            <dd className="mt-2 flex flex-col gap-2">
              <span className="font-display text-lg font-semibold nums-tabular">
                {requisitosCumplidos} de {requisitosTotal}
              </span>
              <div
                role="progressbar"
                aria-label="Documentación obligatoria aprobada"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={porcentaje}
                className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700 ease-out",
                    porcentaje === 100 ? "bg-emerald-400" : "bg-sol-400",
                  )}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
