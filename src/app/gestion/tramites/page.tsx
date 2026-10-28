import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleCheckBig, Clock, FileStack, Inbox, ScrollText, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirStaff } from "@/lib/auth";
import {
  ESTADOS_BANDEJA,
  type FiltrosTramites,
  type TipoTramite,
  contarTramitesPorEstado,
  listarTramites,
} from "@/lib/data/empresas";
import { ESTADO_EMPRESA, ESTADO_TRAMITE, TIPO_TRAMITE } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha, formatRelativo, hoyISO } from "@/lib/domain/formato";
import { Constants } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { rutaTramite } from "../_components/rutas";
import { Segmentos } from "../_components/segmentos";

export const metadata: Metadata = {
  title: "Trámites",
  description: "Bandeja de trámites del registro: inscripciones, renovaciones y cambios.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const ETIQUETA_SEGMENTO: Record<FiltrosTramites["estado"], string> = {
  presentado: "Pendientes",
  observado: "Observados",
  aprobado: "Aprobados",
  rechazado: "Rechazados",
  todos: "Todos",
};

/** Días que lleva esperando un trámite presentado (para resaltar demoras: inspección en 15 días, Art. 4.º). */
function espera(presentado: string | null): number | null {
  if (!presentado) return null;
  const dias = diasHasta(hoyISO(new Date(presentado)));
  return dias === null ? null : -dias;
}

