import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Droplets,
  FlaskConical,
  GraduationCap,
  Mail,
  MessageSquareWarning,
  Phone,
  QrCode,
  ShieldCheck,
  SprayCan,
  Timer,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { KeyValue } from "@/components/shared/key-value";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEmpresaPortal } from "@/lib/data/portal";
import { CLASE_PRODUCTO, ORGANISMO, etiqueta } from "@/lib/domain/etiquetas";
import { diasHasta, formatFechaLarga } from "@/lib/domain/formato";
import { iniciales } from "@/lib/utils";
import { EncabezadoPortal } from "../../_components/encabezado-portal";
import { plazoReingreso } from "../../_lib/reingreso";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const empresa = await getEmpresaPortal(id);
  if (!empresa) return { title: "Empresa no encontrada", robots: { index: false } };
  const actividades = [empresa.habilita_fumigacion && "fumigación", empresa.habilita_tanques && "limpieza de tanques"]
    .filter(Boolean)
    .join(" y ");
  return {
    title: empresa.nombre_comercial,
    description: `Ficha pública de ${empresa.nombre_comercial}, empresa habilitada${
      empresa.numero_registro ? ` (registro N.º ${empresa.numero_registro})` : ""
    }${actividades ? ` para ${actividades}` : ""} en San Miguel de Tucumán.`,
  };
}

