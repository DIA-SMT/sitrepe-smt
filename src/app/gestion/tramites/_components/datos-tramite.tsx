import { ArrowRight, MessageSquareReply } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue, type KeyValueItem } from "@/components/shared/key-value";
import { type ContextoTramite, respuestasTramite } from "@/lib/data/empresas";
import { ESTADO_MEMORIA, ESTADO_TECNICO } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora } from "@/lib/domain/formato";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Claves de `tramites.datos` según quién arma cada trámite:
 * - inscripción: solicitar_inscripcion (módulo cuenta)
 * - renovación, cambio de domicilio y de asesor: módulo legajo del prestador
 * - alta de producto: módulo productos del prestador
 * - respuestas a observaciones: `respuestas` (módulo trámites del prestador)
 */
const ETIQUETAS: Record<string, string> = {
  nombre_comercial: "Nombre comercial",
  titular: "Titular o razón social",
  tipo_persona: "Tipo de persona",
  cuit: "CUIT",
  email: "Correo electrónico",
  telefono: "Teléfono",
  domicilio_oficina: "Domicilio de oficina",
  domicilio_deposito: "Depósito de químicos",
  habilitacion_comercial: "Habilitación comercial",
  habilita_fumigacion: "Fumigación y desinfección",
  habilita_tanques: "Limpieza de tanques",
  deposito_exclusivo: "Depósito exclusivo para químicos",
  declaracion_ordenanza_2681: "Declaración jurada (Ord. 2681/98)",
  anio: "Año declarado",
  categoria: "Categoría",
  libre_deuda: "Libre deuda",
  libre_deuda_declarado: "Libre deuda declarado",
  tecnico_id: "Asesor técnico propuesto",
  tecnico_baja_id: "Asesor que se reemplaza",
  es_representante: "Representante técnico",
  empresa_producto_id: "Producto propuesto",
  producto_nombre: "Producto",
  registro: "Registro del producto",
  motivo: "Motivo",
  fecha_baja: "Fecha de baja",
  observaciones: "Observaciones de la empresa",
  tecnico: "Asesor técnico",
};

/** Orden de presentación de las claves conocidas por tipo de trámite. */
const ORDEN: Record<string, string[]> = {
  inscripcion: [
    "nombre_comercial",
    "titular",
    "tipo_persona",
    "cuit",
    "email",
    "telefono",
    "domicilio_oficina",
    "domicilio_deposito",
    "deposito_exclusivo",
    "habilitacion_comercial",
    "habilita_fumigacion",
    "habilita_tanques",
    "tecnico",
    "declaracion_ordenanza_2681",
    "observaciones",
  ],
  renovacion: ["anio", "categoria", "libre_deuda"],
  cambio_tecnico: ["tecnico_id", "es_representante", "tecnico_baja_id", "motivo"],
  cambio_domicilio: ["domicilio_oficina", "domicilio_deposito", "motivo", "libre_deuda_declarado"],
  alta_producto: ["empresa_producto_id", "producto_nombre", "registro"],
  baja: ["motivo", "fecha_baja"],
};

/**
 * Claves que no se muestran como texto: ids ya resueltos, copias de datos que se muestran con la
 * referencia (nombre y DNI del técnico, domicilios anteriores), el historial de respuestas (va aparte)
 * y marcas internas del prestador.
 */
const OCULTAS = new Set([
  "producto_id",
  "tecnico_nombre",
  "tecnico_dni",
  "tecnico_baja_nombre",
  "domicilio_oficina_anterior",
  "domicilio_deposito_anterior",
  "respuestas",
  "desistido",
  "desistido_at",
]);

const etiquetaDe = (clave: string) => ETIQUETAS[clave] ?? clave.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const textoDe = (v: Json | undefined) => (typeof v === "string" && v.trim() ? v : null);

function textoValor(clave: string, valor: Json | undefined): React.ReactNode {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "boolean") {
    if (clave === "habilita_fumigacion" || clave === "habilita_tanques") return valor ? "Solicita habilitación" : "No solicita";
    if (clave === "declaracion_ordenanza_2681") return valor ? "Aceptada" : "No aceptada";
    return valor ? "Sí" : "No";
  }
  if (clave === "tipo_persona") return valor === "juridica" ? "Persona jurídica" : "Persona humana";
  if (typeof valor === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return formatFecha(valor);
    if (/^\d{4}-\d{2}-\d{2}T/.test(valor)) return formatFechaHora(valor);
    return <span className="whitespace-pre-line">{valor}</span>;
  }
  if (typeof valor === "number") return String(valor);
  if (Array.isArray(valor)) {
    return valor.every((v) => typeof v !== "object" || v === null)
      ? valor.map((v) => String(v ?? "—")).join(", ")
      : `${valor.length} elemento${valor.length === 1 ? "" : "s"}`;
  }
  // Objeto anidado (p. ej. datos del técnico propuesto en la inscripción).
  const entradas = Object.entries(valor).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entradas.length === 0) return null;
  return (
    <ul className="flex flex-col gap-0.5 font-normal">
      {entradas.map(([k, v]) => (
        <li key={k}>
          <span className="text-muted-foreground">{etiquetaDe(k)}: </span>
          {typeof v === "object" ? JSON.stringify(v) : textoValor(k, v)}
        </li>
      ))}
    </ul>
  );
}

