import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  CalendarPlus,
  Contact,
  Eye,
  EyeOff,
  Mail,
  MapPin,
  MessageSquareWarning,
  Navigation,
  Phone,
  Settings2,
  ShieldCheck,
  Store,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import {
  getDenuncia,
  getEmpresasOpciones,
  getInspeccionesDeDenuncia,
  getInspectores,
  uuidValido,
} from "@/lib/data/fiscalizacion";
import {
  ESTADO_DENUNCIA,
  ESTADO_INSPECCION,
  RESULTADO_INSPECCION,
  TIPO_DENUNCIA,
  TIPO_INSPECCION,
} from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { hrefComoLlegar } from "../../inspecciones/_components/contexto";
import { BotonTomarDenuncia, FormGestionDenuncia } from "../_components/form-gestion";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const valido = uuidValido(id);
  const d = valido ? await getDenuncia(valido) : null;
  return { title: d?.codigo ? `Denuncia ${d.codigo}` : "Denuncia" };
}

/** Enlace según el tipo de contacto que dejó el vecino. */
function enlaceContacto(contacto: string): { href: string; icono: typeof Mail } | null {
  const texto = contacto.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) return { href: `mailto:${texto}`, icono: Mail };
  const digitos = texto.replace(/[^\d+]/g, "");
  if (digitos.replace(/\D/g, "").length >= 7) return { href: `tel:${digitos}`, icono: Phone };
  return null;
}

