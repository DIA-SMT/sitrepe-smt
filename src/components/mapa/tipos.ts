/**
 * Tipos y constantes del mapa de fiscalización (sin dependencias de Leaflet:
 * se pueden importar desde Server Components).
 */

/** Estado con el que se colorea cada marcador. */
export type EstadoPunto = "vencido" | "sin_certificado" | "por_vencer" | "vigente" | "info";

/** Orden de la leyenda. */
export const ESTADOS_PUNTO: readonly EstadoPunto[] = ["vencido", "sin_certificado", "por_vencer", "vigente", "info"];

export type PuntoMapa = {
  id: string;
  lat: number;
  lng: number;
  titulo: string;
  /** Domicilio u otra línea secundaria. */
  subtitulo?: string | null;
  estado: EstadoPunto;
  /** Texto del estado en el popup (por defecto, la etiqueta del estado). */
  estadoTexto?: string | null;
  /** Línea extra del popup (p. ej. vencimiento o empresa). */
  detalle?: string | null;
  /** Enlace del popup (ficha del establecimiento, inspección, etc.). */
  href?: string | null;
  hrefTexto?: string | null;
};

/** Centro de San Miguel de Tucumán (plaza Independencia). */
export const CENTRO_SMT: [number, number] = [-26.8241, -65.2226];
export const ZOOM_SMT = 13;

export const ESTILO_PUNTO: Record<EstadoPunto, { relleno: string; borde: string; label: string }> = {
  vencido: { relleno: "#dc2626", borde: "#7f1d1d", label: "Vencido" },
  sin_certificado: { relleno: "#7c3aed", borde: "#4c1d95", label: "Sin certificado" },
  por_vencer: { relleno: "#f59e0b", borde: "#92400e", label: "Por vencer" },
  vigente: { relleno: "#10b981", borde: "#065f46", label: "Al día" },
  info: { relleno: "#0066ff", borde: "#0c2055", label: "Servicio declarado" },
};

/** De menor a mayor gravedad. */
const GRAVEDAD = ["vigente", "por_vencer", "sin_certificado", "vencido"] as const;

/**
 * Estado más grave entre las obligaciones de un establecimiento
 * (fumigación y tanques). "no_aplica" y valores nulos no cuentan.
 */
export function peorEstado(...estados: (string | null | undefined)[]): EstadoPunto {
  let indice = 0;
  for (const e of estados) {
    const i = GRAVEDAD.findIndex((g) => g === e);
    if (i > indice) indice = i;
  }
  return GRAVEDAD[indice];
}

/** ¿Las coordenadas son utilizables? */
export function tieneCoordenadas<T extends { lat: number | null; lng: number | null }>(
  p: T,
): p is T & { lat: number; lng: number } {
  return typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng);
}
