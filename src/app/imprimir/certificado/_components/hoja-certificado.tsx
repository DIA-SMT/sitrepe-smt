import { CalendarClock, Clock, FileSignature, ShieldAlert, ShieldCheck } from "lucide-react";
import { CodigoQR } from "@/components/shared/codigo-qr";
import { HojaImpresion } from "@/components/print/hoja-impresion";
import { APP } from "@/lib/config";
import {
  huellaAbreviada,
  periodicidadTexto,
  plazoReingresoTexto,
  tituloCertificado,
  type CertificadoDetalle,
} from "@/lib/data/certificados";
import { formatFecha, formatFechaHora, formatFechaLarga, formatHora, formatLitros, formatNumero, formatSuperficie } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { SelloPendiente, SelloTimbrado } from "./sello-timbrado";

export type Ejemplar = "original" | "duplicado" | "triplicado";

export const EJEMPLARES: Record<Ejemplar, { titulo: string; destino: string; banda: string; fondo: string; texto: string }> = {
  original: {
    titulo: "ORIGINAL",
    destino: "Para el cliente",
    banda: "bg-azul-600 text-white",
    fondo: "bg-azul-50 text-azul-900",
    texto: "text-azul-700",
  },
  duplicado: {
    titulo: "DUPLICADO",
    destino: "Para la Dirección de Salud Ambiental",
    banda: "bg-celeste-700 text-white",
    fondo: "bg-celeste-50 text-celeste-900",
    texto: "text-celeste-800",
  },
  triplicado: {
    titulo: "TRIPLICADO",
    destino: "Para la empresa",
    banda: "bg-noche-800 text-white",
    fondo: "bg-noche-50 text-noche-800",
    texto: "text-noche-700",
  },
};

