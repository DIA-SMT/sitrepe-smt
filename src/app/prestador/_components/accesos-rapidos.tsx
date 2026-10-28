import Link from "next/link";
import { ArrowUpRight, BadgeCheck, CalendarClock, ClipboardPlus, FileSignature, Stamp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Acceso = {
  titulo: string;
  descripcion: string;
  href: string;
  icon: LucideIcon;
  icono: string;
  contador?: { valor: number; texto: string; tono: string } | null;
};

/** Accesos directos a las tareas frecuentes del prestador. */
export function AccesosRapidos({
  esTecnico,
  pendientesFirma,
  listosParaPagar,
  className,
}: {
  esTecnico: boolean;
  pendientesFirma: number | null;
  listosParaPagar: number;
  className?: string;
}) {
  const accesos: Acceso[] = [
    {
      titulo: "Nueva declaración",
      descripcion: "Planilla de servicios, 24 a 48 h antes",
      href: "/prestador/declaraciones/nueva",
      icon: ClipboardPlus,
      icono: "bg-gradient-brand text-white shadow-brand",
    },
    esTecnico
      ? {
          titulo: "Firmar certificados",
          descripcion: "Firma digital del asesor técnico",
          href: "/prestador/firmas",
          icon: FileSignature,
          icono: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
          contador:
            pendientesFirma && pendientesFirma > 0
              ? {
                  valor: pendientesFirma,
                  texto: pendientesFirma === 1 ? "pendiente" : "pendientes",
                  tono: "bg-violet-600 text-white",
                }
              : null,
        }
      : {
          titulo: "Mis certificados",
          descripcion: "Consultá, imprimí y verificá",
          href: "/prestador/certificados",
          icon: BadgeCheck,
          icono: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        },
    {
      titulo: "Pagar timbrado",
      descripcion: "Liquidá e informá la transferencia",
      href: "/prestador/pagos",
      icon: Stamp,
      icono: "bg-sol-100 text-sol-800 ring-1 ring-sol-300",
      contador:
        listosParaPagar > 0
          ? { valor: listosParaPagar, texto: listosParaPagar === 1 ? "listo" : "listos", tono: "bg-sol-400 text-noche-950" }
          : null,
    },
    {
      titulo: "Renovación anual",
      descripcion: "DDJJ de categorización y libre deuda",
      href: "/prestador/legajo?tab=renovacion",
      icon: CalendarClock,
      icono: "bg-celeste-100 text-celeste-700 ring-1 ring-celeste-200",
    },
  ];

  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      <h2 className="font-display text-base font-semibold text-foreground">Accesos rápidos</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">Lo que más usás, a un clic.</p>
      <ul className="mt-4 grid flex-1 grid-cols-2 gap-3">
        {accesos.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.href} className="flex">
              <Link
                href={a.href}
                className={cn(
                  "group relative flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-3.5 sm:p-4",
                  "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-azul-200 hover:shadow-elevated",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span aria-hidden className={cn("flex size-10 items-center justify-center rounded-xl", a.icono)}>
                    <Icon className="size-5" strokeWidth={1.9} />
                  </span>
                  {a.contador ? (
                    <span
                      className={cn(
                        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-bold whitespace-nowrap",
                        a.contador.tono,
                      )}
                    >
                      {a.contador.valor}
                      <span className="font-medium">{a.contador.texto}</span>
                    </span>
                  ) : (
                    <ArrowUpRight
                      aria-hidden
                      className="size-4 text-noche-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-azul-600"
                    />
                  )}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm leading-snug font-semibold text-foreground">{a.titulo}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{a.descripcion}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
