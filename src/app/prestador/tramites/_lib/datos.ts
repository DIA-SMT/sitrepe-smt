import type { Enums, Json } from "@/lib/supabase/database.types";

/** Lectura segura del jsonb `tramites.datos` (cada tipo de trámite guarda claves distintas). */

export type DatosLeidos = { [clave: string]: Json | undefined };

export function leerDatos(datos: Json | null | undefined): DatosLeidos {
  if (datos !== null && typeof datos === "object" && !Array.isArray(datos)) return datos;
  return {};
}

export function texto(datos: DatosLeidos, clave: string): string | null {
  const v = datos[clave];
  if (typeof v === "string") return v.trim() ? v.trim() : null;
  if (typeof v === "number") return String(v);
  return null;
}

export function numero(datos: DatosLeidos, clave: string): number | null {
  const v = datos[clave];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function booleano(datos: DatosLeidos, clave: string): boolean | null {
  const v = datos[clave];
  return typeof v === "boolean" ? v : null;
}

/** Respuesta de la empresa a una observación de la Dirección (historial en `datos.respuestas`). */
export type RespuestaTramite = { fecha: string; texto: string; observacion: string | null };

export function respuestas(datos: DatosLeidos): RespuestaTramite[] {
  const lista = datos.respuestas;
  if (!Array.isArray(lista)) return [];
  const salida: RespuestaTramite[] = [];
  for (const item of lista) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const fecha = typeof item.fecha === "string" ? item.fecha : null;
    const textoRespuesta = typeof item.texto === "string" ? item.texto : null;
    if (!fecha || !textoRespuesta) continue;
    salida.push({ fecha, texto: textoRespuesta, observacion: typeof item.observacion === "string" ? item.observacion : null });
  }
  return salida;
}

/** Resumen de una línea del contenido de un trámite, para listados. */
export function resumenTramite(tipo: Enums<"tipo_tramite"> | null, datosCrudos: Json | null): string {
  const d = leerDatos(datosCrudos);
  switch (tipo) {
    case "inscripcion":
      return texto(d, "nombre_comercial") ? `Inscripción de ${texto(d, "nombre_comercial")}` : "Solicitud de inscripción";
    case "renovacion": {
      const anio = numero(d, "anio");
      const categoria = texto(d, "categoria");
      return [anio ? `DDJJ ${anio}` : "DDJJ anual", categoria ? `categoría ${categoria}` : null].filter(Boolean).join(" · ");
    }
    case "cambio_tecnico": {
      const nombre = texto(d, "tecnico_nombre");
      const reemplaza = texto(d, "tecnico_baja_nombre");
      return [nombre ? `Alta de ${nombre}` : "Alta de asesor técnico", reemplaza ? `reemplaza a ${reemplaza}` : null]
        .filter(Boolean)
        .join(" · ");
    }
    case "cambio_domicilio": {
      const partes = [
        texto(d, "domicilio_oficina") ? `Oficina: ${texto(d, "domicilio_oficina")}` : null,
        texto(d, "domicilio_deposito") ? `Depósito: ${texto(d, "domicilio_deposito")}` : null,
      ].filter(Boolean);
      return partes.length ? partes.join(" · ") : "Cambio de domicilio";
    }
    case "alta_producto":
      return texto(d, "producto_nombre") ?? "Alta de producto en la memoria técnica";
    case "baja":
      return "Baja del registro";
    default:
      return "—";
  }
}
