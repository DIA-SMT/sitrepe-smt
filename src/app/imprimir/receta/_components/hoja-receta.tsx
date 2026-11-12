import { CheckSquare, FileSignature, Phone, ShieldAlert } from "lucide-react";
import { HojaImpresion, Firma } from "@/components/print/hoja-impresion";
import { CodigoQR } from "@/components/shared/codigo-qr";
import { APP } from "@/lib/config";
import { huellaAbreviada, plazoReingresoTexto, type CertificadoDetalle } from "@/lib/data/certificados";
import { formatFecha, formatFechaHora, formatHora, formatNumero, formatSuperficie } from "@/lib/domain/formato";
import { ANIOS_ARCHIVO_RECETA, COPIAS_RECETA, formatNumeroReceta } from "@/lib/domain/receta";
import { cn } from "@/lib/utils";

export type CopiaReceta = 0 | 1 | 2;

const ESTILO_COPIA: { banda: string; fondo: string }[] = [
  { banda: "bg-azul-600 text-white", fondo: "bg-azul-50 text-azul-900" },
  { banda: "bg-celeste-700 text-white", fondo: "bg-celeste-50 text-celeste-900" },
  { banda: "bg-noche-800 text-white", fondo: "bg-noche-50 text-noche-800" },
];

function hostPublico(): string {
  try {
    return new URL(APP.siteUrl).host;
  } catch {
    return APP.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function Seccion({ numero, titulo, children }: { numero?: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex break-inside-avoid flex-col gap-1.5">
      <h2 className="border-b border-noche-200 pb-1 font-display text-[10.5px] font-bold tracking-[0.14em] text-noche-500 uppercase">
        {numero ? `${numero}. ` : ""}
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Dato({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <dt className="text-[10px] font-semibold tracking-wide text-noche-500 uppercase">{label}</dt>
      <dd className="leading-snug font-medium break-words text-noche-900">{children}</dd>
    </div>
  );
}

function MarcaDeAgua({ texto }: { texto: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden select-none">
      <span className="-rotate-[32deg] rounded-2xl border-[6px] border-red-600/25 px-10 py-6 font-display text-[56px] leading-none font-black tracking-[0.08em] text-red-600/20 sm:text-[76px]">
        {texto}
      </span>
    </div>
  );
}

/** Una hoja A4 de la receta domisanitaria (modelo del Anexo I) para una de sus tres copias. */
export function HojaReceta({ detalle, copia, saltoDePagina }: { detalle: CertificadoDetalle; copia: CopiaReceta; saltoDePagina: boolean }) {
  const { certificado: c, productos, empresa } = detalle;
  const datosCopia = COPIAS_RECETA[copia];
  const estilo = ESTILO_COPIA[copia];
  const numero = formatNumeroReceta(empresa?.numero_registro ?? c.empresa_numero_registro, c.receta_numero);
  const emitida = Boolean(c.firma_hash && numero);
  const anulada = c.estado === "anulado";
  const codigo = c.receta_codigo ?? "";
  const toxicologico = APP.centroToxicologico;

  const lateral = (
    <div className="flex items-start gap-3">
      <div className="hidden max-w-[36mm] text-right text-[10px] leading-tight text-noche-600 sm:block print:block">
        <p className="font-semibold tracking-wide text-noche-700 uppercase">Verificación de la receta</p>
        <p className="mt-0.5 font-mono text-[12px] font-bold tracking-tight text-azul-800">{emitida ? codigo : "—"}</p>
        <p className="mt-1.5">
          Escaneá el QR o ingresá en
          <br />
          <span className="font-semibold text-noche-800">{hostPublico()}/receta</span>
        </p>
      </div>
      {emitida ? <CodigoQR codigo={codigo} receta tamanio={80} className="rounded-md bg-white p-1 ring-1 ring-noche-200" /> : null}
    </div>
  );

  const pie = (
    <p>
      <strong className="text-noche-700">Receta por triplicado:</strong> original para el comercio que expende el producto,
      duplicado para la empresa aplicadora y triplicado para el asesor técnico. Se archiva digitalmente en SITREPE por un
      plazo mínimo de {ANIOS_ARCHIVO_RECETA} año. Solo es válida con la firma digital del asesor técnico: verificala con el
      código QR.
    </p>
  );

  return (
    <HojaImpresion
      titulo="Receta domisanitaria de compra y aplicación"
      subtitulo={
        <span>
          N.º <strong className="font-mono text-noche-900">{numero ?? "sin emitir"}</strong> · {datosCopia.etiqueta} –{" "}
          {datosCopia.destinatario}
        </span>
      }
      lateral={lateral}
      pie={pie}
      saltoDePagina={saltoDePagina}
      className="min-h-0 px-5 py-6 sm:min-h-[297mm] sm:px-[16mm] sm:py-[14mm] print:[&>footer]:mt-4"
    >
      {anulada ? <MarcaDeAgua texto="ANULADA" /> : !emitida ? <MarcaDeAgua texto="SIN FIRMA" /> : null}

      <div className="flex flex-col gap-3">
        <div className="flex items-stretch overflow-hidden rounded-md ring-1 ring-black/10">
          <span className={cn("flex items-center px-3 py-1.5 font-display text-[11px] font-bold tracking-[0.2em] uppercase", estilo.banda)}>
            {datosCopia.etiqueta}
          </span>
          <span className={cn("flex flex-1 items-center px-3 py-1.5 text-[11.5px] font-semibold", estilo.fondo)}>
            {datosCopia.destinatario}
          </span>
          <span className={cn("hidden items-center px-3 py-1.5 font-mono text-[11px] font-bold sm:flex print:flex", estilo.fondo)}>
            {numero ?? "—"}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-3 print:grid-cols-3">
          <Dato label="Fecha de emisión">{c.firmado_at ? formatFecha(c.firmado_at) : "—"}</Dato>
          <Dato label="Tipo de operación" className="col-span-2">
            <span className="flex flex-wrap gap-x-4">
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="size-3.5 text-azul-700" aria-hidden /> Compra de producto
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="size-3.5 text-azul-700" aria-hidden /> Aplicación / Servicio (cert. N.º {c.numero})
              </span>
            </span>
          </Dato>
        </dl>

        <Seccion numero={1} titulo="Empresa solicitante (aplicadora)">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-3 print:grid-cols-3">
            <Dato label="Razón social" className="col-span-2">
              {empresa?.nombre_comercial ?? c.empresa_nombre ?? "—"}
              {empresa?.titular ? <span className="font-normal text-noche-600"> · Titular: {empresa.titular}</span> : null}
            </Dato>
            <Dato label="Habilitación municipal">
              Registro N.º {empresa?.numero_registro ?? c.empresa_numero_registro ?? "—"}
              {empresa?.resolucion_dsa ? <span className="font-normal text-noche-600"> · Res. {empresa.resolucion_dsa}</span> : null}
            </Dato>
          </dl>
        </Seccion>

        <Seccion numero={2} titulo="Director / asesor técnico">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-3 print:grid-cols-3">
            <Dato label="Nombre">{c.tecnico_nombre ?? "—"}</Dato>
            <Dato label="Título">{c.tecnico_titulo ?? "—"}</Dato>
            <Dato label="Matrícula profesional N.º">{c.tecnico_matricula ?? "—"}</Dato>
          </dl>
        </Seccion>

        <Seccion numero={3} titulo="Destino de aplicación">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-3 print:grid-cols-3">
            <Dato label="Cliente" className="col-span-2">
              {c.cliente ?? "—"}
              {c.cliente_cuit ? <span className="font-normal text-noche-600"> · CUIT {c.cliente_cuit}</span> : null}
            </Dato>
            <Dato label="Fecha del servicio">
              {formatFecha(c.fecha_servicio)} · {formatHora(c.fecha_servicio)} h
            </Dato>
            <Dato label="Domicilio" className="col-span-2">
              {c.domicilio ?? "—"}
            </Dato>
            <Dato label="Superficie">{formatSuperficie(c.superficie_m2)}</Dato>
            <Dato label="Rubro" className="col-span-3">
              {c.rubro_nombre ?? "—"}
            </Dato>
          </dl>
        </Seccion>

        <Seccion numero={4} titulo="Prescripción técnica">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5">
            <Dato label="Plaga objetivo">{c.plaga_objetivo ?? "—"}</Dato>
            <Dato label="Método de aplicación">{c.metodo_aplicacion ?? "—"}</Dato>
          </dl>
          {productos.length === 0 ? (
            <p className="text-noche-600">Sin productos prescriptos.</p>
          ) : (
            <table className="mt-1 w-full border-collapse text-left text-[11px]">
              <thead>
                <tr className="border-b border-noche-300 text-[9.5px] tracking-wide text-noche-500 uppercase">
                  <th scope="col" className="py-1 pr-2 font-semibold">Nombre comercial</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Principio activo y %</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Registro</th>
                  <th scope="col" className="py-1 pr-2 text-right font-semibold">Cantidad</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Lote</th>
                  <th scope="col" className="py-1 font-semibold">Vto.</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} className="break-inside-avoid border-b border-noche-100 last:border-0">
                    <td className="py-0.5 pr-2 font-semibold text-noche-900">
                      {p.nombre}
                      {p.formulacion ? <span className="block text-[10px] font-normal text-noche-600">{p.formulacion}</span> : null}
                    </td>
                    <td className="py-0.5 pr-2 text-noche-700">
                      {p.principioActivo}
                      {p.concentracion ? ` ${p.concentracion}` : ""}
                    </td>
                    <td className="py-0.5 pr-2 whitespace-nowrap text-noche-700">
                      <span className="font-semibold">{p.organismo}</span> N.º {p.registro}
                    </td>
                    <td className="nums-tabular py-0.5 pr-2 text-right whitespace-nowrap text-noche-900">
                      {formatNumero(p.cantidad, 3)} {p.unidad}
                    </td>
                    <td className="py-0.5 pr-2 font-mono whitespace-nowrap text-noche-900">{p.lote ?? "………………"}</td>
                    <td className="py-0.5 whitespace-nowrap text-noche-900">{p.loteVence ? formatFecha(p.loteVence) : "…/…/……"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Seccion>

        <Seccion numero={5} titulo="Bioseguridad">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-3 print:grid-cols-3">
            <Dato label="Tiempo de carencia / reingreso">{plazoReingresoTexto(c.plazo_reingreso_horas)}</Dato>
            <Dato label="Centro toxicológico">
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3 text-noche-500" aria-hidden />
                {toxicologico.telefono}
              </span>
            </Dato>
            <Dato label="Lugar">
              {toxicologico.nombre}
              <span className="block text-[10.5px] font-normal text-noche-600">{toxicologico.lugar}</span>
            </Dato>
          </dl>
        </Seccion>

        <Seccion numero={6} titulo="Observaciones">
          <div className="flex flex-col gap-3 pt-1" aria-hidden>
            <span className="border-b border-dotted border-noche-300" />
            <span className="border-b border-dotted border-noche-300" />
          </div>
        </Seccion>

        <div className="grid break-inside-avoid items-end gap-6 sm:grid-cols-2 print:grid-cols-2">
          <Firma titulo="Firma responsable / apoderado" detalle={`Empresa fumigadora · ${empresa?.nombre_comercial ?? ""}`} />
          <div className="flex flex-col gap-1.5">
            {emitida && c.firmado_at ? (
              <div className="flex items-start gap-2 rounded-md bg-azul-50 px-2.5 py-1.5 ring-1 ring-azul-100">
                <FileSignature className="mt-0.5 size-4 shrink-0 text-azul-700" aria-hidden />
                <p className="text-[11px] leading-snug text-noche-800">
                  Firmada digitalmente por <strong>{c.tecnico_nombre}</strong> el {formatFechaHora(c.firmado_at)}
                  <br />
                  Huella <span className="font-mono font-semibold tracking-tight text-azul-800">{huellaAbreviada(c.firma_hash)}</span>
                </p>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-red-700">
                <ShieldAlert className="size-3.5" aria-hidden /> Pendiente de firma digital del asesor técnico
              </p>
            )}
            <p className="text-center text-[11px] text-noche-600">
              <span className="font-semibold text-noche-800">Firma asesor técnico</span> · {c.tecnico_titulo ?? ""}
            </p>
          </div>
        </div>
      </div>
    </HojaImpresion>
  );
}