export default async function EmpresaPage({ params }: Props) {
  const { id } = await params;
  const e = await getEmpresaPortal(id);
  if (!e) notFound();

  const dias = diasHasta(e.vencimiento_habilitacion);
  const actividades = [e.habilita_fumigacion && "Fumigación y desinfección", e.habilita_tanques && "Limpieza de tanques"].filter(
    (a): a is string => Boolean(a),
  );

  return (
    <>
      <EncabezadoPortal
        antetitulo={e.numero_registro ? `Registro N.º ${e.numero_registro}` : "Registro de prestadores"}
        titulo={e.nombre_comercial}
        descripcion={e.titular ? `Titular: ${e.titular}` : undefined}
        icono={Building2}
        migas={[{ label: "Empresas habilitadas", href: "/empresas" }, { label: e.nombre_comercial }]}
        aside={
          <div className="rounded-panel border border-white/70 bg-white/85 p-5 shadow-card backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-success-soft text-success ring-1 ring-emerald-200">
                <ShieldCheck className="size-6" aria-hidden />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-foreground">Empresa habilitada</p>
                <p className="text-sm text-muted-foreground">
                  {e.vencimiento_habilitacion
                    ? `Vigente hasta el ${formatFechaLarga(e.vencimiento_habilitacion)}`
                    : "Habilitación vigente"}
                </p>
              </div>
            </div>
            {dias !== null && dias <= 30 ? (
              <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-warning">
                La habilitación vence en {dias === 0 ? "el día de hoy" : `${dias} ${dias === 1 ? "día" : "días"}`}: debe
                renovarse con la Declaración Jurada Anual.
              </p>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Habilitada" tone="verde" size="lg" />
          {e.habilita_fumigacion ? (
            <Badge tone="azul" size="lg">
              <SprayCan aria-hidden />
              Fumigación y desinfección
            </Badge>
          ) : null}
          {e.habilita_tanques ? (
            <Badge tone="celeste" size="lg">
              <Droplets aria-hidden />
              Limpieza de tanques
            </Badge>
          ) : null}
        </div>
      </EncabezadoPortal>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1.6fr_1fr] lg:px-8">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Datos de la empresa" description="Según el registro municipal" icon={Building2}>
            <KeyValue
              items={[
                { label: "Nombre comercial", value: e.nombre_comercial },
                { label: "Titular o razón social", value: e.titular },
                { label: "CUIT", value: e.cuit ? <span className="nums-tabular">{e.cuit}</span> : null },
                { label: "N.º de registro", value: e.numero_registro },
                {
                  label: "Teléfono",
                  value: e.telefono ? (
                    <a href={`tel:${e.telefono.replace(/[^\d+]/g, "")}`} className="text-azul-700 hover:underline">
                      {e.telefono}
                    </a>
                  ) : null,
                },
                {
                  label: "Correo electrónico",
                  value: e.email ? (
                    <a href={`mailto:${e.email}`} className="break-all text-azul-700 hover:underline">
                      {e.email}
                    </a>
                  ) : null,
                },
                { label: "Domicilio de la oficina", value: e.domicilio_oficina, full: true },
                {
                  label: "Habilitación comercial",
                  value: e.habilitacion_comercial ? <span className="nums-tabular">{e.habilitacion_comercial}</span> : null,
                },
                {
                  label: "Autorización de la Dirección",
                  value: e.resolucion_dsa ? <span className="nums-tabular">Res. {e.resolucion_dsa}</span> : null,
                },
                { label: "Actividades habilitadas", value: actividades.join(" · "), full: true },
              ]}
            />
          </SectionCard>

          <SectionCard
            title="Productos autorizados"
            description="Memoria técnica aprobada por la Dirección de Salud Ambiental"
            icon={FlaskConical}
            flush
          >
            {e.productos.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState
                  compact
                  icon={FlaskConical}
                  title="Sin productos publicados"
                  description="La empresa todavía no tiene productos aprobados en su memoria técnica."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {e.productos.map((p, i) => {
                  const clase = etiqueta(CLASE_PRODUCTO, p.clase);
                  const organismo = p.organismo ? ORGANISMO[p.organismo] : null;
                  return (
                    <li key={`${i}-${p.nombre}`} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{p.nombre}</p>
                          {p.clase ? (
                            <Badge tone={clase.tono} size="sm">
                              {clase.label}
                            </Badge>
                          ) : null}
                        </div>
                        {p.principio_activo ? (
                          <p className="mt-0.5 text-[13px] text-muted-foreground">Principio activo: {p.principio_activo}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {organismo ? (
                          <Badge tone={organismo.tono} variant="soft">
                            <BadgeCheck aria-hidden />
                            {organismo.label} {p.registro ? <span className="nums-tabular">N.º {p.registro}</span> : null}
                          </Badge>
                        ) : null}
                        <Badge tone="neutral" title="Plazo de reingreso al ambiente tratado">
                          <Timer aria-hidden />
                          Reingreso: {plazoReingreso(p.plazo_reingreso_horas)}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Asesores técnicos" description="Firman los certificados de la empresa (Art. 5.º)" icon={GraduationCap}>
            {e.tecnicos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay asesores técnicos aprobados publicados.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {e.tecnicos.map((t, i) => (
                  <li key={`${i}-${t.nombre}`} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-azul-50 font-display text-sm font-semibold text-azul-700 ring-1 ring-azul-100"
                    >
                      {iniciales(t.nombre)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{t.nombre}</p>
                      <p className="text-[13px] text-muted-foreground">{t.titulo ?? "Título no informado"}</p>
                    </div>
                    {t.representante ? (
                      <Badge tone="violeta" size="sm" className="ml-auto">
                        Representante
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <div className="relative overflow-hidden rounded-card bg-noche p-6 text-white shadow-card">
            <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-20" />
            <div className="relative flex flex-col gap-4">
              <span aria-hidden className="flex size-11 items-center justify-center rounded-xl bg-sol-400 text-noche-950">
                <QrCode className="size-5" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold">¿Te hicieron un servicio?</p>
                <p className="mt-1 text-sm leading-relaxed text-noche-200">
                  Escaneá el QR del certificado o ingresá su código para confirmar que está timbrado y vigente.
                </p>
              </div>
              <Button asChild variant="sol">
                <Link href="/verificar">
                  <QrCode aria-hidden />
                  Verificar un certificado
                </Link>
              </Button>
            </div>
          </div>

          <Alert tone="info" title="¿Algo no coincide?" icon={<MessageSquareWarning />}>
            Si la empresa trabajó sin certificado, con productos no autorizados o con otro titular,{" "}
            <Link href="/denuncias" className="font-semibold text-azul-700 underline underline-offset-2">
              hacé una denuncia
            </Link>
            .
          </Alert>

          <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-5 text-sm shadow-card">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <CalendarCheck className="size-4 text-azul-600" aria-hidden />
              Renovación anual
            </p>
            <p className="text-muted-foreground">
              Las empresas renuevan su habilitación cada año con la Declaración Jurada Anual y el libre deuda (Art. 8.º, Ord.
              2681/98).
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {e.email ? (
              <Button asChild variant="outline">
                <a href={`mailto:${e.email}`}>
                  <Mail aria-hidden />
                  Escribir a la empresa
                </a>
              </Button>
            ) : null}
            {e.telefono ? (
              <Button asChild variant="outline">
                <a href={`tel:${e.telefono.replace(/[^\d+]/g, "")}`}>
                  <Phone aria-hidden />
                  Llamar
                </a>
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link href="/empresas">
                <ArrowLeft aria-hidden />
                Volver al listado
              </Link>
            </Button>
          </div>

          {e.titular ? (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <UserRound className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Pedí la factura a nombre del titular habilitado: {e.titular}.
            </p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
