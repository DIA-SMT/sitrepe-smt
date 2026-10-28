import type { Metadata } from "next";
import { BadgeCheck, CalendarDays, ChartPie, FlaskConical, MapPinned, Shapes, Store } from "lucide-react";
import { AreaChartCard, BarChartCard, DonutChart } from "@/components/shared/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import {
  ANIO_INICIO,
  PRESETS_RANGO,
  clavePeriodo,
  describirRango,
  getEstadisticas,
  leerRango,
  periodoActual,
  variacion,
} from "@/lib/data/reportes";
import { CLASE_PRODUCTO, etiqueta } from "@/lib/domain/etiquetas";
import { formatNumero } from "@/lib/domain/formato";
import { EncabezadoSeccion } from "../_components/encabezado-seccion";
import { RangoPersonalizado } from "../_components/rango-personalizado";
import { Segmentos } from "../_components/segmentos";

export const metadata: Metadata = { title: "Estadísticas" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const RUTA = "/gestion/reportes/estadisticas";

/** Acorta rótulos largos para los ejes (el dato completo queda en la tabla). */
function corto(texto: string, max = 26): string {
  return texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto;
}

/** Rótulos cortos y únicos (los gráficos usan el rótulo como clave de cada barra). */
function rotulos<T>(items: T[], texto: (item: T) => string, valor: (item: T) => number, max = 26) {
  const usados = new Set<string>();
  return items.map((item) => {
    const base = corto(texto(item), max);
    let label = base;
    for (let n = 2; usados.has(label); n++) label = `${base} (${n})`;
    usados.add(label);
    return { label, value: valor(item) };
  });
}

const UNIDAD: Record<string, string> = { ml: "ml", l: "L", g: "g", kg: "kg", unidades: "u." };

const porcentaje = (valor: number, total: number) =>
  total > 0 ? `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format((valor / total) * 100)} %` : "—";

export default async function EstadisticasPage({ searchParams }: Props) {
  await requerirStaff();
  const sp = await searchParams;
  const rango = leerRango(sp);
  const est = await getEstadisticas(rango);
  const actual = periodoActual();

  const delta = variacion(est.total, est.totalAnterior);
  const rubrosActivos = est.rubros.filter((r) => r.value > 0);
  const barriosConDato = est.barrios.filter((b) => b.barrio !== "Sin barrio");
  const zonasConDato = est.porZona.filter((z) => z.label !== "Sin zona");
  const promedio = est.meses > 0 ? est.total / est.meses : 0;
  const titulo = describirRango(rango);

  return (
    <>
      <EncabezadoSeccion
        icono={ChartPie}
        titulo={`Estadísticas · ${titulo}`}
        descripcion="Certificados timbrados (válidos) según la fecha del servicio, por rubro del Anexo, zona, barrio y producto aplicado. Cada gráfico tiene su tabla de datos (botón “Ver tabla”)."
        controles={
          <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <Segmentos
              etiqueta="Período de las estadísticas"
              items={PRESETS_RANGO.map((p) => ({
                href: p.valor === "12m" ? RUTA : `${RUTA}?periodo=${p.valor}`,
                etiqueta: p.etiqueta,
                activo: rango.preset === p.valor,
              }))}
            />
            <RangoPersonalizado
              accion={RUTA}
              desde={clavePeriodo(rango.desde)}
              hasta={clavePeriodo(rango.hasta)}
              minimo={`${ANIO_INICIO}-01`}
              maximo={clavePeriodo(actual)}
            />
          </div>
        }
      />

      {est.total === 0 ? (
        <EmptyState
          icon={ChartPie}
          title="Sin certificados timbrados en el período"
          description={`No hay certificados timbrados con servicio en el período elegido (${titulo}). Probá con un período más amplio.`}
        />
      ) : (
        <>
          <section aria-label="Indicadores del período" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Certificados timbrados"
              value={est.total}
              icon={BadgeCheck}
              delta={delta.delta}
              trend={delta.trend}
              hint="vs. período anterior"
            />
            <StatCard
              label="Promedio mensual"
              value={Math.round(promedio)}
              icon={CalendarDays}
              tone="celeste"
              hint={`${est.meses} mes${est.meses === 1 ? "" : "es"} analizado${est.meses === 1 ? "" : "s"}`}
            />
            <StatCard
              label="Rubros con servicios"
              value={rubrosActivos.length}
              icon={Store}
              tone="violeta"
              hint={`En ${est.porGrupo.length} grupo${est.porGrupo.length === 1 ? "" : "s"} del Anexo`}
            />
            <StatCard
              label="Barrios alcanzados"
              value={barriosConDato.length}
              icon={MapPinned}
              tone="ambar"
              hint={`${zonasConDato.length} zona${zonasConDato.length === 1 ? "" : "s"} de la ciudad`}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <AreaChartCard
              title="Evolución mensual"
              description="Certificados timbrados por mes y tipo de servicio"
              data={est.evolucion.map((m) => ({ label: m.label, fumigacion: m.fumigacion, tanque: m.tanque }))}
              series={[
                { key: "fumigacion", label: "Fumigación y desinfección" },
                { key: "tanque", label: "Limpieza de tanques" },
              ]}
              stacked
              height={300}
            />
            <DonutChart
              title="Por tipo de servicio"
              description={titulo}
              data={est.porTipo.map((t) => ({ label: t.label, value: t.value }))}
              centerLabel="certificados"
              size={180}
            />
          </div>

          <h2 className="mt-2 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <Store className="size-5 text-azul-600" aria-hidden /> Rubros del Anexo
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <BarChartCard
              title="Por grupo de rubro"
              description="Agrupación del Anexo de la Ord. 2681/98"
              data={rotulos(est.porGrupo, (g) => g.label, (g) => g.value)}
              orientation="horizontal"
            />
            <BarChartCard
              title="Rubros con más servicios"
              description="Los 10 rubros con más certificados timbrados"
              data={rotulos(rubrosActivos.slice(0, 10), (r) => r.rubro, (r) => r.value)}
              orientation="horizontal"
            />
          </div>
          <SectionCard
            title="Detalle por rubro"
            description={`${rubrosActivos.length} rubros con certificados timbrados en el período`}
            icon={Shapes}
            flush
          >
            <TablaDesplazable>
              <THead className="sticky top-0 z-10">
                <TR>
                  <TH>Rubro</TH>
                  <TH>Grupo</TH>
                  <TH numeric>Certificados</TH>
                  <TH numeric>% del total</TH>
                </TR>
              </THead>
              <TBody>
                {rubrosActivos.map((r) => (
                  <TR key={`${r.grupo}-${r.rubro}`}>
                    <TD className="min-w-56 font-medium">{r.rubro}</TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{r.grupo}</TD>
                    <TD numeric className="font-semibold">
                      {r.value.toLocaleString("es-AR")}
                    </TD>
                    <TD numeric>
                      <Proporcion valor={r.value} total={est.total} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TablaDesplazable>
          </SectionCard>

          <h2 className="mt-2 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <MapPinned className="size-5 text-azul-600" aria-hidden /> Zonas y barrios
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <BarChartCard
              title="Por zona"
              description="Según la zona del establecimiento"
              data={rotulos(est.porZona, (z) => z.label, (z) => z.value, 18)}
              orientation={est.porZona.length > 6 ? "horizontal" : "vertical"}
            />
            <BarChartCard
              title="Barrios con más servicios"
              description="Los 12 barrios con más certificados timbrados"
              data={rotulos(barriosConDato.slice(0, 12), (b) => b.barrio, (b) => b.value)}
              orientation="horizontal"
            />
          </div>
          <SectionCard
            title="Detalle por barrio"
            description={`${est.barrios.length} barrios (incluye establecimientos sin barrio cargado)`}
            icon={MapPinned}
            flush
          >
            <TablaDesplazable>
              <THead className="sticky top-0 z-10">
                <TR>
                  <TH>Barrio</TH>
                  <TH>Zona</TH>
                  <TH numeric>Certificados</TH>
                  <TH numeric>% del total</TH>
                </TR>
              </THead>
              <TBody>
                {est.barrios.map((b) => (
                  <TR key={`${b.zona}-${b.barrio}`}>
                    <TD className="min-w-48 font-medium">{b.barrio}</TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{b.zona}</TD>
                    <TD numeric className="font-semibold">
                      {b.value.toLocaleString("es-AR")}
                    </TD>
                    <TD numeric>
                      <Proporcion valor={b.value} total={est.total} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TablaDesplazable>
          </SectionCard>

          <h2 className="mt-2 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <FlaskConical className="size-5 text-azul-600" aria-hidden /> Productos aplicados
          </h2>
          {est.productos.length === 0 ? (
            <EmptyState
              compact
              icon={FlaskConical}
              title="Sin productos registrados"
              description="Los certificados timbrados del período no tienen productos cargados."
            />
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <DonutChart
                  title="Por clase de producto"
                  description="Aplicaciones (un certificado puede usar varios productos)"
                  data={est.porClase.map((c) => ({ label: etiqueta(CLASE_PRODUCTO, c.clase).label, value: c.value }))}
                  centerLabel="aplicaciones"
                  size={180}
                />
                <BarChartCard
                  title="Productos más utilizados"
                  description="Los 10 productos presentes en más servicios"
                  data={rotulos(est.productos.slice(0, 10), (p) => p.producto, (p) => p.servicios)}
                  orientation="horizontal"
                />
              </div>
              <SectionCard
                title="Detalle por producto"
                description={`${est.productos.length} productos · ${est.aplicaciones.toLocaleString("es-AR")} aplicaciones con cantidades declaradas`}
                icon={FlaskConical}
                flush
              >
                <TablaDesplazable>
                  <THead className="sticky top-0 z-10">
                    <TR>
                      <TH>Producto</TH>
                      <TH>Principio activo</TH>
                      <TH>Clase</TH>
                      <TH numeric>Servicios</TH>
                      <TH numeric>Cantidad aplicada</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {est.productos.map((p) => {
                      const clase = etiqueta(CLASE_PRODUCTO, p.clase);
                      return (
                        <TR key={p.id}>
                          <TD className="min-w-48 font-medium">{p.producto}</TD>
                          <TD className="min-w-40 text-[13px] text-muted-foreground">{p.principioActivo ?? "—"}</TD>
                          <TD>
                            <Badge tone={clase.tono} size="sm">
                              {clase.label}
                            </Badge>
                          </TD>
                          <TD numeric className="font-semibold">
                            {p.servicios.toLocaleString("es-AR")}
                          </TD>
                          <TD numeric className="whitespace-nowrap">
                            {p.cantidades.length > 0
                              ? p.cantidades.map((c) => `${formatNumero(c.total)} ${UNIDAD[c.unidad] ?? c.unidad}`).join(" · ")
                              : "—"}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </TablaDesplazable>
              </SectionCard>
            </>
          )}
        </>
      )}
    </>
  );
}

function TablaDesplazable({ children }: { children: React.ReactNode }) {
  return (
    <Table framed={false} containerClassName="max-h-[28rem] overflow-y-auto">
      {children}
    </Table>
  );
}

function Proporcion({ valor, total }: { valor: number; total: number }) {
  const pct = total > 0 ? (valor / total) * 100 : 0;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span aria-hidden className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-azul-100 sm:inline-block">
        <span className="block h-full rounded-full bg-linear-to-r from-azul-600 to-celeste-400" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-12 text-right text-muted-foreground nums-tabular">{porcentaje(valor, total)}</span>
    </span>
  );
}
