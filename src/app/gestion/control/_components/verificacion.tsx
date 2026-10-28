import {
  CalendarCheck2,
  CalendarClock,
  Check,
  FileSignature,
  FlaskConical,
  Minus,
  Store,
  Tags,
  Timer,
  TriangleAlert,
  UserCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ClaveVerificacion, EstadoVerificacion, Verificacion } from "@/lib/data/control";
import { cn } from "@/lib/utils";

/** Presentación de cada resultado de verificación (siempre ícono + texto, nunca solo color). */
export const ESTILO_VERIFICACION: Record<
  EstadoVerificacion,
  { icono: LucideIcon; etiqueta: string; chip: string; punto: string; texto: string }
> = {
  ok: {
    icono: Check,
    etiqueta: "Correcto",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    punto: "bg-emerald-600 text-white",
    texto: "text-emerald-800",
  },
  aviso: {
    icono: TriangleAlert,
    etiqueta: "Revisar",
    chip: "bg-amber-50 text-amber-800 ring-amber-200",
    punto: "bg-amber-500 text-white",
    texto: "text-amber-900",
  },
  falla: {
    icono: X,
    etiqueta: "Falla",
    chip: "bg-red-50 text-red-700 ring-red-200",
    punto: "bg-red-600 text-white",
    texto: "text-red-800",
  },
  na: {
    icono: Minus,
    etiqueta: "No aplica",
    chip: "bg-noche-50 text-noche-500 ring-noche-200",
    punto: "bg-noche-300 text-white",
    texto: "text-muted-foreground",
  },
};

export const ICONO_VERIFICACION: Record<ClaveVerificacion, LucideIcon> = {
  rubro: Tags,
  fecha: CalendarClock,
  vencimiento: CalendarCheck2,
  firma: FileSignature,
  tecnico: UserCheck,
  productos: FlaskConical,
  antelacion: Timer,
  establecimiento: Store,
};

/** Qué controla el área en cada planilla (texto de ayuda con su base normativa). */
export const GUIA_VERIFICACIONES: { clave: ClaveVerificacion; titulo: string; descripcion: string }[] = [
  { clave: "rubro", titulo: "Rubro informado", descripcion: "Actividad del establecimiento según el Anexo de la Ord. 2681/98." },
  { clave: "fecha", titulo: "Fechas informadas", descripcion: "Fecha y hora del servicio y fecha de vencimiento." },
  { clave: "vencimiento", titulo: "Vencimiento correcto", descripcion: "Periodicidad del rubro (Art. 1.º) o 180 días para tanques (Ord. 2004/92)." },
  { clave: "firma", titulo: "Firma del asesor técnico", descripcion: "Firma digital del representante técnico declarado (Art. 5.º)." },
  { clave: "tecnico", titulo: "Técnico aprobado", descripcion: "Asesor técnico aprobado por la Dirección en el padrón." },
  { clave: "productos", titulo: "Productos o análisis", descripcion: "Productos de la memoria técnica aprobada; en tanques, análisis del agua." },
  { clave: "antelacion", titulo: "Antelación", descripcion: "Planilla presentada entre 24 y 48 h antes del servicio (Art. 9.º a)." },
  { clave: "establecimiento", titulo: "Establecimiento", descripcion: "Vinculado al registro y con su último certificado timbrado." },
];

/** Ícono compacto de una verificación con su resultado (para la matriz de la tabla). */
export function IconoVerificacion({ verificacion, className }: { verificacion: Verificacion; className?: string }) {
  const estilo = ESTILO_VERIFICACION[verificacion.estado];
  const Icono = ICONO_VERIFICACION[verificacion.clave];
  const Marca = estilo.icono;
  return (
    <span
      title={`${verificacion.titulo}: ${estilo.etiqueta}`}
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
        estilo.chip,
        className,
      )}
    >
      <Icono className="size-4" strokeWidth={1.9} aria-hidden />
      <span
        aria-hidden
        className={cn(
          "absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full ring-2 ring-card",
          estilo.punto,
        )}
      >
        <Marca className="size-2.5" strokeWidth={3.2} />
      </span>
      <span className="sr-only">
        {verificacion.titulo}: {estilo.etiqueta}. {verificacion.detalle}
      </span>
    </span>
  );
}

/** Lista detallada de verificaciones (título, resultado y explicación). */
export function ListaVerificaciones({ verificaciones, className }: { verificaciones: Verificacion[]; className?: string }) {
  return (
    <ul className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {verificaciones.map((v) => {
        const estilo = ESTILO_VERIFICACION[v.estado];
        const Icono = ICONO_VERIFICACION[v.clave];
        const Marca = estilo.icono;
        return (
          <li
            key={v.clave}
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-card p-3",
              v.estado === "falla" ? "border-red-200" : v.estado === "aviso" ? "border-amber-200" : "border-border",
            )}
          >
            <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", estilo.chip)}>
              <Icono className="size-4" strokeWidth={1.9} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-semibold text-foreground">
                {v.titulo}
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium", estilo.texto)}>
                  <Marca className="size-3.5" strokeWidth={2.6} aria-hidden />
                  {estilo.etiqueta}
                </span>
              </p>
              <p className="text-[13px] leading-snug text-muted-foreground">{v.detalle}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Leyenda de la matriz de verificaciones. */
export function LeyendaVerificaciones({ className }: { className?: string }) {
  const estados: EstadoVerificacion[] = ["ok", "aviso", "falla", "na"];
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)} aria-label="Referencias">
      {estados.map((e) => {
        const estilo = ESTILO_VERIFICACION[e];
        const Marca = estilo.icono;
        return (
          <li key={e} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("flex size-4 items-center justify-center rounded-full", estilo.punto)}>
              <Marca className="size-2.5" strokeWidth={3.2} />
            </span>
            {estilo.etiqueta}
          </li>
        );
      })}
    </ul>
  );
}
