import Link from "next/link";
import {
  BellRing,
  Building2,
  ChevronRight,
  CircleCheckBig,
  ClipboardCheck,
  FileClock,
  FilePenLine,
  Info,
  Receipt,
  ScrollText,
  Siren,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import type { Alerta, AlertasAgrupadas, NivelAlerta } from "@/lib/data/gestion";
import { NIVELES_ALERTA } from "@/lib/data/gestion";
import { formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

const ICONO_TIPO: Record<string, LucideIcon> = {
  habilitacion_por_vencer: Building2,
  documento_por_vencer: FileClock,
  pago_a_verificar: Receipt,
  declaracion_a_controlar: ClipboardCheck,
  declaracion_observada: FilePenLine,
  notificacion_vencida: BellRing,
  tramite_pendiente: ScrollText,
};

const NIVEL: Record<
  NivelAlerta,
  { titulo: string; descripcion: string; icono: LucideIcon; tono: "rojo" | "ambar" | "azul"; chip: string; barra: string }
> = {
  urgente: {
    titulo: "Urgentes",
    descripcion: "Vencidos o fuera de plazo",
    icono: Siren,
    tono: "rojo",
    chip: "bg-red-50 text-red-600 ring-red-200",
    barra: "bg-red-500",
  },
  alerta: {
    titulo: "Atención",
    descripcion: "Vencen en los próximos 30 días u observados",
    icono: TriangleAlert,
    tono: "ambar",
    chip: "bg-sol-100 text-sol-800 ring-sol-300",
    barra: "bg-sol-400",
  },
  info: {
    titulo: "Para resolver",
    descripcion: "Bandejas de trabajo del área",
    icono: Info,
    tono: "azul",
    chip: "bg-azul-50 text-azul-600 ring-azul-100",
    barra: "bg-azul-500",
  },
};

const VISIBLES = 6;

/** Sección de alertas del panel (ancla #alertas de la campana). */
export function AlertasPanel({ alertas }: { alertas: AlertasAgrupadas }) {
  const total = NIVELES_ALERTA.reduce((acc, n) => acc + alertas.totales[n], 0);

  return (
    <SectionCard
      id="alertas"
      className="scroll-mt-24"
      title="Alertas"
      description="Vencimientos y pendientes del registro, ordenados por antigüedad"
      icon={BellRing}
      flush
      actions={
        total > 0 ? (
          <Badge tone={alertas.totales.urgente > 0 ? "rojo" : "azul"} dot pulse={alertas.totales.urgente > 0}>
            {total.toLocaleString("es-AR")} {total === 1 ? "alerta" : "alertas"}
          </Badge>
        ) : null
      }
    >
      {total === 0 ? (
        <div className="p-5">
          <EmptyState
            compact
            icon={CircleCheckBig}
            title="Todo al día"
            description="No hay vencimientos próximos ni pendientes en las bandejas del área."
          />
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {NIVELES_ALERTA.filter((n) => alertas.totales[n] > 0).map((nivel) => {
            const n = NIVEL[nivel];
            const lista = alertas.grupos[nivel];
            const primeras = lista.slice(0, VISIBLES);
            const resto = lista.slice(VISIBLES);
            const fueraDeLista = alertas.totales[nivel] - lista.length;
            const IconoNivel = n.icono;
            return (
              <section key={nivel} aria-labelledby={`alertas-${nivel}`} className="relative">
                <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", n.barra)} />
                <header className="flex items-center justify-between gap-3 bg-subtle/60 py-2.5 pr-5 pl-6">
                  <div className="flex min-w-0 items-center gap-2">
                    <IconoNivel className={cn("size-4 shrink-0", n.tono === "rojo" ? "text-red-600" : n.tono === "ambar" ? "text-sol-700" : "text-azul-600")} aria-hidden />
                    <h3 id={`alertas-${nivel}`} className="text-sm font-semibold text-foreground">
                      {n.titulo}
                    </h3>
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">· {n.descripcion}</span>
                  </div>
                  <Badge tone={n.tono} size="sm">
                    {alertas.totales[nivel].toLocaleString("es-AR")}
                  </Badge>
                </header>
                <ul className="divide-y divide-border/70">
                  {primeras.map((a) => (
                    <ItemAlerta key={a.clave} alerta={a} chip={n.chip} />
                  ))}
                </ul>
                {resto.length > 0 ? (
                  <details className="group/mas">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 py-2.5 pr-5 pl-6 text-[13px] font-semibold text-azul-700 transition-colors hover:bg-azul-50/60 [&::-webkit-details-marker]:hidden">
                      <ChevronRight className="size-4 transition-transform group-open/mas:rotate-90" aria-hidden />
                      <span className="group-open/mas:hidden">Ver {resto.length} más</span>
                      <span className="hidden group-open/mas:inline">Mostrar menos</span>
                    </summary>
                    <ul className="divide-y divide-border/70 border-t border-border/70">
                      {resto.map((a) => (
                        <ItemAlerta key={a.clave} alerta={a} chip={n.chip} />
                      ))}
                    </ul>
                  </details>
                ) : null}
                {fueraDeLista > 0 ? (
                  <p className="py-2 pr-5 pl-6 text-xs text-muted-foreground">
                    Y {fueraDeLista.toLocaleString("es-AR")} más en las bandejas de trabajo.
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function ItemAlerta({ alerta, chip }: { alerta: Alerta; chip: string }) {
  const Icono = ICONO_TIPO[alerta.tipo] ?? BellRing;
  const contenido = (
    <>
      <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl ring-1", chip)}>
        <Icono className="size-[18px]" strokeWidth={1.9} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{alerta.titulo}</span>
        <span className="truncate text-[13px] text-muted-foreground">{alerta.detalle}</span>
      </span>
      {alerta.fecha ? (
        <time dateTime={alerta.fecha} className="hidden shrink-0 text-xs text-muted-foreground sm:block">
          {formatRelativo(alerta.fecha)}
        </time>
      ) : null}
      {alerta.href ? (
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-noche-300 transition-transform group-hover:translate-x-0.5 group-hover:text-azul-600"
        />
      ) : null}
    </>
  );

  return (
    <li>
      {alerta.href ? (
        <Link
          href={alerta.href}
          className="group flex items-center gap-3 py-3 pr-5 pl-6 transition-colors hover:bg-azul-50/50 focus-visible:bg-azul-50/60"
        >
          {contenido}
        </Link>
      ) : (
        <div className="flex items-center gap-3 py-3 pr-5 pl-6">{contenido}</div>
      )}
    </li>
  );
}
