import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Building, Building2, Megaphone, PenLine, SearchX, Siren, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { type AvisoListado, listarAvisos, type NivelAviso, opcionesEmpresas, resumenAvisos } from "@/lib/data/admin";
import { formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { Constants } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { AccionConfirmada } from "../configuracion/_compartido/acciones-cliente";
import { eliminarAviso } from "./actions";
import { FormAviso } from "./_components/form-aviso";
import { ESTILO_NIVEL } from "./_components/niveles";

export const metadata: Metadata = {
  title: "Avisos a empresas",
  description: "Comunicaciones de la Dirección a las empresas prestadoras.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const TAMANIO = 10;

export default async function AvisosGestionPage({ searchParams }: Props) {
  const sesion = await requerirStaff();
  const puedeEnviar = sesion.perfil.rol === "admin" || sesion.perfil.rol === "control";
  const sp = await searchParams;

  const q = primero(sp.q)?.trim() || undefined;
  const nivelParam = primero(sp.nivel);
  const nivel = (Constants.public.Enums.nivel_aviso as readonly string[]).includes(nivelParam ?? "")
    ? (nivelParam as NivelAviso)
    : undefined;
  const destinoParam = primero(sp.destino);
  const destino = destinoParam === "todas" || destinoParam === "empresa" ? destinoParam : undefined;
  const empresaParam = primero(sp.empresa);
  const { pagina, desde, hasta } = rangoPagina(sp.pagina, TAMANIO);

  const [{ filas, total }, resumen, empresas] = await Promise.all([
    listarAvisos({ q, nivel, destino, empresa: empresaParam, desde, hasta }),
    resumenAvisos(),
    opcionesEmpresas(),
  ]);
  const hayFiltros = Boolean(q || nivel || destino || empresaParam);
  const empresaFiltrada = empresaParam ? empresas.find((e) => e.id === empresaParam) : undefined;

  const listado = (
    <SectionCard
      title="Avisos enviados"
      description={
        empresaFiltrada
          ? `Dirigidos a ${empresaFiltrada.nombre_comercial} · ${total} en total`
          : `${total.toLocaleString("es-AR")} ${total === 1 ? "aviso" : "avisos"}${hayFiltros ? " (filtrado)" : ""}`
      }
      icon={BellRing}
      flush
      footer={
        total > 0 ? (
          <Paginacion pagina={pagina} total={total} tamanio={TAMANIO} params={sp} ruta="/gestion/avisos" className="w-full" />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:px-6">
        {empresaFiltrada ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Solo avisos para
            <Badge tone="violeta">
              <Building aria-hidden />
              {empresaFiltrada.nombre_comercial}
            </Badge>
            <Link href="/gestion/avisos" className="font-medium text-azul-700 underline-offset-2 hover:underline">
              Ver todos
            </Link>
          </p>
        ) : null}
        <FiltrosUrl
          campos={[
            { tipo: "busqueda", nombre: "q", placeholder: "Buscá en título o mensaje", className: "sm:w-60" },
            {
              tipo: "select",
              nombre: "nivel",
              etiqueta: "Nivel",
              opciones: Constants.public.Enums.nivel_aviso.map((n) => ({ valor: n, label: ESTILO_NIVEL[n].etiqueta })),
              className: "sm:w-44",
            },
            {
              tipo: "select",
              nombre: "destino",
              etiqueta: "Destino",
              opciones: [
                { valor: "todas", label: "Todas las empresas" },
                { valor: "empresa", label: "Una empresa" },
              ],
              className: "sm:w-48",
            },
          ]}
        />
      </div>
      {filas.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState
            compact
            icon={hayFiltros ? SearchX : Megaphone}
            title={hayFiltros ? "No hay avisos con esos filtros" : "Todavía no se enviaron avisos"}
            description={
              hayFiltros
                ? "Probá con otras palabras o limpiá los filtros."
                : "Usá los avisos para recordar plazos, informar cambios normativos o convocar a capacitaciones."
            }
            action={
              hayFiltros ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/gestion/avisos">Limpiar filtros</Link>
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {filas.map((a) => (
            <ItemAviso key={a.id} aviso={a} puedeEliminar={puedeEnviar} />
          ))}
        </ol>
      )}
    </SectionCard>
  );

  return (
    <>
      <PageHeader
        title="Avisos a empresas"
        description="Comunicaciones de la Dirección que las empresas prestadoras ven en su panel: recordatorios de plazos, novedades normativas, campañas y urgencias."
        icon={Megaphone}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Comunidad" }, { label: "Avisos a empresas" }]}
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Avisos enviados" value={resumen.total} icon={BellRing} tone="azul" hint="Historial completo" />
          <StatCard
            label="Para todas las empresas"
            value={resumen.generales}
            icon={Building2}
            tone="celeste"
            href="/gestion/avisos?destino=todas"
            hint="Comunicaciones generales"
          />
          <StatCard
            label="Dirigidos a una empresa"
            value={resumen.dirigidos}
            icon={Building}
            tone="violeta"
            href="/gestion/avisos?destino=empresa"
            hint="Comunicaciones particulares"
          />
          <StatCard
            label="Urgentes (30 días)"
            value={resumen.urgentes30}
            icon={Siren}
            tone={resumen.urgentes30 > 0 ? "rojo" : "neutral"}
            href="/gestion/avisos?nivel=urgente"
            hint="Requieren acción inmediata"
          />
        </div>

        {puedeEnviar ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <SectionCard
              title="Nuevo aviso"
              description="Redactalo, elegí a quién va y revisá cómo se verá."
              icon={PenLine}
              className="lg:sticky lg:top-24"
            >
              <FormAviso empresas={empresas} empresaInicial={empresaParam} />
            </SectionCard>
            {listado}
          </div>
        ) : (
          listado
        )}
      </div>
    </>
  );
}

function ItemAviso({ aviso, puedeEliminar }: { aviso: AvisoListado; puedeEliminar: boolean }) {
  const estilo = ESTILO_NIVEL[aviso.nivel];
  const Icono = estilo.icono;
  const autor = aviso.autor ? `${aviso.autor.nombre} ${aviso.autor.apellido}`.trim() || aviso.autor.email : null;
  return (
    <li className="group relative flex gap-4 px-5 py-4 transition-colors hover:bg-azul-50/40 sm:px-6">
      <span aria-hidden className={cn("absolute inset-y-3 left-0 w-1 rounded-r-full", estilo.acento)} />
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1", estilo.icon)}>
        <Icono className="size-5" aria-hidden />
        <span className="sr-only">{estilo.etiqueta}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 className="font-semibold leading-snug text-foreground">{aviso.titulo}</h3>
          <time dateTime={aviso.created_at} title={formatFechaHora(aviso.created_at)} className="text-xs whitespace-nowrap text-muted-foreground">
            {formatRelativo(aviso.created_at)}
          </time>
        </div>
        <p className="line-clamp-3 text-sm leading-relaxed whitespace-pre-line text-foreground/80">{aviso.cuerpo}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {aviso.empresa ? (
            <Link href={`/gestion/empresas/${aviso.empresa.id}`} className="rounded-full">
              <Badge tone="violeta" size="sm" className="hover:ring-violet-300">
                <Building aria-hidden />
                {aviso.empresa.nombre_comercial}
              </Badge>
            </Link>
          ) : aviso.empresa_id ? (
            <Badge tone="neutral" size="sm">
              Empresa dada de baja
            </Badge>
          ) : (
            <Badge tone="celeste" size="sm">
              <Building2 aria-hidden />
              Todas las empresas
            </Badge>
          )}
          {autor ? <span>Enviado por {autor}</span> : null}
        </div>
      </div>
      {puedeEliminar ? (
        <div className="shrink-0 self-start">
          <AccionConfirmada
            accion={eliminarAviso}
            campos={{ id: aviso.id }}
            titulo="¿Eliminar este aviso?"
            descripcion={`"${aviso.titulo}" deja de verse en el panel de ${aviso.empresa ? aviso.empresa.nombre_comercial : "las empresas"}.`}
            confirmar="Sí, eliminar"
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground opacity-70 hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                aria-label={`Eliminar el aviso "${aviso.titulo}"`}
              >
                <Trash2 aria-hidden />
              </Button>
            }
          />
        </div>
      ) : null}
    </li>
  );
}
