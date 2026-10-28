import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CircleCheckBig, ClipboardCheck, FlaskConical, SearchX, ShieldAlert } from "lucide-react";
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
  type FiltrosProductos,
  type MemoriaTecnica,
  contarMemoriasPendientes,
  listarMemoriasPendientes,
  listarProductos,
} from "@/lib/data/empresas";
import { CLASE_PRODUCTO, ORGANISMO } from "@/lib/domain/etiquetas";
import { formatFecha, formatRelativo } from "@/lib/domain/formato";
import { Constants, type Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { AccionesMemoria } from "../_components/acciones-revision";
import { rutaLegajo } from "../_components/rutas";
import { Segmentos } from "../_components/segmentos";
import { BadgeToxicidad } from "../_components/toxicidad";
import { DialogoProducto } from "./_components/dialogo-producto";

export const metadata: Metadata = {
  title: "Productos",
  description: "Catálogo de productos domisanitarios con registro ANMAT o SENASA y memorias técnicas pendientes.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProductosPage({ searchParams }: Props) {
  const sesion = await requerirStaff();
  const sp = await searchParams;
  const puedeEditar = sesion.perfil.rol === "admin" || sesion.perfil.rol === "control";
  const vista = primero(sp.vista) === "memorias" ? "memorias" : "catalogo";
  const pendientes = await contarMemoriasPendientes();

  return (
    <>
      <PageHeader
        title="Productos domisanitarios"
        description="Catálogo de productos con registro ANMAT o SENASA y revisión de las memorias técnicas que proponen las empresas (Art. 5.º)."
        icon={FlaskConical}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Prestadores" }, { label: "Productos" }]}
        actions={puedeEditar && vista === "catalogo" ? <DialogoProducto /> : null}
      >
        <Segmentos
          etiqueta="Vistas de productos"
          items={[
            { href: "/gestion/productos", etiqueta: "Catálogo", activo: vista === "catalogo", icono: <FlaskConical aria-hidden /> },
            {
              href: "/gestion/productos?vista=memorias",
              etiqueta: "Memorias técnicas pendientes",
              activo: vista === "memorias",
              contador: pendientes,
              alerta: true,
              icono: <ClipboardCheck aria-hidden />,
            },
          ]}
        />
      </PageHeader>

      {vista === "memorias" ? (
        <MemoriasPendientes puedeEditar={puedeEditar} />
      ) : (
        <Catalogo sp={sp} puedeEditar={puedeEditar} />
      )}
    </>
  );
}

/* --- Catálogo ---------------------------------------------------------------------------- */

async function Catalogo({
  sp,
  puedeEditar,
}: {
  sp: Record<string, string | string[] | undefined>;
  puedeEditar: boolean;
}) {
  const q = primero(sp.q)?.trim() || undefined;
  const claseParam = primero(sp.clase);
  const clase = (Constants.public.Enums.clase_producto as readonly string[]).includes(claseParam ?? "")
    ? (claseParam as Enums<"clase_producto">)
    : undefined;
  const organismoParam = primero(sp.organismo);
  const organismo = organismoParam === "ANMAT" || organismoParam === "SENASA" ? organismoParam : undefined;
  const estadoParam = primero(sp.estado);
  const estado: FiltrosProductos["estado"] = estadoParam === "activos" || estadoParam === "inactivos" ? estadoParam : undefined;
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);
  const { filas, total } = await listarProductos({ q, clase, organismo, estado, desde, hasta });
  const hayFiltros = Boolean(q || clase || organismo || estado);

  return (
    <SectionCard
      title="Catálogo"
      description={`${total.toLocaleString("es-AR")} producto${total === 1 ? "" : "s"}${hayFiltros ? " (filtrado)" : ""}`}
      icon={FlaskConical}
      flush
      footer={<Paginacion pagina={pagina} total={total} tamanio={tamanio} params={sp} ruta="/gestion/productos" className="w-full" />}
    >
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <FiltrosUrl
          campos={[
            { tipo: "busqueda", nombre: "q", placeholder: "Buscá por nombre, principio activo o registro" },
            {
              tipo: "select",
              nombre: "clase",
              etiqueta: "Clase",
              opciones: Constants.public.Enums.clase_producto.map((c) => ({ valor: c, label: CLASE_PRODUCTO[c].label })),
            },
            {
              tipo: "select",
              nombre: "organismo",
              etiqueta: "Organismo",
              opciones: Constants.public.Enums.organismo_registro.map((o) => ({ valor: o, label: o })),
            },
            {
              tipo: "select",
              nombre: "estado",
              etiqueta: "Estado",
              opciones: [
                { valor: "activos", label: "Activos" },
                { valor: "inactivos", label: "Inactivos" },
              ],
            },
          ]}
        />
      </div>

      {filas.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState
            compact
            icon={hayFiltros ? SearchX : FlaskConical}
            title={hayFiltros ? "No hay productos con esos filtros" : "El catálogo está vacío"}
            description={
              hayFiltros
                ? "Probá con otro nombre, principio activo o N.º de registro."
                : "Cargá los productos domisanitarios autorizados para que las empresas puedan incluirlos en su memoria técnica."
            }
            action={
              hayFiltros ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/gestion/productos">Limpiar filtros</Link>
                </Button>
              ) : puedeEditar ? (
                <DialogoProducto />
              ) : null
            }
          />
        </div>
      ) : (
        <>
          {/* Móvil: tarjetas */}
          <ul className="divide-y divide-border md:hidden">
            {filas.map((p) => (
              <li key={p.id} className={cn("flex flex-col gap-2 px-5 py-4", !p.activo && "bg-subtle/70")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{p.nombre_comercial}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {p.principio_activo}
                      {p.concentracion ? ` ${p.concentracion}` : ""}
                      {p.formulacion ? ` · ${p.formulacion}` : ""}
                    </p>
                  </div>
                  {puedeEditar ? <DialogoProducto producto={p} compacto /> : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <EstadoBadge mapa={CLASE_PRODUCTO} valor={p.clase} size="sm" />
                  <Badge tone={ORGANISMO[p.organismo].tono} size="sm">
                    {p.organismo} {p.registro_numero}
                  </Badge>
                  <BadgeToxicidad categoria={p.categoria_toxicologica} />
                  {!p.activo ? (
                    <Badge tone="neutral" size="sm">
                      Inactivo
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Reingreso: {p.plazo_reingreso_horas} h · {p.empresas_autorizadas} empresa{p.empresas_autorizadas === 1 ? "" : "s"} autorizada
                  {p.empresas_autorizadas === 1 ? "" : "s"}
                  {p.antidoto ? ` · Antídoto: ${p.antidoto}` : ""}
                </p>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <Table framed={false} containerClassName="hidden md:block">
            <THead>
              <TR>
                <TH>Producto</TH>
                <TH>Clase</TH>
                <TH>Registro</TH>
                <TH>Toxicidad</TH>
                <TH numeric>Reingreso</TH>
                <TH numeric>Empresas</TH>
                <TH>Estado</TH>
                {puedeEditar ? (
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                ) : null}
              </TR>
            </THead>
            <TBody>
              {filas.map((p) => (
                <TR key={p.id} className={cn(!p.activo && "bg-subtle/60 text-muted-foreground")}>
                  <TD>
                    <span className="block font-semibold text-foreground">{p.nombre_comercial}</span>
                    <span className="block max-w-72 truncate text-xs text-muted-foreground">
                      {p.principio_activo}
                      {p.concentracion ? ` ${p.concentracion}` : ""}
                      {p.formulacion ? ` · ${p.formulacion}` : ""}
                    </span>
                    {p.antidoto ? (
                      <span className="block max-w-72 truncate text-xs text-muted-foreground" title={p.precauciones ?? undefined}>
                        Antídoto: {p.antidoto}
                      </span>
                    ) : null}
                  </TD>
                  <TD>
                    <EstadoBadge mapa={CLASE_PRODUCTO} valor={p.clase} size="sm" />
                  </TD>
                  <TD className="whitespace-nowrap">
                    <Badge tone={ORGANISMO[p.organismo].tono} size="sm">
                      {p.organismo}
                    </Badge>
                    <span className="ml-1.5 text-sm nums-tabular">{p.registro_numero}</span>
                  </TD>
                  <TD>
                    <BadgeToxicidad categoria={p.categoria_toxicologica} />
                  </TD>
                  <TD numeric className="whitespace-nowrap">
                    {p.plazo_reingreso_horas} h
                  </TD>
                  <TD numeric>
                    <span className={cn("inline-flex items-center gap-1", p.empresas_autorizadas > 0 && "font-semibold text-foreground")}>
                      <Building2 className="size-3.5 text-muted-foreground" aria-hidden />
                      {p.empresas_autorizadas}
                    </span>
                  </TD>
                  <TD>
                    {p.activo ? (
                      <Badge tone="verde" size="sm" dot>
                        Activo
                      </Badge>
                    ) : (
                      <Badge tone="neutral" size="sm" dot>
                        Inactivo
                      </Badge>
                    )}
                  </TD>
                  {puedeEditar ? (
                    <TD align="right">
                      <DialogoProducto producto={p} />
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        </>
      )}
    </SectionCard>
  );
}

/* --- Memorias técnicas pendientes ------------------------------------------------------------- */

async function MemoriasPendientes({ puedeEditar }: { puedeEditar: boolean }) {
  const memorias = await listarMemoriasPendientes();
  const porEmpresa = new Map<string, MemoriaTecnica[]>();
  for (const m of memorias) {
    const clave = m.empresa_id ?? "sin-empresa";
    porEmpresa.set(clave, [...(porEmpresa.get(clave) ?? []), m]);
  }

  if (memorias.length === 0) {
    return (
      <EmptyState
        icon={CircleCheckBig}
        title="No hay memorias técnicas pendientes"
        description="Cuando una empresa proponga un producto para su memoria técnica, lo vas a poder revisar acá."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!puedeEditar ? (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <ShieldAlert className="size-4 shrink-0 text-azul-600" aria-hidden />
          La aprobación de productos está a cargo de Administración y Control de Empresas.
        </p>
      ) : null}
      {[...porEmpresa.entries()].map(([empresaId, lista]) => (
        <SectionCard
          key={empresaId}
          title={lista[0]?.empresa_nombre ?? "Empresa"}
          description={`${lista.length} producto${lista.length === 1 ? "" : "s"} propuesto${lista.length === 1 ? "" : "s"}`}
          icon={Building2}
          flush
          actions={
            empresaId !== "sin-empresa" ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={rutaLegajo(empresaId, "memoria")}>Ver memoria completa</Link>
              </Button>
            ) : null
          }
        >
          <ul className="divide-y divide-border">
            {lista.map((m) => (
              <li
                key={m.id}
                className="grid gap-3 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_auto] md:items-start md:gap-6"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="font-semibold text-foreground">{m.producto_nombre}</p>
                  <p className="text-[13px] text-muted-foreground">{m.principio_activo}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <EstadoBadge mapa={CLASE_PRODUCTO} valor={m.clase} size="sm" />
                    <Badge tone="neutral" size="sm" variant="outline">
                      {m.organismo} {m.registro_numero}
                    </Badge>
                    <BadgeToxicidad categoria={m.categoria_toxicologica} />
                  </div>
                </div>
                <dl className="grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[auto_1fr]">
                  <dt className="text-muted-foreground">Dosis</dt>
                  <dd className="text-foreground">{m.dosis || "—"}</dd>
                  <dt className="text-muted-foreground">Concentración</dt>
                  <dd className="text-foreground">{m.concentracion_uso || "—"}</dd>
                  <dt className="text-muted-foreground">Precauciones</dt>
                  <dd className="text-foreground">{m.precauciones || "—"}</dd>
                </dl>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <span className="text-xs text-muted-foreground" title={formatFecha(m.created_at)}>
                    Propuesto {formatRelativo(m.created_at)}
                  </span>
                  {puedeEditar && m.id ? (
                    <AccionesMemoria id={m.id} producto={m.producto_nombre ?? "el producto"} empresa={m.empresa_nombre} estado="propuesto" />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}
    </div>
  );
}
