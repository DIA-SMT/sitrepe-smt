import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Firma, HojaImpresion } from "@/components/print/hoja-impresion";
import { BarraImpresion } from "@/components/print/barra-impresion";
import { esStaff, requerirSesion } from "@/lib/auth";
import { APP } from "@/lib/config";
import {
  desplazarPeriodo,
  esUuid,
  getCertificadosDelMes,
  getEmpresaPlanilla,
  getPlanillaMensual,
  getUltimoDiaHabil,
  leerParam,
  leerPeriodo,
  nombrePeriodo,
  queryPeriodo,
  totalizarPlanilla,
  tituloPeriodo,
  type CertificadoMes,
  type EmpresaPlanilla,
  type FilaPlanilla,
  type Periodo,
} from "@/lib/data/reportes";
import { ESTADO_CERTIFICADO, ESTADO_EMPRESA, TIPO_SERVICIO_CORTO, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaLarga, formatLitros, formatNumero, formatSuperficie, hoyISO } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const periodo = leerPeriodo(await searchParams);
  return { title: `Planilla mensual de ${nombrePeriodo(periodo)}` };
}

const th = "border border-noche-200 px-1.5 py-1 font-semibold";
const td = "border border-noche-200 px-1.5 py-1";

function Seccion({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mt-5", className)}>
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

function Cifra({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col rounded border px-2.5 py-2",
        destacado ? "border-azul-600 bg-azul-50/60 print:bg-azul-50/60" : "border-noche-200",
      )}
    >
      <span className="text-[9.5px] font-semibold tracking-wide text-noche-500 uppercase">{label}</span>
      <span className="text-[15px] font-bold text-noche-900 nums-tabular">{valor}</span>
    </div>
  );
}

export default async function ImprimirPlanillaMensualPage({ searchParams }: Props) {
  const sesion = await requerirSesion();
  const staff = esStaff(sesion.perfil.rol);
  const sp = await searchParams;
  const periodo = leerPeriodo(sp);

  // El staff elige la empresa (o imprime el resumen de todas); una empresa solo imprime la propia.
  const param = leerParam(sp, "empresa");
  const empresaId = staff ? (esUuid(param) ? param : null) : (sesion.empresa?.id ?? null);
  if (!staff && (!empresaId || (param && param !== empresaId))) notFound();

  const [filas, vencimiento] = await Promise.all([
    getPlanillaMensual(periodo),
    getUltimoDiaHabil(desplazarPeriodo(periodo, 1)),
  ]);
  const volver = staff
    ? `/gestion/reportes/planilla-mensual?${queryPeriodo(periodo, { empresa: empresaId })}`
    : "/prestador";

  if (!empresaId) {
    return (
      <>
        <BarraImpresion volverHref={volver} volverTexto="Volver a la planilla" />
        <ResumenConsolidado periodo={periodo} filas={filas} vencimiento={vencimiento} />
      </>
    );
  }

  const [empresa, certificados] = await Promise.all([
    getEmpresaPlanilla(empresaId),
    getCertificadosDelMes(periodo, empresaId),
  ]);
  if (!empresa) notFound();

  return (
    <>
      <BarraImpresion volverHref={volver} volverTexto={staff ? "Volver a la planilla" : "Volver"} />
      <PlanillaEmpresa
        periodo={periodo}
        empresa={empresa}
        fila={filas.find((f) => f.empresaId === empresa.id) ?? null}
        certificados={certificados}
        vencimiento={vencimiento}
      />
    </>
  );
}

