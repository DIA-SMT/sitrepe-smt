import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FilePenLine,
  FileSignature,
  MessageSquareWarning,
  Plus,
  Send,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TEmpty, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirEmpresa } from "@/lib/auth";
import { getAntelacion, getDeclaraciones, getResumenDeclaraciones } from "@/lib/data/declaraciones";
import { ESTADO_DECLARACION, TIPO_SERVICIO, TIPO_SERVICIO_CORTO } from "@/lib/domain/etiquetas";
import { formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { habilitacionPara } from "./_lib/habilitacion";

export const metadata: Metadata = {
  title: "Declaraciones",
  description: "Planillas de servicios presentadas ante Control de Empresas (Art. 9.º a, Ord. 2681/98).",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ESTADOS = Object.keys(ESTADO_DECLARACION) as Enums<"estado_declaracion">[];
const TIPOS = Object.keys(TIPO_SERVICIO) as Enums<"tipo_servicio">[];

function primero(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

function enLista<T extends string>(valor: string | undefined, lista: readonly T[]): T | undefined {
  return lista.find((v) => v === valor);
}

export default async function DeclaracionesPage({ searchParams }: Props) {
  const sesion = await requerirEmpresa();
  const empresa = sesion.empresa;
  const sp = await searchParams;
  const estado = enLista(primero(sp.estado), ESTADOS);
  const tipo = enLista(primero(sp.tipo), TIPOS);
  const codigo = primero(sp.q)?.trim() || undefined;
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);
  const hayFiltros = Boolean(estado || tipo || codigo);

  const [{ filas, total }, resumen, antelacion] = await Promise.all([
    getDeclaraciones(empresa.id, { estado, tipo, codigo, desde, hasta }),
    getResumenDeclaraciones(empresa.id),
    getAntelacion(),
  ]);
  const totalGeneral = Object.values(resumen).reduce((a, b) => a + b, 0);
  // El aviso general refleja el tipo que la empresa puede declarar (si solo tiene tanques, no se le habla de fumigación).
  const habilitacion = habilitacionPara(empresa, empresa.habilita_fumigacion || !empresa.habilita_tanques ? "fumigacion" : "tanque");
  const esTecnico = sesion.perfil.rol === "tecnico";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Declaraciones de servicios"
        description="La planilla en línea reemplaza a la de papel: cargá cada servicio con su rubro, fecha, productos y firma del asesor técnico, y presentala ante Control de Empresas."
        icon={ClipboardList}
        breadcrumb={[{ label: "Inicio", href: "/prestador" }, { label: "Declaraciones" }]}
        actions={
          <>
            {esTecnico ? (
              <Button asChild variant="outline">
                <Link href="/prestador/firmas">
                  <FileSignature aria-hidden />
                  Firmas pendientes
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/prestador/declaraciones/nueva">
                <Plus aria-hidden />
                Nueva declaración
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Borradores"
          value={resumen.borrador}
          icon={FilePenLine}
          tone="neutral"
          hint="En carga, sin presentar"
          href="/prestador/declaraciones?estado=borrador"
        />
        <StatCard
          label="En control"
          value={resumen.presentada}
          icon={Send}
          tone="azul"
          hint="Presentadas, a revisar por el área"
          href="/prestador/declaraciones?estado=presentada"
        />
        <StatCard
          label="Observadas"
          value={resumen.observada}
          icon={MessageSquareWarning}
          tone={resumen.observada > 0 ? "rojo" : "neutral"}
          hint={resumen.observada > 0 ? "Requieren tu corrección" : "Sin observaciones"}
          href="/prestador/declaraciones?estado=observada"
        />
        <StatCard
          label="Controladas"
          value={resumen.controlada}
          icon={ClipboardCheck}
          tone="verde"
          hint="Listas para el timbrado"
          href="/prestador/declaraciones?estado=controlada"
        />
      </div>

      {habilitacion.ok ? (
        <Alert tone="info" title={`Presentá la planilla entre ${antelacion.minHoras} y ${antelacion.maxHoras} horas antes de cada servicio`}>
          Así lo exige el Art. 9.º a de la Ord. 2681/98.
          {empresa.habilita_tanques ? " Las limpiezas de tanques se declaran una vez realizadas, con los análisis del agua." : ""}{" "}
          Solo las empresas habilitadas pueden presentar declaraciones.
        </Alert>
      ) : (
        <Alert
          tone="warning"
          title={habilitacion.titulo}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/prestador/tramites">Ver trámites</Link>
            </Button>
          }
        >
          {habilitacion.detalle} La planilla se presenta entre {antelacion.minHoras} y {antelacion.maxHoras} horas antes de cada
          servicio (Art. 9.º a, Ord. 2681/98).
        </Alert>
      )}

      {totalGeneral === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Todavía no cargaste declaraciones"
          description={`Creá tu primera planilla: agregá los servicios de los próximos días, pedí la firma del asesor técnico y presentala entre ${antelacion.minHoras} y ${antelacion.maxHoras} horas antes.`}
          action={
            <Button asChild size="lg">
              <Link href="/prestador/declaraciones/nueva">
                <Plus aria-hidden />
                Crear la primera declaración
              </Link>
            </Button>
          }
        />
      ) : (
        <SectionCard
          title="Tus planillas"
          description={hayFiltros ? `${total.toLocaleString("es-AR")} resultados con los filtros aplicados` : `${totalGeneral.toLocaleString("es-AR")} declaraciones en total`}
          icon={ClipboardList}
          flush
          footer={<Paginacion pagina={pagina} total={total} tamanio={tamanio} params={sp} ruta="/prestador/declaraciones" className="w-full" />}
        >
          <div className="border-b border-border px-5 py-3 sm:px-6">
            <FiltrosUrl
              campos={[
                { tipo: "busqueda", nombre: "q", placeholder: "Buscar por código (DJ-…)" },
                {
                  tipo: "select",
                  nombre: "estado",
                  etiqueta: "Estado",
                  opciones: ESTADOS.map((e) => ({ valor: e, label: ESTADO_DECLARACION[e].label })),
                },
                {
                  tipo: "select",
                  nombre: "tipo",
                  etiqueta: "Tipo",
                  opciones: TIPOS.map((t) => ({ valor: t, label: TIPO_SERVICIO[t].label })),
                },
              ]}
            />
          </div>

          {/* Escritorio */}
          <div className="hidden md:block">
            <Table framed={false}>
              <THead>
                <TR>
                  <TH>Código</TH>
                  <TH>Tipo</TH>
                  <TH>Estado</TH>
                  <TH numeric>Certificados</TH>
                  <TH numeric>Sin firma</TH>
                  <TH numeric>Observados</TH>
                  <TH>Primer servicio</TH>
                  <TH>Presentada</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {filas.length === 0 ? (
                  <TEmpty colSpan={9}>No hay declaraciones con esos filtros.</TEmpty>
                ) : (
                  filas.map((d) => {
                    const pendientesFirma = d.pendientes_firma ?? 0;
                    const observados = d.observados ?? 0;
                    return (
                      <TR key={d.id}>
                        <TD>
                          <Link
                            href={`/prestador/declaraciones/${d.id}`}
                            className="font-display font-semibold whitespace-nowrap text-foreground hover:text-azul-700"
                          >
                            {d.codigo ?? "Sin código"}
                          </Link>
                          <span className="block text-xs text-muted-foreground">Creada {formatRelativo(d.created_at)}</span>
                        </TD>
                        <TD>
                          <Badge tone={d.tipo ? TIPO_SERVICIO[d.tipo].tono : "neutral"} size="sm">
                            {d.tipo ? TIPO_SERVICIO_CORTO[d.tipo] : "—"}
                          </Badge>
                        </TD>
                        <TD>
                          <EstadoBadge mapa={ESTADO_DECLARACION} valor={d.estado} size="sm" pulse={d.estado === "presentada"} />
                        </TD>
                        <TD numeric>{d.cantidad_certificados ?? 0}</TD>
                        <TD numeric>
                          <span className={cn(pendientesFirma > 0 && "font-semibold text-warning")}>{pendientesFirma}</span>
                        </TD>
                        <TD numeric>
                          <span className={cn(observados > 0 && "font-semibold text-danger")}>{observados}</span>
                        </TD>
                        <TD className="whitespace-nowrap">
                          <span className="nums-tabular">{formatFechaHora(d.primer_servicio)}</span>
                        </TD>
                        <TD className="whitespace-nowrap text-muted-foreground">
                          {d.presentada_at ? formatFechaHora(d.presentada_at) : "—"}
                        </TD>
                        <TD align="right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/prestador/declaraciones/${d.id}`} aria-label={`Abrir la declaración ${d.codigo ?? ""}`}>
                              {d.estado === "borrador" || d.estado === "observada" ? "Continuar" : "Ver"}
                              <ArrowRight aria-hidden />
                            </Link>
                          </Button>
                        </TD>
                      </TR>
                    );
                  })
                )}
              </TBody>
            </Table>
          </div>

          {/* Celular */}
          <ul className="flex flex-col divide-y divide-border md:hidden">
            {filas.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">No hay declaraciones con esos filtros.</li>
            ) : (
              filas.map((d) => {
                const pendientesFirma = d.pendientes_firma ?? 0;
                const observados = d.observados ?? 0;
                return (
                  <li key={d.id}>
                    <Link
                      href={`/prestador/declaraciones/${d.id}`}
                      className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-azul-50/50 active:bg-azul-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display font-semibold text-foreground">{d.codigo ?? "Sin código"}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.tipo ? TIPO_SERVICIO_CORTO[d.tipo] : "—"} · {d.cantidad_certificados ?? 0} certificados
                          </p>
                        </div>
                        <EstadoBadge mapa={ESTADO_DECLARACION} valor={d.estado} size="sm" pulse={d.estado === "presentada"} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="size-3.5" aria-hidden />
                          {d.primer_servicio ? formatFechaHora(d.primer_servicio) : "Sin servicios"}
                        </span>
                        {pendientesFirma > 0 ? <span className="font-medium text-warning">{pendientesFirma} sin firma</span> : null}
                        {observados > 0 ? <span className="font-medium text-danger">{observados} observados</span> : null}
                      </div>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
