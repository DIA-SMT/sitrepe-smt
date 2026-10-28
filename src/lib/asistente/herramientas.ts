import "server-only";
import { z } from "zod";
import type { Sesion } from "@/lib/auth";
import { getArancelesVigentes, getRubros } from "@/lib/data/catalogos";
import { contarVigencias, getAlertasEmpresa, getHabilitacion, getRecordatoriosVencimiento } from "@/lib/data/certificados";
import { getFirmasPendientes, getResumenDeclaraciones } from "@/lib/data/declaraciones";
import { getAlertas, getDashboardKpis } from "@/lib/data/gestion";
import { getResumenPagosEmpresa } from "@/lib/data/pagos";
import { consultarDenuncia, getCapacitacionesPortal, getEmpresasPortal, verificarCertificado } from "@/lib/data/portal";
import { CODIGO_DENUNCIA, normalizarCodigoDenuncia } from "@/lib/domain/denuncias";
import type { AmbitoAsistente } from "./config";

/*
 * Herramientas que el modelo puede pedir. Todas son de solo lectura y usan el cliente de Supabase con la sesión
 * de quien chatea: la RLS decide qué datos ve (un visitante solo accede a lo público).
 */

type Contexto = { ambito: AmbitoAsistente; sesion: Sesion | null };

type Herramienta = {
  nombre: string;
  descripcion: string;
  /** JSON Schema de los argumentos (formato de tools de OpenAI/OpenRouter). */
  parametros: Record<string, unknown>;
  /** Mensaje que ve el usuario mientras se ejecuta. */
  estado: string;
  disponible: (ctx: Contexto) => boolean;
  ejecutar: (args: unknown, ctx: Contexto) => Promise<unknown>;
};

const sinParametros = { type: "object", properties: {}, additionalProperties: false };

const normalizar = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

const siempre = () => true;

