import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarraImpresion } from "@/components/print/barra-impresion";
import { Firma, HojaImpresion } from "@/components/print/hoja-impresion";
import {
  EJEMPLARES,
  type Ejemplar,
  MarcaDeAgua,
  Renglon,
  SelectorEjemplar,
  SelloEjemplar,
  ejemplaresDe,
} from "@/app/gestion/notificaciones/_components/impresion";
import { LUGAR_PRESENTACION, PLAZO_EN_LETRAS, textoIntimacion } from "@/app/gestion/notificaciones/_components/textos";
import { requerirStaff } from "@/lib/auth";
import { type Notificacion, obtenerNotificacion, valorPermitido } from "@/lib/data/intimaciones";
import { TIPO_NOTIFICACION } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatHora } from "@/lib/domain/formato";

type ImprimirNotificacionProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: ImprimirNotificacionProps): Promise<Metadata> {
  const { id } = await params;
  const datos = await obtenerNotificacion(id).catch(() => null);
  return { title: datos?.notificacion.numero ? `Notificación N.º ${datos.notificacion.numero}` : "Notificación" };
}

export default async function ImprimirNotificacionPage({ params, searchParams }: ImprimirNotificacionProps) {
  await requerirStaff();
  const { id } = await params;
  const sp = await searchParams;
  const datos = await obtenerNotificacion(id);
  if (!datos) notFound();

  const seleccion = valorPermitido(sp.ejemplar, EJEMPLARES) ?? "ambos";
  const ejemplares = ejemplaresDe(seleccion);
  const ruta = `/imprimir/notificacion/${id}`;

  return (
    <>
      <BarraImpresion volverHref={`/gestion/notificaciones/${id}`} volverTexto="Volver a la notificación">
        <SelectorEjemplar ruta={ruta} actual={seleccion} />
      </BarraImpresion>
      <div className="flex flex-col gap-8 print:gap-0">
        {ejemplares.map((e, i) => (
          <HojaNotificacion key={e} n={datos.notificacion} ejemplar={e} saltoDePagina={i < ejemplares.length - 1} />
        ))}
      </div>
    </>
  );
}

function HojaNotificacion({ n, ejemplar, saltoDePagina }: { n: Notificacion; ejemplar: Ejemplar; saltoDePagina: boolean }) {
  const tipo = n.tipo ?? "tanques";
  const plazo = n.plazo ?? "cinco_dias_habiles";
  const texto = textoIntimacion(tipo, plazo);
  const numero = n.numero ?? "—";
  const anulada = n.estado === "anulada";

  // Campos variables del modelo vigente; fecha y hora quedan en blanco si todavía no se notificó.
  const datos: { etiqueta: string; valor: React.ReactNode; span: string }[] = [
    { etiqueta: "Razón social", valor: n.razon_social, span: "col-span-6" },
    { etiqueta: "Rubro", valor: n.rubro, span: "col-span-3" },
    { etiqueta: "CUIT", valor: n.cuit, span: "col-span-3" },
    { etiqueta: "Domicilio", valor: n.domicilio, span: "col-span-6" },
    { etiqueta: "O.T.", valor: n.orden_trabajo, span: "col-span-2" },
    { etiqueta: "Fecha", valor: n.notificada_at ? formatFecha(n.notificada_at) : null, span: "col-span-2" },
    { etiqueta: "Hora", valor: n.notificada_at ? formatHora(n.notificada_at) : null, span: "col-span-2" },
  ];

  return (
    <HojaImpresion
      titulo={`NOTIFICACIÓN N.º ${numero}`}
      subtitulo={
        <span>
          {TIPO_NOTIFICACION[tipo].label} ·{" "}
          {ejemplar === "original" ? "Ejemplar para el notificado" : "Ejemplar para la Dirección de Salud Ambiental"}
        </span>
      }
      lateral={
        <SelloEjemplar
          ejemplar={ejemplar}
          detalle={
            <>
              Ciclo {n.ciclo ?? "—"} · Talonario {n.talonario ? String(n.talonario).padStart(5, "0") : "—"}
            </>
          }
        />
      }
      pie={
        <span>
          Notificación N.º {numero} · {ejemplar === "original" ? "ORIGINAL" : "DUPLICADO"}
          {n.vence_at ? ` · Plazo hasta el ${formatFechaHora(n.vence_at)}` : ""}
        </span>
      }
      saltoDePagina={saltoDePagina}
    >
      {anulada ? <MarcaDeAgua texto="ANULADA" /> : null}

      {/* Datos del destinatario (campos variables del modelo vigente) */}
      <dl className="grid grid-cols-12 gap-px overflow-hidden rounded-md border border-noche-300 bg-noche-300 text-[12.5px]">
        {datos.map((d) => (
          <div key={d.etiqueta} className={`${d.span} bg-white px-2.5 py-1.5`}>
            <dt className="text-[9.5px] font-semibold tracking-wide text-noche-500 uppercase">{d.etiqueta}</dt>
            <dd className="min-h-[1.25em] font-medium text-noche-950">{d.valor ?? " "}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-col gap-2.5 text-justify">
        <p>{texto.intimacion}</p>
        <ol className="list-decimal space-y-0.5 pl-6">
          {texto.documentos.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ol>
        <p className="font-semibold">
          Plazo: {PLAZO_EN_LETRAS[plazo]}
          {n.vence_at ? ` (vence el ${formatFecha(n.vence_at)} a las ${formatHora(n.vence_at)})` : ""}.
        </p>
        <p>
          <strong>Lugar de presentación:</strong> {LUGAR_PRESENTACION}
        </p>
        <p>{texto.apercibimiento}</p>
      </div>

      <div className="mt-3 rounded-md border border-noche-200 px-3 py-2 text-[10.5px] leading-snug text-noche-700">
        <p className="mb-1 font-semibold tracking-wide text-noche-800 uppercase">Normativa</p>
        <ul className="flex flex-col gap-0.5">
          {texto.normativa.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-semibold tracking-wide text-noche-800 uppercase">Observaciones</p>
        {n.observaciones ? (
          <p className="mt-1 border-b border-dotted border-noche-400 pb-1 whitespace-pre-line">{n.observaciones}</p>
        ) : (
          <div className="mt-1 flex flex-col gap-4" aria-hidden>
            <span className="block h-4 border-b border-dotted border-noche-400" />
            <span className="block h-4 border-b border-dotted border-noche-400" />
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-10">
        <div className="flex flex-col">
          <Firma titulo="Firma de recepción" />
          <p className="mt-2 flex items-end gap-2 text-[11px]">
            <span className="shrink-0 text-noche-600">Aclaración:</span>
            <Renglon valor={n.persona_notificada} />
          </p>
          <p className="mt-1.5 flex items-end gap-2 text-[11px]">
            <span className="shrink-0 text-noche-600">DNI:</span>
            <Renglon valor={n.dni_notificado} />
          </p>
        </div>
        <div className="flex flex-col">
          <Firma titulo="Firma y sello del inspector" detalle={n.inspector_nombre ?? undefined} />
        </div>
      </div>
    </HojaImpresion>
  );
}
