import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CalendarX2,
  ChevronRight,
  ClipboardCheck,
  Receipt,
  SearchX,
  ShieldCheck,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import {
  type CertificadoListado,
  ESTADOS_CERTIFICADO,
  TIPOS_SERVICIO,
  VIGENCIAS_FILTRO,
  buscarCertificados,
  filtrosCertificadosDesdeParams,
  getOpcionesFiltroCertificados,
  getResumenCertificados,
} from "@/lib/data/control";
import { ESTADO_CERTIFICADO, TIPO_SERVICIO, TIPO_SERVICIO_CORTO, VIGENCIA } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha, formatFechaHora } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificados" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CertificadosPage({ searchParams }: Props) {
  await requerirStaff();
  const sp = await searchParams;
  const filtros = filtrosCertificadosDesdeParams(sp);
  const { pagina, desde, hasta } = rangoPagina(sp.pagina);

  const [{ filas, total }, resumen, opciones] = await Promise.all([
    buscarCertificados(filtros, { desde, hasta }),
    getResumenCertificados(filtros.empresa),
    getOpcionesFiltroCertificados(),
  ]);

  const empresa = filtros.empresa ? opciones.empresas.find((e) => e.id === filtros.empresa) : undefined;
  const hayFiltros = Object.values(filtros).some(Boolean);
  const conEmpresa = (extra: Record<string, string>) => {
    const p = new URLSearchParams(extra);
    if (filtros.empresa) p.set("empresa", filtros.empresa);
    return `/gestion/certificados?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title={empresa ? `Certificados de ${empresa.nombre}` : "Certificados"}
        description="Buscá cualquier certificado por número, cliente, domicilio, código de verificación (QR) o sello de timbrado."
        icon={BadgeCheck}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Certificados", href: empresa ? "/gestion/certificados" : undefined },
          ...(empresa ? [{ label: empresa.nombre }] : []),
        ]}
        actions={
          empresa ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/gestion/empresas/${empresa.id}`}>
                  <Building2 aria-hidden />
                  Legajo
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/gestion/pagos?empresa=${empresa.id}`}>
                  <Receipt aria-hidden />
                  Pagos
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild variant="outline">
              <Link href="/gestion/control">
                <ClipboardCheck aria-hidden />
                Bandeja de control
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Timbrados vigentes"
            value={resumen.vigentes}
            icon={ShieldCheck}
            tone="verde"
            hint="Válidos ante una inspección"
            href={conEmpresa({ vigencia: "vigente" })}
          />
          <StatCard
            label="Por vencer"
            value={resumen.porVencer}
            icon={CalendarClock}
            tone="ambar"
            hint="Vencen en los próximos 15 días"
            href={conEmpresa({ vigencia: "por_vencer" })}
          />
          <StatCard
            label="Vencidos"
            value={resumen.vencidos}
            icon={CalendarX2}
            tone="rojo"
            hint="Base de la hoja de ruta"
            href={conEmpresa({ vigencia: "vencido" })}
          />
          <StatCard
            label="A controlar"
            value={resumen.aControlar}
            icon={ClipboardCheck}
            tone="azul"
            hint="Declarados en planillas presentadas"
            href={filtros.empresa ? conEmpresa({ estado: "declarado" }) : "/gestion/control"}
          />
        </div>

        <SectionCard
          title={hayFiltros ? "Resultados de la búsqueda" : "Todos los certificados"}
          description={
            total === 0
              ? "Sin resultados"
              : `${total.toLocaleString("es-AR")} ${total === 1 ? "certificado" : "certificados"} · del servicio más reciente al más antiguo`
          }
          icon={BadgeCheck}
          flush
          footer={total > 0 ? <Paginacion pagina={pagina} total={total} params={sp} ruta="/gestion/certificados" className="w-full" /> : undefined}
        >
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <FiltrosUrl
              campos={[
                {
                  tipo: "busqueda",
                  nombre: "q",
                  placeholder: "N.º, cliente, domicilio, código QR o sello",
                  className: "sm:w-80",
                },
                {
                  tipo: "select",
                  nombre: "empresa",
                  etiqueta: "Empresa",
                  opciones: opciones.empresas.map((e) => ({ valor: e.id, label: e.nombre })),
                  className: "sm:w-64",
                },
                {
                  tipo: "select",
                  nombre: "estado",
                  etiqueta: "Estado",
                  opciones: ESTADOS_CERTIFICADO.map((e) => ({ valor: e, label: ESTADO_CERTIFICADO[e].label })),
                },
                {
                  tipo: "select",
                  nombre: "vigencia",
                  etiqueta: "Vigencia",
                  opciones: VIGENCIAS_FILTRO.map((v) => ({ valor: v, label: VIGENCIA[v].label })),
                },
                {
                  tipo: "select",
                  nombre: "tipo",
                  etiqueta: "Servicio",
                  opciones: TIPOS_SERVICIO.map((t) => ({ valor: t, label: TIPO_SERVICIO[t].label })),
                },
                {
                  tipo: "select",
                  nombre: "grupo",
                  etiqueta: "Grupo de rubro",
                  opciones: opciones.grupos.map((g) => ({ valor: g, label: g })),
                },
                { tipo: "fecha", nombre: "desde", etiqueta: "Servicio desde" },
                { tipo: "fecha", nombre: "hasta", etiqueta: "hasta" },
              ]}
            />
          </div>

          {filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={SearchX}
                title={hayFiltros ? "No encontramos certificados" : "Todavía no hay certificados"}
                description={
                  hayFiltros
                    ? "Probá con otros filtros o buscá por el código de verificación que figura debajo del QR."
                    : "Cuando las empresas carguen sus planillas de servicios, los certificados van a aparecer acá."
                }
                action={
                  hayFiltros ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/gestion/certificados">Limpiar filtros</Link>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <Table framed={false} containerClassName="hidden xl:block">
                <THead>
                  <TR>
                    <TH>Certificado</TH>
                    <TH>Empresa</TH>
                    <TH>Cliente y rubro</TH>
                    <TH>Servicio y vencimiento</TH>
                    <TH>Estado</TH>
                    <TH>
                      <span className="sr-only">Acciones</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {filas.map((c) => (
                    <TR key={c.id ?? `${c.empresa_id}-${c.numero}`}>
                      <TD className="align-top">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/gestion/certificados/${c.id}`}
                            className="font-semibold whitespace-nowrap text-foreground transition-colors hover:text-azul-700"
                          >
                            N.º {c.numero}
                          </Link>
                          <Badge tone={c.tipo === "tanque" ? "celeste" : "azul"} size="sm">
                            {c.tipo ? TIPO_SERVICIO_CORTO[c.tipo] : "Servicio"}
                          </Badge>
                        </div>
                      </TD>
                      <TD className="max-w-48 align-top">
                        {c.empresa_id && !filtros.empresa ? (
                          <Link
                            href={`/gestion/certificados?empresa=${c.empresa_id}`}
                            className="line-clamp-2 text-[13px] font-medium text-foreground transition-colors hover:text-azul-700"
                            title={`Ver los certificados de ${c.empresa_nombre ?? "la empresa"}`}
                          >
                            {c.empresa_nombre ?? "—"}
                          </Link>
                        ) : (
                          <span className="line-clamp-2 text-[13px] font-medium">{c.empresa_nombre ?? "—"}</span>
                        )}
                      </TD>
                      <TD className="max-w-72 align-top">
                        <p className="line-clamp-1 font-medium">{c.cliente ?? "—"}</p>
                        <p className="line-clamp-1 text-[13px] text-muted-foreground">{c.domicilio ?? "—"}</p>
                        {c.rubro_nombre ? (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {c.rubro_grupo ? `${c.rubro_grupo} · ` : ""}
                            {c.rubro_nombre}
                          </p>
                        ) : null}
                      </TD>
                      <TD className="align-top whitespace-nowrap">
                        <p className="nums-tabular text-[13px] text-foreground">
                          {c.fecha_servicio ? formatFechaHora(c.fecha_servicio) : "—"}
                        </p>
                        <Vencimiento certificado={c} conEtiqueta />
                      </TD>
                      <TD className="align-top">
                        <EstadoCertificado certificado={c} />
                      </TD>
                      <TD align="right" className="align-top">
                        <Button asChild variant="ghost" size="icon-sm">
                          <Link href={`/gestion/certificados/${c.id}`} aria-label={`Ver el certificado N.º ${c.numero ?? ""}`}>
                            <ChevronRight aria-hidden />
                          </Link>
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>

              <ul className="divide-y divide-border xl:hidden">
                {filas.map((c) => (
                  <li key={c.id ?? `${c.empresa_id}-${c.numero}`} className="relative flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-azul-50/40 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/gestion/certificados/${c.id}`}
                            className="font-display text-[15px] font-semibold text-foreground after:absolute after:inset-0"
                          >
                            N.º {c.numero}
                          </Link>
                          <Badge tone={c.tipo === "tanque" ? "celeste" : "azul"} size="sm">
                            {c.tipo ? TIPO_SERVICIO_CORTO[c.tipo] : "Servicio"}
                          </Badge>
                        </span>
                        <p className="truncate text-[13px] text-muted-foreground">{c.empresa_nombre ?? "—"}</p>
                      </div>
                      <EstadoCertificado certificado={c} alineado="derecha" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{c.cliente ?? "—"}</p>
                      <p className="text-[13px] text-muted-foreground">{c.domicilio ?? "—"}</p>
                      {c.rubro_nombre ? (
                        <p className="text-xs text-muted-foreground">
                          {c.rubro_grupo ? `${c.rubro_grupo} · ` : ""}
                          {c.rubro_nombre}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Servicio</span>
                        <span className="nums-tabular">{c.fecha_servicio ? formatFechaHora(c.fecha_servicio) : "—"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Vencimiento</span>
                        <Vencimiento certificado={c} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionCard>

        <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
          <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-azul-600" aria-hidden />
          Los certificados son válidos solo una vez timbrados (pago verificado y sellado digital). El QR de cada certificado
          permite a inspectores y vecinos confirmar su validez.
        </p>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------- */

function EstadoCertificado({
  certificado: c,
  alineado = "izquierda",
}: {
  certificado: CertificadoListado;
  alineado?: "izquierda" | "derecha";
}) {
  const mostrarVigencia = c.estado === "timbrado" && c.vigencia && c.vigencia !== "sin_timbrar";
  return (
    <div className={cn("flex flex-col gap-1", alineado === "derecha" ? "items-end" : "items-start")}>
      <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" />
      {mostrarVigencia ? <EstadoBadge mapa={VIGENCIA} valor={c.vigencia} size="sm" /> : null}
    </div>
  );
}

function Vencimiento({ certificado: c, conEtiqueta = false }: { certificado: CertificadoListado; conEtiqueta?: boolean }) {
  if (!c.fecha_vencimiento) {
    return <span className="text-[13px] text-muted-foreground">{c.fecha_servicio ? "Sin vencimiento" : "—"}</span>;
  }
  const dias = diasHasta(c.fecha_vencimiento);
  const relevante = c.estado === "timbrado" && dias !== null;
  return (
    <span className="flex flex-col">
      <span className={cn("nums-tabular text-[13px]", conEtiqueta ? "text-muted-foreground" : "text-foreground")}>
        {conEtiqueta ? "Vence " : ""}
        {formatFecha(c.fecha_vencimiento)}
      </span>
      {relevante ? (
        <span
          className={cn(
            "text-xs",
            dias < 0 ? "font-medium text-red-700" : dias <= 15 ? "font-medium text-amber-800" : "text-muted-foreground",
          )}
        >
          {dias < 0
            ? `Venció hace ${Math.abs(dias) === 1 ? "1 día" : `${Math.abs(dias)} días`}`
            : dias === 0
              ? "Vence hoy"
              : `Vence en ${dias === 1 ? "1 día" : `${dias} días`}`}
        </span>
      ) : null}
    </span>
  );
}
