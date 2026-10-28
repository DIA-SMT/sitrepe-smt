import type { Metadata } from "next";
import Link from "next/link";
import { Award, CalendarRange, DoorOpen, ExternalLink, GraduationCap, SearchX, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { type EstadoCapacitacion, listarCapacitaciones, resumenCapacitaciones } from "@/lib/data/admin";
import { ESTADO_CAPACITACION } from "@/lib/domain/etiquetas";
import { Constants } from "@/lib/supabase/database.types";
import { SegmentosEnlace } from "../configuracion/_compartido/segmentos";
import { DialogoCapacitacion } from "./_components/dialogo-capacitacion";
import { TarjetaCapacitacion } from "./_components/tarjeta-capacitacion";

export const metadata: Metadata = {
  title: "Capacitaciones",
  description: "Capacitaciones para empresas, asesores técnicos y la comunidad: inscriptos, cupo y asistencia.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const TAMANIO = 12;

export default async function CapacitacionesGestionPage({ searchParams }: Props) {
  const sesion = await requerirStaff();
  const puedeEditar = sesion.perfil.rol === "admin" || sesion.perfil.rol === "control";
  const sp = await searchParams;

  const q = primero(sp.q)?.trim() || undefined;
  const estadoParam = primero(sp.estado);
  const estado = (Constants.public.Enums.estado_capacitacion as readonly string[]).includes(estadoParam ?? "")
    ? (estadoParam as EstadoCapacitacion)
    : undefined;
  const cuandoParam = primero(sp.cuando);
  const cuando = cuandoParam === "proximas" || cuandoParam === "pasadas" ? cuandoParam : undefined;
  const { pagina, desde, hasta } = rangoPagina(sp.pagina, TAMANIO);

  const [{ filas, total }, resumen] = await Promise.all([
    listarCapacitaciones({ q, estado, cuando, desde, hasta }),
    resumenCapacitaciones(),
  ]);
  const hayFiltros = Boolean(q || estado || cuando);
  const pctAsistencia = resumen.inscriptos ? Math.round((resumen.asistentes / resumen.inscriptos) * 100) : 0;

  const hrefCuando = (valor?: "proximas" | "pasadas") => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (estado) p.set("estado", estado);
    if (valor) p.set("cuando", valor);
    return `/gestion/capacitaciones${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Capacitaciones"
        description="Organizá las capacitaciones para prestadores y la comunidad: inscripción desde el portal, cupo, asistencia y certificados."
        icon={GraduationCap}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Comunidad" }, { label: "Capacitaciones" }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/capacitaciones" target="_blank" rel="noopener">
                <ExternalLink aria-hidden />
                Ver en el portal
              </Link>
            </Button>
            {puedeEditar ? <DialogoCapacitacion modo="crear" /> : null}
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Inscripción abierta"
            value={resumen.abiertas}
            icon={DoorOpen}
            tone="verde"
            hint="Reciben inscripciones en el portal"
            href="/gestion/capacitaciones?estado=abierta"
          />
          <StatCard
            label="Próximas"
            value={resumen.proximas}
            icon={CalendarRange}
            tone="azul"
            hint="Desde hoy en adelante"
            href="/gestion/capacitaciones?cuando=proximas"
          />
          <StatCard
            label="Inscriptos"
            value={resumen.inscriptos}
            icon={UsersRound}
            tone="celeste"
            hint={`Total histórico · ${resumen.finalizadas} ${resumen.finalizadas === 1 ? "capacitación finalizada" : "capacitaciones finalizadas"}`}
          />
          <StatCard
            label="Asistentes certificados"
            value={resumen.asistentes}
            icon={Award}
            tone="ambar"
            hint={resumen.inscriptos ? `${pctAsistencia} % de los inscriptos` : "Todavía sin asistencia"}
          />
        </div>

        <SectionCard
          title="Agenda de capacitaciones"
          description={`${total.toLocaleString("es-AR")} ${total === 1 ? "capacitación" : "capacitaciones"}${hayFiltros ? " (filtrado)" : ""}`}
          icon={CalendarRange}
          flush
          footer={
            total > 0 ? (
              <Paginacion pagina={pagina} total={total} tamanio={TAMANIO} params={sp} ruta="/gestion/capacitaciones" className="w-full" />
            ) : undefined
          }
        >
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <SegmentosEnlace
              etiqueta="Período"
              items={[
                { href: hrefCuando(), etiqueta: "Todas", activo: !cuando },
                { href: hrefCuando("proximas"), etiqueta: "Próximas", activo: cuando === "proximas" },
                { href: hrefCuando("pasadas"), etiqueta: "Realizadas", activo: cuando === "pasadas" },
              ]}
            />
            <FiltrosUrl
              campos={[
                { tipo: "busqueda", nombre: "q", placeholder: "Buscá por título o lugar", className: "sm:w-64" },
                {
                  tipo: "select",
                  nombre: "estado",
                  etiqueta: "Estado",
                  opciones: Constants.public.Enums.estado_capacitacion.map((e) => ({
                    valor: e,
                    label: ESTADO_CAPACITACION[e].label,
                  })),
                },
              ]}
            />
          </div>

          <div className="p-5 sm:p-6">
            {filas.length === 0 ? (
              <EmptyState
                compact
                icon={hayFiltros ? SearchX : GraduationCap}
                title={hayFiltros ? "No hay capacitaciones con esos filtros" : "Todavía no hay capacitaciones"}
                description={
                  hayFiltros
                    ? "Probá con otro período o limpiá los filtros."
                    : "Programá la primera: las empresas y la comunidad se inscriben desde el portal."
                }
                action={
                  hayFiltros ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/gestion/capacitaciones">Limpiar filtros</Link>
                    </Button>
                  ) : puedeEditar ? (
                    <DialogoCapacitacion modo="crear" />
                  ) : null
                }
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filas.map((c, i) => (
                  <li key={c.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                    <TarjetaCapacitacion capacitacion={c} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
