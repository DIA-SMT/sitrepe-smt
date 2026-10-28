import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, ClipboardList, ScrollText, SearchX, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import { type EstadoEmpresa, getResumenPadron, listarEmpresas } from "@/lib/data/empresas";
import { ESTADO_EMPRESA } from "@/lib/domain/etiquetas";
import { Constants } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { Actividades, IconoObservaciones, Vencimiento } from "./_components/celdas";
import { DialogoEmpresa } from "./_components/dialogo-empresa";

export const metadata: Metadata = {
  title: "Empresas",
  description: "Padrón de empresas prestadoras de servicios de fumigación y limpieza de tanques.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PadronEmpresasPage({ searchParams }: Props) {
  const sesion = await requerirStaff();
  const sp = await searchParams;
  const puedeEditar = sesion.perfil.rol === "admin" || sesion.perfil.rol === "control";

  const q = primero(sp.q)?.trim() || undefined;
  const estadoParam = primero(sp.estado);
  const estado = (Constants.public.Enums.estado_empresa as readonly string[]).includes(estadoParam ?? "")
    ? (estadoParam as EstadoEmpresa)
    : undefined;
  const actividadParam = primero(sp.actividad);
  const actividad = actividadParam === "F" || actividadParam === "T" ? actividadParam : undefined;
  const vence30 = primero(sp.vence) === "30";
  const conObservaciones = primero(sp.obs) === "si";
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);

  const [{ filas, total }, resumen] = await Promise.all([
    listarEmpresas({ q, estado, actividad, vence30, conObservaciones, desde, hasta }),
    getResumenPadron(),
  ]);
  const hayFiltros = Boolean(q || estado || actividad || vence30 || conObservaciones);

  return (
    <>
      <PageHeader
        title="Empresas prestadoras"
        description="Padrón del Registro de Empresas de Fumigación: estado de habilitación, asesores técnicos, productos aprobados y actividad del mes."
        icon={Building2}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Prestadores" }, { label: "Empresas" }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/gestion/tramites">
                <ScrollText aria-hidden />
                Trámites
              </Link>
            </Button>
            {puedeEditar ? <DialogoEmpresa modo="crear" /> : null}
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Habilitadas"
            value={resumen.porEstado.habilitada}
            icon={Building2}
            tone="verde"
            hint={`${resumen.conTanques} también para limpieza de tanques`}
            href="/gestion/empresas?estado=habilitada"
          />
          <StatCard
            label="Vencen en 30 días"
            value={resumen.porVencer30}
            icon={CalendarClock}
            tone="ambar"
            hint={`${resumen.porEstado.vencida} con la habilitación vencida`}
            href="/gestion/empresas?vence=30"
          />
          <StatCard
            label="En trámite"
            value={resumen.porEstado.en_tramite}
            icon={ClipboardList}
            tone="celeste"
            hint="Solicitudes de inscripción en curso"
            href="/gestion/empresas?estado=en_tramite"
          />
          <StatCard
            label="Con observaciones"
            value={resumen.conObservaciones}
            icon={TriangleAlert}
            tone="violeta"
            hint="Inconsistencias de datos a regularizar"
            href="/gestion/empresas?obs=si"
          />
        </div>

        <SectionCard
          title="Padrón"
          description={`${total.toLocaleString("es-AR")} de ${resumen.total.toLocaleString("es-AR")} empresas${hayFiltros ? " (filtrado)" : ""}`}
          icon={ClipboardList}
          flush
          footer={<Paginacion pagina={pagina} total={total} tamanio={tamanio} params={sp} ruta="/gestion/empresas" className="w-full" />}
        >
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <FiltrosUrl
              campos={[
                { tipo: "busqueda", nombre: "q", placeholder: "Buscá por nombre, CUIT o N.º" },
                {
                  tipo: "select",
                  nombre: "estado",
                  etiqueta: "Estado",
                  opciones: Constants.public.Enums.estado_empresa.map((e) => ({ valor: e, label: ESTADO_EMPRESA[e].label })),
                },
                {
                  tipo: "select",
                  nombre: "actividad",
                  etiqueta: "Actividad",
                  opciones: [
                    { valor: "F", label: "Fumigación (F)" },
                    { valor: "T", label: "Limpieza de tanques (T)" },
                  ],
                },
                { tipo: "select", nombre: "vence", etiqueta: "Vencimiento", opciones: [{ valor: "30", label: "Vence en 30 días" }] },
                { tipo: "select", nombre: "obs", etiqueta: "Observaciones", opciones: [{ valor: "si", label: "Con observaciones" }] },
              ]}
            />
          </div>

          {filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={SearchX}
                title={hayFiltros ? "No encontramos empresas con esos filtros" : "Todavía no hay empresas en el padrón"}
                description={
                  hayFiltros
                    ? "Probá con otro nombre, CUIT o N.º de registro, o limpiá los filtros."
                    : "Las empresas se incorporan al aprobar su solicitud de inscripción o con el alta manual."
                }
                action={
                  hayFiltros ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/gestion/empresas">Limpiar filtros</Link>
                    </Button>
                  ) : puedeEditar ? (
                    <DialogoEmpresa modo="crear" />
                  ) : null
                }
              />
            </div>
          ) : (
            <>
              {/* Móvil: tarjetas */}
              <ul className="divide-y divide-border md:hidden">
                {filas.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/gestion/empresas/${e.id}`}
                      className="flex flex-col gap-2.5 px-5 py-4 transition-colors hover:bg-azul-50/50 active:bg-azul-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar nombre={e.nombre_comercial ?? "Empresa"} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{e.nombre_comercial}</p>
                            <p className="text-xs text-muted-foreground nums-tabular">
                              {e.numero_registro ? `N.º ${e.numero_registro} · ` : ""}
                              {e.cuit}
                            </p>
                          </div>
                        </div>
                        <EstadoBadge mapa={ESTADO_EMPRESA} valor={e.estado_efectivo} size="sm" />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <Actividades fumigacion={e.habilita_fumigacion} tanques={e.habilita_tanques} />
                        <Vencimiento fecha={e.vencimiento_habilitacion} dias={e.dias_para_vencer} compacto />
                      </div>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{e.tecnicos_aprobados ?? 0} técnicos</span>
                        <span>{e.productos_aprobados ?? 0} productos</span>
                        <span>{e.certificados_mes ?? 0} certificados este mes</span>
                        {e.observaciones ? (
                          <span className="inline-flex items-center gap-1 font-medium text-sol-800">
                            <TriangleAlert className="size-3.5" aria-hidden /> Con observaciones
                          </span>
                        ) : null}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Escritorio: tabla */}
              <Table framed={false} containerClassName="hidden md:block">
                <THead>
                  <TR>
                    <TH numeric className="w-14">
                      N.º
                    </TH>
                    <TH>Empresa</TH>
                    <TH>CUIT</TH>
                    <TH>Actividades</TH>
                    <TH>Estado</TH>
                    <TH>Vencimiento</TH>
                    <TH numeric>Técnicos</TH>
                    <TH numeric>Productos</TH>
                    <TH numeric>Cert. mes</TH>
                    <TH>
                      <span className="sr-only">Acciones</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {filas.map((e) => (
                    <TR key={e.id}>
                      <TD numeric className="font-semibold text-muted-foreground">
                        {e.numero_registro ?? "—"}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar nombre={e.nombre_comercial ?? "Empresa"} size="sm" className="hidden lg:inline-flex" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/gestion/empresas/${e.id}`}
                                className="font-semibold whitespace-nowrap text-foreground transition-colors hover:text-azul-700"
                              >
                                {e.nombre_comercial}
                              </Link>
                              <IconoObservaciones texto={e.observaciones} />
                            </div>
                            {e.titular ? <p className="max-w-56 truncate text-xs text-muted-foreground">{e.titular}</p> : null}
                          </div>
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap text-muted-foreground nums-tabular">{e.cuit}</TD>
                      <TD>
                        <Actividades fumigacion={e.habilita_fumigacion} tanques={e.habilita_tanques} />
                      </TD>
                      <TD>
                        <EstadoBadge mapa={ESTADO_EMPRESA} valor={e.estado_efectivo} />
                      </TD>
                      <TD className="whitespace-nowrap">
                        <Vencimiento fecha={e.vencimiento_habilitacion} dias={e.dias_para_vencer} />
                      </TD>
                      <TD numeric>
                        <span
                          className={cn(
                            (e.tecnicos_aprobados ?? 0) === 0 && e.estado_efectivo === "habilitada" && "font-semibold text-danger",
                          )}
                          title={(e.tecnicos_aprobados ?? 0) === 0 ? "Sin asesor técnico aprobado: no puede firmar certificados" : undefined}
                        >
                          {e.tecnicos_aprobados ?? 0}
                        </span>
                      </TD>
                      <TD numeric>{e.productos_aprobados ?? 0}</TD>
                      <TD numeric className="font-semibold">
                        {(e.certificados_mes ?? 0).toLocaleString("es-AR")}
                      </TD>
                      <TD align="right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/gestion/empresas/${e.id}`} aria-label={`Ver legajo de ${e.nombre_comercial}`}>
                            Legajo
                            <ArrowRight aria-hidden />
                          </Link>
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </>
          )}
        </SectionCard>
      </div>
    </>
  );
}
