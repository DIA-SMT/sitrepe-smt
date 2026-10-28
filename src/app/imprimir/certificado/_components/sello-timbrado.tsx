import { formatFecha, formatHora } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

const TINTA = "#0e3da5"; // azul-800: tinta del sello institucional

type SelloTimbradoProps = {
  /** Código del sellado digital (SA-AAAA-NNNNNN). */
  codigo: string;
  /** Fecha y hora del timbrado. */
  fecha: string | null;
  /** Diámetro en px. */
  tamanio?: number;
  /** Sufijo para que los ids de los trazados no se repitan si hay varios sellos en la página. */
  idUnico: string;
  className?: string;
};

/**
 * Sello de timbrado dibujado como un sello institucional (doble aro, leyenda
 * circular y código al centro). Es la marca de validez del certificado (Art. 9.º b).
 */
export function SelloTimbrado({ codigo, fecha, tamanio = 132, idUnico, className }: SelloTimbradoProps) {
  const id = `sello-${idUnico.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      role="img"
      aria-label={`Sello de timbrado ${codigo}${fecha ? ` del ${formatFecha(fecha)}` : ""}`}
      viewBox="0 0 200 200"
      width={tamanio}
      height={tamanio}
      className={cn("shrink-0 -rotate-[8deg] select-none", className)}
    >
      <defs>
        <path id={`${id}-arriba`} d="M28,100 A72,72 0 0,1 172,100" />
        <path id={`${id}-abajo`} d="M17,100 A83,83 0 0,0 183,100" />
      </defs>
      <g fill="none" stroke={TINTA} opacity={0.92}>
        <circle cx="100" cy="100" r="95" strokeWidth="3.5" />
        <circle cx="100" cy="100" r="89" strokeWidth="1" />
        <circle cx="100" cy="100" r="64" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="60" strokeWidth="0.6" strokeDasharray="1.5 2.5" />
      </g>
      <g fill={TINTA} opacity={0.92} fontFamily="var(--font-poppins), Poppins, var(--font-inter), sans-serif">
        <text fontSize="10.5" fontWeight="700" letterSpacing="0.6">
          <textPath href={`#${id}-arriba`} startOffset="50%" textAnchor="middle" textLength="204" lengthAdjust="spacingAndGlyphs">
            MUNICIPALIDAD DE SAN MIGUEL DE TUCUMÁN
          </textPath>
        </text>
        <text fontSize="10.5" fontWeight="700" letterSpacing="0.6">
          <textPath href={`#${id}-abajo`} startOffset="50%" textAnchor="middle" textLength="176" lengthAdjust="spacingAndGlyphs">
            DIRECCIÓN DE SALUD AMBIENTAL
          </textPath>
        </text>
        <circle cx="22" cy="100" r="2.6" />
        <circle cx="178" cy="100" r="2.6" />
        <text x="100" y="79" fontSize="7.5" fontWeight="600" letterSpacing="1.6" textAnchor="middle">
          SELLADO DIGITAL
        </text>
        <text x="100" y="99" fontSize="17" fontWeight="800" letterSpacing="0.8" textAnchor="middle">
          TIMBRADO
        </text>
        <rect x="52" y="105" width="96" height="1.2" />
        <text
          x="100"
          y="120"
          fontSize="10.5"
          fontWeight="700"
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        >
          {codigo}
        </text>
        {fecha ? (
          <text x="100" y="133" fontSize="8.5" fontWeight="500" textAnchor="middle">
            {formatFecha(fecha)} · {formatHora(fecha)}
          </text>
        ) : null}
      </g>
    </svg>
  );
}

/** Lugar del sello cuando el certificado todavía no fue timbrado. */
export function SelloPendiente({
  tamanio = 132,
  texto = "Pendiente de timbrado",
  className,
}: {
  tamanio?: number;
  texto?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-noche-300 p-4 text-center text-[11px] leading-tight font-semibold text-noche-400 uppercase",
        className,
      )}
      style={{ width: tamanio, height: tamanio }}
    >
      {texto}
    </div>
  );
}
