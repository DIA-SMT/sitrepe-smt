import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Droplets, Hash, ShieldCheck, SprayCan, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandGlow, PetalDecor } from "@/components/brand/petal-decor";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { Button } from "@/components/ui/button";
import type { HabilitacionEmpresa } from "@/lib/data/certificados";
import { ESTADO_EMPRESA } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

const DIAS_AVISO = 30;

function Actividad({ activa, etiqueta, letra, icon: Icon }: {
  activa: boolean;
  etiqueta: string;
  letra: string;
  icon: LucideIcon;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium ring-1",
        activa ? "bg-celeste-400/15 text-white ring-celeste-300/40" : "bg-white/[0.03] text-noche-400 ring-white/10",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md font-display text-xs font-bold",
          activa ? "bg-celeste-400 text-noche-950" : "bg-white/10 text-noche-300",
        )}
      >
        {letra}
      </span>
      <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
      <span className={cn("min-w-0 flex-1 truncate", !activa && "line-through decoration-noche-500")}>{etiqueta}</span>
      {activa ? (
        <Check className="size-4 shrink-0 text-celeste-300" aria-label="Habilitada" />
      ) : (
        <X className="size-4 shrink-0 text-noche-500" aria-label="No habilitada" />
      )}
    </li>
  );
}

/** Tarjeta destacada con el estado de habilitación de la empresa (Arts. 4.º y 8.º). */
export function TarjetaHabilitacion({ h, className }: { h: HabilitacionEmpresa; className?: string }) {
  const estado = h.estado_efectivo ?? h.estado ?? "en_tramite";
  const dias = h.dias_para_vencer;
  const periodo =
    h.fecha_habilitacion && h.vencimiento_habilitacion
      ? Math.max(1, diasHasta(h.vencimiento_habilitacion, h.fecha_habilitacion) ?? 365)
      : 365;
  const pct = dias === null ? 0 : Math.max(0, Math.min(100, (dias / periodo) * 100));
  const tono = dias === null ? "neutral" : dias < 0 ? "rojo" : dias <= DIAS_AVISO ? "ambar" : "verde";
  const barra = {
    neutral: "bg-white/30",
    rojo: "bg-red-500",
    ambar: "bg-linear-to-r from-sol-400 to-amber-500",
    verde: "bg-linear-to-r from-celeste-400 via-emerald-400 to-sol-400",
  }[tono];

  const necesitaRenovar = estado === "vencida" || (estado === "habilitada" && dias !== null && dias <= DIAS_AVISO);
  const aviso: { texto: string; accion: string; href: string } | null =
    estado === "en_tramite"
      ? {
          texto: "Tu inscripción está en revisión. Te avisamos cuando la Dirección la resuelva.",
          accion: "Ver trámite",
          href: "/prestador/tramites",
        }
      : estado === "observada"
        ? {
            texto: "La Dirección hizo observaciones a tu legajo. Revisalas para mantener la habilitación.",
            accion: "Ver legajo",
            href: "/prestador/legajo",
          }
        : estado === "suspendida" || estado === "baja"
          ? {
              texto: "No podés declarar servicios mientras la habilitación no esté vigente. Consultá tu legajo o comunicate con la Dirección.",
              accion: "Ver legajo",
              href: "/prestador/legajo",
            }
          : necesitaRenovar
            ? {
                texto: "Presentá la DDJJ anual de categorización y el libre deuda para renovar la habilitación (Art. 8.º).",
                accion: "Renovar ahora",
                href: "/prestador/legajo?tab=renovacion",
              }
            : null;

  return (
    <section
      aria-labelledby="habilitacion-titulo"
      className={cn("relative overflow-hidden rounded-panel bg-noche p-5 text-white shadow-elevated sm:p-7", className)}
    >
      <BrandGlow />
      <PetalDecor variant="corner" tone="dark" className="h-48 opacity-80" />
      <div className="relative flex h-full flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-celeste-200 uppercase">
              <ShieldCheck className="size-3.5 text-sol-400" aria-hidden />
              Habilitación municipal
            </p>
            <h2 id="habilitacion-titulo" className="mt-1.5 font-display text-xl leading-tight font-semibold sm:text-2xl">
              {h.nombre_comercial ?? "Tu empresa"}
            </h2>
            <p className="mt-1 text-[13px] text-noche-200">
              CUIT {h.cuit ?? "—"}
              {h.resolucion_dsa ? <> · Res. {h.resolucion_dsa}</> : null}
            </p>
          </div>
          <EstadoBadge mapa={ESTADO_EMPRESA} valor={estado} size="lg" pulse={estado === "en_tramite"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 sm:flex-col sm:items-start sm:justify-center sm:px-5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-noche-300 uppercase">
              <Hash className="size-3.5" aria-hidden /> N.º de registro
            </span>
            <span className="ml-auto font-display text-3xl leading-none font-bold text-white sm:ml-0">
              {h.numero_registro ?? "—"}
            </span>
          </div>
          <div className="rounded-xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-noche-300 uppercase">Actividades habilitadas</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              <Actividad activa={!!h.habilita_fumigacion} letra="F" etiqueta="Fumigación y desinfección" icon={SprayCan} />
              <Actividad activa={!!h.habilita_tanques} letra="T" etiqueta="Limpieza de tanques" icon={Droplets} />
            </ul>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <p className="flex items-center gap-2 text-sm text-noche-200">
              <CalendarClock className="size-4 text-celeste-300" aria-hidden />
              {h.vencimiento_habilitacion ? (
                <>
                  Vence el <strong className="font-semibold text-white">{formatFecha(h.vencimiento_habilitacion)}</strong>
                </>
              ) : (
                "Sin fecha de vencimiento registrada"
              )}
            </p>
            {dias !== null ? (
              <p
                className={cn(
                  "text-sm font-semibold",
                  tono === "rojo" && "text-red-300",
                  tono === "ambar" && "text-sol-300",
                  tono === "verde" && "text-emerald-300",
                )}
              >
                {dias < 0
                  ? `Vencida hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`
                  : dias === 0
                    ? "Vence hoy"
                    : `${dias} ${dias === 1 ? "día restante" : "días restantes"}`}
              </p>
            ) : null}
          </div>
          <div
            role="progressbar"
            aria-label="Vigencia restante de la habilitación"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            aria-valuetext={dias === null ? "Sin datos" : `${Math.max(0, dias)} días restantes`}
            className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
          >
            <div className={cn("h-full rounded-full transition-[width] duration-700", barra)} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {aviso ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10">
            <p className="min-w-0 flex-1 text-[13px] text-noche-100">{aviso.texto}</p>
            <Button asChild size="sm" variant="sol">
              <Link href={aviso.href}>
                {aviso.accion}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