const HERRAMIENTAS: Herramienta[] = [
  {
    nombre: "buscar_empresas_habilitadas",
    descripcion:
      "Busca en el registro público de empresas habilitadas por nombre, titular, CUIT o domicilio, y opcionalmente por servicio. Sin texto devuelve un resumen del listado.",
    parametros: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Nombre, titular, CUIT o parte del domicilio. Vacío para listar." },
        servicio: { type: "string", enum: ["fumigacion", "tanque"], description: "Filtra por servicio habilitado." },
      },
      additionalProperties: false,
    },
    estado: "Buscando en el registro de empresas…",
    disponible: siempre,
    async ejecutar(args) {
      const { texto, servicio } = z
        .object({ texto: z.string().max(120).optional(), servicio: z.enum(["fumigacion", "tanque"]).optional() })
        .parse(args);
      const buscado = normalizar(texto);
      const digitos = (texto ?? "").replace(/\D/g, "");
      const empresas = (await getEmpresasPortal()).filter(
        (e) =>
          (!servicio || (servicio === "tanque" ? e.tanques : e.fumigacion)) &&
          (!buscado ||
            [e.nombre, e.titular, e.domicilio].some((v) => normalizar(v).includes(buscado)) ||
            (digitos.length >= 6 && (e.cuit ?? "").replace(/\D/g, "").includes(digitos))),
      );
      return {
        total: empresas.length,
        mostradas: empresas.slice(0, 12).map((e) => ({
          nombre: e.nombre,
          registro: e.numeroRegistro,
          titular: e.titular,
          telefono: e.telefono,
          domicilio: e.domicilio,
          servicios: [e.fumigacion && "fumigación", e.tanques && "limpieza de tanques"].filter(Boolean),
          habilitada_hasta: e.vencimiento,
          ficha: `/empresas/${e.id}`,
        })),
        listado_completo: "/empresas",
      };
    },
  },
  {
    nombre: "verificar_certificado",
    descripcion:
      "Verifica un certificado de fumigación o de limpieza de tanque por su código QR (XXXX-XXXX-XXXX) o su sello. Devuelve validez, empresa, servicio, vencimiento y productos.",
    parametros: {
      type: "object",
      properties: { codigo: { type: "string", description: "Código del QR o sello del certificado." } },
      required: ["codigo"],
      additionalProperties: false,
    },
    estado: "Verificando el certificado…",
    disponible: siempre,
    async ejecutar(args) {
      const { codigo } = z.object({ codigo: z.string().max(60) }).parse(args);
      const resultado = await verificarCertificado(codigo);
      return resultado
        ? { encontrado: true, detalle: `/verificar/${encodeURIComponent(codigo.trim().toUpperCase())}`, ...resultado }
        : { encontrado: false, mensaje: "No existe un certificado con ese código." };
    },
  },
  {
    nombre: "consultar_denuncia",
    descripcion: "Consulta el estado de una denuncia con su código completo DEN-AAAA-NNNNNN-XXXXXXXX.",
    parametros: {
      type: "object",
      properties: { codigo: { type: "string", description: "Código completo de la denuncia." } },
      required: ["codigo"],
      additionalProperties: false,
    },
    estado: "Consultando la denuncia…",
    disponible: siempre,
    async ejecutar(args) {
      const codigo = normalizarCodigoDenuncia(z.object({ codigo: z.string().max(60) }).parse(args).codigo);
      if (!CODIGO_DENUNCIA.test(codigo)) {
        return { encontrada: false, mensaje: "El código debe ser completo: DEN-AAAA-NNNNNN-XXXXXXXX." };
      }
      const denuncia = await consultarDenuncia(codigo);
      return denuncia ? { encontrada: true, ...denuncia } : { encontrada: false, mensaje: "No hay una denuncia con ese código." };
    },
  },
  {
    nombre: "proximas_capacitaciones",
    descripcion: "Lista las próximas capacitaciones de la Dirección con fecha, modalidad, lugar y vacantes.",
    parametros: sinParametros,
    estado: "Buscando capacitaciones…",
    disponible: siempre,
    async ejecutar() {
      const { proximas } = await getCapacitacionesPortal();
      return {
        proximas: proximas.slice(0, 6).map((c) => ({
          titulo: c.titulo,
          fecha_inicio: c.fechaInicio,
          modalidad: c.modalidad,
          lugar: c.lugar,
          duracion_horas: c.duracionHoras,
          destinatarios: c.destinatarios,
          vacantes: c.vacantes,
          admite_inscripcion: c.admiteInscripcion,
        })),
        inscripcion: "/capacitaciones",
      };
    },
  },
  {
    nombre: "aranceles_vigentes",
    descripcion:
      "Importes vigentes de la Ordenanza Tarifaria (timbrado de certificados, limpieza de tanques y otros conceptos) con su cuenta recaudadora y medios de pago.",
    parametros: sinParametros,
    estado: "Consultando aranceles…",
    disponible: siempre,
    async ejecutar() {
      const aranceles = await getArancelesVigentes();
      return aranceles.map((a) => ({
        concepto: a.concepto,
        importe: a.importe,
        unidad: a.unidad,
        norma: `${a.ordenanza}, ${a.articulo}`,
        cuenta: a.cuenta ? { codigo: a.cuenta.codigo, banco: a.cuenta.banco, cbu: a.cuenta.cbu, medios: a.cuenta.medios_pago } : null,
      }));
    },
  },
  {
    nombre: "periodicidad_por_rubro",
    descripcion:
      "Busca rubros o actividades del Anexo de la ordenanza y devuelve cada cuánto deben fumigarse (periodicidad que define el vencimiento del certificado).",
    parametros: {
      type: "object",
      properties: { texto: { type: "string", description: "Actividad o rubro, p. ej. 'restaurante', 'escuela'." } },
      required: ["texto"],
      additionalProperties: false,
    },
    estado: "Buscando el rubro en el Anexo…",
    disponible: siempre,
    async ejecutar(args) {
      const buscado = normalizar(z.object({ texto: z.string().max(80) }).parse(args).texto);
      const palabras = buscado.split(/\s+/).filter((p) => p.length > 2);
      const rubros = (await getRubros()).filter((r) => {
        const texto = normalizar(`${r.grupo} ${r.nombre} ${r.descripcion ?? ""}`);
        return palabras.length ? palabras.some((p) => texto.includes(p)) : true;
      });
      return {
        coincidencias: rubros.slice(0, 10).map((r) => ({
          grupo: r.grupo,
          rubro: r.nombre,
          periodicidad: r.periodicidad,
          provisorio: !r.validado,
        })),
        nota: "Las actividades no tipificadas se declaran ante la Dirección, que fija la periodicidad por similitud.",
      };
    },
  },
  {
    nombre: "resumen_mi_empresa",
    descripcion:
      "Pendientes y estado de la empresa del usuario: habilitación, declaraciones por estado, certificados por vigencia, pagos, alertas, vencimientos de clientes y firmas pendientes del técnico.",
    parametros: sinParametros,
    estado: "Revisando los pendientes de tu empresa…",
    disponible: ({ ambito, sesion }) => ambito === "prestador" && Boolean(sesion?.empresa),
    async ejecutar(_args, { sesion }) {
      const empresaId = sesion?.empresa?.id;
      if (!empresaId) return { error: "El usuario no tiene una empresa vinculada." };
      const tecnicoId = sesion.perfil.rol === "tecnico" ? sesion.perfil.tecnico_id : null;
      const [habilitacion, declaraciones, vigencias, pagos, alertas, recordatorios, firmas] = await Promise.all([
        getHabilitacion(empresaId),
        getResumenDeclaraciones(empresaId),
        contarVigencias(empresaId),
        getResumenPagosEmpresa(empresaId),
        getAlertasEmpresa(empresaId, 8),
        getRecordatoriosVencimiento(empresaId, 6),
        tecnicoId ? getFirmasPendientes(empresaId, tecnicoId) : Promise.resolve(null),
      ]);
      return {
        habilitacion: habilitacion && {
          estado: habilitacion.estado_efectivo ?? habilitacion.estado,
          vence: habilitacion.vencimiento_habilitacion,
          dias_para_vencer: habilitacion.dias_para_vencer,
          fumigacion: habilitacion.habilita_fumigacion,
          tanques: habilitacion.habilita_tanques,
        },
        declaraciones_por_estado: declaraciones,
        certificados_por_vigencia: vigencias,
        pagos,
        alertas: alertas.map((a) => ({ nivel: a.nivel, titulo: a.titulo, detalle: a.detalle, enlace: a.href })),
        clientes_por_vencer: recordatorios.map((r) => ({
          cliente: r.cliente,
          domicilio: r.domicilio,
          vence: r.fecha_vencimiento,
          ya_programado: r.programado,
        })),
        firmas_pendientes: firmas ? firmas.length : undefined,
      };
    },
  },
  {
    nombre: "resumen_gestion",
    descripcion:
      "Indicadores del día para el personal de la Dirección: empresas, certificados, pagos a verificar, recaudación del mes, fiscalización y alertas principales.",
    parametros: sinParametros,
    estado: "Mirando el panel de gestión…",
    disponible: ({ ambito, sesion }) => ambito === "gestion" && Boolean(sesion),
    async ejecutar() {
      const [kpis, alertas] = await Promise.all([getDashboardKpis(), getAlertas(60)]);
      return {
        indicadores: {
          empresas: kpis.empresas,
          certificados: kpis.certificados,
          pagos: kpis.pagos,
          fiscalizacion: kpis.fiscalizacion,
          tramites_pendientes: kpis.tramites_pendientes,
        },
        alertas_por_nivel: alertas.totales,
        alertas_principales: [...alertas.grupos.urgente, ...alertas.grupos.alerta]
          .slice(0, 10)
          .map((a) => ({ nivel: a.nivel, titulo: a.titulo, detalle: a.detalle, enlace: a.href })),
      };
    },
  },
];

