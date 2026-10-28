import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Ban,
  Building2,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileX2,
  Hourglass,
  Printer,
  Ruler,
  SearchX,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TBody, TD, TFoot, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import {
  MESES,
  aniosDisponibles,
  desplazarPeriodo,
  esUuid,
  getCertificadosDelMes,
  getEmpresaPlanilla,
  getEmpresasOpciones,
  getPlanillaMensual,
  getUltimoDiaHabil,
  leerParam,
  leerPeriodo,
  nombrePeriodo,
  periodoActual,
  queryPeriodo,
  totalizarPlanilla,
  type CertificadoMes,
  type FilaPlanilla,
  type Periodo,
} from "@/lib/data/reportes";
import { ESTADO_CERTIFICADO, ESTADO_EMPRESA, TIPO_SERVICIO_CORTO } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha, formatFechaLarga, formatLitros, formatSuperficie } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { EncabezadoSeccion } from "../_components/encabezado-seccion";
import { SelectorEmpresa, type OpcionEmpresa } from "../_components/selector-empresa";
import { SelectorPeriodo } from "../_components/selector-periodo";

export const metadata: Metadata = { title: "Planilla mensual por empresa" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PlanillaMensualPage({ searchParams }: Props) {
  await requerirStaff();
  const sp = await searchParams;
  const periodo = leerPeriodo(sp);
  const empresaParam = leerParam(sp, "empresa");
  const empresaId = esUuid(empresaParam) ? empresaParam : null;

  const [filas, empresas, vencimiento, empresa, certificados] = await Promise.all([
    getPlanillaMensual(periodo),
    getEmpresasOpciones(),
    getUltimoDiaHabil(desplazarPeriodo(periodo, 1)),
    empresaId ? getEmpresaPlanilla(empresaId) : Promise.resolve(null),
    empresaId ? getCertificadosDelMes(periodo, empresaId) : Promise.resolve<CertificadoMes[]>([]),
  ]);

  const totales = totalizarPlanilla(filas);
  const actividad = new Map(filas.map((f) => [f.empresaId, f.certificados]));
  const opciones: OpcionEmpresa[] = empresas.map((e) => ({
    id: e.id,
    etiqueta: `${e.nombre}${e.numeroRegistro ? ` (Reg. ${e.numeroRegistro})` : ""}`,
    actividad: actividad.get(e.id) ?? 0,
  }));
  if (empresa && !opciones.some((o) => o.id === empresa.id)) {
    opciones.push({ id: empresa.id, etiqueta: empresa.nombre, actividad: actividad.get(empresa.id) ?? 0 });
  }
  const sinActividad = empresas.filter((e) => e.estado === "habilitada" && !actividad.has(e.id));
  const nombreMes = nombrePeriodo(periodo);
  const q = queryPeriodo(periodo);
  const qEmpresa = empresaId ? queryPeriodo(periodo, { empresa: empresaId }) : q;
  const dias = diasHasta(vencimiento) ?? 0;

  return (
    <>
      <EncabezadoSeccion
        icono={FileSpreadsheet}
        titulo={empresa ? `Planilla de ${empresa.nombre}` : `Planilla mensual de ${nombreMes}`}
        descripcion={
          empresa ? (
            <>
              Certificados con servicio en {nombreMes} (sin borradores) y su estado de control y timbrado (Art. 10.º c,
              Ord. 2681/98).
            </>
          ) : (
            <>
              Resumen de los certificados de cada empresa en {nombreMes}: declarados, timbrados, en proceso, anulados y
              superficie tratada (Art. 10.º c, Ord. 2681/98). Elegí una empresa para ver e imprimir su planilla.
            </>
          )
        }
        controles={
          <>
            <SelectorPeriodo
              anio={periodo.anio}
              mes={periodo.mes}
              anios={aniosDisponibles()}
              meses={[...MESES]}
              maximo={periodoActual()}
            />
            <SelectorEmpresa valor={empresaId} opciones={opciones} />
          </>
        }
        acciones={
          empresa ? (
            <>
              <Button asChild variant="ghost">
                <Link href={`/gestion/reportes/planilla-mensual?${q}`}>
                  <X aria-hidden /> Ver todas
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href={`/gestion/reportes/exportar?tipo=certificados&${qEmpresa}`}>
                  <Download aria-hidden /> Exportar CSV
                </a>
              </Button>
              <Button asChild>
                <Link href={`/imprimir/planilla-mensual?${qEmpresa}`}>
                  <Printer aria-hidden /> Imprimir planilla
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline">
                <a href={`/gestion/reportes/exportar?tipo=planilla&${q}`}>
                  <Download aria-hidden /> Exportar CSV
                </a>
              </Button>
              <Button asChild>
                <Link href={`/imprimir/planilla-mensual?${q}`}>
                  <Printer aria-hidden /> Imprimir resumen
                </Link>
              </Button>
            </>
          )
        }
      />

      <Plazo periodo={periodo} vencimiento={vencimiento} dias={dias} />

      {empresaId && !empresa ? (
        <EmptyState
          icon={SearchX}
          title="No encontramos la empresa"
          description="La empresa elegida no existe o no tenés acceso a su información. Elegí otra en el selector."
          action={
            <Button asChild variant="outline">
              <Link href={`/gestion/reportes/planilla-mensual?${q}`}>Ver todas las empresas</Link>
            </Button>
          }
        />
      ) : null}

      {empresa ? (
        <DetalleEmpresa
          empresa={empresa}
          fila={filas.find((f) => f.empresaId === empresa.id) ?? null}
          certificados={certificados}
          nombreMes={nombreMes}
        />
      ) : (
        <section aria-label={`Totales de ${nombreMes}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Empresas con certificados"
            value={totales.empresas}
            icon={Building2}
            tone="violeta"
            hint={`${sinActividad.length} habilitada${sinActividad.length === 1 ? "" : "s"} sin actividad`}
          />
          <StatCard
            label="Certificados declarados"
            value={totales.certificados}
            icon={ClipboardList}
            hint={`${totales.fumigacion.toLocaleString("es-AR")} de fumigación · ${totales.tanque.toLocaleString("es-AR")} de tanques`}
          />
          <StatCard
            label="Timbrados"
            value={totales.timbrados}
            icon={BadgeCheck}
            tone="verde"
            hint={
              totales.certificados > 0
                ? `${Math.round((totales.timbrados / totales.certificados) * 100)} % del total declarado`
                : "Sin certificados en el mes"
            }
          />
          <StatCard
            label="Superficie tratada"
            value={formatSuperficie(Math.round(totales.superficieM2))}
            icon={Ruler}
            tone="celeste"
            hint={`${totales.enProceso.toLocaleString("es-AR")} en proceso · ${totales.anulados.toLocaleString("es-AR")} anulados`}
          />
        </section>
      )}

      <ResumenEmpresas filas={filas} periodo={periodo} seleccionada={empresa?.id ?? null} nombreMes={nombreMes} />

      {!empresa ? (
        <SectionCard
          title="Empresas habilitadas sin certificados en el mes"
          description="Insumo para el control: empresas habilitadas que no declararon servicios en el período."
          icon={FileX2}
        >
          {sinActividad.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CircleCheck className="size-4" aria-hidden />
              Todas las empresas habilitadas registran certificados en {nombreMes}.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {sinActividad.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/gestion/empresas/${e.id}`}
                    className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:border-azul-300 hover:bg-azul-50 hover:text-azul-800"
                  >
                    <Building2 className="size-3.5 text-muted-foreground" aria-hidden />
                    {e.nombre}
                    {e.numeroRegistro ? <span className="text-xs text-muted-foreground">Reg. {e.numeroRegistro}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}
    </>
  );
}

function Plazo({ periodo, vencimiento, dias }: { periodo: Periodo; vencimiento: string; dias: number }) {
  const vencido = dias < 0;
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        vencido ? "border-noche-200 bg-subtle" : dias <= 5 ? "border-amber-200 bg-warning-soft" : "border-celeste-200 bg-info-soft",
      )}
    >
      <p className="flex items-start gap-2.5">
        <CalendarClock
          className={cn("mt-0.5 size-4 shrink-0", vencido ? "text-muted-foreground" : dias <= 5 ? "text-warning" : "text-info")}
          aria-hidden
        />
        <span>
          Plazo para la planilla de {nombrePeriodo(periodo)}: hasta el{" "}
          <span className="font-semibold">{formatFechaLarga(vencimiento)}</span> (último día hábil del mes siguiente).
        </span>
      </p>
      <Badge tone={vencido ? "neutral" : dias <= 5 ? "ambar" : "celeste"} className="self-start sm:self-auto">
        {vencido ? "Plazo cerrado" : dias === 0 ? "Vence hoy" : `Faltan ${dias} día${dias === 1 ? "" : "s"}`}
      </Badge>
    </div>
  );
}

