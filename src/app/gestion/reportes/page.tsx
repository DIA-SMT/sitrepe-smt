import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  ChartPie,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Landmark,
  Printer,
  Receipt,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandGlow, PetalDecor } from "@/components/brand/petal-decor";
import { BarChartCard } from "@/components/shared/charts";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import {
  EXPEDIENTE_RENDICION,
  desplazarPeriodo,
  diferencia,
  getPendientesConciliacion,
  getPlanillaMensual,
  getSerieRecaudacion,
  getUltimoDiaHabil,
  nombrePeriodo,
  periodoActual,
  queryPeriodo,
  totalizarPlanilla,
  tituloPeriodo,
  variacion,
} from "@/lib/data/reportes";
import { diasHasta, formatFechaLarga, formatNumero, formatPesos } from "@/lib/domain/formato";
import { pesosEnLetras } from "@/lib/domain/numeros-a-letras";
import { cn } from "@/lib/utils";
import { ComposicionCuentas } from "./_components/composicion-cuentas";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesResumenPage() {
  await requerirStaff();

  const actual = periodoActual();
  const cerrado = desplazarPeriodo(actual, -1);
  const previo = desplazarPeriodo(actual, -2);

  const [serie, planillaCerrado, planillaPrevio, planillaActual, vencimiento, pendientes] = await Promise.all([
    getSerieRecaudacion(desplazarPeriodo(actual, -11), actual),
    getPlanillaMensual(cerrado),
    getPlanillaMensual(previo),
    getPlanillaMensual(actual),
    getUltimoDiaHabil(actual),
    getPendientesConciliacion(cerrado),
  ]);

  const mesCerrado = serie[serie.length - 2];
  const mesPrevio = serie[serie.length - 3];
  const mesActual = serie[serie.length - 1];
  const totCerrado = totalizarPlanilla(planillaCerrado);
  const totPrevio = totalizarPlanilla(planillaPrevio);
  const totActual = totalizarPlanilla(planillaActual);
  const diasRestantes = diasHasta(vencimiento) ?? 0;
  const qCerrado = queryPeriodo(cerrado);
  const hintPrevio = `vs. ${nombrePeriodo(previo).split(" de ")[0]}`;

  const recaudacion = variacion(mesCerrado?.total ?? 0, mesPrevio?.total ?? 0);
  const certificados = variacion(totCerrado.certificados, totPrevio.certificados);
  const timbrados = variacion(totCerrado.timbrados, totPrevio.timbrados);
  const empresas = diferencia(totCerrado.empresas, totPrevio.empresas);

  const rendiciones = [...serie].reverse().slice(1, 7);
  const hayRecaudacion = serie.some((m) => m.total > 0);

  return (
    <>
      {/* Rendición del último mes cerrado */}
      <section
        aria-labelledby="rendicion-titulo"
        className="relative isolate overflow-hidden rounded-panel bg-noche px-5 py-6 text-white shadow-elevated sm:px-8 sm:py-8"
      >
        <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 -z-10 text-white opacity-25" />
        <BrandGlow className="-z-10" />
        <PetalDecor variant="corner" tone="dark" animated className="-z-10 h-56 opacity-80 sm:h-64" />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end">
          <div className="flex flex-col gap-4 animate-fade-up">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-celeste-200 ring-1 ring-white/15">
              <Sparkles className="size-3.5 text-sol-400" aria-hidden />
              Rendición mensual · Expte. N.º {EXPEDIENTE_RENDICION}
            </p>
            <div>
              <h2 id="rendicion-titulo" className="font-display text-lg font-medium text-noche-100">
                Recaudación verificada de {nombrePeriodo(cerrado)}
              </h2>
              <p className="mt-1 font-display text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
                <span className="text-gradient-light nums-tabular">{formatPesos(mesCerrado?.total ?? 0)}</span>
              </p>
              <p className="mt-3 max-w-xl text-xs leading-relaxed tracking-wide text-noche-200 uppercase">
                {pesosEnLetras(mesCerrado?.total ?? 0)}
              </p>
            </div>
            <ComposicionCuentas
              tono="oscuro"
              className="max-w-xl"
              partes={[
                { codigo: "505", nombre: "Cuenta Bancaria Especial de Salud Ambiental", total: mesCerrado?.c505 ?? 0 },
                { codigo: "091", nombre: "Compartida con Bromatología y Ambiente", total: mesCerrado?.c091 ?? 0 },
              ]}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="sol">
                <Link href={`/imprimir/informe-recaudacion?${qCerrado}`}>
                  <Printer aria-hidden /> Generar nota mensual
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/25 bg-white/[0.06] text-white hover:border-white/40 hover:bg-white/[0.12] hover:text-white"
              >
                <Link href={`/gestion/reportes/recaudacion?${qCerrado}`}>
                  Ver detalle <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/12 backdrop-blur-sm">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-celeste-200 uppercase">
                <CalendarClock className="size-4 text-sol-400" aria-hidden />
                Planilla mensual · Art. 10.º c
              </p>
              <p className="mt-2 text-sm text-noche-100">
                La planilla de <span className="font-semibold text-white">{nombrePeriodo(cerrado)}</span> se presenta hasta
                el último día hábil del mes siguiente:
              </p>
              <p className="mt-1 font-display text-xl font-semibold first-letter:uppercase">{formatFechaLarga(vencimiento)}</p>
              <p className="mt-1 text-sm">
                {diasRestantes > 0 ? (
                  <span className={cn("font-semibold", diasRestantes <= 5 ? "text-sol-300" : "text-celeste-200")}>
                    Faltan {diasRestantes} día{diasRestantes === 1 ? "" : "s"}
                  </span>
                ) : diasRestantes === 0 ? (
                  <span className="font-semibold text-sol-300">Vence hoy</span>
                ) : (
                  <span className="font-semibold text-red-300">Plazo vencido</span>
                )}
                <span className="text-noche-200">
                  {" "}
                  · {totCerrado.empresas.toLocaleString("es-AR")} empresa{totCerrado.empresas === 1 ? "" : "s"} con certificados
                </span>
              </p>
              <Link
                href={`/gestion/reportes/planilla-mensual?${qCerrado}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-sol-300 underline-offset-4 hover:underline"
              >
                Ver planillas del mes <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/12">
                <p className="text-xs text-noche-200 first-letter:uppercase">{nombrePeriodo(actual)} (en curso)</p>
                <p className="mt-1 text-lg font-semibold nums-tabular">{formatPesos(mesActual?.total ?? 0, false)}</p>
                <p className="text-xs text-noche-200">{formatNumero(totActual.certificados, 0)} certificados</p>
              </div>
              <Link
                href="/gestion/pagos"
                className="group rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/12 transition-colors hover:bg-white/[0.11]"
              >
                <p className="text-xs text-noche-200 first-letter:uppercase">
                  Pagos a verificar de {nombrePeriodo(cerrado).split(" de ")[0]}
                </p>
                <p className={cn("mt-1 text-lg font-semibold nums-tabular", pendientes.cantidad > 0 && "text-sol-300")}>
                  {pendientes.cantidad.toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-noche-200">
                  {pendientes.cantidad > 0 ? `${formatPesos(pendientes.total, false)} sin conciliar` : "Todo conciliado"}
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Indicadores del mes cerrado */}
      <section aria-labelledby="indicadores-titulo" className="flex flex-col gap-3">
        <h2 id="indicadores-titulo" className="font-display text-base font-semibold text-foreground first-letter:uppercase">
          {tituloPeriodo(cerrado)} en números
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Recaudación verificada"
            value={mesCerrado?.total ?? 0}
            format="currency"
            icon={Landmark}
            tone="verde"
            delta={recaudacion.delta}
            trend={recaudacion.trend}
            hint={hintPrevio}
            href={`/gestion/reportes/recaudacion?${qCerrado}`}
          />
          <StatCard
            label="Certificados declarados"
            value={totCerrado.certificados}
            icon={ClipboardList}
            tone="azul"
            delta={certificados.delta}
            trend={certificados.trend}
            hint={hintPrevio}
            href={`/gestion/reportes/planilla-mensual?${qCerrado}`}
          />
          <StatCard
            label="Certificados timbrados"
            value={totCerrado.timbrados}
            icon={BadgeCheck}
            tone="celeste"
            delta={timbrados.delta}
            trend={timbrados.trend}
            hint={hintPrevio}
          />
          <StatCard
            label="Empresas con actividad"
            value={totCerrado.empresas}
            icon={Building2}
            tone="violeta"
            delta={empresas.delta}
            trend={empresas.trend}
            hint={hintPrevio}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {hayRecaudacion ? (
          <BarChartCard
            title="Recaudación verificada por cuenta"
            description="Últimos 12 meses · pagos conciliados por fecha de pago"
            data={serie.map((m) => ({ label: m.etiqueta, c505: m.c505, c091: m.c091 }))}
            series={[
              { key: "c505", label: "Cuenta 505" },
              { key: "c091", label: "Cuenta 091" },
            ]}
            stacked
            format="currency"
            height={300}
          />
        ) : (
          <SectionCard title="Recaudación verificada por cuenta" description="Últimos 12 meses" icon={Landmark}>
            <p className="py-10 text-center text-sm text-muted-foreground">
              Todavía no hay pagos verificados en los últimos 12 meses. Cuando el área concilie los pagos, vas a ver la
              evolución por cuenta acá.
            </p>
          </SectionCard>
        )}

        <nav aria-label="Reportes disponibles" className="grid gap-4">
          <AccesoReporte
            href={`/gestion/reportes/recaudacion?${qCerrado}`}
            icono={Landmark}
            titulo="Informe de recaudación"
            texto="Totales por cuenta (505 y 091), conceptos de la Ordenanza Tarifaria, movimientos y nota mensual para Ingresos Municipales."
            etiqueta={`Expte. ${EXPEDIENTE_RENDICION}`}
          />
          <AccesoReporte
            href={`/gestion/reportes/planilla-mensual?${qCerrado}`}
            icono={FileSpreadsheet}
            titulo="Planilla mensual por empresa"
            texto="Certificados, timbrados, en proceso, anulados y superficie tratada por empresa, con el detalle imprimible."
            etiqueta="Art. 10.º c"
          />
          <AccesoReporte
            href="/gestion/reportes/estadisticas"
            icono={ChartPie}
            titulo="Estadísticas"
            texto="Certificados timbrados por rubro, zona, barrio y producto para planificar operativos y campañas."
            etiqueta="Últimos 12 meses"
          />
        </nav>
      </div>

      <SectionCard
        title="Rendiciones mensuales"
        description="Últimos seis meses cerrados. Generá la nota de cada mes con los importes en números y en letras."
        icon={Receipt}
        flush
      >
        <Table framed={false}>
          <THead>
            <TR>
              <TH>Mes</TH>
              <TH numeric>Cuenta 505</TH>
              <TH numeric>Cuenta 091</TH>
              <TH numeric>Total</TH>
              <TH numeric>Operaciones</TH>
              <TH>
                <span className="sr-only">Acciones</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {rendiciones.map((m) => {
              const q = queryPeriodo(m.periodo);
              return (
                <TR key={m.clave}>
                  <TD className="font-medium whitespace-nowrap first-letter:uppercase">{tituloPeriodo(m.periodo)}</TD>
                  <TD numeric className="whitespace-nowrap">
                    {formatPesos(m.c505)}
                  </TD>
                  <TD numeric className="whitespace-nowrap">
                    {formatPesos(m.c091)}
                  </TD>
                  <TD numeric className="font-semibold whitespace-nowrap">
                    {formatPesos(m.total)}
                  </TD>
                  <TD numeric>{m.operaciones.toLocaleString("es-AR")}</TD>
                  <TD align="right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/gestion/reportes/recaudacion?${q}`} aria-label={`Ver el detalle de ${nombrePeriodo(m.periodo)}`}>
                          Detalle
                        </Link>
                      </Button>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/imprimir/informe-recaudacion?${q}`} aria-label={`Generar la nota de ${nombrePeriodo(m.periodo)}`}>
                          <FileText aria-hidden /> Nota
                        </Link>
                      </Button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </SectionCard>
    </>
  );
}

function AccesoReporte({
  href,
  icono: Icono,
  titulo,
  texto,
  etiqueta,
}: {
  href: string;
  icono: LucideIcon;
  titulo: string;
  texto: string;
  etiqueta: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-start gap-4 overflow-hidden rounded-card border border-border bg-card p-5 shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-azul-200 hover:shadow-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-celeste-200/30 blur-2xl transition-opacity group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100 transition-colors group-hover:bg-gradient-brand group-hover:text-white group-hover:ring-transparent"
      >
        <Icono className="size-5" strokeWidth={1.9} />
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[15px] font-semibold text-foreground">{titulo}</span>
          <Badge size="sm" tone="azul">
            {etiqueta}
          </Badge>
        </span>
        <span className="text-[13px] leading-relaxed text-muted-foreground">{texto}</span>
      </span>
      <ArrowRight
        aria-hidden
        className="relative mt-1 size-4 shrink-0 text-noche-300 transition-transform group-hover:translate-x-0.5 group-hover:text-azul-600"
      />
    </Link>
  );
}
