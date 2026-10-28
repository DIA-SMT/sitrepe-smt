import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  PlusCircle,
  Receipt,
  Route,
  ScrollText,
  ShieldCheck,
  Siren,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandGlow, PetalDecor } from "@/components/brand/petal-decor";
import type { Rol } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Acceso = { label: string; href: string; icon: LucideIcon; roles: Rol[]; contador?: number; detalle: string };

export type BienvenidaProps = {
  saludo: string;
  nombre: string;
  rol: Rol;
  rolLabel: string;
  fecha: string;
  urgentes: number;
  contadores: {
    aControlar: number;
    pagosAVerificar: number;
    tramites: number;
    establecimientosVencidos: number;
    inspeccionesHoy: number;
  };
};

/** Encabezado del panel: saludo, fecha, resumen y accesos rápidos según el rol. */
export function Bienvenida({ saludo, nombre, rol, rolLabel, fecha, urgentes, contadores }: BienvenidaProps) {
  const accesos: Acceso[] = [
    {
      label: "Controlar declaraciones",
      href: "/gestion/control",
      icon: ClipboardCheck,
      roles: ["admin", "control"],
      contador: contadores.aControlar,
      detalle: "certificados declarados",
    },
    {
      label: "Conciliar pagos",
      href: "/gestion/pagos",
      icon: Receipt,
      roles: ["admin", "control"],
      contador: contadores.pagosAVerificar,
      detalle: "pagos informados",
    },
    {
      label: "Resolver trámites",
      href: "/gestion/tramites",
      icon: ScrollText,
      roles: ["admin", "control"],
      contador: contadores.tramites,
      detalle: "trámites presentados",
    },
    {
      label: "Hoja de ruta",
      href: "/gestion/hoja-de-ruta",
      icon: Route,
      roles: ["admin", "inspector"],
      contador: contadores.establecimientosVencidos,
      detalle: "establecimientos vencidos",
    },
    {
      label: "Inspecciones",
      href: "/gestion/inspecciones",
      icon: ShieldCheck,
      roles: ["admin", "inspector"],
      contador: contadores.inspeccionesHoy,
      detalle: "programadas para hoy",
    },
    {
      label: "Nueva inspección",
      href: "/gestion/inspecciones/nueva",
      icon: PlusCircle,
      roles: ["inspector"],
      detalle: "registrá una visita",
    },
  ];
  const visibles = accesos.filter((a) => a.roles.includes(rol));
  const primerNombre = nombre.split(/\s+/)[0] || nombre;

  return (
    <section
      aria-labelledby="saludo-panel"
      className="relative isolate overflow-hidden rounded-panel bg-noche px-5 py-6 text-white shadow-elevated sm:px-8 sm:py-8"
    >
      <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 -z-10 text-white opacity-30" />
      <BrandGlow className="-z-10" />
      <PetalDecor variant="corner" tone="dark" animated className="-z-10 h-56 opacity-90 sm:h-64" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-3 animate-fade-up">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-celeste-200 ring-1 ring-white/15">
            <Sparkles className="size-3.5 text-sol-400" aria-hidden />
            {rolLabel}
          </p>
          <h1 id="saludo-panel" className="font-display text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            {saludo}, <span className="text-gradient-light">{primerNombre}</span>
          </h1>
          <p className="flex items-center gap-2 text-sm text-noche-200">
            <CalendarDays className="size-4 shrink-0 text-celeste-300" aria-hidden />
            <span>{fecha}</span>
          </p>
          <p className="text-[15px] leading-relaxed text-noche-100">
            {urgentes > 0 ? (
              <>
                <Siren className="mr-1.5 inline size-4 -translate-y-px text-sol-400" aria-hidden />
                Hay{" "}
                <a href="#alertas" className="font-semibold text-sol-300 underline-offset-4 hover:underline">
                  {urgentes} alerta{urgentes === 1 ? "" : "s"} urgente{urgentes === 1 ? "" : "s"}
                </a>{" "}
                para atender hoy.
              </>
            ) : (
              "No hay alertas urgentes: el registro está al día. ¡Buen trabajo!"
            )}
          </p>
        </div>
      </div>

      {visibles.length > 0 ? (
        <nav aria-label="Accesos rápidos" className="mt-6">
          <ul
            className={cn(
              "grid gap-3 sm:grid-cols-2",
              visibles.length >= 5 ? "lg:grid-cols-3 xl:grid-cols-5" : visibles.length >= 3 ? "lg:grid-cols-3" : "lg:max-w-2xl",
            )}
          >
            {visibles.map((a) => {
              const Icono = a.icon;
              const conPendientes = (a.contador ?? 0) > 0;
              return (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    className="group flex h-full items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/12 backdrop-blur-sm transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-white/[0.11] hover:ring-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-400"
                  >
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-celeste-200 ring-1 ring-white/15 transition-colors group-hover:bg-azul-600 group-hover:text-white"
                    >
                      <Icono className="size-5" strokeWidth={1.9} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold text-white">{a.label}</span>
                      <span className="truncate text-xs text-noche-200">
                        {a.contador !== undefined ? `${a.contador.toLocaleString("es-AR")} ${a.detalle}` : a.detalle}
                      </span>
                    </span>
                    {conPendientes ? (
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-sol-400 px-1.5 text-xs font-bold text-noche-950 nums-tabular">
                        {(a.contador ?? 0) > 99 ? "99+" : a.contador}
                      </span>
                    ) : (
                      <ArrowUpRight
                        aria-hidden
                        className="size-4 shrink-0 text-noche-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </section>
  );
}
