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
import { requerirStaff } from "@/lib/auth";
import { APP } from "@/lib/config";
import { obtenerActa, valorPermitido } from "@/lib/data/intimaciones";
import { enteroALetras } from "@/lib/domain/numeros-a-letras";
import { ESTADO_ACTA, MOTIVO_ACTA } from "@/lib/domain/etiquetas";
import { formatFecha, formatHora } from "@/lib/domain/formato";

type ImprimirActaProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type DatosActa = NonNullable<Awaited<ReturnType<typeof obtenerActa>>>;

export async function generateMetadata({ params }: ImprimirActaProps): Promise<Metadata> {
  const { id } = await params;
  const datos = await obtenerActa(id).catch(() => null);
  return { title: datos?.acta.numero ? `Acta N.º ${datos.acta.numero}` : "Acta de infracción" };
}

const partesFecha = new Intl.DateTimeFormat("es-AR", {
  timeZone: APP.zonaHoraria,
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "a los VEINTISÉIS (26) días del mes de octubre de 2026" */
function fechaEnLetras(iso: string | null): string {
  if (!iso) return "a los ……… días del mes de ……………… de ………";
  const p = partesFecha.formatToParts(new Date(iso));
  const v = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? "";
  const dia = Number(v("day"));
  // "veintiún días", "treinta y un días" (apócope delante del sustantivo).
  const letras = enteroALetras(dia).replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN");
  const enLetras = dia === 1 ? "al PRIMER (1) día" : `a los ${letras} (${dia}) días`;
  return `${enLetras} del mes de ${v("month")} de ${v("year")}`;
}

/** ", con plazo vencido el …" (o "con plazo hasta el …" si el acta es anterior al vencimiento). */
function plazoNotificacion(venceAt: string | null, fechaActa: string | null): string {
  if (!venceAt) return "";
  const vencido = !fechaActa || new Date(venceAt).getTime() <= new Date(fechaActa).getTime();
  return `, con plazo ${vencido ? "vencido el" : "hasta el"} ${formatFecha(venceAt)}`;
}

export default async function ImprimirActaPage({ params, searchParams }: ImprimirActaProps) {
  await requerirStaff();
  const { id } = await params;
  const sp = await searchParams;
  const datos = await obtenerActa(id);
  if (!datos) notFound();

  const seleccion = valorPermitido(sp.ejemplar, EJEMPLARES) ?? "ambos";
  const ejemplares = ejemplaresDe(seleccion);

  return (
    <>
      <BarraImpresion volverHref={`/gestion/actas/${id}`} volverTexto="Volver al acta">
        <SelectorEjemplar ruta={`/imprimir/acta/${id}`} actual={seleccion} />
      </BarraImpresion>
      <div className="flex flex-col gap-8 print:gap-0">
        {ejemplares.map((e, i) => (
          <HojaActa key={e} datos={datos} ejemplar={e} saltoDePagina={i < ejemplares.length - 1} />
        ))}
      </div>
    </>
  );
}

function HojaActa({ datos, ejemplar, saltoDePagina }: { datos: DatosActa; ejemplar: Ejemplar; saltoDePagina: boolean }) {
  const { acta: a, infractor, notificacion, inspeccion } = datos;
  const numero = a.numero ?? "—";
  const est = infractor.establecimiento;
  const emp = infractor.empresa;
  const lugar = est?.domicilio ?? emp?.domicilio_oficina ?? "……………………………………………";

  const filasInfractor: { etiqueta: string; valor: React.ReactNode; span: string }[] = [];
  if (est) {
    filasInfractor.push(
      { etiqueta: "Establecimiento", valor: est.nombre, span: "col-span-6" },
      { etiqueta: "Nombre de fantasía", valor: est.nombre_fantasia, span: "col-span-3" },
      { etiqueta: "CUIT", valor: est.cuit, span: "col-span-3" },
      { etiqueta: "Domicilio", valor: [est.domicilio, est.barrio].filter(Boolean).join(" · "), span: "col-span-8" },
      { etiqueta: "Rubro", valor: est.rubro, span: "col-span-4" },
    );
  }
  if (emp) {
    filasInfractor.push(
      { etiqueta: "Empresa prestadora", valor: emp.nombre_comercial, span: "col-span-6" },
      { etiqueta: "CUIT", valor: emp.cuit, span: "col-span-3" },
      { etiqueta: "Registro municipal", valor: emp.numero_registro ? `N.º ${emp.numero_registro}` : "No inscripta", span: "col-span-3" },
    );
  }

  return (
    <HojaImpresion
      titulo={`ACTA DE INFRACCIÓN N.º ${numero}`}
      subtitulo={
        <span>
          Código de Faltas, Ord. N.º 758/82 ·{" "}
          {ejemplar === "original" ? "Ejemplar para el Tribunal Municipal de Faltas" : "Ejemplar para el presunto infractor"}
        </span>
      }
      lateral={<SelloEjemplar ejemplar={ejemplar} detalle={a.estado ? `Estado: ${ESTADO_ACTA[a.estado].label}` : undefined} />}
      pie={
        <span>
          Acta N.º {numero} · {ejemplar === "original" ? "ORIGINAL" : "DUPLICADO"} · Art. 2.º Ord. N.º 2681/98 (t.o. Ord. N.º
          3737/06): las infracciones son sancionadas por el Tribunal Municipal de Faltas.
        </span>
      }
      saltoDePagina={saltoDePagina}
    >
      {a.estado === "anulada" ? <MarcaDeAgua texto="ANULADA" /> : null}

      <p className="text-justify">
        En la ciudad de San Miguel de Tucumán, {fechaEnLetras(a.fecha)}, siendo las{" "}
        <strong>{a.fecha ? formatHora(a.fecha) : "……:……"}</strong> horas, quien suscribe,{" "}
        <strong>{a.inspector_nombre ?? "……………………………………"}</strong>, inspector/a de la {APP.direccion} de la {APP.municipio}, se
        constituye en <strong>{lugar}</strong> y labra la presente acta de infracción al presunto infractor que se identifica a
        continuación:
      </p>

      {filasInfractor.length > 0 ? (
        <dl className="mt-3 grid grid-cols-12 gap-px overflow-hidden rounded-md border border-noche-300 bg-noche-300 text-[12.5px]">
          {filasInfractor.map((d, i) => (
            <div key={`${d.etiqueta}-${i}`} className={`${d.span} bg-white px-2.5 py-1.5`}>
              <dt className="text-[9.5px] font-semibold tracking-wide text-noche-500 uppercase">{d.etiqueta}</dt>
              <dd className="min-h-[1.25em] font-medium text-noche-950">{d.valor || " "}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        <p>
          <span className="text-[11px] font-semibold tracking-wide text-noche-600 uppercase">Motivo: </span>
          <strong>{a.motivo ? MOTIVO_ACTA[a.motivo].label : "—"}</strong>
        </p>
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-noche-600 uppercase">Hechos constatados</p>
          <p className="mt-1 rounded-md border border-noche-200 bg-noche-50/40 px-3 py-2 text-justify whitespace-pre-line">
            {a.descripcion}
          </p>
        </div>
        <p>
          <span className="text-[11px] font-semibold tracking-wide text-noche-600 uppercase">Normativa infringida: </span>
          {a.normativa ?? "Código de Faltas, Ord. N.º 758/82"}
        </p>
        {notificacion || inspeccion ? (
          <p className="text-[12px] text-noche-700">
            <span className="text-[11px] font-semibold tracking-wide text-noche-600 uppercase">Antecedentes: </span>
            {notificacion
              ? `Notificación N.º ${notificacion.numero ?? ""}${notificacion.notificada_at ? `, notificada el ${formatFecha(notificacion.notificada_at)}` : ""}${notificacion.persona_notificada ? ` a ${notificacion.persona_notificada}` : ""}${plazoNotificacion(notificacion.vence_at, a.fecha)}.`
              : null}
            {notificacion && inspeccion ? " " : null}
            {inspeccion ? `Inspección ${inspeccion.codigo ?? ""} del ${formatFecha(inspeccion.realizada_at ?? inspeccion.fecha_programada)}.` : null}
          </p>
        ) : null}
        <p className="text-justify">
          Se hace saber al presunto infractor que la presente acta será elevada al Tribunal Municipal de Faltas, ante el cual
          podrá ejercer su derecho de defensa en la forma y en los plazos que este establezca. Leída que le fue, se firma al pie
          y se entrega el duplicado.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-[11.5px] text-noche-700">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block size-3.5 rounded-[3px] border border-noche-500" /> Se negó a firmar
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block size-3.5 rounded-[3px] border border-noche-500" /> Responsable ausente
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block size-3.5 rounded-[3px] border border-noche-500" /> Se entregó el duplicado
        </span>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-10">
        <div className="flex flex-col">
          <Firma titulo="Presunto infractor o responsable" />
          <p className="mt-2 flex items-end gap-2 text-[11px]">
            <span className="shrink-0 text-noche-600">Aclaración:</span>
            <Renglon />
          </p>
          <p className="mt-1.5 flex items-end gap-2 text-[11px]">
            <span className="shrink-0 text-noche-600">DNI:</span>
            <Renglon />
          </p>
          <p className="mt-1.5 flex items-end gap-2 text-[11px]">
            <span className="shrink-0 text-noche-600">Carácter:</span>
            <Renglon />
          </p>
        </div>
        <div className="flex flex-col">
          <Firma titulo="Firma y sello del inspector/a" detalle={a.inspector_nombre ?? undefined} />
          <div className="mt-6">
            <Firma titulo="Testigo (si corresponde)" detalle="Aclaración y DNI" />
          </div>
        </div>
      </div>
    </HojaImpresion>
  );
}
