import "server-only";
import { cache } from "react";
import { z } from "zod";
import { mensajeError } from "@/lib/acciones";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";

/**
 * Lecturas del portal público. Todas funcionan sin sesión (rol anon): usan las RPC públicas
 * (portal_*, verificar_certificado, consultar_denuncia) y las tablas con lectura anónima (noticias).
 *
 * Las RPC que devuelven jsonb llegan tipadas como `Json`: se validan con zod para obtener
 * objetos tipados sin aserciones.
 */

const E = Constants.public.Enums;

/** Convierte un error de la base en una excepción con mensaje para el usuario. */
function lanzar(error: Parameters<typeof mensajeError>[0], contexto: string): never {
  throw new Error(`${contexto}: ${mensajeError(error)}`);
}

/** Valida la respuesta jsonb de una RPC; si no coincide con el contrato, falla de forma explícita. */
function parsear<T>(esquema: z.ZodType<T>, datos: unknown, contexto: string): T {
  const r = esquema.safeParse(datos);
  if (!r.success) throw new Error(`${contexto}: la respuesta del servidor no tiene el formato esperado.`);
  return r.data;
}

const texto = z.string().nullable().catch(null);
const numero = z.coerce.number().catch(0);
const numeroNulo = z.coerce.number().nullable().catch(null);

// -----------------------------------------------------------------------------
// Indicadores (portal_estadisticas)
// -----------------------------------------------------------------------------
const esquemaEstadisticas = z.object({
  empresas_habilitadas: numero,
  empresas_tanques: numero,
  certificados_vigentes: numero,
  certificados_mes: numero,
  establecimientos_al_dia: numero,
});

export type EstadisticasPortal = z.infer<typeof esquemaEstadisticas>;

export async function getEstadisticasPortal(): Promise<EstadisticasPortal> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_estadisticas");
  if (error) lanzar(error, "No se pudieron obtener los indicadores");
  return parsear(esquemaEstadisticas, data, "Indicadores");
}

// -----------------------------------------------------------------------------
// Registro público de empresas (portal_empresas / portal_empresa)
// -----------------------------------------------------------------------------
export type EmpresaPortal = {
  id: string;
  numeroRegistro: number | null;
  nombre: string;
  titular: string | null;
  cuit: string | null;
  telefono: string | null;
  email: string | null;
  domicilio: string | null;
  habilitacionComercial: string | null;
  resolucionDsa: string | null;
  fumigacion: boolean;
  tanques: boolean;
  vencimiento: string | null;
};

/** Empresas habilitadas y vigentes, ordenadas por N.º de registro. */
export async function getEmpresasPortal(): Promise<EmpresaPortal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_empresas");
  if (error) lanzar(error, "No se pudo obtener el listado de empresas");
  return (data ?? []).flatMap((e) =>
    e.id
      ? [
          {
            id: e.id,
            numeroRegistro: e.numero_registro,
            nombre: e.nombre_comercial?.trim() || "Empresa sin nombre",
            titular: e.titular,
            cuit: e.cuit,
            telefono: e.telefono,
            email: e.email,
            domicilio: e.domicilio_oficina,
            habilitacionComercial: e.habilitacion_comercial,
            resolucionDsa: e.resolucion_dsa,
            fumigacion: e.habilita_fumigacion ?? false,
            tanques: e.habilita_tanques ?? false,
            vencimiento: e.vencimiento_habilitacion,
          },
        ]
      : [],
  );
}

const esquemaFicha = z.object({
  id: z.string(),
  numero_registro: numeroNulo,
  nombre_comercial: z.string(),
  titular: texto,
  cuit: texto,
  telefono: texto,
  email: texto,
  domicilio_oficina: texto,
  habilitacion_comercial: texto,
  resolucion_dsa: texto,
  habilita_fumigacion: z.boolean().catch(false),
  habilita_tanques: z.boolean().catch(false),
  vencimiento_habilitacion: texto,
  tecnicos: z
    .array(z.object({ nombre: z.string(), titulo: texto, representante: z.boolean().catch(false) }))
    .catch([]),
  productos: z
    .array(
      z.object({
        nombre: z.string(),
        principio_activo: texto,
        clase: z.enum(E.clase_producto).nullable().catch(null),
        organismo: z.enum(E.organismo_registro).nullable().catch(null),
        registro: texto,
        plazo_reingreso_horas: numeroNulo,
      }),
    )
    .catch([]),
});

