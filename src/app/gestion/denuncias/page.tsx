import type { Metadata } from "next";
import Link from "next/link";
import { CheckCheck, EyeOff, Inbox, Loader, MapPin, MessageSquareWarning, ShieldCheck, UserRound } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { getDenuncias, getInspectores, getResumenDenuncias, leerFiltrosDenuncias } from "@/lib/data/fiscalizacion";
import { ESTADO_DENUNCIA, TIPO_DENUNCIA } from "@/lib/domain/etiquetas";
import { formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { Constants } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Denuncias",
  description: "Bandeja de denuncias vecinales sobre servicios de fumigación, envases y limpieza de tanques.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DenunciasPage({ searchParams }: Props) {
  const sesion = await requerirStaff();
  const sp = await searchParams;
  const filtros = leerFiltrosDenuncias(sp);
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);

  const [{ filas, total }, resumen, inspectores] = await Promise.all([
    getDenuncias(filtros, { desde, hasta }),
    getResumenDenuncias(),
    getInspectores(),
  ]);
  const opcionesAsignada = inspectores.some((p) => p.id === sesion.userId)
    ? inspectores
    : [{ id: sesion.userId, nombre: "Yo" }, ...inspectores];
  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <>
      <PageHeader
        title="Denuncias"
        description="Lo que denuncian los vecinos desde el portal: empresas sin habilitación, servicios mal realizados, envases descartados y tanques sin limpieza."
        icon={MessageSquareWarning}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Fiscalización" }, { label: "Denuncias" }]}
      />

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Sin tratar" value={resumen.recibidas} icon={Inbox} tone="azul" hint="Recibidas" href="/gestion/denuncias?estado=recibida" />
          <StatCard label="En curso" value={resumen.enCurso} icon={Loader} tone="ambar" href="/gestion/denuncias?estado=en_curso" />
          <StatCard
            label="Con inspección"
            value={resumen.programadas}
            icon={ShieldCheck}
            tone="violeta"
            hint="Programada"
            href="/gestion/denuncias?estado=inspeccion_programada"
          />
          <StatCard label="Cerradas" value={resumen.cerradas} icon={CheckCheck} tone="verde" href="/gestion/denuncias?estado=cerrada" />
        </div>

        <SectionCard
          title="Bandeja"
          description={total === 0 ? "Sin resultados" : `${total.toLocaleString("es-AR")} ${total === 1 ? "denuncia" : "denuncias"} · las más recientes primero`}
          icon={Inbox}
          flush
          footer={total > tamanio ? <Paginacion pagina={pagina} total={total} params={sp} ruta="/gestion/denuncias" className="w-full" /> : undefined}
        >
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <FiltrosUrl
              campos={[
                { tipo: "busqueda", nombre: "q", placeholder: "Código, domicilio o texto…", className: "sm:w-64" },
                {
                  tipo: "select",
                  nombre: "estado",
                  etiqueta: "Estado",
                  opciones: Constants.public.Enums.estado_denuncia.map((v) => ({ valor: v, label: ESTADO_DENUNCIA[v].label })),
                },
                {
                  tipo: "select",
                  nombre: "tipo",
                  etiqueta: "Tipo",
                  opciones: Constants.public.Enums.tipo_denuncia.map((v) => ({ valor: v, label: TIPO_DENUNCIA[v].label })),
                  className: "sm:w-60",
                },
                {
                  tipo: "select",
                  nombre: "asignada",
                  etiqueta: "Asignada a",
                  opciones: opcionesAsignada.map((p) => ({ valor: p.id, label: p.nombre })),
                },
              ]}
            />
          </div>

          {filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={MessageSquareWarning}
                title={hayFiltros ? "No hay denuncias con esos filtros" : "No hay denuncias"}
                description={
                  hayFiltros
                    ? "Probá con otros filtros o limpialos."
                    : "Cuando un vecino haga una denuncia desde el portal, va a aparecer acá."
                }
                action={
                  hayFiltros ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/gestion/denuncias">Ver todas</Link>
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <ul role="list" className="divide-y divide-border">
              {filas.map((d) => {
                const asignada = d.asignada ? `${d.asignada.nombre} ${d.asignada.apellido}`.trim() : null;
                const nueva = d.estado === "recibida";
                return (
                  <li
                    key={d.id}
                    className={cn(
                      "group relative flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-azul-50/40 sm:px-6 md:flex-row md:items-start md:gap-5",
                      nueva && "bg-azul-50/30",
                    )}
                  >
                    {nueva ? <span aria-hidden className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-azul-500" /> : null}
                    <div className="flex shrink-0 items-center gap-3 md:w-36 md:flex-col md:items-start md:gap-1">
                      <span className="font-mono text-xs font-semibold text-azul-700">{d.codigo}</span>
                      <time dateTime={d.created_at} title={formatFechaHora(d.created_at)} className="text-xs text-muted-foreground">
                        {formatRelativo(d.created_at)}
                      </time>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <EstadoBadge mapa={TIPO_DENUNCIA} valor={d.tipo} size="sm" />
                        {d.anonima ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <EyeOff className="size-3.5" aria-hidden /> Anónima
                          </span>
                        ) : null}
                      </div>
                      <Link
                        href={`/gestion/denuncias/${d.id}`}
                        className="line-clamp-2 text-[15px] leading-snug font-medium text-foreground after:absolute after:inset-0 hover:text-azul-700"
                      >
                        {d.descripcion}
                      </Link>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {d.domicilio ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden /> {d.domicilio}
                          </span>
                        ) : null}
                        {d.establecimiento ? <span>Establecimiento: {d.establecimiento.nombre}</span> : null}
                        {d.empresa ? <span>Empresa: {d.empresa.nombre_comercial}</span> : d.empresa_mencionada ? <span>Menciona: {d.empresa_mencionada}</span> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 md:w-56 md:flex-col md:items-end">
                      <EstadoBadge mapa={ESTADO_DENUNCIA} valor={d.estado} size="sm" pulse={nueva} />
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <UserRound className="size-3.5" aria-hidden /> {asignada ?? "Sin asignar"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}
