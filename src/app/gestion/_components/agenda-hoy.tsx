import Link from "next/link";
import { ArrowRight, CalendarClock, ChevronRight, Droplets, MapPin, ShieldCheck, SprayCan } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServicioAgenda } from "@/lib/data/gestion";
import { formatHora } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

const VISIBLES = 7;

function hrefInspeccion(s: ServicioAgenda): string {
  const params = new URLSearchParams({ tipo: "muestreo_servicio", certificado: s.id });
  if (s.empresaId) params.set("empresa", s.empresaId);
  if (s.establecimientoId) params.set("establecimiento", s.establecimientoId);
  return `/gestion/inspecciones/nueva?${params}`;
}

/** Servicios declarados para hoy (inspecciones por muestreo, Art. 10.º b). */
export function AgendaHoy({
  hoy,
  proximos,
  puedeInspeccionar,
}: {
  hoy: ServicioAgenda[];
  proximos: ServicioAgenda[];
  puedeInspeccionar: boolean;
}) {
  const primeros = hoy.slice(0, VISIBLES);
  const resto = hoy.slice(VISIBLES);
  const sinInspeccionar = hoy.filter((s) => !s.inspeccionado).length;

  return (
    <SectionCard
      title="Agenda del día"
      description={
        hoy.length === 0
          ? "Sin servicios declarados para hoy"
          : `${hoy.length} servicio${hoy.length === 1 ? "" : "s"} declarado${hoy.length === 1 ? "" : "s"} · ${sinInspeccionar} sin inspeccionar`
      }
      icon={CalendarClock}
      flush
      className="h-full"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/gestion/hoja-de-ruta">
            Hoja de ruta
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      }
      footer={
        <p className="text-muted-foreground">
          {proximos.length > 0 ? (
            <>
              <span className="font-semibold text-foreground">{proximos.length}</span> servicio
              {proximos.length === 1 ? "" : "s"} declarado{proximos.length === 1 ? "" : "s"} para los próximos días.
            </>
          ) : (
            "No hay servicios declarados para los próximos días."
          )}
        </p>
      }
    >
      {hoy.length === 0 ? (
        <div className="p-5">
          <EmptyState
            compact
            icon={CalendarClock}
            title="Hoy no hay servicios declarados"
            description="Las empresas declaran sus servicios entre 24 y 48 horas antes. Consultá la hoja de ruta para planificar controles."
          />
        </div>
      ) : (
        <>
          <ol className="divide-y divide-border/70">
            {primeros.map((s) => (
              <ItemServicio key={s.id} servicio={s} puedeInspeccionar={puedeInspeccionar} />
            ))}
          </ol>
          {resto.length > 0 ? (
            <details className="group/mas border-t border-border/70">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-5 py-2.5 text-[13px] font-semibold text-azul-700 transition-colors hover:bg-azul-50/60 sm:px-6 [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 transition-transform group-open/mas:rotate-90" aria-hidden />
                <span className="group-open/mas:hidden">Ver {resto.length} más</span>
                <span className="hidden group-open/mas:inline">Mostrar menos</span>
              </summary>
              <ol className="divide-y divide-border/70 border-t border-border/70">
                {resto.map((s) => (
                  <ItemServicio key={s.id} servicio={s} puedeInspeccionar={puedeInspeccionar} />
                ))}
              </ol>
            </details>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}

function ItemServicio({ servicio: s, puedeInspeccionar }: { servicio: ServicioAgenda; puedeInspeccionar: boolean }) {
  const Icono = s.tipo === "tanque" ? Droplets : SprayCan;
  return (
    <li className="flex items-start gap-3 px-5 py-3 sm:px-6">
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 pt-0.5">
        <time dateTime={s.fechaServicio} className="text-sm font-semibold text-foreground nums-tabular">
          {formatHora(s.fechaServicio)}
        </time>
        <span
          aria-hidden
          className={cn(
            "flex size-7 items-center justify-center rounded-lg ring-1",
            s.tipo === "tanque" ? "bg-celeste-50 text-celeste-700 ring-celeste-200" : "bg-azul-50 text-azul-600 ring-azul-100",
          )}
        >
          <Icono className="size-4" strokeWidth={1.9} />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold text-foreground">{s.cliente}</p>
        <p className="flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {s.domicilio}
            {s.barrio ? ` · ${s.barrio}` : ""}
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {s.empresaNombre}
          {s.rubro ? ` · ${s.rubro}` : ""} · N.º {s.numero}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {s.inspeccionado ? (
          <Badge tone="verde" size="sm" dot>
            Inspeccionado
          </Badge>
        ) : puedeInspeccionar ? (
          <Button asChild size="sm" variant="secondary">
            <Link href={hrefInspeccion(s)} aria-label={`Inspeccionar el servicio N.º ${s.numero} de ${s.empresaNombre}`}>
              <ShieldCheck aria-hidden />
              <span className="hidden sm:inline">Inspeccionar</span>
            </Link>
          </Button>
        ) : (
          <Badge tone="neutral" size="sm">
            Sin inspección
          </Badge>
        )}
      </div>
    </li>
  );
}