function PlanillaEmpresa({
  periodo,
  empresa,
  fila,
  certificados,
  vencimiento,
}: {
  periodo: Periodo;
  empresa: EmpresaPlanilla;
  fila: FilaPlanilla | null;
  certificados: CertificadoMes[];
  vencimiento: string;
}) {
  const mes = nombrePeriodo(periodo);
  return (
    <HojaImpresion
      titulo="Planilla mensual de servicios"
      subtitulo={<span>Certificados con servicio en {mes} · Art. 10.º c, Ord. 2681/98 (t.o. Ord. 3737/06)</span>}
      lateral={
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-[10px] font-semibold tracking-wide text-noche-500 uppercase">Período</span>
          <span className="rounded-md border-2 border-azul-600 px-3 py-1 font-display text-base font-bold text-azul-700">
            {tituloPeriodo(periodo)}
          </span>
          {empresa.numeroRegistro ? (
            <span className="text-[11px] text-noche-600">Registro N.º {empresa.numeroRegistro}</span>
          ) : null}
        </div>
      }
      pie={
        <>
          Planilla mensual por empresa (Art. 10.º c): se presenta hasta el último día hábil del mes siguiente (
          {formatFechaLarga(vencimiento)}). Incluye los certificados declarados, en control, timbrados y anulados; no
          incluye borradores. Impresa el {formatFechaLarga(hoyISO())}.
        </>
      }
    >
      <Seccion titulo="Empresa prestadora" className="mt-0">
        <div className="grid grid-cols-3 gap-x-6 gap-y-2">
          <Dato label="Nombre o razón social" className="col-span-2">
            {empresa.nombre}
          </Dato>
          <Dato label="CUIT">{empresa.cuit}</Dato>
          <Dato label="Titular" className="col-span-2">
            {empresa.titular}
          </Dato>
          <Dato label="Estado">{etiqueta(ESTADO_EMPRESA, empresa.estado).label}</Dato>
          <Dato label="Resolución DSA">{empresa.resolucionDsa}</Dato>
          <Dato label="Habilitación comercial">{empresa.habilitacionComercial}</Dato>
          <Dato label="Vence la habilitación">
            {empresa.vencimientoHabilitacion ? formatFecha(empresa.vencimientoHabilitacion) : null}
          </Dato>
          <Dato label="Domicilio" className="col-span-3">
            {empresa.domicilio}
          </Dato>
        </div>
      </Seccion>

      <Seccion titulo="Resumen del mes">
        <div className="grid grid-cols-6 gap-2">
          <Cifra label="Certificados" valor={formatNumero(fila?.certificados ?? 0, 0)} destacado />
          <Cifra label="Fumigación" valor={formatNumero(fila?.fumigacion ?? 0, 0)} />
          <Cifra label="Tanques" valor={formatNumero(fila?.tanque ?? 0, 0)} />
          <Cifra label="Timbrados" valor={formatNumero(fila?.timbrados ?? 0, 0)} />
          <Cifra label="En proceso" valor={formatNumero(fila?.enProceso ?? 0, 0)} />
          <Cifra label="Anulados" valor={formatNumero(fila?.anulados ?? 0, 0)} />
        </div>
        <p className="mt-2 text-[11px] text-noche-600">
          Superficie tratada: <span className="font-semibold text-noche-900">{formatSuperficie(Math.round(fila?.superficieM2 ?? 0))}</span>
        </p>
      </Seccion>

      <Seccion titulo={`Detalle de certificados (${certificados.length})`}>
        {certificados.length === 0 ? (
          <p className="rounded border border-dashed border-noche-300 px-3 py-4 text-center text-[12px] text-noche-600">
            La empresa no registra certificados con servicio en {mes}.
          </p>
        ) : (
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-azul-50 text-left text-[9px] tracking-wide text-noche-600 uppercase">
                <th className={th}>N.º</th>
                <th className={th}>Tipo</th>
                <th className={th}>Servicio</th>
                <th className={th}>Cliente</th>
                <th className={th}>Domicilio</th>
                <th className={th}>Rubro</th>
                <th className={cn(th, "text-right")}>Sup. / cap.</th>
                <th className={th}>Vence</th>
                <th className={th}>Estado</th>
                <th className={th}>Sello</th>
              </tr>
            </thead>
            <tbody>
              {certificados.map((c) => (
                <tr key={c.id} className="break-inside-avoid">
                  <td className={cn(td, "font-mono font-semibold whitespace-nowrap")}>{c.numero}</td>
                  <td className={td}>{TIPO_SERVICIO_CORTO[c.tipo]}</td>
                  <td className={cn(td, "whitespace-nowrap")}>{formatFecha(c.fechaServicio)}</td>
                  <td className={td}>{c.cliente}</td>
                  <td className={td}>
                    {c.domicilio}
                    {c.barrio ? <span className="text-noche-500"> · {c.barrio}</span> : null}
                  </td>
                  <td className={td}>{c.rubro}</td>
                  <td className={cn(td, "text-right whitespace-nowrap nums-tabular")}>
                    {c.tipo === "tanque" ? formatLitros(c.capacidadLitros) : formatSuperficie(c.superficieM2)}
                  </td>
                  <td className={cn(td, "whitespace-nowrap")}>{formatFecha(c.fechaVencimiento)}</td>
                  <td className={td}>{etiqueta(ESTADO_CERTIFICADO, c.estado).label}</td>
                  <td className={cn(td, "font-mono text-[9px]")}>{c.selloCodigo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Seccion>

      <div className="mt-10 grid grid-cols-3 gap-8 break-inside-avoid">
        <Firma titulo="Asesor técnico" detalle="Firma y aclaración" />
        <Firma titulo="Titular o representante" detalle={empresa.nombre} />
        <Firma titulo="Control de Empresas y Timbrado" detalle={APP.direccion} />
      </div>
    </HojaImpresion>
  );
}

function ResumenConsolidado({ periodo, filas, vencimiento }: { periodo: Periodo; filas: FilaPlanilla[]; vencimiento: string }) {
  const mes = nombrePeriodo(periodo);
  const tot = totalizarPlanilla(filas);
  return (
    <HojaImpresion
      titulo="Resumen mensual de certificados por empresa"
      subtitulo={<span>Planillas mensuales de {mes} · Art. 10.º c, Ord. 2681/98 (t.o. Ord. 3737/06)</span>}
      lateral={
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-[10px] font-semibold tracking-wide text-noche-500 uppercase">Período</span>
          <span className="rounded-md border-2 border-azul-600 px-3 py-1 font-display text-base font-bold text-azul-700">
            {tituloPeriodo(periodo)}
          </span>
          <span className="text-[11px] text-noche-600">{tot.empresas} empresas con actividad</span>
        </div>
      }
      pie={
        <>
          Plazo de presentación de las planillas de {mes}: {formatFechaLarga(vencimiento)}. Certificados con servicio en el
          mes, sin borradores. Impreso el {formatFechaLarga(hoyISO())}.
        </>
      }
    >
      <div className="grid grid-cols-5 gap-2">
        <Cifra label="Empresas" valor={formatNumero(tot.empresas, 0)} />
        <Cifra label="Certificados" valor={formatNumero(tot.certificados, 0)} destacado />
        <Cifra label="Timbrados" valor={formatNumero(tot.timbrados, 0)} />
        <Cifra label="En proceso" valor={formatNumero(tot.enProceso, 0)} />
        <Cifra label="Anulados" valor={formatNumero(tot.anulados, 0)} />
      </div>

      <Seccion titulo="Detalle por empresa">
        {filas.length === 0 ? (
          <p className="rounded border border-dashed border-noche-300 px-3 py-4 text-center text-[12px] text-noche-600">
            Ninguna empresa registra certificados con servicio en {mes}.
          </p>
        ) : (
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-azul-50 text-left text-[9.5px] tracking-wide text-noche-600 uppercase">
                <th className={th}>Empresa</th>
                <th className={th}>CUIT</th>
                <th className={cn(th, "text-right")}>Fumig.</th>
                <th className={cn(th, "text-right")}>Tanques</th>
                <th className={cn(th, "text-right")}>Total</th>
                <th className={cn(th, "text-right")}>Timbrados</th>
                <th className={cn(th, "text-right")}>En proceso</th>
                <th className={cn(th, "text-right")}>Anulados</th>
                <th className={cn(th, "text-right")}>Superficie</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.empresaId} className="break-inside-avoid">
                  <td className={cn(td, "font-medium")}>{f.empresaNombre}</td>
                  <td className={cn(td, "whitespace-nowrap")}>{f.empresaCuit}</td>
                  <td className={cn(td, "text-right nums-tabular")}>{f.fumigacion}</td>
                  <td className={cn(td, "text-right nums-tabular")}>{f.tanque}</td>
                  <td className={cn(td, "text-right font-semibold nums-tabular")}>{f.certificados}</td>
                  <td className={cn(td, "text-right nums-tabular")}>{f.timbrados}</td>
                  <td className={cn(td, "text-right nums-tabular")}>{f.enProceso}</td>
                  <td className={cn(td, "text-right nums-tabular")}>{f.anulados}</td>
                  <td className={cn(td, "text-right whitespace-nowrap nums-tabular")}>
                    {formatSuperficie(Math.round(f.superficieM2))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-noche-50 font-bold">
                <td colSpan={2} className={cn(td, "text-[10px] uppercase")}>
                  Total
                </td>
                <td className={cn(td, "text-right nums-tabular")}>{tot.fumigacion}</td>
                <td className={cn(td, "text-right nums-tabular")}>{tot.tanque}</td>
                <td className={cn(td, "text-right nums-tabular")}>{tot.certificados}</td>
                <td className={cn(td, "text-right nums-tabular")}>{tot.timbrados}</td>
                <td className={cn(td, "text-right nums-tabular")}>{tot.enProceso}</td>
                <td className={cn(td, "text-right nums-tabular")}>{tot.anulados}</td>
                <td className={cn(td, "text-right whitespace-nowrap nums-tabular")}>
                  {formatSuperficie(Math.round(tot.superficieM2))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </Seccion>

      <div className="mt-10 flex justify-end break-inside-avoid">
        <Firma titulo="Control de Empresas y Timbrado" detalle={APP.direccion} />
      </div>
    </HojaImpresion>
  );
}