/** Host público de la plataforma (para la leyenda "Verificá en …/verificar"). */
function hostPublico(): string {
  try {
    return new URL(APP.siteUrl).host;
  } catch {
    return APP.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function Seccion({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex break-inside-avoid flex-col gap-1.5", className)}>
      <h2 className="border-b border-noche-200 pb-1 font-display text-[10.5px] font-bold tracking-[0.14em] text-noche-500 uppercase">
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

/** Marca de agua para certificados sin validez (no timbrados o anulados). */
function MarcaDeAgua({ anulado }: { anulado: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden select-none"
    >
      <div className="flex -rotate-[32deg] flex-col items-center gap-2 rounded-2xl border-[6px] border-red-600/25 px-10 py-6 text-center text-red-600/20">
        <span className="font-display text-[64px] leading-none font-black tracking-[0.08em] sm:text-[88px]">
          {anulado ? "ANULADO" : "SIN TIMBRAR"}
        </span>
        {!anulado ? (
          <span className="font-display text-[32px] leading-none font-extrabold tracking-[0.3em] sm:text-[44px]">NO VÁLIDO</span>
        ) : null}
      </div>
    </div>
  );
}

/** Una hoja A4 del certificado oficial para un ejemplar. */
export function HojaCertificado({
  detalle,
  ejemplar,
  saltoDePagina,
}: {
  detalle: CertificadoDetalle;
  ejemplar: Ejemplar;
  saltoDePagina: boolean;
}) {
  const { certificado: c, productos, empresa, establecimiento } = detalle;
  const e = EJEMPLARES[ejemplar];
  const timbrado = c.estado === "timbrado" && !!c.sello_codigo;
  const anulado = c.estado === "anulado";
  const esTanque = c.tipo === "tanque";
  const codigo = c.codigo_verificacion ?? "";
  const huella = huellaAbreviada(c.firma_hash);
  /*
   * Alto útil de la A4 con los márgenes de /imprimir: 269 mm ≈ 1017 px. Medido con la tipografía real,
   * un ejemplar ocupa ≈ 875 px sin productos + ≈ 23 px por producto; con más de 3 productos se compacta
   * (filas, separaciones y sello más chicos: ≈ 975 px con 8 productos) para que cada ejemplar entre en una hoja.
   */
  const compacto = productos.length > 3;
  const celda = compacto ? "py-0 pr-2" : "py-0.5 pr-2";
  const tamanioSello = compacto ? 96 : 104;

  const pie = (
    <p>
      {esTanque ? (
        <>
          <strong className="text-noche-700">Ord. N.º 2004/92 (t.o. Ord. N.º 3098/01):</strong> limpieza y desinfección cada
          180 días de tanques y cisternas de inmuebles con afluencia de público, por empresas empadronadas y con análisis
          bacteriológico y físico-químico del agua.
        </>
      ) : (
        <>
          <strong className="text-noche-700">Ord. N.º 2681/98 (t.o. Ord. N.º 3737/06), Art. 9.º b:</strong> certificado por
          triplicado (original para el cliente, duplicado para la Dirección y triplicado para la empresa) con el sellado del
          arancel; su vigencia depende del rubro según el Anexo.
        </>
      )}{" "}
      <strong className="text-noche-700">Recomendación:</strong> respetá el plazo de reingreso y ventilá el ambiente antes de
      volver a ocuparlo. Solo es válido con el sello de timbrado: verificalo con el código QR.
    </p>
  );

  const lateral = (
    <div className="flex items-start gap-3">
      <div className="hidden max-w-[36mm] text-right text-[10px] leading-tight text-noche-600 sm:block print:block">
        <p className="font-semibold tracking-wide text-noche-700 uppercase">Código de verificación</p>
        <p className="mt-0.5 font-mono text-[12px] font-bold tracking-tight text-azul-800">{codigo || "—"}</p>
        <p className="mt-1.5">
          Verificá en
          <br />
          <span className="font-semibold text-noche-800">{hostPublico()}/verificar</span>
        </p>
      </div>
      {codigo ? (
        <CodigoQR codigo={codigo} tamanio={80} className="rounded-md bg-white p-1 ring-1 ring-noche-200" />
      ) : null}
    </div>
  );

  return (
    <HojaImpresion
      titulo={tituloCertificado(c.tipo)}
      subtitulo={
        <span>
          N.º <strong className="font-mono text-noche-900">{c.numero ?? "—"}</strong> · {e.titulo} – {e.destino}
          {!timbrado ? (
            <span className="sr-only">
              {" "}
              · {anulado ? "Certificado anulado, sin validez." : "Certificado sin timbrar, sin validez."}
            </span>
          ) : null}
        </span>
      }
      lateral={lateral}
      pie={pie}
      saltoDePagina={saltoDePagina}
      // El pie compartido trae mt-8: al imprimir se acorta para ganar alto útil en la A4.
      className="min-h-0 px-5 py-6 sm:min-h-[297mm] sm:px-[16mm] sm:py-[14mm] print:[&>footer]:mt-4"
    >
      {!timbrado ? <MarcaDeAgua anulado={anulado} /> : null}

      <div className={cn("flex flex-col", compacto ? "gap-2" : "gap-3")}>
        {/* Banda del ejemplar */}
        <div className="flex items-stretch overflow-hidden rounded-md ring-1 ring-black/10">
          <span className={cn("flex items-center px-3 py-1.5 font-display text-[11px] font-bold tracking-[0.2em]", e.banda)}>
            {e.titulo}
          </span>
          <span className={cn("flex flex-1 items-center px-3 py-1.5 text-[11.5px] font-semibold", e.fondo)}>{e.destino}</span>
          <span className={cn("hidden items-center px-3 py-1.5 font-mono text-[11px] font-bold sm:flex print:flex", e.fondo)}>
            N.º {c.numero ?? "—"}
          </span>
        </div>

        {/* Empresa + vencimiento */}
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto]">
          <Seccion titulo="Empresa prestadora">
            <p className="font-display text-[15px] leading-tight font-bold text-noche-950">
              {empresa?.nombre_comercial ?? c.empresa_nombre ?? "—"}
            </p>
            {empresa?.titular ? (
              <p className="-mt-1 text-[11.5px] leading-snug text-noche-700">
                Titular: <span className="font-semibold text-noche-900">{empresa.titular}</span>
              </p>
            ) : null}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 print:grid-cols-3">
              <Dato label="CUIT">{empresa?.cuit ?? c.empresa_cuit ?? "—"}</Dato>
              <Dato label="N.º de registro">{empresa?.numero_registro ?? c.empresa_numero_registro ?? "—"}</Dato>
              <Dato label="Resolución DSA">{empresa?.resolucion_dsa ?? "—"}</Dato>
            </dl>
          </Seccion>
          <div className="flex min-w-[46mm] flex-col items-center justify-center rounded-lg border-2 border-noche-900 px-4 py-2.5 text-center">
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-[0.24em] text-noche-600 uppercase">
              <CalendarClock className="size-3" aria-hidden /> Vence
            </span>
            <span className="nums-tabular font-display text-[26px] leading-tight font-extrabold text-noche-950">
              {c.fecha_vencimiento ? formatFecha(c.fecha_vencimiento) : "—"}
            </span>
            <span className="text-[10px] leading-tight text-noche-600">
              {c.fecha_vencimiento ? formatFechaLarga(c.fecha_vencimiento) : "Servicio por única vez"}
            </span>
          </div>
        </div>

        {/* Establecimiento y servicio */}
        <Seccion titulo={esTanque ? "Inmueble y servicio" : "Establecimiento y servicio"}>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3 print:grid-cols-3">
            <Dato label="Cliente (titular o razón social)" className="col-span-2">
              {c.cliente ?? "—"}
              {c.cliente_cuit ? <span className="font-normal text-noche-600"> · CUIT {c.cliente_cuit}</span> : null}
              {establecimiento?.nombre_fantasia ? (
                <span className="block text-[11.5px] font-normal text-noche-600">“{establecimiento.nombre_fantasia}”</span>
              ) : null}
            </Dato>
            <Dato label="Fecha y hora del servicio">
              {formatFecha(c.fecha_servicio)} · {formatHora(c.fecha_servicio)} h
            </Dato>
            <Dato label="Domicilio del servicio" className="col-span-2">
              {c.domicilio ?? "—"}
              {c.establecimiento_barrio ? <span className="font-normal text-noche-600"> · B.º {c.establecimiento_barrio}</span> : null}
            </Dato>
            <Dato label={esTanque ? "Capacidad" : "Superficie tratada"}>
              {esTanque ? formatLitros(c.capacidad_litros) : formatSuperficie(c.superficie_m2)}
            </Dato>
            <Dato label="Rubro (Anexo Ord. 2681/98)" className="col-span-2">
              {c.rubro_nombre ?? "—"}
              {c.rubro_grupo ? <span className="font-normal text-noche-600"> · {c.rubro_grupo}</span> : null}
            </Dato>
            <Dato label="Periodicidad">{periodicidadTexto(c.tipo, c.rubro_periodicidad)}</Dato>
          </dl>
        </Seccion>

        {/* Productos */}
        <Seccion titulo={esTanque ? "Productos utilizados para la desinfección" : "Productos aplicados"}>
          {productos.length === 0 ? (
            <p className="text-noche-600">Sin productos declarados.</p>
          ) : (
            <table className={cn("w-full border-collapse text-left", compacto ? "text-[10.5px] leading-snug" : "text-[11.5px]")}>
              <thead>
                <tr className="border-b border-noche-300 text-[10px] tracking-wide text-noche-500 uppercase">
                  <th scope="col" className="py-1 pr-2 font-semibold">Producto</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Principio activo</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Registro</th>
                  <th scope="col" className="py-1 text-right font-semibold">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} className="break-inside-avoid border-b border-noche-100 last:border-0">
                    <td className={cn(celda, "font-semibold text-noche-900")}>{p.nombre}</td>
                    <td className={cn(celda, "text-noche-700")}>
                      {p.principioActivo}
                      {p.concentracion ? ` ${p.concentracion}` : ""}
                    </td>
                    <td className={cn(celda, "whitespace-nowrap text-noche-700")}>
                      <span className="font-semibold">{p.organismo}</span> N.º {p.registro}
                    </td>
                    <td className={cn(compacto ? "py-0" : "py-0.5", "nums-tabular text-right whitespace-nowrap text-noche-900")}>
                      {formatNumero(p.cantidad, 3)} {p.unidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {esTanque ? (
            <p className="text-[11.5px] text-noche-700">
              <strong className="font-semibold text-noche-900">Análisis del agua:</strong>{" "}
              {c.laboratorio ? `Laboratorio ${c.laboratorio} · ` : ""}
              bacteriológico {c.analisis_bacteriologico_path ? "presentado" : "pendiente"} · físico-químico{" "}
              {c.analisis_fisicoquimico_path ? "presentado" : "pendiente"}.
            </p>
          ) : null}
        </Seccion>

        {/* Plazo de reingreso */}
        <div className="flex items-center gap-3 rounded-lg border border-sol-500 bg-sol-50 px-3.5 py-2">
          <Clock className="size-5 shrink-0 text-sol-800" aria-hidden />
          <p className="text-[12px] leading-snug text-noche-900">
            <strong className="font-bold">
              {esTanque ? "Plazo antes de volver a usar el tanque" : "Plazo de reingreso al ambiente tratado"}:{" "}
              {c.plazo_reingreso_horas === null ? "a confirmar por el asesor técnico" : plazoReingresoTexto(c.plazo_reingreso_horas)}.
            </strong>{" "}
            <span className="text-noche-700">
              {c.plazo_reingreso_horas === null
                ? "No hay productos declarados para calcularlo."
                : esTanque
                  ? "Respetá el plazo indicado antes de volver a habilitar el uso del tanque o la cisterna."
                  : c.plazo_reingreso_horas > 0
                    ? "No ingresen personas ni animales al lugar antes de cumplirse el plazo."
                    : "Se puede reingresar al ambiente, ventilándolo previamente."}
            </span>
          </p>
        </div>

        {/* Firma y sello */}
        <div className="grid break-inside-avoid items-end gap-5 sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto]">
          <Seccion titulo="Asesor técnico responsable (Art. 5.º)">
            <p className="font-display text-[14px] leading-tight font-bold text-noche-950">{c.tecnico_nombre ?? "—"}</p>
            <p className="text-[11.5px] text-noche-700">
              {c.tecnico_titulo ?? "—"}
              {c.tecnico_matricula ? ` · Matrícula ${c.tecnico_matricula}` : ""}
            </p>
            {c.firma_hash && c.firmado_at ? (
              <div className="mt-1.5 flex items-start gap-2 rounded-md bg-azul-50 px-2.5 py-1.5 ring-1 ring-azul-100">
                <FileSignature className="mt-0.5 size-4 shrink-0 text-azul-700" aria-hidden />
                <p className="text-[11px] leading-snug text-noche-800">
                  Firmado digitalmente el <strong>{formatFechaHora(c.firmado_at)}</strong>
                  <br />
                  Huella <span className="font-mono font-semibold tracking-tight text-azul-800">{huella}</span>
                </p>
              </div>
            ) : (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-red-700">
                <ShieldAlert className="size-3.5" aria-hidden /> Pendiente de firma digital del asesor técnico
              </p>
            )}
          </Seccion>
          <div className="flex flex-col items-center gap-1 text-center">
            {timbrado && c.sello_codigo ? (
              <>
                <SelloTimbrado codigo={c.sello_codigo} fecha={c.timbrado_at} tamanio={tamanioSello} idUnico={`${ejemplar}-${c.id}`} />
                <p className="flex items-center gap-1 text-[10px] font-semibold text-azul-800">
                  <ShieldCheck className="size-3" aria-hidden /> Sellado digital de la Dirección
                </p>
              </>
            ) : (
              <>
                <SelloPendiente tamanio={tamanioSello} texto={anulado ? "Anulado" : "Sin timbrar"} />
                <p className="text-[10px] font-semibold text-noche-500">Espacio para el sello de timbrado</p>
              </>
            )}
          </div>
        </div>

        {anulado && c.anulado_motivo ? (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[11.5px] text-red-800">
            <strong>Certificado anulado:</strong> {c.anulado_motivo}
          </p>
        ) : null}
      </div>
    </HojaImpresion>
  );
}
