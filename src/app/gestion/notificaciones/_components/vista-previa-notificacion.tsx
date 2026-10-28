import { Eye, MapPin } from "lucide-react";
import { Isotipo } from "@/components/brand/logo";
import type { EntidadOpcion } from "@/lib/data/intimaciones";
import { TIPO_NOTIFICACION } from "@/lib/domain/etiquetas";
import { formatFechaHora } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";
import { LUGAR_PRESENTACION, PLAZO_EN_LETRAS, textoIntimacion } from "./textos";

type VistaPreviaNotificacionProps = {
  anio: number;
  tipo: Enums<"tipo_notificacion">;
  plazo: Enums<"plazo_notificacion">;
  razonSocial: string;
  rubro: string;
  cuit: string;
  domicilio: string;
  ordenTrabajo: string;
  observaciones: string;
  entidad: EntidadOpcion | null;
  vencimiento: string | null;
};

/** Mini hoja con el texto que se va a imprimir, actualizada en vivo. */
export function VistaPreviaNotificacion({
  anio,
  tipo,
  plazo,
  razonSocial,
  rubro,
  cuit,
  domicilio,
  ordenTrabajo,
  observaciones,
  entidad,
  vencimiento,
}: VistaPreviaNotificacionProps) {
  const texto = textoIntimacion(tipo, plazo);
  const vacio = <span className="text-noche-300">—</span>;

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Eye className="size-3.5" aria-hidden /> Vista previa
      </p>
      <div className="relative overflow-hidden rounded-card border border-border bg-white shadow-elevated">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-azul-600 via-celeste-400 to-sol-400" />
        <div className="flex flex-col gap-4 p-5 text-[12.5px] leading-relaxed text-noche-800">
          <div className="flex items-center justify-between gap-3 border-b border-azul-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Isotipo size={26} />
              <div className="leading-tight">
                <p className="text-[10px] font-semibold tracking-wide text-noche-500 uppercase">Salud Ambiental</p>
                <p className="font-display text-[13px] font-bold text-noche-950">NOTIFICACIÓN</p>
              </div>
            </div>
            <span className="nums-tabular rounded-md bg-noche-50 px-2 py-1 font-mono text-[11px] text-noche-600 ring-1 ring-noche-100">
              N.º {anio}-·····
            </span>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-noche-500">Razón social</dt>
            <dd className="font-semibold text-noche-950">{razonSocial || vacio}</dd>
            <dt className="text-noche-500">Rubro</dt>
            <dd>{rubro || vacio}</dd>
            <dt className="text-noche-500">CUIT</dt>
            <dd className="nums-tabular">{cuit || vacio}</dd>
            <dt className="text-noche-500">Domicilio</dt>
            <dd>{domicilio || vacio}</dd>
            {ordenTrabajo ? (
              <>
                <dt className="text-noche-500">O.T.</dt>
                <dd>{ordenTrabajo}</dd>
              </>
            ) : null}
          </dl>

          <div className="flex flex-col gap-2">
            <p>{texto.intimacion}</p>
            <ol className="list-decimal space-y-1 pl-5 marker:font-semibold marker:text-azul-600">
              {texto.documentos.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ol>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg bg-gradient-brand-soft px-3 py-2 ring-1 ring-azul-100">
            <span className="text-[11px] font-semibold tracking-wide text-azul-700 uppercase">Plazo</span>
            <span className="text-right font-semibold text-azul-900">{PLAZO_EN_LETRAS[plazo]}</span>
          </div>
          {vencimiento ? (
            <p className="-mt-2 text-right text-[11.5px] text-noche-600">Vence el {formatFechaHora(vencimiento)}</p>
          ) : null}

          {observaciones ? (
            <div className="rounded-lg border border-dashed border-noche-200 px-3 py-2">
              <p className="text-[10.5px] font-semibold tracking-wide text-noche-500 uppercase">Observaciones</p>
              <p className="whitespace-pre-line">{observaciones}</p>
            </div>
          ) : null}

          <p className="flex items-start gap-1.5 text-[11.5px] text-noche-600">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-azul-600" aria-hidden />
            <span>
              <strong className="font-semibold text-noche-800">Lugar de presentación:</strong> {LUGAR_PRESENTACION}
            </span>
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-noche-100 pt-3 text-[11px] text-noche-500">
            <span>{TIPO_NOTIFICACION[tipo].label}</span>
            <span>{entidad ? "Vinculada al padrón" : "Datos cargados a mano"}</span>
          </div>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        El número ({"{CICLO}-{TALONARIO}"}) se asigna al emitir. Se imprime en original y duplicado con la normativa
        citada y los espacios de firma.
      </p>
    </div>
  );
}