export default async function DenunciaPage({ params }: Props) {
  const sesion = await requerirStaff();
  const { id: idParam } = await params;
  const id = uuidValido(idParam);
  if (!id) notFound();
  const d = await getDenuncia(id);
  if (!d) notFound();

  const [inspecciones, inspectores, empresas] = await Promise.all([
    getInspeccionesDeDenuncia(id),
    getInspectores(),
    getEmpresasOpciones(),
  ]);
  const asignada = d.asignada ? `${d.asignada.nombre} ${d.asignada.apellido}`.trim() : null;
  const contacto = !d.anonima && d.denunciante_contacto ? enlaceContacto(d.denunciante_contacto) : null;
  const llegar = d.domicilio ? hrefComoLlegar({ domicilio: d.domicilio }) : null;
  const abierta = d.estado !== "cerrada" && d.estado !== "desestimada";
  const programada = inspecciones.find((i) => i.estado === "programada");

  return (
    <>
      <PageHeader
        title={`Denuncia ${d.codigo ?? ""}`}
        description={`${TIPO_DENUNCIA[d.tipo].label} · recibida ${formatRelativo(d.created_at)}`}
        icon={MessageSquareWarning}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Denuncias", href: "/gestion/denuncias" },
          { label: d.codigo ?? "Denuncia" },
        ]}
        actions={
          <>
            {!d.asignada_a && abierta ? <BotonTomarDenuncia denunciaId={d.id} /> : null}
            {abierta ? (
              <Button asChild>
                <Link href={`/gestion/inspecciones/nueva?denuncia=${d.id}&tipo=denuncia`}>
                  <CalendarPlus aria-hidden /> Programar inspección
                </Link>
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_DENUNCIA} valor={d.estado} pulse={d.estado === "recibida"} />
          <EstadoBadge mapa={TIPO_DENUNCIA} valor={d.tipo} />
          <span className="text-[13px] text-muted-foreground">Asignada a: {asignada ?? "nadie todavía"}</span>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {programada ? (
            <Alert
              tone="info"
              title={`Inspección ${programada.codigo ?? ""} programada para el ${formatFecha(programada.fecha_programada)}`}
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={`/gestion/inspecciones/${programada.id}`}>Ver</Link>
                </Button>
              }
            >
              {programada.inspector_nombre ? `A cargo de ${programada.inspector_nombre}.` : "Todavía sin inspector asignado."}
            </Alert>
          ) : null}

          <SectionCard title="Lo que denunció el vecino" description={`Recibida el ${formatFechaHora(d.created_at)}`} icon={MessageSquareWarning}>
            <div className="flex flex-col gap-5">
              <blockquote className="relative rounded-2xl bg-subtle px-5 py-4 text-[15px] leading-relaxed whitespace-pre-line text-foreground">
                <span aria-hidden className="absolute -top-3 left-4 font-display text-5xl leading-none text-azul-200">
                  “
                </span>
                {d.descripcion}
              </blockquote>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Domicilio</p>
                  {d.domicilio ? (
                    <>
                      <p className="flex items-start gap-1.5 text-sm font-medium">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden /> {d.domicilio}
                      </p>
                      {llegar ? (
                        <a href={llegar} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm text-azul-700 hover:underline">
                          <Navigation className="size-3.5" aria-hidden /> Cómo llegar
                        </a>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No informado</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Empresa mencionada</p>
                  <p className="text-sm font-medium">{d.empresa_mencionada ?? <span className="font-normal text-muted-foreground">No informada</span>}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Contacto del denunciante" icon={Contact}>
            {d.anonima ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <EyeOff className="size-4" aria-hidden /> Denuncia anónima: no hay datos de contacto. La respuesta se consulta con el código.
              </p>
            ) : (
              <div className="flex flex-col gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Nombre: </span>
                  <span className="font-medium">{d.denunciante_nombre ?? "No informado"}</span>
                </p>
                {d.denunciante_contacto ? (
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">Contacto: </span>
                    {contacto ? (
                      <a href={contacto.href} className="inline-flex items-center gap-1.5 font-medium text-azul-700 hover:underline">
                        <contacto.icono className="size-4" aria-hidden /> {d.denunciante_contacto}
                      </a>
                    ) : (
                      <span className="font-medium">{d.denunciante_contacto}</span>
                    )}
                  </p>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Inspecciones vinculadas"
            icon={ShieldCheck}
            flush
            actions={
              abierta ? (
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/gestion/inspecciones/nueva?denuncia=${d.id}&tipo=denuncia`}>
                    <CalendarPlus aria-hidden /> Programar
                  </Link>
                </Button>
              ) : null
            }
          >
            {inspecciones.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState
                  compact
                  icon={ShieldCheck}
                  title="Sin inspecciones"
                  description="Programá una visita para constatar lo denunciado."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {inspecciones.map((i) => (
                  <li key={i.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="min-w-0">
                      <Link href={`/gestion/inspecciones/${i.id}`} className="font-medium text-foreground hover:text-azul-700">
                        {i.codigo} · {i.tipo ? TIPO_INSPECCION[i.tipo].label : "Inspección"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {i.realizada_at ? `Realizada ${formatFechaHora(i.realizada_at)}` : `Programada ${formatFecha(i.fecha_programada)}`}
                        {i.inspector_nombre ? ` · ${i.inspector_nombre}` : ""}
                      </p>
                      {i.estado === "realizada" && i.observaciones ? (
                        <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{i.observaciones}</p>
                      ) : null}
                    </div>
                    {i.resultado ? (
                      <EstadoBadge mapa={RESULTADO_INSPECCION} valor={i.resultado} size="sm" />
                    ) : (
                      <EstadoBadge mapa={ESTADO_INSPECCION} valor={i.estado} size="sm" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="Gestión de la denuncia">
          <SectionCard title="Gestión" description="Estado, asignación, vínculos y respuesta" icon={Settings2}>
            <FormGestionDenuncia
              key={`${d.updated_at}-${d.estado}-${d.asignada_a ?? ""}`}
              denuncia={{
                id: d.id,
                estado: d.estado,
                tipo: d.tipo,
                asignada_a: d.asignada_a,
                empresa_id: d.empresa_id,
                respuesta: d.respuesta,
              }}
              establecimiento={
                d.establecimiento
                  ? { id: d.establecimiento.id, nombre: d.establecimiento.nombre, domicilio: d.establecimiento.domicilio, barrio: d.establecimiento.barrio }
                  : null
              }
              inspectores={
                inspectores.some((p) => p.id === sesion.userId)
                  ? inspectores
                  : [{ id: sesion.userId, nombre: `${sesion.perfil.nombre} ${sesion.perfil.apellido}`.trim() || "Yo" }, ...inspectores]
              }
              empresas={empresas}
            />
          </SectionCard>

          {d.establecimiento || d.empresa ? (
            <SectionCard title="Vínculos" icon={Store}>
              <div className="flex flex-col gap-2">
                {d.establecimiento ? (
                  <Link
                    href={`/gestion/establecimientos/${d.establecimiento.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-azul-200 hover:bg-azul-50/50"
                  >
                    <Store className="size-5 shrink-0 text-azul-600" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.establecimiento.nombre}</span>
                      <span className="block truncate text-xs text-muted-foreground">{d.establecimiento.domicilio}</span>
                    </span>
                    <ArrowUpRight className="size-4 text-noche-300 group-hover:text-azul-600" aria-hidden />
                  </Link>
                ) : null}
                {d.empresa ? (
                  <Link
                    href={`/gestion/empresas/${d.empresa.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-azul-200 hover:bg-azul-50/50"
                  >
                    <Building2 className="size-5 shrink-0 text-azul-600" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.empresa.nombre_comercial}</span>
                      <span className="block text-xs text-muted-foreground">
                        {d.empresa.numero_registro ? `Registro N.º ${d.empresa.numero_registro}` : "Sin número de registro"}
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 text-noche-300 group-hover:text-azul-600" aria-hidden />
                  </Link>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Así lo ve el vecino" description="Consulta pública con el código" icon={Eye}>
            <div className="flex flex-col gap-3 rounded-xl bg-gradient-brand-soft p-4 ring-1 ring-azul-100">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-azul-800">{d.codigo}</span>
                <EstadoBadge mapa={ESTADO_DENUNCIA} valor={d.estado} size="sm" />
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/85">
                {d.respuesta ?? "Todavía no hay una respuesta del área."}
              </p>
              <p className="text-xs text-muted-foreground">Actualizada {formatRelativo(d.updated_at)}</p>
            </div>
          </SectionCard>
        </aside>
      </div>
    </>
  );
}
