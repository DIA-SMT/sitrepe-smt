import type { NextRequest } from "next/server";
import { z } from "zod";
import { esStaff, getSesion } from "@/lib/auth";
import {
  ANIO_INICIO,
  clavePeriodo,
  compararPeriodos,
  esUuid,
  getCertificadosDelMes,
  getEmpresaPlanilla,
  getInformeRecaudacion,
  getPlanillaMensual,
  periodoActual,
  nombrePeriodo,
  type Periodo,
} from "@/lib/data/reportes";
import { ESTADO_CERTIFICADO, MEDIO_PAGO, TIPO_SERVICIO_CORTO, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha } from "@/lib/domain/formato";
import { construirCsv, nombreArchivo, numeroCsv, respuestaCsv } from "./csv";

/**
 * Exportación CSV de reportes (solo staff):
 *   ?tipo=movimientos&anio=&mes=            movimientos de la rendición mensual
 *   ?tipo=planilla&anio=&mes=[&empresa=]    planilla mensual por empresa (resumen)
 *   ?tipo=certificados&anio=&mes=[&empresa=] certificados con servicio en el mes
 */

const esquema = z.object({
  tipo: z.enum(["movimientos", "planilla", "certificados"], { message: "Indicá un tipo de reporte válido." }),
  anio: z.coerce.number().int().min(ANIO_INICIO, "El año no es válido."),
  mes: z.coerce.number().int().min(1, "El mes no es válido.").max(12, "El mes no es válido."),
  empresa: z
    .string()
    .optional()
    .refine((v) => v === undefined || esUuid(v), "La empresa indicada no es válida."),
});

function texto(mensaje: string, status: number): Response {
  return new Response(mensaje, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const sesion = await getSesion();
  if (!sesion) return texto("Tu sesión expiró. Ingresá nuevamente para descargar el reporte.", 401);
  if (!esStaff(sesion.perfil.rol)) return texto("No tenés permisos para descargar reportes de gestión.", 403);

  const sp = request.nextUrl.searchParams;
  const datos = esquema.safeParse({
    tipo: sp.get("tipo") ?? undefined,
    anio: sp.get("anio") ?? undefined,
    mes: sp.get("mes") ?? undefined,
    empresa: sp.get("empresa") || undefined,
  });
  if (!datos.success) {
    return texto(datos.error.issues.map((i) => i.message).join("\n") || "Parámetros inválidos.", 400);
  }

  const { tipo, anio, mes, empresa } = datos.data;
  const periodo: Periodo = { anio, mes };
  if (compararPeriodos(periodo, periodoActual()) > 0) {
    return texto("El período solicitado todavía no comenzó.", 400);
  }

  try {
    if (tipo === "movimientos") return await exportarMovimientos(periodo);
    if (tipo === "planilla") return await exportarPlanilla(periodo, empresa);
    return await exportarCertificados(periodo, empresa);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo generar el archivo.";
    return texto(mensaje, 500);
  }
}

async function exportarMovimientos(periodo: Periodo): Promise<Response> {
  const informe = await getInformeRecaudacion(periodo);
  const contenido = construirCsv(
    [
      "Fecha de pago",
      "Liquidación",
      "Contribuyente",
      "CUIT/CUIL",
      "Concepto",
      "Cuenta",
      "Medio de pago",
      "N.º de operación",
      "Cantidad",
      "Importe",
    ],
    informe.movimientos.map((m) => [
      m.fecha_pago ? formatFecha(m.fecha_pago) : "",
      m.codigo,
      m.contribuyente,
      m.cuit,
      m.concepto,
      m.cuenta,
      m.medio ? etiqueta(MEDIO_PAGO, m.medio).label : "",
      m.numero_operacion,
      numeroCsv(m.cantidad),
      numeroCsv(m.importe, 2),
    ]),
  );
  return respuestaCsv(contenido, nombreArchivo("sitrepe", "recaudacion", "movimientos", clavePeriodo(periodo)));
}

async function exportarPlanilla(periodo: Periodo, empresaId: string | undefined): Promise<Response> {
  const [planilla, empresa] = await Promise.all([
    getPlanillaMensual(periodo),
    empresaId ? getEmpresaPlanilla(empresaId) : Promise.resolve(null),
  ]);
  if (empresaId && !empresa) return texto("No se encontró la empresa indicada.", 404);
  const filas = planilla.filter((f) => !empresaId || f.empresaId === empresaId);
  const contenido = construirCsv(
    [
      "Período",
      "Empresa",
      "CUIT",
      "Certificados de fumigación",
      "Certificados de tanques",
      "Total de certificados",
      "Timbrados",
      "En proceso",
      "Anulados",
      "Superficie tratada (m²)",
    ],
    filas.map((f) => [
      nombrePeriodo(periodo), // "octubre de 2026": Excel no lo convierte en fecha
      f.empresaNombre,
      f.empresaCuit,
      numeroCsv(f.fumigacion),
      numeroCsv(f.tanque),
      numeroCsv(f.certificados),
      numeroCsv(f.timbrados),
      numeroCsv(f.enProceso),
      numeroCsv(f.anulados),
      numeroCsv(f.superficieM2, 2),
    ]),
  );
  const sufijo = empresa ? empresa.nombre : "todas-las-empresas";
  return respuestaCsv(contenido, nombreArchivo("sitrepe", "planilla-mensual", clavePeriodo(periodo), sufijo));
}

async function exportarCertificados(periodo: Periodo, empresaId: string | undefined): Promise<Response> {
  const [certificados, empresa] = await Promise.all([
    getCertificadosDelMes(periodo, empresaId),
    empresaId ? getEmpresaPlanilla(empresaId) : Promise.resolve(null),
  ]);
  if (empresaId && !empresa) return texto("No se encontró la empresa indicada.", 404);

  const contenido = construirCsv(
    [
      "Empresa",
      "CUIT de la empresa",
      "Tipo",
      "N.º de certificado",
      "Fecha del servicio",
      "Cliente",
      "CUIT del cliente",
      "Domicilio",
      "Barrio",
      "Zona",
      "Grupo de rubro",
      "Rubro",
      "Superficie (m²)",
      "Capacidad (L)",
      "Asesor técnico",
      "Estado",
      "Vencimiento",
      "Sello digital",
      "Declaración",
      "Liquidación",
    ],
    certificados.map((c) => [
      c.empresaNombre,
      c.empresaCuit,
      TIPO_SERVICIO_CORTO[c.tipo],
      c.numero,
      c.fechaServicio ? formatFecha(c.fechaServicio) : "",
      c.cliente,
      c.clienteCuit,
      c.domicilio,
      c.barrio,
      c.zona,
      c.rubroGrupo,
      c.rubro,
      numeroCsv(c.superficieM2, 2),
      numeroCsv(c.capacidadLitros, 2),
      c.tecnico,
      etiqueta(ESTADO_CERTIFICADO, c.estado).label,
      c.fechaVencimiento ? formatFecha(c.fechaVencimiento) : "",
      c.selloCodigo,
      c.declaracionCodigo,
      c.pagoCodigo,
    ]),
  );
  const sufijo = empresa ? empresa.nombre : "todas-las-empresas";
  return respuestaCsv(contenido, nombreArchivo("sitrepe", "certificados", clavePeriodo(periodo), sufijo));
}
