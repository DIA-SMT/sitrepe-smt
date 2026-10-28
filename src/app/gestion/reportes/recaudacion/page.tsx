import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Landmark, ListOrdered, Printer, ReceiptText, Wallet } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TBody, TD, TFoot, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import {
  EXPEDIENTE_RENDICION,
  MESES,
  aniosDisponibles,
  compararPeriodos,
  conceptosConTarifario,
  desplazarPeriodo,
  getInformeRecaudacion,
  getPendientesConciliacion,
  getSerieRecaudacion,
  getTarifario,
  leerParam,
  leerPeriodo,
  nombrePeriodo,
  periodoActual,
  queryPeriodo,
  variacion,
  type CuentaInforme,
  type ArancelTarifario,
} from "@/lib/data/reportes";
import { MEDIO_PAGO, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatPesos } from "@/lib/domain/formato";
import { pesosEnLetras } from "@/lib/domain/numeros-a-letras";
import { cn } from "@/lib/utils";
import { ComposicionCuentas } from "../_components/composicion-cuentas";
import { EncabezadoSeccion } from "../_components/encabezado-seccion";
import { Segmentos } from "../_components/segmentos";
import { SelectorPeriodo } from "../_components/selector-periodo";

export const metadata: Metadata = { title: "Informe de recaudación" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RecaudacionPage({ searchParams }: Props) {
  await requerirStaff();
  const sp = await searchParams;
  const periodo = leerPeriodo(sp);
  const actual = periodoActual();
  const enCurso = compararPeriodos(periodo, actual) === 0;

  const [informe, tarifario, pendientes, serie] = await Promise.all([
    getInformeRecaudacion(periodo),
    getTarifario(periodo),
    getPendientesConciliacion(periodo),
    getSerieRecaudacion(desplazarPeriodo(periodo, -1), periodo),
  ]);

  const q = queryPeriodo(periodo);
  const anterior = serie[0]?.total ?? 0;
  const delta = variacion(informe.total, anterior);
  const codigos = informe.cuentas.map((c) => c.codigo);
  const cuentaParam = leerParam(sp, "cuenta");
  const filtroCuenta = cuentaParam && codigos.includes(cuentaParam) ? cuentaParam : null;
  const movimientos = filtroCuenta ? informe.movimientos.filter((m) => m.cuenta === filtroCuenta) : informe.movimientos;
  const totalMovimientos = movimientos.reduce((acc, m) => acc + m.importe, 0);
  const nombreMes = nombrePeriodo(periodo);

  return (
    <>
      <EncabezadoSeccion
        icono={Landmark}
        titulo={`Recaudación de ${nombreMes}`}
        descripcion={
          <>
            Pagos verificados (conciliados) con fecha de pago en el mes, por cuenta recaudadora del Banco Macro. Es la base
            de la rendición a la Secretaría de Ingresos Municipales (Expte. N.º {EXPEDIENTE_RENDICION}).
          </>
        }
        controles={
          <SelectorPeriodo
            anio={periodo.anio}
            mes={periodo.mes}
            anios={aniosDisponibles()}
            meses={[...MESES]}
            maximo={actual}
            descartar={["cuenta"]}
          />
        }
        acciones={
          <>
            <Button asChild variant="outline">
              <a href={`/gestion/reportes/exportar?tipo=movimientos&${q}`}>
                <Download aria-hidden /> Exportar CSV
              </a>
            </Button>
            <Button asChild>
              <Link href={`/imprimir/informe-recaudacion?${q}`}>
                <Printer aria-hidden /> Generar nota mensual
              </Link>
            </Button>
          </>
        }
      />

      {enCurso ? (
        <Alert tone="info" title="Mes en curso">
          Los importes de {nombreMes} pueden cambiar hasta el cierre del mes y hasta que se concilien todos los pagos
          informados.
        </Alert>
      ) : null}

      {pendientes.cantidad > 0 ? (
        <Alert
          tone="warning"
          title={`${pendientes.cantidad} pago${pendientes.cantidad === 1 ? "" : "s"} informado${pendientes.cantidad === 1 ? "" : "s"} sin verificar`}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/gestion/pagos">
                Conciliar <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          Hay {formatPesos(pendientes.total)} informados con fecha de pago en {nombreMes} que todavía no se conciliaron. No
          se incluyen en la rendición hasta que el área verifique la acreditación.
        </Alert>
      ) : null}

      {/* Total general */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <span aria-hidden className="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full bg-azul-200/30 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -right-16 -bottom-24 size-56 rounded-full bg-sol-200/40 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col gap-3">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
              Total recaudado por la Dirección
              <Badge tone={delta.trend === "down" ? "ambar" : delta.trend === "up" ? "verde" : "neutral"} size="sm">
                {delta.delta} vs. mes anterior
              </Badge>
            </p>
            <p className="font-display text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
              <span className="text-gradient-brand nums-tabular">{formatPesos(informe.total)}</span>
            </p>
            <p className="rounded-xl border border-azul-100 bg-azul-50/60 px-3 py-2 text-[13px] leading-relaxed text-azul-900">
              <span className="font-semibold">Son: </span>
              {pesosEnLetras(informe.total)}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {informe.movimientos.length.toLocaleString("es-AR")} operaci{informe.movimientos.length === 1 ? "ón" : "ones"}{" "}
              verificada{informe.movimientos.length === 1 ? "" : "s"} · importes generados desde los pagos registrados
            </p>
          </div>
          <ComposicionCuentas partes={informe.cuentas.map((c) => ({ codigo: c.codigo, nombre: c.nombre, total: c.total }))} />
        </div>
      </Card>

      {/* Planilla por cuenta */}
      <div className="grid gap-6">
        {informe.cuentas.map((cuenta) => (
          <PlanillaCuenta key={cuenta.codigo} cuenta={cuenta} tarifario={tarifario} />
        ))}
      </div>

      {/* Movimientos */}
      <SectionCard
        title="Movimientos del mes"
        description={`${movimientos.length.toLocaleString("es-AR")} operaciones · planilla que se adjunta como anexo a la nota`}
        icon={ListOrdered}
        flush
        actions={
          informe.movimientos.length > 0 ? (
            <Segmentos
              etiqueta="Filtrar movimientos por cuenta"
              items={[
                {
                  href: `/gestion/reportes/recaudacion?${q}`,
                  etiqueta: "Todas",
                  activo: !filtroCuenta,
                  contador: informe.movimientos.length,
                },
                ...informe.cuentas.map((c) => ({
                  href: `/gestion/reportes/recaudacion?${queryPeriodo(periodo, { cuenta: c.codigo })}`,
                  etiqueta: `Cuenta ${c.codigo}`,
                  activo: filtroCuenta === c.codigo,
                  contador: c.operaciones,
                })),
              ]}
            />
          ) : null
        }
      >
        {movimientos.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              compact
              icon={ReceiptText}
              title={`Sin pagos verificados en ${nombreMes}`}
              description="Cuando el área concilie pagos con fecha en este mes, vas a ver acá cada transferencia, boleta o pago electrónico."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/gestion/pagos">Ir a pagos y conciliación</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <Table framed={false}>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Liquidación</TH>
                <TH>Contribuyente</TH>
                <TH>Concepto</TH>
                <TH>Cuenta</TH>
                <TH>Medio</TH>
                <TH>N.º de operación</TH>
                <TH numeric>Cant.</TH>
                <TH numeric>Importe</TH>
              </TR>
            </THead>
            <TBody>
              {movimientos.map((m, i) => (
                <TR key={`${m.codigo ?? "s/n"}-${i}`}>
                  <TD className="whitespace-nowrap nums-tabular">{formatFecha(m.fecha_pago)}</TD>
                  <TD className="font-mono text-[13px] whitespace-nowrap">{m.codigo ?? "—"}</TD>
                  <TD className="min-w-48">
                    <span className="block font-medium">{m.contribuyente ?? "—"}</span>
                    {m.cuit ? <span className="block text-xs text-muted-foreground nums-tabular">{m.cuit}</span> : null}
                  </TD>
                  <TD className="min-w-48 text-[13px]">{m.concepto ?? "—"}</TD>
                  <TD>
                    <Badge tone={m.cuenta === "505" ? "azul" : "ambar"} size="sm">
                      {m.cuenta ?? "—"}
                    </Badge>
                  </TD>
                  <TD>
                    <EstadoBadge mapa={MEDIO_PAGO} valor={m.medio} size="sm" />
                  </TD>
                  <TD className="font-mono text-[13px] whitespace-nowrap text-muted-foreground">{m.numero_operacion ?? "—"}</TD>
                  <TD numeric>{m.cantidad.toLocaleString("es-AR")}</TD>
                  <TD numeric className="font-semibold whitespace-nowrap">
                    {formatPesos(m.importe)}
                  </TD>
                </TR>
              ))}
            </TBody>
            <TFoot>
              <TR className="hover:bg-transparent">
                <TD colSpan={8} className="text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {filtroCuenta ? `Total cuenta ${filtroCuenta}` : "Total del mes"}
                </TD>
                <TD numeric className="text-[15px] font-semibold whitespace-nowrap">
                  {formatPesos(totalMovimientos)}
                </TD>
              </TR>
            </TFoot>
          </Table>
        )}
      </SectionCard>
    </>
  );
}

function PlanillaCuenta({ cuenta, tarifario }: { cuenta: CuentaInforme; tarifario: ArancelTarifario[] }) {
  const conceptos = conceptosConTarifario(cuenta, tarifario);
  const es505 = cuenta.codigo === "505";

  return (
    <SectionCard
      title={
        <span className="flex flex-wrap items-center gap-2">
          Cuenta {cuenta.codigo}
          <span className="font-normal text-muted-foreground">· {cuenta.nombre}</span>
        </span>
      }
      description={
        <span className="flex flex-wrap gap-x-3 gap-y-0.5">
          <span>{cuenta.banco}</span>
          {cuenta.numero_cuenta ? <span className="nums-tabular">Cuenta N.º {cuenta.numero_cuenta}</span> : null}
          {cuenta.cbu ? <span className="font-mono tracking-wide">CBU {cuenta.cbu}</span> : null}
        </span>
      }
      icon={es505 ? Landmark : Wallet}
      flush
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          {cuenta.medios_pago.map((m) => (
            <Badge key={m} tone={etiqueta(MEDIO_PAGO, m).tono} size="sm">
              {etiqueta(MEDIO_PAGO, m).label}
            </Badge>
          ))}
        </div>
      }
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-foreground/85">
            <span className="font-semibold">Son: </span>
            {pesosEnLetras(cuenta.total)}
          </p>
          {cuenta.porMedio.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {cuenta.porMedio.map((pm) => (
                <li key={pm.medio}>
                  <Badge tone="neutral" variant="outline" size="sm">
                    {etiqueta(MEDIO_PAGO, pm.medio).label}: {pm.operaciones} · {formatPesos(pm.total, false)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      }
    >
      <Table framed={false}>
        <THead>
          <TR>
            <TH>Concepto</TH>
            <TH>Ordenanza / artículo</TH>
            <TH numeric>Importe unitario</TH>
            <TH numeric>Cantidad</TH>
            <TH numeric>Total</TH>
          </TR>
        </THead>
        <TBody>
          {conceptos.length === 0 ? (
            <TR>
              <TD colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                No hay conceptos tarifarios asociados a esta cuenta.
              </TD>
            </TR>
          ) : (
            conceptos.map((c, i) => (
              <TR key={`${c.concepto}-${c.importe_unitario}-${i}`} className={cn(c.sinMovimiento && "text-muted-foreground")}>
                <TD className={cn("min-w-52", !c.sinMovimiento && "font-medium")}>
                  {c.concepto}
                  {c.sinMovimiento ? <span className="ml-2 text-xs">(sin movimientos)</span> : null}
                </TD>
                <TD className="min-w-44 text-[13px]">
                  <span className="block">Ord. Tarifaria {c.ordenanza ?? "—"}</span>
                  <span className="block text-xs text-muted-foreground">{c.articulo ?? ""}</span>
                </TD>
                <TD numeric className="whitespace-nowrap">
                  {formatPesos(c.importe_unitario)}
                </TD>
                <TD numeric>{c.cantidad.toLocaleString("es-AR")}</TD>
                <TD numeric className={cn("whitespace-nowrap", !c.sinMovimiento && "font-semibold")}>
                  {formatPesos(c.total)}
                </TD>
              </TR>
            ))
          )}
        </TBody>
        <TFoot>
          <TR className="hover:bg-transparent">
            <TD colSpan={3} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Total cuenta {cuenta.codigo} · {cuenta.operaciones} operaci{cuenta.operaciones === 1 ? "ón" : "ones"}
            </TD>
            <TD numeric>{cuenta.conceptos.reduce((acc, c) => acc + c.cantidad, 0).toLocaleString("es-AR")}</TD>
            <TD numeric className="text-[15px] font-semibold whitespace-nowrap">
              {formatPesos(cuenta.total)}
            </TD>
          </TR>
        </TFoot>
      </Table>
    </SectionCard>
  );
}