function DetalleEmpresa({
  empresa,
  fila,
  certificados,
  nombreMes,
}: {
  empresa: NonNullable<Awaited<ReturnType<typeof getEmpresaPlanilla>>>;
  fila: FilaPlanilla | null;
  certificados: CertificadoMes[];
  nombreMes: string;
}) {
  const total = fila?.certificados ?? 0;
  const timbradosPct = total > 0 ? ((fila?.timbrados ?? 0) / total) * 100 : 0;

  return (
    <>
      <SectionCard
        title={empresa.nombre}
        description={`CUIT ${empresa.cuit}${empresa.numeroRegistro ? ` · Registro N.º ${empresa.numeroRegistro}` : ""}`}
        icon={Building2}
        actions={
          <>
            <EstadoBadge mapa={ESTADO_EMPRESA} valor={empresa.estado} />
            <Button asChild variant="ghost" size="sm">
              <Link href={`/gestion/empresas/${empresa.id}`}>Ver legajo</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/gestion/pagos?empresa=${empresa.id}`}>Pagos</Link>
            </Button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <KeyValue
            columns={2}
            items={[
              { label: "Titular", value: empresa.titular },
              { label: "Resolución DSA", value: empresa.resolucionDsa },
              { label: "Habilitación comercial", value: empresa.habilitacionComercial },
              { label: "Vencimiento de la habilitación", value: formatFecha(empresa.vencimientoHabilitacion) },
              { label: "Domicilio", value: empresa.domicilio, full: true },
            ]}
          />
          <div className="flex flex-col gap-4 rounded-2xl bg-gradient-brand-soft p-4 ring-1 ring-azul-100">
            <Progress label={`Timbrados en ${nombreMes}`} value={timbradosPct} showValue tone="verde" />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Fumigación</dt>
                <dd className="text-lg font-semibold nums-tabular">{(fila?.fumigacion ?? 0).toLocaleString("es-AR")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Limpieza de tanques</dt>
                <dd className="text-lg font-semibold nums-tabular">{(fila?.tanque ?? 0).toLocaleString("es-AR")}</dd>
              </div>
            </dl>
          </div>
        </div>
      </SectionCard>

      <section aria-label="Totales de la empresa en el mes" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Certificados" value={total} icon={ClipboardList} />
        <StatCard label="Timbrados" value={fila?.timbrados ?? 0} icon={BadgeCheck} tone="verde" />
        <StatCard label="En proceso" value={fila?.enProceso ?? 0} icon={Hourglass} tone="ambar" hint="Declarados, observados o controlados" />
        <StatCard label="Anulados" value={fila?.anulados ?? 0} icon={Ban} tone="rojo" />
        <StatCard label="Superficie tratada" value={formatSuperficie(Math.round(fila?.superficieM2 ?? 0))} icon={Ruler} tone="celeste" />
      </section>

      <SectionCard
        title="Certificados del mes"
        description={`${certificados.length.toLocaleString("es-AR")} certificados con servicio en ${nombreMes}, ordenados por fecha`}
        icon={BadgeCheck}
        flush
      >
        {certificados.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              compact
              icon={ClipboardList}
              title={`Sin certificados en ${nombreMes}`}
              description="La empresa no presentó certificados con servicio en este mes. Si corresponde, podés intimarla o programar una inspección."
            />
          </div>
        ) : (
          <Table framed={false}>
            <THead>
              <TR>
                <TH>N.º</TH>
                <TH>Tipo</TH>
                <TH>Servicio</TH>
                <TH>Cliente y domicilio</TH>
                <TH>Rubro</TH>
                <TH numeric>Superficie / capacidad</TH>
                <TH>Vence</TH>
                <TH>Estado</TH>
                <TH>Sello</TH>
              </TR>
            </THead>
            <TBody>
              {certificados.map((c) => (
                <TR key={c.id}>
                  <TD className="whitespace-nowrap">
                    <Link
                      href={`/gestion/certificados/${c.id}`}
                      className="font-mono text-[13px] font-semibold text-azul-700 underline-offset-4 hover:underline"
                    >
                      {c.numero}
                    </Link>
                  </TD>
                  <TD>
                    <Badge tone={c.tipo === "tanque" ? "celeste" : "azul"} size="sm">
                      {TIPO_SERVICIO_CORTO[c.tipo]}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap nums-tabular">{formatFecha(c.fechaServicio)}</TD>
                  <TD className="min-w-56">
                    <span className="block font-medium">{c.cliente}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.domicilio}
                      {c.barrio ? ` · ${c.barrio}` : ""}
                    </span>
                  </TD>
                  <TD className="min-w-40 text-[13px]">{c.rubro}</TD>
                  <TD numeric className="whitespace-nowrap">
                    {c.tipo === "tanque" ? formatLitros(c.capacidadLitros) : formatSuperficie(c.superficieM2)}
                  </TD>
                  <TD className="whitespace-nowrap nums-tabular">{formatFecha(c.fechaVencimiento)}</TD>
                  <TD>
                    <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" />
                  </TD>
                  <TD className="font-mono text-xs whitespace-nowrap text-muted-foreground">{c.selloCodigo ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </SectionCard>
    </>
  );
}

function ResumenEmpresas({
  filas,
  periodo,
  seleccionada,
  nombreMes,
}: {
  filas: FilaPlanilla[];
  periodo: Periodo;
  seleccionada: string | null;
  nombreMes: string;
}) {
  const totales = totalizarPlanilla(filas);

  return (
    <SectionCard
      title="Resumen de todas las empresas"
      description={`${filas.length.toLocaleString("es-AR")} empresas con certificados en ${nombreMes}`}
      icon={ClipboardList}
      flush
      actions={
        <Button asChild variant="ghost" size="sm">
          <a href={`/gestion/reportes/exportar?tipo=planilla&${queryPeriodo(periodo)}`}>
            <Download aria-hidden /> CSV
          </a>
        </Button>
      }
    >
      {filas.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState
            compact
            icon={FileSpreadsheet}
            title={`Sin certificados en ${nombreMes}`}
            description="Ninguna empresa presentó certificados con servicio en este mes. Probá con otro período."
          />
        </div>
      ) : (
        <Table framed={false}>
          <THead>
            <TR>
              <TH>Empresa</TH>
              <TH numeric>Fumigación</TH>
              <TH numeric>Tanques</TH>
              <TH numeric>Total</TH>
              <TH numeric>Timbrados</TH>
              <TH numeric>En proceso</TH>
              <TH numeric>Anulados</TH>
              <TH numeric>Superficie</TH>
              <TH>
                <span className="sr-only">Acciones</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {filas.map((f) => {
              const q = queryPeriodo(periodo, { empresa: f.empresaId });
              const activa = f.empresaId === seleccionada;
              return (
                <TR key={f.empresaId} data-state={activa ? "selected" : undefined}>
                  <TD className="min-w-56">
                    <Link
                      href={`/gestion/reportes/planilla-mensual?${q}`}
                      scroll={false}
                      className="font-medium text-foreground underline-offset-4 hover:text-azul-700 hover:underline"
                      aria-current={activa ? "true" : undefined}
                    >
                      {f.empresaNombre}
                    </Link>
                    <span className="block text-xs text-muted-foreground nums-tabular">{f.empresaCuit}</span>
                  </TD>
                  <TD numeric>{f.fumigacion.toLocaleString("es-AR")}</TD>
                  <TD numeric>{f.tanque.toLocaleString("es-AR")}</TD>
                  <TD numeric className="font-semibold">
                    {f.certificados.toLocaleString("es-AR")}
                  </TD>
                  <TD numeric className="text-success">
                    {f.timbrados.toLocaleString("es-AR")}
                  </TD>
                  <TD numeric>{f.enProceso.toLocaleString("es-AR")}</TD>
                  <TD numeric className={cn(f.anulados > 0 && "text-danger")}>
                    {f.anulados.toLocaleString("es-AR")}
                  </TD>
                  <TD numeric className="whitespace-nowrap">
                    {formatSuperficie(Math.round(f.superficieM2))}
                  </TD>
                  <TD align="right">
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link href={`/imprimir/planilla-mensual?${q}`} aria-label={`Imprimir la planilla de ${f.empresaNombre}`}>
                        <Printer aria-hidden />
                      </Link>
                    </Button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
          <TFoot>
            <TR className="hover:bg-transparent">
              <TD className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Total · {totales.empresas} empresas
              </TD>
              <TD numeric>{totales.fumigacion.toLocaleString("es-AR")}</TD>
              <TD numeric>{totales.tanque.toLocaleString("es-AR")}</TD>
              <TD numeric className="font-semibold">
                {totales.certificados.toLocaleString("es-AR")}
              </TD>
              <TD numeric>{totales.timbrados.toLocaleString("es-AR")}</TD>
              <TD numeric>{totales.enProceso.toLocaleString("es-AR")}</TD>
              <TD numeric>{totales.anulados.toLocaleString("es-AR")}</TD>
              <TD numeric className="whitespace-nowrap">
                {formatSuperficie(Math.round(totales.superficieM2))}
              </TD>
              <TD />
            </TR>
          </TFoot>
        </Table>
      )}
    </SectionCard>
  );
}
