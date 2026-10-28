import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HojaImpresion } from "@/components/print/hoja-impresion";
import { BarraImpresion } from "@/components/print/barra-impresion";
import { esStaff, requerirSesion } from "@/lib/auth";
import { getCertificadosDePago, getCuenta, getEmpresaContribuyente, getPago } from "@/lib/data/pagos";
import { ESTADO_PAGO, MEDIO_PAGO, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatFechaLarga, formatPesos, hoyISO } from "@/lib/domain/formato";
import { pesosEnLetras } from "@/lib/domain/numeros-a-letras";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pago = await getPago(id);
  return { title: pago?.codigo ? `Liquidación ${pago.codigo}` : "Liquidación" };
}

function Seccion({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mt-5 break-inside-avoid", className)}>
      <h2 className="mb-2 border-b border-noche-200 pb-1 text-[11px] font-bold tracking-[0.12em] text-azul-700 uppercase">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Dato({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-[10px] font-semibold tracking-wide text-noche-500 uppercase">{label}</span>
      <span className="font-medium text-noche-900">{children || "—"}</span>
    </div>
  );
}

export default async function ImprimirLiquidacionPage({ params }: Props) {
  const sesion = await requerirSesion();
  const { id } = await params;

  const pago = await getPago(id);
  const staff = esStaff(sesion.perfil.rol);
  // Solo el staff o la empresa titular (la RLS también lo garantiza).
  if (!pago || !pago.id || (!staff && pago.empresa_id !== sesion.empresa?.id)) notFound();

  const [certificados, cuenta, empresa] = await Promise.all([
    getCertificadosDePago(pago.id),
    getCuenta(pago.cuenta_id),
    getEmpresaContribuyente(pago.empresa_id),
  ]);

  const codigo = pago.codigo ?? "s/n";
  const estado = etiqueta(ESTADO_PAGO, pago.estado);
  const total = Number(pago.importe_total ?? 0);
  const anulada = pago.estado === "anulado";
  const volver = staff ? `/gestion/pagos/${pago.id}` : `/prestador/pagos/${pago.id}`;
  const informado = Boolean(pago.fecha_pago);
  const medios = cuenta?.medios_pago ?? [];

  return (
    <>
      <BarraImpresion volverHref={volver} volverTexto="Volver a la liquidación" />
      <HojaImpresion
        titulo="Liquidación de arancel"
        subtitulo={
          <span>
            {pago.arancel_concepto ?? "Arancel"} · Ord. Tarifaria N.º {pago.arancel_ordenanza ?? "—"}
          </span>
        }
        lateral={
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="text-[10px] font-semibold tracking-wide text-noche-500 uppercase">Liquidación N.º</span>
            <span className="rounded-md border-2 border-azul-600 px-3 py-1 font-mono text-base font-bold text-azul-700">
              {codigo}
            </span>
            <span className="text-[11px] text-noche-600">Emitida el {formatFecha(pago.created_at)}</span>
            <span
              className={cn(
                "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                pago.estado === "verificado" && "bg-emerald-100 text-emerald-800",
                pago.estado === "rechazado" && "bg-red-100 text-red-700",
                (pago.estado === "pendiente" || pago.estado === "informado") && "bg-amber-100 text-amber-800",
                anulada && "bg-noche-100 text-noche-700",
              )}
            >
              {estado.label}
            </span>
          </div>
        }
        pie={
          <>
            Este documento no constituye comprobante de pago. El sellado digital de los certificados se aplica una vez
            verificada la acreditación (Art. 9.º b, Ord. 2681/98, t.o. Ord. 3737/06). Importes según la Ordenanza Tarifaria
            N.º 5487. Impreso el {formatFechaLarga(hoyISO())}.
          </>
        }
      >
        {anulada ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden print:fixed"
          >
            <span className="-rotate-30 font-display text-[120px] font-bold tracking-widest text-red-600/10">ANULADA</span>
          </div>
        ) : null}

        <Seccion titulo="Contribuyente">
          <div className="grid grid-cols-3 gap-x-6 gap-y-2">
            <Dato label="Nombre o razón social" className="col-span-2">
              {empresa?.nombre_comercial ?? pago.empresa_nombre ?? pago.contribuyente}
            </Dato>
            <Dato label="CUIT/CUIL">{empresa?.cuit ?? pago.empresa_cuit ?? pago.contribuyente_cuit}</Dato>
            {empresa ? (
              <>
                <Dato label="Titular" className="col-span-2">
                  {empresa.titular}
                </Dato>
                <Dato label="N.º de registro">{empresa.numero_registro ? String(empresa.numero_registro) : null}</Dato>
                <Dato label="Domicilio" className="col-span-3">
                  {empresa.domicilio_oficina}
                </Dato>
              </>
            ) : null}
          </div>
        </Seccion>

        <Seccion titulo="Detalle de la liquidación">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-azul-50 text-left text-[10px] tracking-wide text-noche-600 uppercase">
                <th className="border border-noche-200 px-2 py-1.5 font-semibold">Concepto</th>
                <th className="border border-noche-200 px-2 py-1.5 font-semibold">Norma</th>
                <th className="border border-noche-200 px-2 py-1.5 text-right font-semibold">Cantidad</th>
                <th className="border border-noche-200 px-2 py-1.5 text-right font-semibold">Importe unitario</th>
                <th className="border border-noche-200 px-2 py-1.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-noche-200 px-2 py-2 font-medium">{pago.arancel_concepto}</td>
                <td className="border border-noche-200 px-2 py-2">
                  Ord. Tarifaria {pago.arancel_ordenanza}
                  <br />
                  <span className="text-noche-600">{pago.arancel_articulo}</span>
                </td>
                <td className="border border-noche-200 px-2 py-2 text-right nums-tabular">{pago.cantidad ?? 0}</td>
                <td className="border border-noche-200 px-2 py-2 text-right nums-tabular">
                  {formatPesos(pago.importe_unitario)}
                </td>
                <td className="border border-noche-200 px-2 py-2 text-right font-semibold nums-tabular">
                  {formatPesos(total)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="border border-noche-200 bg-noche-50 px-2 py-2 text-right text-[11px] font-bold uppercase">
                  {pago.estado === "verificado" ? "Total abonado" : anulada ? "Total (anulado)" : "Total a pagar"}
                </td>
                <td className="border border-noche-200 bg-noche-50 px-2 py-2 text-right text-[15px] font-bold nums-tabular">
                  {formatPesos(total)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 rounded border border-noche-200 bg-white px-2 py-1.5 text-[11px]">
            <span className="font-semibold">Son: </span>
            {pesosEnLetras(total)}
          </p>
          {certificados.length > 0 ? (
            <p className="mt-1.5 text-[11px] text-noche-600">
              El importe se cobra una vez por certificado, no por ejemplar (original, duplicado y triplicado).
            </p>
          ) : null}
        </Seccion>

        <Seccion titulo="Datos para el pago">
          <div className="grid grid-cols-3 gap-x-6 gap-y-2">
            <Dato label="Cuenta" className="col-span-2">
              {`${cuenta?.codigo ?? pago.cuenta_codigo ?? "—"} · ${cuenta?.nombre ?? pago.cuenta_nombre ?? ""}`}
            </Dato>
            <Dato label="Banco">{cuenta?.banco ?? pago.cuenta_banco}</Dato>
            <Dato label="N.º de cuenta">{cuenta?.numero_cuenta}</Dato>
            <Dato label="CBU" className="col-span-2">
              <span className="font-mono tracking-wider">{cuenta?.cbu ?? pago.cuenta_cbu}</span>
            </Dato>
            <Dato label="Medios admitidos" className="col-span-3">
              {medios.length > 0 ? medios.map((m) => MEDIO_PAGO[m].label).join(" · ") : null}
            </Dato>
          </div>
          {medios.includes("boleta") ? (
            <p className="mt-2 text-[11px] text-noche-600">
              La boleta se genera con el CUIT/CUIL del contribuyente en el sistema de Rentas; también puede abonarse por
              plataformas electrónicas (Rapipago, Pago Fácil, billeteras virtuales).
            </p>
          ) : null}
        </Seccion>

        {informado ? (
          <Seccion titulo={pago.informado_at ? "Pago informado" : "Pago registrado por la Dirección"}>
            <div className="grid grid-cols-4 gap-x-6 gap-y-2">
              <Dato label="Medio">{etiqueta(MEDIO_PAGO, pago.medio).label}</Dato>
              <Dato label="N.º de operación">{pago.numero_operacion}</Dato>
              <Dato label="Fecha de pago">{formatFecha(pago.fecha_pago)}</Dato>
              <Dato label="Estado">{estado.label}</Dato>
              {pago.verificado_at ? (
                <Dato label="Verificado" className="col-span-2">
                  {formatFechaHora(pago.verificado_at)}
                </Dato>
              ) : null}
              {pago.estado === "rechazado" && pago.observaciones ? (
                <Dato label="Motivo del rechazo" className="col-span-4">
                  {pago.observaciones}
                </Dato>
              ) : null}
            </div>
          </Seccion>
        ) : null}

        {certificados.length > 0 ? (
          <Seccion titulo={`Certificados incluidos (${certificados.length})`}>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-azul-50 text-left text-[10px] tracking-wide text-noche-600 uppercase">
                  <th className="border border-noche-200 px-2 py-1 font-semibold">N.º</th>
                  <th className="border border-noche-200 px-2 py-1 font-semibold">Cliente</th>
                  <th className="border border-noche-200 px-2 py-1 font-semibold">Domicilio</th>
                  <th className="border border-noche-200 px-2 py-1 font-semibold">Servicio</th>
                  <th className="border border-noche-200 px-2 py-1 font-semibold">Sello digital</th>
                </tr>
              </thead>
              <tbody>
                {certificados.map((c) => (
                  <tr key={c.id ?? c.numero} className="break-inside-avoid">
                    <td className="border border-noche-200 px-2 py-1 font-mono font-semibold">{c.numero}</td>
                    <td className="border border-noche-200 px-2 py-1">{c.cliente}</td>
                    <td className="border border-noche-200 px-2 py-1">{c.domicilio}</td>
                    <td className="border border-noche-200 px-2 py-1 whitespace-nowrap">{formatFecha(c.fecha_servicio)}</td>
                    <td className="border border-noche-200 px-2 py-1 font-mono">{c.sello_codigo ?? "Pendiente"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Seccion>
        ) : null}
      </HojaImpresion>
    </>
  );
}