/** Datos presentados por la empresa, formateados según el tipo de trámite. */
export function DatosTramite({ contexto }: { contexto: ContextoTramite }) {
  const { tramite, datos, referencias, empresa } = contexto;
  const tipo = tramite.tipo ?? "inscripcion";
  const orden = ORDEN[tipo] ?? [];
  const claves = [...orden.filter((k) => k in datos), ...Object.keys(datos).filter((k) => !orden.includes(k))].filter(
    (k) => !OCULTAS.has(k),
  );
  const respuestas = respuestasTramite(datos);

  const items: KeyValueItem[] = [];
  for (const clave of claves) {
    const valor = datos[clave];

    if (clave === "tecnico_id" || clave === "tecnico_baja_id") {
      const t = clave === "tecnico_id" ? referencias.tecnico : referencias.tecnicoBaja;
      // Si el registro ya no existe, se muestra lo que informó la empresa.
      const nombreInformado = textoDe(datos[clave === "tecnico_id" ? "tecnico_nombre" : "tecnico_baja_nombre"]);
      if (!t && !valor) continue;
      items.push({
        label: etiquetaDe(clave),
        value: t ? (
          <span className="flex flex-col gap-1">
            <span>
              {t.nombre} {t.apellido} · DNI {t.dni}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {t.titulo}
              {t.matricula ? ` · Mat. ${t.matricula}` : ""}
            </span>
            <EstadoBadge mapa={ESTADO_TECNICO} valor={t.estado} size="sm" />
          </span>
        ) : (
          <span className="text-muted-foreground">
            {nombreInformado ? `${nombreInformado} (no figura en el legajo)` : "No se encontró el asesor indicado"}
          </span>
        ),
        full: true,
      });
      continue;
    }

    if (clave === "empresa_producto_id") {
      const m = referencias.memoria;
      const p = referencias.producto;
      items.push({
        label: etiquetaDe(clave),
        value: m ? (
          <span className="flex flex-col gap-1">
            <span>{m.producto_nombre}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {m.principio_activo} · {m.organismo} {m.registro_numero}
              {m.dosis ? ` · Dosis: ${m.dosis}` : ""}
              {m.concentracion_uso ? ` · Concentración: ${m.concentracion_uso}` : ""}
            </span>
            <EstadoBadge mapa={ESTADO_MEMORIA} valor={m.estado} size="sm" />
          </span>
        ) : p ? (
          <span className="flex flex-col gap-1">
            <span>{p.nombre_comercial}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {p.principio_activo} · {p.organismo} {p.registro_numero} · la propuesta ya no está en la memoria técnica
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">No se encontró el producto en la memoria técnica</span>
        ),
        full: true,
      });
      continue;
    }

    // Con la referencia resuelta, el nombre y el registro informados son redundantes.
    if ((clave === "producto_nombre" || clave === "registro") && (referencias.memoria || referencias.producto)) continue;

    if (tipo === "cambio_domicilio" && (clave === "domicilio_oficina" || clave === "domicilio_deposito")) {
      // El domicilio anterior lo guarda la empresa al presentar; si falta, se compara con el actual del legajo.
      const anterior = textoDe(datos[`${clave}_anterior`]) ?? (tramite.estado === "aprobado" ? null : (empresa?.[clave] ?? null));
      const nuevo = textoDe(valor);
      items.push({
        label: etiquetaDe(clave),
        value: nuevo ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {anterior && anterior !== nuevo ? (
              <>
                <span className="text-muted-foreground line-through decoration-noche-300">{anterior}</span>
                <ArrowRight className="size-3.5 text-noche-300" aria-hidden />
                <span className="sr-only">pasa a</span>
              </>
            ) : null}
            <span>{nuevo}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Sin cambios</span>
        ),
        full: true,
      });
      continue;
    }

    const texto = textoValor(clave, valor);
    if (texto === null) continue;
    items.push({
      label: etiquetaDe(clave),
      value: texto,
      full: (typeof valor === "object" && valor !== null) || clave === "motivo" || clave === "observaciones",
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          El trámite no incluye datos adicionales: se resuelve con el legajo de la empresa.
        </p>
      ) : (
        <KeyValue columns={2} items={items} />
      )}

      {respuestas.length > 0 ? (
        <div className="flex flex-col gap-2.5 border-t border-border pt-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareReply className="size-4 text-azul-600" aria-hidden />
            Respuestas de la empresa a las observaciones
          </p>
          <ol className="flex flex-col gap-2.5">
            {respuestas.map((r, i) => (
              <li key={`${r.fecha}-${i}`} className="rounded-xl bg-subtle px-3.5 py-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  <time dateTime={r.fecha}>{formatFechaHora(r.fecha)}</time>
                </p>
                {r.observacion ? (
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    <span className="font-medium text-foreground">Observación: </span>
                    {r.observacion}
                  </p>
                ) : null}
                <p className="mt-1 whitespace-pre-line text-foreground">{r.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
