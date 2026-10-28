import type { Metadata } from "next";
import Link from "next/link";
import {
  ArchiveRestore,
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  Droplets,
  Plus,
  Route,
  Store,
} from "lucide-react";
import { Mapa } from "@/components/mapa/mapa";
import {
  peorEstado,
  type PuntoMapa,
  tieneCoordenadas,
} from "@/components/mapa/tipos";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requerirStaff } from "@/lib/auth";
import {
  contarEstablecimientosDeBaja,
  type FilaEstablecimiento,
  getEstablecimientos,
  getEstablecimientosDeBaja,
  getGruposRubro,
  getPuntosEstablecimientos,
  getResumenEstablecimientos,
  getTerritorio,
  LIMITE_MAPA,
  leerFiltrosEstablecimientos,
  param,
} from "@/lib/data/fiscalizacion";
import { ESTADO_OBLIGACION } from "@/lib/domain/etiquetas";
import { formatFecha } from "@/lib/domain/formato";
import { Obligacion } from "../hoja-de-ruta/_components/obligacion";
import { VistaListaMapa } from "../hoja-de-ruta/_components/vista-lista-mapa";

export const metadata: Metadata = {
  title: "Establecimientos",
  description:
    "Padrón de establecimientos alcanzados por la fumigación obligatoria y la limpieza de tanques.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EstablecimientosPage({ searchParams }: Props) {
  await requerirStaff();
  const sp = await searchParams;
  const filtros = leerFiltrosEstablecimientos(sp);
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);

  if (param(sp.baja) === "si") {
    return <DadosDeBaja q={filtros.q} sp={sp} />;
  }

  const [
    { filas, total },
    puntosRaw,
    resumen,
    territorio,
    grupos,
    cantidadBajas,
  ] = await Promise.all([
    getEstablecimientos(filtros, { desde, hasta }),
    getPuntosEstablecimientos(filtros),
    getResumenEstablecimientos(),
    getTerritorio(),
    getGruposRubro(),
    contarEstablecimientosDeBaja(),
  ]);

  const puntos: PuntoMapa[] = puntosRaw.filter(tieneCoordenadas).flatMap((p) =>
    p.id
      ? [
          {
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            titulo: p.nombre ?? "Establecimiento",
            subtitulo: [p.domicilio, p.barrio].filter(Boolean).join(" · "),
            estado: peorEstado(p.estado_fumigacion, p.estado_tanque),
            detalle: p.rubro_nombre,
            href: `/gestion/establecimientos/${p.id}`,
          },
        ]
      : [],
  );
  const hayFiltros = Object.values(filtros).some(Boolean);

  const lista = (
    <SectionCard
      title="Padrón"
      description={
        total === 0
          ? "Sin resultados"
          : `${total.toLocaleString("es-AR")} ${total === 1 ? "establecimiento" : "establecimientos"}`
      }
      icon={Store}
      flush
      footer={
        total > tamanio ? (
          <Paginacion
            pagina={pagina}
            total={total}
            params={sp}
            ruta="/gestion/establecimientos"
            className="w-full"
          />
        ) : undefined
      }
    >
      {filas.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState
            compact
            icon={Store}
            title={
              hayFiltros
                ? "No hay establecimientos con esos filtros"
                : "El padrón está vacío"
            }
            description={
              hayFiltros
                ? "Probá con otra búsqueda o limpiá los filtros."
                : "Cargá los establecimientos alcanzados o se agregan solos cuando las empresas declaran servicios."
            }
            action={
              <Button
                asChild
                size="sm"
                variant={hayFiltros ? "outline" : "primary"}
              >
                <Link
                  href={
                    hayFiltros
                      ? "/gestion/establecimientos"
                      : "/gestion/establecimientos/nuevo"
                  }
                >
                  {hayFiltros ? "Ver todos" : "Nuevo establecimiento"}
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <ul role="list" className="divide-y divide-border">
          {filas.map((f, i) => (
            <FilaPadron key={f.id ?? i} fila={f} />
          ))}
        </ul>
      )}
    </SectionCard>
  );

  return (
    <>
      <PageHeader
        title="Establecimientos"
        description="Padrón de inmuebles alcanzados por la fumigación obligatoria (Anexo, Ord. 2681/98) y la limpieza de tanques (Ord. 2004/92)."
        icon={Store}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Fiscalización" },
          { label: "Establecimientos" },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/gestion/hoja-de-ruta">
                <Route aria-hidden /> Hoja de ruta
              </Link>
            </Button>
            <Button asChild>
              <Link href="/gestion/establecimientos/nuevo">
                <Plus aria-hidden /> Nuevo establecimiento
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="En el padrón"
            value={resumen.total}
            icon={Store}
            tone="azul"
            hint="Establecimientos activos"
          />
          <StatCard
            label="Al día"
            value={resumen.alDia}
            icon={BadgeCheck}
            tone="verde"
            hint={
              resumen.total > 0
                ? `${Math.round((resumen.alDia / resumen.total) * 100)} % del padrón`
                : undefined
            }
            href="/gestion/establecimientos?estado=vigente"
          />
          <StatCard
            label="Vencidos o sin certificado"
            value={resumen.enFalta}
            icon={CircleAlert}
            tone="rojo"
            hint="Fumigación o tanques"
            href="/gestion/hoja-de-ruta"
          />
          <StatCard
            label="Con tanque de reserva"
            value={resumen.conTanque}
            icon={Droplets}
            tone="celeste"
            hint="Limpieza cada 180 días"
            href="/gestion/establecimientos?tanque=si"
          />
        </div>

        <Card className="p-4">
          <FiltrosUrl
            campos={[
              {
                tipo: "busqueda",
                nombre: "q",
                placeholder: "Nombre, domicilio, barrio o CUIT…",
                className: "sm:w-72",
              },
              {
                tipo: "select",
                nombre: "zona",
                etiqueta: "Zona",
                opciones: territorio.zonas.map((z) => ({ valor: z, label: z })),
                className: "sm:w-40",
              },
              {
                tipo: "select",
                nombre: "grupo",
                etiqueta: "Rubro",
                opciones: grupos.map((g) => ({ valor: g, label: g })),
              },
              {
                tipo: "select",
                nombre: "estado",
                etiqueta: "Estado",
                opciones: [
                  { valor: "vencido", label: ESTADO_OBLIGACION.vencido.label },
                  {
                    valor: "sin_certificado",
                    label: ESTADO_OBLIGACION.sin_certificado.label,
                  },
                  {
                    valor: "por_vencer",
                    label: ESTADO_OBLIGACION.por_vencer.label,
                  },
                  { valor: "vigente", label: ESTADO_OBLIGACION.vigente.label },
                ],
                className: "sm:w-44",
              },
              {
                tipo: "select",
                nombre: "tanque",
                etiqueta: "Tanque",
                opciones: [
                  { valor: "si", label: "Con tanque" },
                  { valor: "no", label: "Sin tanque" },
                ],
                className: "sm:w-40",
              },
            ]}
          />
        </Card>

        <VistaListaMapa
          cantidadMapa={puntos.length}
          lista={lista}
          mapa={
            <Mapa
              puntos={puntos}
              ajustar={puntos.length > 0}
              titulo="Mapa del padrón de establecimientos"
              altoClassName="h-[62vh] min-h-80 xl:h-[calc(100dvh-12rem)]"
              vacio="No hay establecimientos con ubicación para estos filtros"
              sinUbicacion={puntosRaw.length - puntos.length}
              nota={
                total > LIMITE_MAPA
                  ? `El mapa muestra los primeros ${LIMITE_MAPA.toLocaleString("es-AR")} resultados: filtrá por zona o barrio para ver el resto.`
                  : null
              }
            />
          }
        />

        {cantidadBajas > 0 ? (
          <p className="text-sm text-muted-foreground">
            <Link
              href="/gestion/establecimientos?baja=si"
              className="inline-flex items-center gap-1.5 font-medium text-azul-700 underline-offset-2 hover:underline"
            >
              <ArchiveRestore className="size-4" aria-hidden />
              Ver{" "}
              {cantidadBajas === 1
                ? "el establecimiento dado de baja"
                : `los ${cantidadBajas} establecimientos dados de baja`}
            </Link>{" "}
            (no figuran en el padrón ni en la hoja de ruta; se pueden reactivar
            desde su ficha).
          </p>
        ) : null}
      </div>
    </>
  );
}

