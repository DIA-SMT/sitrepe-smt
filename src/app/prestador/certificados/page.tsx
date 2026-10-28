import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ClipboardPlus, FileSearch, Stamp } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltrosUrl, type CampoFiltro } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requerirEmpresa } from "@/lib/auth";
import {
  VIGENCIAS_CERTIFICADO,
  contarVigencias,
  listarCertificados,
  parsearFiltrosCertificados,
} from "@/lib/data/certificados";
import { ESTADO_CERTIFICADO, TIPO_SERVICIO, VIGENCIA } from "@/lib/domain/etiquetas";
import { Constants } from "@/lib/supabase/database.types";
import { AtajosVigencia } from "./_components/atajos-vigencia";
import { TablaCertificados } from "./_components/tabla-certificados";

export const metadata: Metadata = {
  title: "Certificados",
  description: "Certificados de fumigación y de limpieza de tanques de la empresa, con su vigencia y sello de timbrado.",
};

const CAMPOS: CampoFiltro[] = [
  { tipo: "busqueda", nombre: "q", placeholder: "Buscá por N.º, cliente, domicilio o sello" },
  {
    tipo: "select",
    nombre: "estado",
    etiqueta: "Estado",
    opciones: Constants.public.Enums.estado_certificado.map((e) => ({ valor: e, label: ESTADO_CERTIFICADO[e].label })),
  },
  {
    tipo: "select",
    nombre: "tipo",
    etiqueta: "Servicio",
    opciones: Constants.public.Enums.tipo_servicio.map((t) => ({ valor: t, label: TIPO_SERVICIO[t].label })),
  },
  {
    tipo: "select",
    nombre: "vigencia",
    etiqueta: "Vigencia",
    opciones: VIGENCIAS_CERTIFICADO.map((v) => ({ valor: v, label: VIGENCIA[v].label })),
  },
  { tipo: "fecha", nombre: "desde", etiqueta: "Desde" },
  { tipo: "fecha", nombre: "hasta", etiqueta: "Hasta" },
];

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CertificadosPage({ searchParams }: Props) {
  const sesion = await requerirEmpresa();
  const params = await searchParams;
  const filtros = parsearFiltrosCertificados(params);
  const { pagina, desde, hasta, tamanio } = rangoPagina(params.pagina);

  const [{ filas, total }, conteo] = await Promise.all([
    listarCertificados(sesion.empresa.id, filtros, { desde, hasta }),
    contarVigencias(sesion.empresa.id),
  ]);

  const hayFiltros = Object.values(filtros).some((v) => v !== undefined && v !== "");
  // Sin filtros, el total es el de todos los certificados de la empresa (incluidos los anulados).
  const sinCertificados = total === 0 && !hayFiltros;

  // Primera página conservando los filtros (para cuando ?pagina= quedó fuera de rango).
  const primeraPagina = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "pagina" || v === undefined) continue;
    primeraPagina.set(k, Array.isArray(v) ? v[0] : v);
  }
  const hrefPrimeraPagina = `/prestador/certificados${primeraPagina.size ? `?${primeraPagina}` : ""}`;

  return (
    <>
      <PageHeader
        title="Certificados"
        description="Cada servicio genera un certificado con código QR. Una vez pagado el timbrado, la Dirección lo sella digitalmente y queda válido hasta su vencimiento."
        icon={BadgeCheck}
        breadcrumb={[{ label: "Inicio", href: "/prestador" }, { label: "Certificados" }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/prestador/pagos">
                <Stamp aria-hidden /> Pagar timbrado
              </Link>
            </Button>
            <Button asChild>
              <Link href="/prestador/declaraciones/nueva">
                <ClipboardPlus aria-hidden /> Nueva declaración
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        <AtajosVigencia conteo={conteo} params={params} actual={filtros.vigencia} />

        <Card className="p-4">
          <FiltrosUrl campos={CAMPOS} />
        </Card>

        {sinCertificados ? (
          <EmptyState
            icon={BadgeCheck}
            title="Todavía no tenés certificados"
            description="Los certificados se cargan dentro de una declaración de servicios. Creá tu primera declaración para empezar."
            action={
              <Button asChild>
                <Link href="/prestador/declaraciones/nueva">
                  <ClipboardPlus aria-hidden /> Nueva declaración
                </Link>
              </Button>
            }
          />
        ) : (
          <SectionCard
            title="Listado"
            description={
              total === 0
                ? "Sin resultados"
                : `${total.toLocaleString("es-AR")} ${total === 1 ? "certificado" : "certificados"}${hayFiltros ? " con los filtros aplicados" : ""}`
            }
            icon={FileSearch}
            flush
            footer={
              total > 0 ? (
                <Paginacion
                  pagina={pagina}
                  total={total}
                  tamanio={tamanio}
                  params={params}
                  ruta="/prestador/certificados"
                  className="w-full"
                />
              ) : undefined
            }
          >
            {filas.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  compact
                  icon={FileSearch}
                  title={total > 0 ? "No hay más resultados en esta página" : "Sin resultados para esta búsqueda"}
                  description={
                    total > 0
                      ? "Volvé a la primera página del listado."
                      : "Probá con otro número, cliente o domicilio, o quitá algunos filtros."
                  }
                  className="border-none"
                  action={
                    total > 0 ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={hrefPrimeraPagina}>Ir a la primera página</Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <Link href="/prestador/certificados">Ver todos los certificados</Link>
                      </Button>
                    )
                  }
                />
              </div>
            ) : (
              <TablaCertificados filas={filas} />
            )}
          </SectionCard>
        )}
      </div>
    </>
  );
}
