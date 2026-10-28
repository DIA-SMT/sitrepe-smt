import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  Building2,
  CalendarCheck,
  CalendarPlus,
  CircleX,
  ClipboardCheck,
  MapPin,
  Route,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import {
  type FilaInspeccion,
  getEmpresaBasica,
  getInspecciones,
  getInspeccionesDelDia,
  getInspectores,
  getResumenInspecciones,
  leerFiltrosInspecciones,
  sumarDiasISO,
} from "@/lib/data/fiscalizacion";
import { ESTADO_INSPECCION, RESULTADO_INSPECCION, TIPO_INSPECCION } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, hoyISO } from "@/lib/domain/formato";
import { Constants } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inspecciones",
  description: "Inspecciones por muestreo, controles de vencimiento, depósitos anuales y denuncias.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function InspeccionesPage({ searchParams }: Props) {
  const sesion = await requerirStaff();
  const sp = await searchParams;
  const filtros = leerFiltrosInspecciones(sp);
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);
  const esInspector = sesion.perfil.rol === "inspector";
  // Aproximación del "este mes" de los indicadores: el filtro de fechas usa la fecha programada.
  const inicioMes = `${hoyISO().slice(0, 8)}01`;

  const [{ filas, total }, delDia, resumen, inspectores, empresa] = await Promise.all([
    getInspecciones(filtros, { desde, hasta }),
    getInspeccionesDelDia(esInspector ? sesion.userId : null),
    getResumenInspecciones(),
    getInspectores(),
    filtros.empresa ? getEmpresaBasica(filtros.empresa) : Promise.resolve(null),
  ]);

  const hayFiltros = Object.values(filtros).some(Boolean);
  const sinEmpresa = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k !== "empresa" && k !== "pagina" && typeof v === "string") sinEmpresa.set(k, v);
  }

  return (
    <>
      <PageHeader
        title="Inspecciones"
        description="Muestreo en el lugar del servicio, control de vencimientos, inspección anual de depósitos y denuncias (Art. 10.º b y d)."
        icon={ShieldCheck}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Fiscalización" }, { label: "Inspecciones" }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/gestion/hoja-de-ruta">
                <Route aria-hidden />
                Hoja de ruta
              </Link>
            </Button>
            <Button asChild>
              <Link href="/gestion/inspecciones/nueva">
                <CalendarPlus aria-hidden />
                Programar inspección
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <DelDia inspecciones={delDia} esInspector={esInspector} />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Programadas"
            value={resumen.programadas}
            icon={CalendarCheck}
            tone="azul"
            hint="Pendientes de realizar"
            href="/gestion/inspecciones?estado=programada"
          />
          <StatCard
            label="Atrasadas"
            value={resumen.atrasadas}
            icon={AlarmClock}
            tone="ambar"
            hint="Con fecha vencida"
            href={`/gestion/inspecciones?estado=programada&hasta=${sumarDiasISO(hoyISO(), -1)}`}
          />
          <StatCard
            label="Realizadas este mes"
            value={resumen.realizadasMes}
            icon={ClipboardCheck}
            tone="verde"
            href={`/gestion/inspecciones?estado=realizada&desde=${inicioMes}`}
          />
          <StatCard
            label="No conformes este mes"
            value={resumen.noConformesMes}
            icon={CircleX}
            tone="rojo"
            hint="Posibles actas"
            href={`/gestion/inspecciones?resultado=no_conforme&desde=${inicioMes}`}
          />
        </div>

        <SectionCard
          title="Registro de inspecciones"
          description={total === 0 ? "Sin resultados" : `${total.toLocaleString("es-AR")} ${total === 1 ? "inspección" : "inspecciones"}`}
          icon={ClipboardCheck}
          flush
          footer={total > tamanio ? <Paginacion pagina={pagina} total={total} params={sp} ruta="/gestion/inspecciones" className="w-full" /> : undefined}
        >
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:px-6">
            {empresa ? (
              <p className="inline-flex w-fit flex-wrap items-center gap-2 rounded-full bg-azul-50 py-1 pr-1 pl-3 text-sm text-azul-800 ring-1 ring-azul-100">
                <Building2 className="size-4" aria-hidden />
                Empresa: <strong className="font-semibold">{empresa.nombre_comercial}</strong>
                <Link
                  href={`/gestion/inspecciones${sinEmpresa.size ? `?${sinEmpresa}` : ""}`}
                  className="inline-flex size-6 items-center justify-center rounded-full hover:bg-azul-100"
                  aria-label="Quitar el filtro por empresa"
                >
                  <X className="size-3.5" aria-hidden />
                </Link>
              </p>
            ) : null}
            <FiltrosUrl
              campos={[
                { tipo: "busqueda", nombre: "q", placeholder: "Código, establecimiento o empresa…", className: "sm:w-64" },
                {
                  tipo: "select",
                  nombre: "estado",
                  etiqueta: "Estado",
                  opciones: Constants.public.Enums.estado_inspeccion.map((v) => ({ valor: v, label: ESTADO_INSPECCION[v].label })),
                  className: "sm:w-40",
                },
                {
                  tipo: "select",
                  nombre: "tipo",
                  etiqueta: "Tipo",
                  opciones: Constants.public.Enums.tipo_inspeccion.map((v) => ({ valor: v, label: TIPO_INSPECCION[v].label })),
                },
                {
                  tipo: "select",
                  nombre: "resultado",
                  etiqueta: "Resultado",
                  opciones: Constants.public.Enums.resultado_inspeccion.map((v) => ({ valor: v, label: RESULTADO_INSPECCION[v].label })),
                  className: "sm:w-44",
                },
                {
                  tipo: "select",
                  nombre: "inspector",
                  etiqueta: "Inspector",
                  opciones: inspectores.map((p) => ({ valor: p.id, label: p.nombre })),
                },
                { tipo: "fecha", nombre: "desde", etiqueta: "Desde" },
                { tipo: "fecha", nombre: "hasta", etiqueta: "Hasta" },
              ]}
            />
          </div>

          {filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={ShieldCheck}
                title={hayFiltros ? "No hay inspecciones con esos filtros" : "Todavía no hay inspecciones"}
                description={
                  hayFiltros
                    ? "Probá con otros filtros o limpialos para ver todo el registro."
                    : "Programá la primera desde la hoja de ruta o con el botón “Programar inspección”."
                }
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href={hayFiltros ? "/gestion/inspecciones" : "/gestion/hoja-de-ruta"}>
                      {hayFiltros ? "Ver todas" : "Ir a la hoja de ruta"}
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul role="list" className="divide-y divide-border">
              {filas.map((f, i) => (
                <FilaRegistro key={f.id ?? i} inspeccion={f} />
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}

/** Lugar de la inspección: establecimiento o, si no hay, la empresa. */
function lugar(i: FilaInspeccion) {
  return {
    titulo: i.establecimiento_nombre ?? i.empresa_nombre ?? "Sin lugar asignado",
    detalle: i.establecimiento_nombre ? i.establecimiento_domicilio : i.empresa_nombre ? "Oficina y depósito de la empresa" : null,
  };
}

function DelDia({ inspecciones, esInspector }: { inspecciones: FilaInspeccion[]; esInspector: boolean }) {
  const hoy = hoyISO();
  const titulo = esInspector ? "Mis inspecciones de hoy" : "Inspecciones programadas para hoy";
  return (
    <section
      aria-labelledby="del-dia"
      className="relative overflow-hidden rounded-panel bg-noche p-5 text-white shadow-elevated sm:p-6"
    >
      <PetalDecor variant="corner" tone="dark" className="opacity-80" />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-celeste-200 ring-1 ring-white/15">
              <Sun className="size-3.5 text-sol-400" aria-hidden />
              {formatFecha(hoy)}
            </p>
            <h2 id="del-dia" className="mt-2 font-display text-xl font-semibold sm:text-2xl">
              {titulo}
            </h2>
            <p className="text-sm text-noche-200">
              {inspecciones.length === 0
                ? esInspector
                  ? "No tenés visitas pendientes para hoy."
                  : "No hay visitas pendientes para hoy."
                : `${inspecciones.length} ${inspecciones.length === 1 ? "visita pendiente" : "visitas pendientes"}, incluidas las atrasadas.`}
            </p>
          </div>
          {inspecciones.length === 0 ? (
            <Button asChild variant="sol">
              <Link href="/gestion/hoja-de-ruta">
                <Route aria-hidden /> Ver la hoja de ruta
              </Link>
            </Button>
          ) : null}
        </div>

        {inspecciones.length > 0 ? (
          <ul role="list" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {inspecciones.map((i) => {
              const l = lugar(i);
              const atrasada = Boolean(i.fecha_programada && i.fecha_programada < hoy);
              return (
                <li key={i.id ?? i.codigo}>
                  <Link
                    href={`/gestion/inspecciones/${i.id}`}
                    className="group flex h-full flex-col gap-2 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/15 transition-all hover:-translate-y-0.5 hover:bg-white/[0.12] hover:ring-white/30"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <EstadoBadge mapa={TIPO_INSPECCION} valor={i.tipo} size="sm" />
                      {atrasada ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sol-400 px-2 py-0.5 text-[11px] font-semibold text-noche-950">
                          <AlarmClock className="size-3" aria-hidden /> Atrasada · {formatFecha(i.fecha_programada)}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-display text-base leading-snug font-semibold">{l.titulo}</p>
                    {l.detalle ? (
                      <p className="flex items-start gap-1.5 text-sm text-noche-200">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {l.detalle}
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-noche-300">
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="size-3.5" aria-hidden /> {i.inspector_nombre ?? "Sin asignar"}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-sol-300 group-hover:text-sol-200">
                        Registrar <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function FilaRegistro({ inspeccion: i }: { inspeccion: FilaInspeccion }) {
  if (!i.id) return null;
  const l = lugar(i);
  const hoy = hoyISO();
  const atrasada = i.estado === "programada" && Boolean(i.fecha_programada && i.fecha_programada < hoy);
  return (
    <li className="group relative flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-azul-50/40 sm:px-6 md:flex-row md:items-center md:gap-5">
      <div className="flex shrink-0 items-center gap-3 md:w-36 md:flex-col md:items-start md:gap-0.5">
        <span className="font-mono text-xs font-semibold text-azul-700">{i.codigo}</span>
        <span className={cn("text-sm nums-tabular", atrasada ? "font-semibold text-warning" : "text-muted-foreground")}>
          {formatFecha(i.fecha_programada)}
          {atrasada ? " · atrasada" : ""}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/gestion/inspecciones/${i.id}`}
          className="font-medium leading-snug text-foreground after:absolute after:inset-0 hover:text-azul-700"
        >
          {l.titulo}
        </Link>
        {l.detalle ? <p className="text-sm text-muted-foreground">{l.detalle}</p> : null}
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UserRound className="size-3.5" aria-hidden /> {i.inspector_nombre ?? "Sin asignar"}
          </span>
          {i.certificado_numero ? <span>· Cert. N.º {i.certificado_numero}</span> : null}
          {i.denuncia_codigo ? <span>· Denuncia {i.denuncia_codigo}</span> : null}
          {i.empresa_nombre && i.establecimiento_nombre ? <span>· {i.empresa_nombre}</span> : null}
          {i.realizada_at ? <span>· Realizada {formatFechaHora(i.realizada_at)}</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 md:w-72 md:justify-end">
        <EstadoBadge mapa={TIPO_INSPECCION} valor={i.tipo} size="sm" />
        {i.resultado ? (
          <EstadoBadge mapa={RESULTADO_INSPECCION} valor={i.resultado} size="sm" />
        ) : (
          <EstadoBadge mapa={ESTADO_INSPECCION} valor={i.estado} size="sm" />
        )}
      </div>
    </li>
  );
}