export type FichaEmpresa = z.infer<typeof esquemaFicha>;

/**
 * Ficha pública de una empresa (solo si está habilitada y vigente). Memorizada por request
 * para compartirla entre generateMetadata y la página.
 */
export const getEmpresaPortal = cache(async (id: string): Promise<FichaEmpresa | null> => {
  // Un id con formato inválido haría fallar la consulta (22P02): se trata como "no encontrada".
  if (!z.guid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_empresa", { p_id: id });
  if (error) lanzar(error, "No se pudo obtener la ficha de la empresa");
  if (data === null) return null;
  return parsear(esquemaFicha, data, "Ficha de empresa");
});

// -----------------------------------------------------------------------------
// Verificación pública de certificados (verificar_certificado)
// -----------------------------------------------------------------------------
const esquemaVerificacion = z.object({
  numero: z.string(),
  tipo: z.enum(E.tipo_servicio),
  codigo_verificacion: z.string(),
  sello_codigo: texto,
  estado: z.enum(E.estado_certificado),
  vigencia: z.enum(["vigente", "vencido", "sin_timbrar", "anulado"]),
  cliente: z.string(),
  domicilio: z.string(),
  rubro: texto,
  rubro_grupo: texto,
  superficie_m2: numeroNulo,
  capacidad_litros: numeroNulo,
  fecha_servicio: z.string(),
  fecha_vencimiento: texto,
  timbrado_at: texto,
  plazo_reingreso_horas: numeroNulo,
  firmado: z.boolean().catch(false),
  empresa: z.object({
    id: z.string(),
    nombre: z.string(),
    cuit: texto,
    numero_registro: numeroNulo,
    resolucion_dsa: texto,
    habilitada: z.boolean().catch(false),
  }),
  tecnico: z.object({ nombre: texto, titulo: texto, matricula: texto }).catch({ nombre: null, titulo: null, matricula: null }),
  productos: z
    .array(
      z.object({
        nombre: z.string(),
        principio_activo: texto,
        organismo: z.enum(E.organismo_registro).nullable().catch(null),
        registro: texto,
        cantidad: numeroNulo,
        unidad: texto,
        plazo_reingreso_horas: numeroNulo,
      }),
    )
    .catch([]),
});

export type VerificacionCertificado = z.infer<typeof esquemaVerificacion>;

/** Formato de los códigos verificables: QR (XXXX-XXXX-XXXX) o sello (SA-AAAA-NNNNNN). */
const CODIGO_VALIDO = /^[A-Z0-9][A-Z0-9-]{3,39}$/;

/** Verifica un certificado por su código QR o su sello. Devuelve null si no existe. */
export const verificarCertificado = cache(async (codigo: string): Promise<VerificacionCertificado | null> => {
  const normalizado = codigo.trim().toUpperCase();
  if (!CODIGO_VALIDO.test(normalizado)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verificar_certificado", { p_codigo: normalizado });
  if (error) lanzar(error, "No se pudo verificar el certificado");
  if (data === null) return null;
  return parsear(esquemaVerificacion, data, "Verificación");
});

// -----------------------------------------------------------------------------
// Noticias (tabla noticias: anon ve solo las publicadas)
// -----------------------------------------------------------------------------
const COLUMNAS_NOTICIA = "id, slug, titulo, resumen, categoria, imagen_url, publicada_at, created_at" as const;

export type NoticiaResumen = {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;
  categoria: string;
  imagen_url: string | null;
  publicada_at: string | null;
  created_at: string;
};

export type Noticia = NoticiaResumen & { cuerpo: string };

/**
 * Filtro de publicación: marcada como publicada y con fecha de publicación alcanzada (una fecha futura
 * equivale a una publicación programada). El filtro explícito también evita mostrar borradores a
 * usuarios del staff con sesión iniciada (la RLS les deja verlos).
 */
function filtroPublicadas(ahora = new Date().toISOString()): string {
  // El valor va entre comillas: contiene caracteres reservados de PostgREST ("." y ":").
  return `publicada_at.is.null,publicada_at.lte."${ahora}"`;
}

/** PostgREST responde 416 (PGRST103) si la página pedida queda fuera del total (p. ej. ?pagina=99). */
const FUERA_DE_RANGO = "PGRST103";

/** Noticias publicadas, de la más reciente a la más antigua (paginadas). */
export async function getNoticias({
  desde = 0,
  hasta = 8,
}: { desde?: number; hasta?: number } = {}): Promise<{ noticias: NoticiaResumen[]; total: number }> {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("noticias")
    .select(COLUMNAS_NOTICIA, { count: "exact" })
    .eq("publicada", true)
    .or(filtroPublicadas())
    .order("publicada_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(desde, hasta);
  if (error?.code === FUERA_DE_RANGO && desde > 0) {
    // Página inexistente: sin filas, pero con el total real para ofrecer volver al inicio.
    const { total } = await getNoticias({ desde: 0, hasta: 0 });
    return { noticias: [], total };
  }
  if (error) lanzar(error, "No se pudieron obtener las noticias");
  return { noticias: data ?? [], total: count ?? 0 };
}

const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const getNoticia = cache(async (slug: string): Promise<Noticia | null> => {
  if (!SLUG_VALIDO.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("noticias")
    .select(`${COLUMNAS_NOTICIA}, cuerpo`)
    .eq("slug", slug)
    .eq("publicada", true)
    .or(filtroPublicadas())
    .maybeSingle();
  if (error) lanzar(error, "No se pudo obtener la noticia");
  return data;
});

// -----------------------------------------------------------------------------
// Capacitaciones (portal_capacitaciones)
// -----------------------------------------------------------------------------
export type CapacitacionPortal = {
  id: string;
  titulo: string;
  descripcion: string;
  modalidad: (typeof E.modalidad_capacitacion)[number];
  lugar: string | null;
  fechaInicio: string;
  duracionHoras: number;
  cupo: number | null;
  estado: (typeof E.estado_capacitacion)[number];
  destinatarios: string | null;
  inscriptos: number;
  /** null = sin cupo máximo. */
  vacantes: number | null;
  /** Inscripción abierta, con fecha futura y vacantes. */
  admiteInscripcion: boolean;
  /** Fecha de inicio ya pasada o capacitación finalizada. */
  pasada: boolean;
};

/** Capacitaciones no canceladas, separadas en próximas (ascendente) y pasadas (descendente). */
export async function getCapacitacionesPortal(): Promise<{ proximas: CapacitacionPortal[]; pasadas: CapacitacionPortal[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_capacitaciones");
  if (error) lanzar(error, "No se pudieron obtener las capacitaciones");

  const ahora = Date.now();
  const todas = (data ?? []).flatMap((c): CapacitacionPortal[] => {
    if (!c.id || !c.titulo || !c.fecha_inicio || !c.estado || c.estado === "cancelada") return [];
    const inscriptos = c.inscriptos ?? 0;
    const vacantes = c.cupo === null ? null : Math.max(0, c.cupo - inscriptos);
    const pasada = c.estado === "finalizada" || new Date(c.fecha_inicio).getTime() < ahora;
    return [
      {
        id: c.id,
        titulo: c.titulo,
        descripcion: c.descripcion ?? "",
        modalidad: c.modalidad ?? "presencial",
        lugar: c.lugar,
        fechaInicio: c.fecha_inicio,
        duracionHoras: c.duracion_horas ?? 0,
        cupo: c.cupo,
        estado: c.estado,
        destinatarios: c.destinatarios,
        inscriptos,
        vacantes,
        admiteInscripcion: c.estado === "abierta" && !pasada && (vacantes === null || vacantes > 0),
        pasada,
      },
    ];
  });

  return {
    proximas: todas.filter((c) => !c.pasada).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)),
    pasadas: todas.filter((c) => c.pasada).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)),
  };
}

// -----------------------------------------------------------------------------
// Denuncias (consultar_denuncia)
// -----------------------------------------------------------------------------
const esquemaDenuncia = z.object({
  codigo: z.string(),
  tipo: z.enum(E.tipo_denuncia),
  estado: z.enum(E.estado_denuncia),
  creada: z.string(),
  actualizada: texto,
  respuesta: texto,
});

export type EstadoDenunciaPublico = z.infer<typeof esquemaDenuncia>;

/** Estado público de una denuncia a partir de su código completo (DEN-AAAA-NNNNNN-XXXXXXXX). */
export async function consultarDenuncia(codigo: string): Promise<EstadoDenunciaPublico | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consultar_denuncia", { p_codigo: codigo });
  if (error) lanzar(error, "No se pudo consultar la denuncia");
  if (data === null) return null;
  return parsear(esquemaDenuncia, data, "Denuncia");
}
