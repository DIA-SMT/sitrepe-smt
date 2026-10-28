import type { Metadata } from "next";
import { Firma, HojaImpresion } from "@/components/print/hoja-impresion";
import { BarraImpresion } from "@/components/print/barra-impresion";
import { requerirStaff } from "@/lib/auth";
import { APP } from "@/lib/config";
import {
  EXPEDIENTE_RENDICION,
  getFirmaDireccion,
  getInformeRecaudacion,
  getPendientesConciliacion,
  getTarifario,
  getUrlBoletaRentas,
  leerPeriodo,
  nombrePeriodo,
  queryPeriodo,
  tituloPeriodo,
  type ArancelTarifario,
  type CuentaInforme,
  type MovimientoRecaudacion,
} from "@/lib/data/reportes";
import { MEDIO_PAGO, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaLarga, formatPesos, hoyISO } from "@/lib/domain/formato";
import { pesosEnLetras } from "@/lib/domain/numeros-a-letras";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const periodo = leerPeriodo(await searchParams);
  return { title: `Rendición de ${nombrePeriodo(periodo)}` };
}

/** Texto de cada medio de cobranza para el Punto 3 de la nota. */
const MEDIO_COBRANZA: Record<Enums<"medio_pago">, string> = {
  transferencia: "transferencia bancaria a la cuenta",
  boleta: "boleta física de Rentas, que el contribuyente abona en las entidades habilitadas",
  plataforma_electronica: "plataformas electrónicas de cobro (Rapipago, Pago Fácil y billeteras virtuales)",
};

function Punto({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="mb-1.5 flex items-baseline gap-2 text-[13px] font-bold text-noche-900 break-after-avoid">
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-azul-600 text-[11px] text-white print:bg-azul-600">
          {numero}
        </span>
        {titulo}
      </h2>
      <div className="flex flex-col gap-2 pl-7">{children}</div>
    </section>
  );
}

const th = "border border-noche-200 px-2 py-1.5 font-semibold";
const td = "border border-noche-200 px-2 py-1";