async function DadosDeBaja({
  q,
  sp,
}: {
  q?: string;
  sp: Record<string, string | string[] | undefined>;
}) {
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);
  const { filas, total } = await getEstablecimientosDeBaja(q, { desde, hasta });
  return (
    <>
      <PageHeader
        title="Establecimientos dados de baja"
        description="Inmuebles que ya no están alcanzados (cerraron, cambiaron de destino o estaban duplicados). Abrí la ficha para reactivarlos."
        icon={ArchiveRestore}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Establecimientos", href: "/gestion/establecimientos" },
          { label: "Dados de baja" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/gestion/establecimientos">
              <ArrowLeft aria-hidden /> Volver al padrón
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        <Card className="p-4">
          <FiltrosUrl
            campos={[
              {
                tipo: "busqueda",
                nombre: "q",
                placeholder: "Nombre, domicilio, barrio o CUIT…",
                className: "sm:w-72",
              },
            ]}
          />
        </Card>
        <SectionCard
          title="Dados de baja"
          description={
            total === 0
              ? "Sin resultados"
              : `${total.toLocaleString("es-AR")} ${total === 1 ? "establecimiento" : "establecimientos"}`
          }
          icon={ArchiveRestore}
          flush
          footer={
            total > tamanio ? (
              <Paginacion
                pagina={pagina}
                total={total}
                params={sp}
                ruta="/gestion/establecimientos"
                className="w-full"
              />
            ) : undefined
          }
        >
          {filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={ArchiveRestore}
                title={
                  q
                    ? "No hay bajas que coincidan con la búsqueda"
                    : "No hay establecimientos dados de baja"
                }
                description="Todos los establecimientos cargados están activos en el padrón."
              />
            </div>
          ) : (
            <ul role="list" className="divide-y divide-border">
              {filas.map((f) => (
                <li
                  key={f.id}
                  className="relative flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-azul-50/40 sm:px-6"
                >
                  <Link
                    href={`/gestion/establecimientos/${f.id}`}
                    className="font-display text-[15px] leading-snug font-semibold text-foreground after:absolute after:inset-0 hover:text-azul-700"
                  >
                    {f.nombre}
                    {f.nombre_fantasia ? (
                      <span className="font-sans text-sm font-normal text-muted-foreground">
                        {" "}
                        ({f.nombre_fantasia})
                      </span>
                    ) : null}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {f.domicilio}
                    {f.barrio ? ` · ${f.barrio}` : ""}
                    {f.zona ? ` · Zona ${f.zona}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f.rubro?.nombre ?? "Sin rubro asignado"} · Última
                    modificación: {formatFecha(f.updated_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}

function FilaPadron({ fila: f }: { fila: FilaEstablecimiento }) {
  if (!f.id) return null;
  return (
    <li className="group relative flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-azul-50/40 sm:px-6 2xl:flex-row 2xl:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/gestion/establecimientos/${f.id}`}
            className="font-display text-[15px] leading-snug font-semibold text-foreground after:absolute after:inset-0 hover:text-azul-700"
          >
            {f.nombre}
          </Link>
          {f.nombre_fantasia ? (
            <span className="text-sm text-muted-foreground">
              ({f.nombre_fantasia})
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {f.domicilio}
          {f.barrio ? ` · ${f.barrio}` : ""}
          {f.zona ? ` · Zona ${f.zona}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {f.rubro_grupo ? (
            <Badge tone="neutral" size="sm">
              {f.rubro_grupo}
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {f.rubro_nombre ?? "Sin rubro asignado"}
          </span>
          {f.tiene_tanque ? (
            <Badge tone="celeste" size="sm">
              <Droplets aria-hidden /> Tanque
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 2xl:w-[340px] 2xl:shrink-0">
        <Obligacion
          tipo="fumigacion"
          estado={f.estado_fumigacion}
          vencimiento={f.fumigacion_vencimiento}
          empresa={f.fumigacion_empresa}
          compacta
        />
        <Obligacion
          tipo="tanque"
          estado={f.estado_tanque}
          vencimiento={f.tanque_vencimiento}
          empresa={f.tanque_empresa}
          compacta
        />
      </div>
    </li>
  );
}