export function herramientasDisponibles(ctx: Contexto) {
  return HERRAMIENTAS.filter((h) => h.disponible(ctx));
}

/** Definiciones en el formato `tools` de la API de chat de OpenRouter. */
export function definicionesHerramientas(ctx: Contexto) {
  return herramientasDisponibles(ctx).map((h) => ({
    type: "function" as const,
    function: { name: h.nombre, description: h.descripcion, parameters: h.parametros },
  }));
}

export function estadoHerramienta(nombre: string): string {
  return HERRAMIENTAS.find((h) => h.nombre === nombre)?.estado ?? "Consultando…";
}

/** Ejecuta una herramienta y devuelve el resultado serializado (o un error legible para el modelo). */
export async function ejecutarHerramienta(nombre: string, argumentosJson: string, ctx: Contexto): Promise<string> {
  const herramienta = herramientasDisponibles(ctx).find((h) => h.nombre === nombre);
  if (!herramienta) return JSON.stringify({ error: `La herramienta ${nombre} no está disponible.` });
  try {
    const args: unknown = argumentosJson.trim() ? JSON.parse(argumentosJson) : {};
    const resultado = await herramienta.ejecutar(args, ctx);
    return JSON.stringify(resultado).slice(0, 12_000);
  } catch (e) {
    console.error(`[asistente] Falló la herramienta ${nombre}:`, e);
    return JSON.stringify({ error: "No se pudo obtener el dato en este momento." });
  }
}
