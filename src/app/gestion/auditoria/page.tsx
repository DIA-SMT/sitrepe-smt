import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FilePen, FileX2, Fingerprint, History, ScrollText, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ETIQUETA_ROL, requerirStaff } from "@/lib/auth";
import {
  type AccionAuditoria,
  listarAuditoria,
  opcionesUsuariosAuditoria,
  resumenAuditoria,
  TABLAS_AUDITADAS,
} from "@/lib/data/admin";
import { formatFecha } from "@/lib/domain/formato";
import { ESTILO_ACCION, EventoAuditoriaItem } from "./_components/evento-auditoria";

export const metadata: Metadata = {
  title: "Auditoría",
  description: "Registro inmutable de altas, modificaciones y bajas en la plataforma.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const TAMANIO = 25;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esAccion(valor: string | undefined): valor is AccionAuditoria {
  return valor === "INSERT" || valor === "UPDATE" || valor === "DELETE";
}

export default async function AuditoriaPage({ searchParams }: Props) {
  await requerirStaff(["admin"]);
  const sp = await searchParams;

  const tablaParam = primero(sp.tabla);
  const tabla = tablaParam && Object.hasOwn(TABLAS_AUDITADAS, tablaParam) ? tablaParam : undefined;
  const accionParam = primero(sp.accion);
  const accion = esAccion(accionParam) ? accionParam : undefined;
  const usuario = primero(sp.usuario)?.trim() || undefined;
  const desdeParam = primero(sp.desde);
  const hastaParam = primero(sp.hasta);
  const fechaDesde = desdeParam && FECHA.test(desdeParam) ? desdeParam : undefined;
  const fechaHasta = hastaParam && FECHA.test(hastaParam) ? hastaParam : undefined;
  const registro = primero(sp.registro)?.trim() || undefined;
  const { pagina, desde, hasta } = rangoPagina(sp.pagina, TAMANIO);

  const [{ filas, total }, resumen, usuarios] = await Promise.all([
    listarAuditoria({ tabla, accion, usuario, fechaDesde, fechaHasta, registro, desde, hasta }),
    resumenAuditoria(),
    opcionesUsuariosAuditoria(),
  ]);
  const hayFiltros = Boolean(tabla || accion || usuario || fechaDesde || fechaHasta || registro);
  const usuarioFiltrado = usuario === "sistema" ? "Procesos del sistema" : usuarios.find((u) => u.id === usuario)?.etiqueta;
  const rangoInvalido = Boolean(fechaDesde && fechaHasta && fechaDesde > fechaHasta);

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Cada alta, modificación y baja en las tablas operativas queda registrada con su autor, la fecha y los datos anteriores y nuevos. El registro no se puede editar ni borrar."
        icon={History}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Administración" }, { label: "Auditoría" }]}
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Movimientos de hoy" value={resumen.hoy} icon={CalendarClock} tone="azul" hint="Altas, cambios y bajas" />
          <StatCard label="Últimos 7 días" value={resumen.semana} icon={ScrollText} tone="celeste" hint="Actividad de la semana" />
          <StatCard
            label="Modificaciones (7 días)"
            value={resumen.modificaciones}
            icon={FilePen}
            tone="violeta"
            href="/gestion/auditoria?accion=UPDATE"
            hint="Cambios sobre registros existentes"
          />
          <StatCard
            label="Bajas (7 días)"
            value={resumen.bajas}
            icon={FileX2}
            tone={resumen.bajas > 0 ? "rojo" : "neutral"}
            href="/gestion/auditoria?accion=DELETE"
            hint="Registros eliminados"
          />
        </div>

        <SectionCard
          title="Registro de actividad"
          description={`${total.toLocaleString("es-AR")} ${total === 1 ? "movimiento" : "movimientos"}${hayFiltros ? " con los filtros aplicados" : ""}`}
          icon={History}
          flush
          footer={
            total > 0 ? (
              <Paginacion pagina={pagina} total={total} tamanio={TAMANIO} params={sp} ruta="/gestion/auditoria" className="w-full" />
            ) : undefined
          }
        >
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:px-6">
            <FiltrosUrl
              campos={[
                {
                  tipo: "select",
                  nombre: "tabla",
                  etiqueta: "Tabla",
                  opciones: Object.entries(TABLAS_AUDITADAS)
                    .sort(([, a], [, b]) => a.localeCompare(b, "es"))
                    .map(([valor, label]) => ({ valor, label })),
                  className: "sm:w-56",
                },
                {
                  tipo: "select",
                  nombre: "accion",
                  etiqueta: "Acción",
                  opciones: (["INSERT", "UPDATE", "DELETE"] as const).map((a) => ({ valor: a, label: ESTILO_ACCION[a].etiqueta })),
                  className: "sm:w-48",
                },
                {
                  tipo: "select",
                  nombre: "usuario",
                  etiqueta: "Usuario",
                  opciones: [
                    { valor: "sistema", label: "Procesos del sistema" },
                    ...usuarios.map((u) => ({ valor: u.id, label: `${u.etiqueta} (${ETIQUETA_ROL[u.rol]})` })),
                  ],
                  className: "sm:w-72",
                },
                { tipo: "fecha", nombre: "desde", etiqueta: "Desde" },
                { tipo: "fecha", nombre: "hasta", etiqueta: "Hasta" },
                { tipo: "busqueda", nombre: "registro", placeholder: "Id del registro", className: "sm:w-64" },
              ]}
            />
            {hayFiltros ? (
              <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                <span>Mostrando:</span>
                {tabla ? <Badge tone="azul" size="sm">{TABLAS_AUDITADAS[tabla]}</Badge> : null}
                {accion ? (
                  <Badge tone={ESTILO_ACCION[accion].tono} size="sm">
                    {ESTILO_ACCION[accion].etiqueta}
                  </Badge>
                ) : null}
                {usuarioFiltrado ? <Badge tone="violeta" size="sm">{usuarioFiltrado}</Badge> : null}
                {fechaDesde || fechaHasta ? (
                  <Badge tone="celeste" size="sm">
                    {fechaDesde ? `desde ${formatFecha(fechaDesde)}` : ""}
                    {fechaDesde && fechaHasta ? " " : ""}
                    {fechaHasta ? `hasta ${formatFecha(fechaHasta)}` : ""}
                  </Badge>
                ) : null}
                {registro ? (
                  <Badge tone="neutral" size="sm" className="max-w-full font-mono">
                    <Fingerprint aria-hidden />
                    <span className="truncate">{registro}</span>
                  </Badge>
                ) : null}
              </p>
            ) : null}
          </div>

          {filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={SearchX}
                title={
                  rangoInvalido
                    ? "La fecha «desde» es posterior a «hasta»"
                    : hayFiltros
                      ? "No hay movimientos con esos filtros"
                      : "Todavía no hay movimientos registrados"
                }
                description={
                  rangoInvalido
                    ? "Corregí el rango de fechas."
                    : hayFiltros
                      ? "Ampliá el rango de fechas o quitá algún filtro."
                      : "Los cambios que se hagan en la plataforma aparecerán acá."
                }
                action={
                  hayFiltros ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/gestion/auditoria">Limpiar filtros</Link>
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <ol className="divide-y divide-border" aria-label="Movimientos, del más reciente al más antiguo">
              {filas.map((e) => (
                <EventoAuditoriaItem key={e.id} evento={e} etiquetas={ETIQUETA_ROL} />
              ))}
            </ol>
          )}
        </SectionCard>
      </div>
    </>
  );
}