export default async function BandejaTramitesPage({ searchParams }: Props) {
  await requerirStaff();
  const sp = await searchParams;

  const estadoParam = primero(sp.estado);
  const estado: FiltrosTramites["estado"] =
    estadoParam === "todos" || (ESTADOS_BANDEJA as readonly string[]).includes(estadoParam ?? "")
      ? (estadoParam as FiltrosTramites["estado"])
      : "presentado";
  const tipoParam = primero(sp.tipo);
  const tipo = (Constants.public.Enums.tipo_tramite as readonly string[]).includes(tipoParam ?? "")
    ? (tipoParam as TipoTramite)
    : undefined;
  const q = primero(sp.q)?.trim() || undefined;
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);

  const [{ filas, total }, conteos] = await Promise.all([
    listarTramites({ estado, tipo, q, desde, hasta }),
    contarTramitesPorEstado(),
  ]);

  const hrefEstado = (e: FiltrosTramites["estado"]) => {
    const p = new URLSearchParams();
    if (e !== "presentado") p.set("estado", e);
    if (tipo) p.set("tipo", tipo);
    if (q) p.set("q", q);
    return `/gestion/tramites${p.size ? `?${p}` : ""}`;
  };
  const hayFiltros = Boolean(tipo || q);
  const pendientes = estado === "presentado" || estado === "observado";

  return (
    <>
      <PageHeader
        title="Trámites del registro"
        description="Inscripciones, renovaciones anuales, cambios de asesor técnico o de domicilio, altas de productos y bajas presentadas por las empresas."
        icon={ScrollText}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Prestadores" }, { label: "Trámites" }]}
        actions={
          <Button asChild variant="outline">
            <Link href="/gestion/empresas">
              Padrón de empresas
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      >
        <Segmentos
          etiqueta="Estado de los trámites"
          items={[...ESTADOS_BANDEJA, "todos" as const].map((e) => ({
            href: hrefEstado(e),
            etiqueta: ETIQUETA_SEGMENTO[e],
            activo: estado === e,
            contador: conteos[e],
            alerta: e === "presentado",
          }))}
        />
      </PageHeader>

      <SectionCard
        title={ETIQUETA_SEGMENTO[estado]}
        description={
          pendientes
            ? "Ordenados por antigüedad: primero los que esperan hace más tiempo"
            : "Ordenados por fecha de la última actualización"
        }
        icon={estado === "presentado" ? Inbox : FileStack}
        flush
        footer={<Paginacion pagina={pagina} total={total} tamanio={tamanio} params={sp} ruta="/gestion/tramites" className="w-full" />}
      >
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <FiltrosUrl
            campos={[
              { tipo: "busqueda", nombre: "q", placeholder: "Buscá por empresa, CUIT o código" },
              {
                tipo: "select",
                nombre: "tipo",
                etiqueta: "Tipo",
                opciones: Constants.public.Enums.tipo_tramite.map((t) => ({ valor: t, label: TIPO_TRAMITE[t].label })),
              },
            ]}
          />
        </div>

        {filas.length === 0 ? (
          <div className="p-5 sm:p-6">
            {hayFiltros ? (
              <EmptyState
                compact
                icon={SearchX}
                title="No hay trámites con esos filtros"
                description="Probá con otro tipo de trámite o con otro texto de búsqueda."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href={estado === "presentado" ? "/gestion/tramites" : `/gestion/tramites?estado=${estado}`}>
                      Limpiar filtros
                    </Link>
                  </Button>
                }
              />
            ) : estado === "presentado" ? (
              <EmptyState
                compact
                icon={CircleCheckBig}
                title="¡Bandeja al día!"
                description="No hay trámites pendientes de resolución. Cuando una empresa presente uno, lo vas a ver acá."
              />
            ) : (
              <EmptyState compact icon={Inbox} title={`No hay trámites ${ETIQUETA_SEGMENTO[estado].toLowerCase()}`} />
            )}
          </div>
        ) : (
          <>
            {/* Móvil: tarjetas */}
            <ul className="divide-y divide-border md:hidden">
              {filas.map((t) => {
                const dias = t.estado === "presentado" ? espera(t.presentado_at) : null;
                return (
                  <li key={t.id}>
                    <Link
                      href={t.id ? rutaTramite(t.id) : "/gestion/tramites"}
                      className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-azul-50/50 active:bg-azul-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{t.tipo ? TIPO_TRAMITE[t.tipo].label : "Trámite"}</p>
                          <p className="truncate text-sm text-muted-foreground">{t.empresa_nombre}</p>
                        </div>
                        <EstadoBadge mapa={ESTADO_TRAMITE} valor={t.estado} size="sm" />
                      </div>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="nums-tabular">{t.codigo}</span>
                        <span>Presentado {formatRelativo(t.presentado_at ?? t.created_at)}</span>
                        <span>{t.cantidad_documentos ?? 0} documentos</span>
                        {dias !== null && dias > 15 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-danger">
                            <Clock className="size-3.5" aria-hidden />
                            {dias} días de espera
                          </span>
                        ) : null}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Escritorio: tabla */}
            <Table framed={false} containerClassName="hidden md:block">
              <THead>
                <TR>
                  <TH>Código</TH>
                  <TH>Trámite</TH>
                  <TH>Empresa</TH>
                  <TH>Presentado</TH>
                  <TH numeric>Docs.</TH>
                  <TH>Estado</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {filas.map((t) => {
                  const dias = t.estado === "presentado" ? espera(t.presentado_at) : null;
                  return (
                    <TR key={t.id}>
                      <TD className="font-semibold whitespace-nowrap nums-tabular">
                        <Link href={t.id ? rutaTramite(t.id) : "/gestion/tramites"} className="text-azul-700 hover:underline">
                          {t.codigo ?? "—"}
                        </Link>
                      </TD>
                      <TD>
                        <EstadoBadge mapa={TIPO_TRAMITE} valor={t.tipo} size="sm" />
                      </TD>
                      <TD>
                        <span className="block max-w-64 truncate font-medium">{t.empresa_nombre}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="nums-tabular">{t.empresa_cuit}</span>
                          {t.empresa_estado && t.empresa_estado !== "habilitada" ? (
                            <Badge tone={ESTADO_EMPRESA[t.empresa_estado].tono} size="sm">
                              {ESTADO_EMPRESA[t.empresa_estado].label}
                            </Badge>
                          ) : null}
                        </span>
                      </TD>
                      <TD className="whitespace-nowrap">
                        <span className="block nums-tabular">{formatFecha(t.presentado_at ?? t.created_at)}</span>
                        <span
                          className={cn(
                            "text-xs",
                            dias !== null && dias > 15 ? "font-semibold text-danger" : "text-muted-foreground",
                          )}
                        >
                          {dias !== null && dias > 15 ? `${dias} días de espera` : formatRelativo(t.presentado_at ?? t.created_at)}
                        </span>
                      </TD>
                      <TD numeric>{t.cantidad_documentos ?? 0}</TD>
                      <TD>
                        <div className="flex flex-col items-start gap-1">
                          <EstadoBadge mapa={ESTADO_TRAMITE} valor={t.estado} size="sm" pulse={t.estado === "presentado"} />
                          {t.resuelto_at ? <span className="text-xs text-muted-foreground">el {formatFecha(t.resuelto_at)}</span> : null}
                        </div>
                      </TD>
                      <TD align="right">
                        <Button asChild variant={t.estado === "presentado" ? "secondary" : "ghost"} size="sm">
                          <Link href={t.id ? rutaTramite(t.id) : "/gestion/tramites"}>
                            {t.estado === "presentado" ? "Resolver" : "Ver"}
                            <ArrowRight aria-hidden />
                          </Link>
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </>
        )}
      </SectionCard>
    </>
  );
}
