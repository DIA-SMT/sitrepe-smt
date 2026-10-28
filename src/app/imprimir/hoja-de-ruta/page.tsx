import type { Metadata } from "next";
import { BarraImpresion } from "@/components/print/barra-impresion";
import { Firma, HojaImpresion } from "@/components/print/hoja-impresion";
import { requerirStaff } from "@/lib/auth";
import {
  type FilaAgenda,
  type FilaHojaRuta,
  getAgendaServicios,
  getHojaRuta,
  getInspeccionesPorCertificado,
  type InspeccionDeServicio,
  leerFiltrosHojaRuta,
  param,
  querystringHojaRuta,
} from "@/lib/data/fiscalizacion";
import { ESTADO_OBLIGACION, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatFechaLarga, formatHora, hoyISO } from "@/lib/domain/formato";

export const metadata: Metadata = { title: "Hoja de ruta" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Agrupa por zona y barrio, en orden alfabético (sin zona al final). */
function agrupar<T extends { zona: string | null; barrio: string | null }>(filas: T[]) {
  const zonas = new Map<string, Map<string, T[]>>();
  for (const f of filas) {
    const z = f.zona ?? "Sin zona";
    const b = f.barrio ?? "Sin barrio";
    if (!zonas.has(z)) zonas.set(z, new Map());
    const barrios = zonas.get(z);
    if (!barrios) continue;
    if (!barrios.has(b)) barrios.set(b, []);
    barrios.get(b)?.push(f);
  }
  const orden = (a: string, b: string) =>
    a.startsWith("Sin ") ? 1 : b.startsWith("Sin ") ? -1 : a.localeCompare(b, "es");
  return [...zonas.entries()]
    .sort(([a], [b]) => orden(a, b))
    .map(([zona, barrios]) => ({
      zona,
      barrios: [...barrios.entries()].sort(([a], [b]) => orden(a, b)).map(([barrio, items]) => ({ barrio, items })),
    }));
}

const casilla = <span aria-hidden className="inline-block size-3.5 rounded-[3px] border border-noche-500 align-middle" />;

export default async function ImprimirHojaDeRutaPage({ searchParams }: Props) {
  const sesion = await requerirStaff();
  const sp = await searchParams;
  const esAgenda = param(sp.vista) === "agenda";
  const filtros = leerFiltrosHojaRuta(sp);
  const inspector = `${sesion.perfil.nombre} ${sesion.perfil.apellido}`.trim();

  const descripcionFiltros = [
    filtros.zona ? `Zona ${filtros.zona}` : null,
    filtros.barrio ? `Barrio ${filtros.barrio}` : null,
    filtros.estado ? etiqueta(ESTADO_OBLIGACION, filtros.estado).label : null,
    filtros.obligacion === "fumigacion" ? "Fumigación" : filtros.obligacion === "tanque" ? "Limpieza de tanques" : null,
    filtros.q ? `“${filtros.q}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const encabezadoInspector = (
    <div className="flex flex-col gap-1.5 rounded-lg border border-noche-200 px-3 py-2 text-[11px] text-noche-700">
      <p>
        Inspector/a: <span className="font-semibold text-noche-900">{inspector || "______________________"}</span>
      </p>
      <p>Fecha de salida: ____ / ____ / ________</p>
      <p>Vehículo / O.T.: ____________________</p>
    </div>
  );

  if (esAgenda) {
    const servicios = await getAgendaServicios({ zona: filtros.zona, barrio: filtros.barrio });
    const inspecciones = await getInspeccionesPorCertificado(servicios.flatMap((s) => (s.id ? [s.id] : [])));
    const grupos = agrupar(servicios);
    const volver = `/gestion/hoja-de-ruta/agenda${querystringHojaRuta({ zona: filtros.zona, barrio: filtros.barrio })}`;
    return (
      <>
        <BarraImpresion volverHref={volver} volverTexto="Volver a la agenda" />
        <HojaImpresion
          titulo="Agenda de servicios para inspección por muestreo"
          subtitulo={
            <>
              Servicios declarados para hoy y mañana ({formatFechaLarga(hoyISO())}) · Art. 10.º b, Ord. 2681/98
              {descripcionFiltros ? ` · ${descripcionFiltros}` : ""}
            </>
          }
          lateral={encabezadoInspector}
          pie={`Generado el ${formatFechaHora(new Date())} · ${servicios.length} servicios`}
        >
          {servicios.length === 0 ? (
            <p className="rounded-lg border border-dashed border-noche-300 p-6 text-center text-noche-600">
              No hay servicios declarados para hoy ni para mañana con esos filtros.
            </p>
          ) : (
            grupos.map((g) => (
              <section key={g.zona} className="mb-5">
                <h2 className="mb-2 border-b border-noche-300 pb-1 font-display text-sm font-bold text-noche-900">
                  Zona {g.zona}
                </h2>
                {g.barrios.map((b) => (
                  <TablaAgenda key={b.barrio} barrio={b.barrio} items={b.items} inspecciones={inspecciones} />
                ))}
              </section>
            ))
          )}
          <Firmas />
        </HojaImpresion>
      </>
    );
  }

  const { filas, total } = await getHojaRuta(filtros);
  const grupos = agrupar(filas);
  const conteo = {
    vencidos: filas.filter((f) => f.prioridad === 1).length,
    sinCertificado: filas.filter((f) => f.prioridad === 2).length,
    porVencer: filas.filter((f) => f.prioridad === 3).length,
  };
  // Numeración correlativa en el orden impreso (zona → barrio → prioridad).
  const numeros = new Map<FilaHojaRuta, number>();
  for (const g of grupos) for (const b of g.barrios) for (const f of b.items) numeros.set(f, numeros.size + 1);

  return (
    <>
      <BarraImpresion volverHref={`/gestion/hoja-de-ruta${querystringHojaRuta(filtros)}`} volverTexto="Volver a la hoja de ruta" />
      <HojaImpresion
        titulo="Hoja de ruta de fiscalización"
        subtitulo={
          <>
            Establecimientos con certificados vencidos, sin presentar o por vencer · Ord. 2681/98 y Ord. 2004/92
            {descripcionFiltros ? ` · ${descripcionFiltros}` : ""}
          </>
        }
        lateral={encabezadoInspector}
        pie={`Generado el ${formatFechaHora(new Date())}${total > filas.length ? ` · Se muestran ${filas.length} de ${total}` : ""}`}
      >
        <div className="mb-4 grid grid-cols-4 gap-2 text-center text-[11px]">
          <Resumen titulo="Establecimientos" valor={filas.length} />
          <Resumen titulo="Vencidos" valor={conteo.vencidos} />
          <Resumen titulo="Sin certificado" valor={conteo.sinCertificado} />
          <Resumen titulo="Por vencer" valor={conteo.porVencer} />
        </div>
        <p className="mb-4 text-[11px] text-noche-600">
          Referencias: <strong>V</strong> visitado · <strong>E</strong> exhibe certificado vigente · <strong>N</strong>{" "}
          se notificó · <strong>A</strong> se labró acta. Anotá en observaciones la persona que atendió y su DNI.
        </p>

        {filas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-noche-300 p-6 text-center text-noche-600">
            No hay establecimientos para controlar con esos filtros.
          </p>
        ) : (
          grupos.map((g) => (
            <section key={g.zona} className="mb-5">
              <h2 className="mb-2 border-b border-noche-300 pb-1 font-display text-sm font-bold text-noche-900">
                Zona {g.zona}
              </h2>
              {g.barrios.map((b) => (
                <div key={b.barrio} className="mb-4 break-inside-avoid-page">
                  <h3 className="mb-1 text-[11px] font-semibold tracking-wide text-azul-700 uppercase">
                    {b.barrio} · {b.items.length}
                  </h3>
                  <table className="w-full border-collapse text-[10.5px] leading-snug">
                    <thead>
                      <tr className="bg-noche-50 text-left text-[9.5px] tracking-wide text-noche-600 uppercase">
                        <th className="border border-noche-200 px-1.5 py-1 font-semibold">N.º</th>
                        <th className="border border-noche-200 px-1.5 py-1 font-semibold">Establecimiento</th>
                        <th className="border border-noche-200 px-1.5 py-1 font-semibold">Fumigación</th>
                        <th className="border border-noche-200 px-1.5 py-1 font-semibold">Tanques</th>
                        <th className="border border-noche-200 px-1 py-1 text-center font-semibold">V</th>
                        <th className="border border-noche-200 px-1 py-1 text-center font-semibold">E</th>
                        <th className="border border-noche-200 px-1 py-1 text-center font-semibold">N</th>
                        <th className="border border-noche-200 px-1 py-1 text-center font-semibold">A</th>
                        <th className="w-[28%] border border-noche-200 px-1.5 py-1 font-semibold">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.items.map((f, i) => (
                        <FilaImpresion key={f.id ?? i} numero={numeros.get(f) ?? i + 1} fila={f} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          ))
        )}
        <Firmas />
      </HojaImpresion>
    </>
  );
}

function Resumen({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-noche-200 px-2 py-1.5">
      <p className="font-display text-lg leading-none font-bold text-noche-900">{valor}</p>
      <p className="mt-0.5 text-noche-600">{titulo}</p>
    </div>
  );
}

function celdaObligacion(estado: string | null, vencimiento: string | null, empresa: string | null) {
  if (estado === "no_aplica") return <span className="text-noche-400">No aplica</span>;
  return (
    <>
      <span className={estado === "vencido" ? "font-semibold text-red-700" : "font-medium"}>
        {etiqueta(ESTADO_OBLIGACION, estado ?? "sin_certificado").label}
      </span>
      {vencimiento ? <span className="block text-noche-600">Vto. {formatFecha(vencimiento)}</span> : null}
      {empresa ? <span className="block text-noche-500">{empresa}</span> : null}
    </>
  );
}

function FilaImpresion({ numero, fila: f }: { numero: number; fila: FilaHojaRuta }) {
  return (
    <tr className="break-inside-avoid align-top">
      <td className="border border-noche-200 px-1.5 py-1.5 text-noche-500 nums-tabular">{numero}</td>
      <td className="border border-noche-200 px-1.5 py-1.5">
        <span className="font-semibold text-noche-900">{f.nombre}</span>
        <span className="block">{f.domicilio}</span>
        <span className="block text-noche-500">
          {f.rubro_nombre ?? "Sin rubro"}
          {f.telefono ? ` · Tel. ${f.telefono}` : ""}
        </span>
      </td>
      <td className="border border-noche-200 px-1.5 py-1.5">
        {celdaObligacion(f.estado_fumigacion, f.fumigacion_vencimiento, f.fumigacion_empresa)}
      </td>
      <td className="border border-noche-200 px-1.5 py-1.5">
        {celdaObligacion(f.estado_tanque, f.tanque_vencimiento, f.tanque_empresa)}
      </td>
      <td className="border border-noche-200 px-1 py-1.5 text-center">{casilla}</td>
      <td className="border border-noche-200 px-1 py-1.5 text-center">{casilla}</td>
      <td className="border border-noche-200 px-1 py-1.5 text-center">{casilla}</td>
      <td className="border border-noche-200 px-1 py-1.5 text-center">{casilla}</td>
      <td className="border border-noche-200 px-1.5 py-1.5" />
    </tr>
  );
}

function TablaAgenda({
  barrio,
  items,
  inspecciones,
}: {
  barrio: string;
  items: FilaAgenda[];
  inspecciones: Map<string, InspeccionDeServicio>;
}) {
  return (
    <div className="mb-4 break-inside-avoid-page">
      <h3 className="mb-1 text-[11px] font-semibold tracking-wide text-azul-700 uppercase">
        {barrio} · {items.length}
      </h3>
      <table className="w-full border-collapse text-[10.5px] leading-snug">
        <thead>
          <tr className="bg-noche-50 text-left text-[9.5px] tracking-wide text-noche-600 uppercase">
            <th className="border border-noche-200 px-1.5 py-1 font-semibold">Día y hora</th>
            <th className="border border-noche-200 px-1.5 py-1 font-semibold">Cliente y domicilio</th>
            <th className="border border-noche-200 px-1.5 py-1 font-semibold">Empresa · técnico</th>
            <th className="border border-noche-200 px-1 py-1 text-center font-semibold">Insp.</th>
            <th className="w-[30%] border border-noche-200 px-1.5 py-1 font-semibold">Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => (
            <tr key={s.id ?? i} className="break-inside-avoid align-top">
              <td className="border border-noche-200 px-1.5 py-1.5 whitespace-nowrap nums-tabular">
                {s.fecha_servicio ? formatFecha(s.fecha_servicio) : "—"}
                <span className="block font-semibold">{s.fecha_servicio ? `${formatHora(s.fecha_servicio)} h` : ""}</span>
              </td>
              <td className="border border-noche-200 px-1.5 py-1.5">
                <span className="font-semibold text-noche-900">{s.cliente}</span>
                <span className="block">{s.domicilio}</span>
                <span className="block text-noche-500">
                  {s.tipo === "tanque" ? "Limpieza de tanques" : "Fumigación"} · Cert. N.º {s.numero}
                  {s.rubro_nombre ? ` · ${s.rubro_nombre}` : ""}
                </span>
              </td>
              <td className="border border-noche-200 px-1.5 py-1.5">
                {s.empresa_nombre}
                <span className="block text-noche-500">{s.tecnico_nombre}</span>
              </td>
              <td className="border border-noche-200 px-1 py-1.5 text-center">
                {(() => {
                  const insp = s.id ? inspecciones.get(s.id) : undefined;
                  if (insp?.estado === "realizada") return <span className="font-semibold text-emerald-700">✓</span>;
                  if (insp?.estado === "programada") return <span className="text-[9px] font-semibold text-azul-700">Prog.</span>;
                  return casilla;
                })()}
              </td>
              <td className="border border-noche-200 px-1.5 py-1.5" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Firmas() {
  return (
    <div className="mt-8 flex flex-wrap justify-around gap-8 break-inside-avoid">
      <Firma titulo="Firma del inspector/a" detalle="Aclaración y legajo" />
      <Firma titulo="Jefatura de Control" detalle="Dirección de Salud Ambiental" />
    </div>
  );
}