export default async function ImprimirInformeRecaudacionPage({ searchParams }: Props) {
  await requerirStaff();
  const sp = await searchParams;
  const periodo = leerPeriodo(sp);

  const [informe, tarifario, firma, pendientes, urlRentas] = await Promise.all([
    getInformeRecaudacion(periodo),
    getTarifario(periodo),
    getFirmaDireccion(),
    getPendientesConciliacion(periodo),
    getUrlBoletaRentas(),
  ]);

  const mes = nombrePeriodo(periodo);
  const hoy = hoyISO();
  const operaciones = informe.movimientos.length;
  const conMovimientos = informe.cuentas.filter((c) => c.operaciones > 0 || c.total > 0);

  return (
    <>
      <BarraImpresion volverHref={`/gestion/reportes/recaudacion?${queryPeriodo(periodo)}`} volverTexto="Volver al informe" />

      {operaciones === 0 || pendientes.cantidad > 0 ? (
        <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] flex-col gap-2 px-4 sm:px-0">
          {operaciones === 0 ? (
            <p role="status" className="rounded-xl border border-celeste-200 bg-info-soft px-4 py-3 text-sm">
              No hay pagos verificados en {mes}: la nota informa una recaudación de $ 0,00.
            </p>
          ) : null}
          {pendientes.cantidad > 0 ? (
            <p role="alert" className="rounded-xl border border-amber-200 bg-warning-soft px-4 py-3 text-sm">
              Atención: hay {pendientes.cantidad} pago{pendientes.cantidad === 1 ? "" : "s"} informado
              {pendientes.cantidad === 1 ? "" : "s"} por {formatPesos(pendientes.total)} con fecha en {mes} que todavía no
              se verificaron y no figuran en esta rendición.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-6 print:gap-0">
        {/* --- Nota --- */}
        <HojaImpresion
          titulo="Nota de rendición mensual de recaudación"
          subtitulo={
            <span>
              Expte. N.º {EXPEDIENTE_RENDICION} · Recaudación de {mes}
            </span>
          }
          lateral={
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-[10px] font-semibold tracking-wide text-noche-500 uppercase">Período rendido</span>
              <span className="rounded-md border-2 border-azul-600 px-3 py-1 font-display text-base font-bold text-azul-700">
                {tituloPeriodo(periodo)}
              </span>
              <span className="text-[11px] text-noche-600">Expte. N.º {EXPEDIENTE_RENDICION}</span>
            </div>
          }
          pie={
            <>
              Importes generados por {APP.nombre} a partir de los pagos verificados (conciliados) con fecha de pago en el
              período; los importes en letras se calculan desde los mismos datos. Impreso el {formatFechaLarga(hoy)}.
            </>
          }
          saltoDePagina
        >
          <p className="text-right">San Miguel de Tucumán, {formatFechaLarga(hoy)}.</p>

          <div className="mt-4 leading-snug">
            <p className="font-semibold">A la {APP.secretaria}</p>
            <p>y por su intermedio a la Secretaría de Ingresos Municipales</p>
            <p>{APP.municipio}</p>
            <p className="font-semibold tracking-[0.3em]">S / D</p>
          </div>

          <p className="mt-4 rounded border-l-4 border-azul-600 bg-azul-50/60 px-3 py-1.5 text-[12.5px] print:bg-azul-50/60">
            <span className="font-semibold">Ref.: </span>Expte. N.º {EXPEDIENTE_RENDICION} — Rendición de lo recaudado en{" "}
            {mes}.
          </p>

          <p className="mt-4 text-justify">
            Me dirijo a usted, en el marco del expediente de referencia, a fin de informar el movimiento de las cuentas
            recaudadoras de la {APP.direccion} correspondiente al mes de {mes}. Ambas cuentas pertenecen al Banco Macro:
          </p>

          <table className="mt-2 w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-azul-50 text-left text-[10px] tracking-wide text-noche-600 uppercase">
                <th className={th}>Cuenta</th>
                <th className={th}>Denominación</th>
                <th className={th}>N.º de cuenta</th>
                <th className={th}>CBU</th>
              </tr>
            </thead>
            <tbody>
              {informe.cuentas.map((c) => (
                <tr key={c.codigo}>
                  <td className={cn(td, "font-bold")}>{c.codigo}</td>
                  <td className={td}>
                    {c.codigo === "505"
                      ? "Cuenta Bancaria Especial de Salud Ambiental"
                      : c.codigo === "091"
                        ? "Cuenta compartida con las Direcciones de Bromatología y de Ambiente"
                        : c.nombre}
                  </td>
                  <td className={cn(td, "font-mono whitespace-nowrap")}>{c.numero_cuenta || "—"}</td>
                  <td className={cn(td, "font-mono whitespace-nowrap")}>{c.cbu || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Punto numero="1" titulo="Planilla de la Ordenanza Tarifaria y comprobantes">
            <p className="text-justify">
              Se detallan los tributos que percibe el área según la planilla vigente de la Ordenanza Tarifaria N.º 5487,
              con la cuenta de acreditación y el importe de cada concepto:
            </p>
            <PlanillaTarifaria tarifario={tarifario} />
            <p className="text-justify">
              Los comprobantes de las {operaciones.toLocaleString("es-AR")} operaciones del mes se remiten diariamente a
              Tesorería General y se conservan en el archivo digital de comprobantes de la plataforma {APP.nombre} (módulo
              Pagos y conciliación), vinculados a cada liquidación y a los certificados que pagan.
            </p>
          </Punto>

          <Punto numero="2" titulo="Comprobantes de pago">
            <p className="text-justify">
              Esta Dirección no emite comprobantes de pago propios. La acreditación de cada importe se verifica con el
              comprobante de la entidad bancaria o de la plataforma de cobro que presenta el contribuyente.
            </p>
          </Punto>

          <Punto numero="3" titulo="Medios de cobranza">
            <ul className="flex list-disc flex-col gap-1 pl-4">
              {informe.cuentas.map((c) => (
                <li key={c.codigo} className="text-justify">
                  <span className="font-semibold">Cuenta {c.codigo}:</span>{" "}
                  {c.medios_pago.length > 0 ? c.medios_pago.map((m) => MEDIO_COBRANZA[m]).join("; ") : "sin medios configurados"}
                  .{" "}
                  {conceptosDeCuenta(tarifario, c.codigo)}
                  {c.medios_pago.includes("boleta") ? (
                    <>
                      {" "}
                      {urlRentas ? (
                        <>
                          La boleta se genera con el CUIT/CUIL del contribuyente en{" "}
                          <a href={urlRentas} className="font-mono text-[11px] break-all text-azul-700 underline">
                            {urlRentas}
                          </a>
                          .
                        </>
                      ) : (
                        "La boleta se genera en el sitio de Rentas de la Municipalidad ingresando el CUIT/CUIL del contribuyente."
                      )}
                    </>
                  ) : null}
                  {c.porMedio.length > 0 ? (
                    <span className="text-noche-600">
                      {" "}
                      En el mes: {c.porMedio.map((pm) => `${etiqueta(MEDIO_PAGO, pm.medio).label.toLowerCase()}, ${pm.operaciones} (${formatPesos(pm.total)})`).join("; ")}.
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Punto>

          <Punto numero="4" titulo="Total recaudado en el mes">
            <p className="text-justify">
              El total recaudado por la {APP.direccion} en {mes} asciende a{" "}
              <span className="font-bold nums-tabular">{formatPesos(informe.total)}</span> (
              <span className="font-semibold">{pesosEnLetras(informe.total)}</span>), con la siguiente composición por
              cuenta:
            </p>
            {informe.cuentas.map((c) => (
              <ComposicionCuenta key={c.codigo} cuenta={c} />
            ))}
            <p className="text-justify">
              {conMovimientos.length > 0
                ? "Se adjuntan como Anexo las planillas de movimientos de cada cuenta."
                : "No se registraron movimientos en el período, por lo que no se adjuntan planillas de movimientos."}
            </p>
          </Punto>

          <p className="mt-5">Sin otro particular, saludo a usted atentamente.</p>

          <div className="mt-6 flex justify-end break-inside-avoid">
            <Firma titulo={firma.cargo} detalle={firma.nombre ?? APP.direccion} />
          </div>
        </HojaImpresion>

        {/* --- Anexo: planillas de movimientos --- */}
        <HojaImpresion
          titulo="Anexo · Planilla de movimientos"
          subtitulo={
            <span>
              Recaudación de {mes} · Expte. N.º {EXPEDIENTE_RENDICION} · {operaciones.toLocaleString("es-AR")} operaciones
            </span>
          }
          pie={<>Pagos verificados con fecha de pago en el período, ordenados por fecha y número de liquidación.</>}
        >
          {informe.cuentas.map((c) => (
            <MovimientosCuenta
              key={c.codigo}
              cuenta={c}
              movimientos={informe.movimientos.filter((m) => m.cuenta === c.codigo)}
            />
          ))}
          <div className="mt-5 flex items-center justify-between rounded border-2 border-azul-600 px-3 py-2 break-inside-avoid">
            <span className="text-[11px] font-bold tracking-wide text-noche-700 uppercase">Total general del mes</span>
            <span className="text-right">
              <span className="block text-[15px] font-bold nums-tabular">{formatPesos(informe.total)}</span>
              <span className="block text-[10px] text-noche-600">{pesosEnLetras(informe.total)}</span>
            </span>
          </div>
        </HojaImpresion>
      </div>
    </>
  );
}

function conceptosDeCuenta(tarifario: ArancelTarifario[], codigo: string): string {
  const conceptos = tarifario.filter((a) => a.cuentaCodigo === codigo).map((a) => a.concepto.toLowerCase());
  if (conceptos.length === 0) return "";
  const lista = conceptos.length === 1 ? conceptos[0] : `${conceptos.slice(0, -1).join(", ")} y ${conceptos[conceptos.length - 1]}`;
  return `Conceptos: ${lista}.`;
}

function PlanillaTarifaria({ tarifario }: { tarifario: ArancelTarifario[] }) {
  if (tarifario.length === 0) {
    return <p className="text-noche-600 italic">No hay aranceles vigentes cargados para el período.</p>;
  }
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr className="bg-azul-50 text-left text-[10px] tracking-wide text-noche-600 uppercase">
          <th className={th}>Tributo</th>
          <th className={th}>Ord. Tarifaria</th>
          <th className={th}>Artículo</th>
          <th className={cn(th, "text-right")}>Importe</th>
          <th className={th}>Cuenta (CBU)</th>
        </tr>
      </thead>
      <tbody>
        {tarifario.map((a) => (
          <tr key={a.id} className="break-inside-avoid">
            <td className={cn(td, "font-medium")}>{a.concepto}</td>
            <td className={cn(td, "whitespace-nowrap")}>{a.ordenanza}</td>
            <td className={td}>{a.articulo}</td>
            <td className={cn(td, "text-right whitespace-nowrap nums-tabular")}>
              {formatPesos(a.importe)}
              <span className="block text-[9.5px] text-noche-500">{a.unidad}</span>
            </td>
            <td className={cn(td, "whitespace-nowrap")}>
              <span className="font-mono">{a.cbu || "—"}</span>
              <span className="block text-[9.5px] text-noche-500">Cuenta {a.cuentaCodigo}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ComposicionCuenta({ cuenta }: { cuenta: CuentaInforme }) {
  return (
    <div className="break-inside-avoid rounded border border-noche-200 p-2.5">
      <p className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">
          Cuenta {cuenta.codigo} — {cuenta.nombre}
        </span>
        <span className="font-bold nums-tabular">{formatPesos(cuenta.total)}</span>
      </p>
      <p className="text-[11px] text-noche-700">Son {pesosEnLetras(cuenta.total)}.</p>
      {cuenta.conceptos.length > 0 ? (
        <table className="mt-2 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-noche-50 text-left text-[10px] tracking-wide text-noche-600 uppercase">
              <th className={th}>Concepto</th>
              <th className={th}>Ordenanza / artículo</th>
              <th className={cn(th, "text-right")}>Importe unitario</th>
              <th className={cn(th, "text-right")}>Cantidad</th>
              <th className={cn(th, "text-right")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {cuenta.conceptos.map((c, i) => (
              <tr key={`${c.concepto}-${i}`}>
                <td className={td}>{c.concepto}</td>
                <td className={td}>
                  {c.ordenanza ?? "—"} · {c.articulo ?? ""}
                </td>
                <td className={cn(td, "text-right whitespace-nowrap nums-tabular")}>{formatPesos(c.importe_unitario)}</td>
                <td className={cn(td, "text-right nums-tabular")}>{c.cantidad.toLocaleString("es-AR")}</td>
                <td className={cn(td, "text-right font-semibold whitespace-nowrap nums-tabular")}>{formatPesos(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-1 text-[11px] text-noche-600 italic">Sin movimientos en el mes.</p>
      )}
    </div>
  );
}

function MovimientosCuenta({ cuenta, movimientos }: { cuenta: CuentaInforme; movimientos: MovimientoRecaudacion[] }) {
  return (
    <section className="mt-4 first:mt-0">
      <h2 className="mb-2 border-b border-noche-200 pb-1 text-[11px] font-bold tracking-[0.12em] text-azul-700 uppercase">
        Cuenta {cuenta.codigo} · {cuenta.nombre}
        <span className="ml-2 font-mono font-normal tracking-normal text-noche-500 normal-case">CBU {cuenta.cbu}</span>
      </h2>
      {movimientos.length === 0 ? (
        <p className="text-[11px] text-noche-600 italic">No se registraron movimientos en el mes.</p>
      ) : (
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-azul-50 text-left text-[9.5px] tracking-wide text-noche-600 uppercase">
              <th className={th}>Fecha</th>
              <th className={th}>Liquidación</th>
              <th className={th}>Contribuyente</th>
              <th className={th}>CUIT/CUIL</th>
              <th className={th}>Concepto</th>
              <th className={th}>Medio</th>
              <th className={th}>N.º operación</th>
              <th className={cn(th, "text-right")}>Cant.</th>
              <th className={cn(th, "text-right")}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m, i) => (
              <tr key={`${m.codigo ?? "s/n"}-${i}`} className="break-inside-avoid">
                <td className={cn(td, "whitespace-nowrap")}>{formatFecha(m.fecha_pago)}</td>
                <td className={cn(td, "font-mono whitespace-nowrap")}>{m.codigo ?? "—"}</td>
                <td className={td}>{m.contribuyente ?? "—"}</td>
                <td className={cn(td, "whitespace-nowrap")}>{m.cuit ?? "—"}</td>
                <td className={td}>{m.concepto ?? "—"}</td>
                <td className={td}>{m.medio ? etiqueta(MEDIO_PAGO, m.medio).label : "—"}</td>
                <td className={cn(td, "font-mono")}>{m.numero_operacion ?? "—"}</td>
                <td className={cn(td, "text-right nums-tabular")}>{m.cantidad.toLocaleString("es-AR")}</td>
                <td className={cn(td, "text-right whitespace-nowrap nums-tabular")}>{formatPesos(m.importe)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8} className={cn(td, "bg-noche-50 text-right text-[10px] font-bold uppercase")}>
                Subtotal cuenta {cuenta.codigo} ({movimientos.length} operaciones)
              </td>
              <td className={cn(td, "bg-noche-50 text-right font-bold whitespace-nowrap nums-tabular")}>
                {formatPesos(cuenta.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}
