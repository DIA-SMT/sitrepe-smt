import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  FileSignature,
  KeyRound,
  Landmark,
  LifeBuoy,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ETIQUETA_ROL, type Rol, esStaff, inicioPorRol, requerirSesion } from "@/lib/auth";
import { APP } from "@/lib/config";
import { getTecnicoVinculado } from "@/lib/data/cuenta";
import { ESTADO_EMPRESA, ESTADO_TECNICO } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaLarga, hoyISO } from "@/lib/domain/formato";
import { FormCambioClave } from "../(auth)/_components/form-cambio-clave";
import { FormDatos } from "./_components/form-datos";

const QUE_HACE: Record<Rol, string> = {
  admin: "Configurás aranceles y parámetros, administrás usuarios y supervisás todo el circuito.",
  control: "Controlás declaraciones, certificados y pagos, y resolvés los trámites del registro.",
  inspector: "Armás la hoja de ruta, hacés inspecciones y labrás notificaciones y actas.",
  empresa: "Administrás tu empresa: declaraciones, certificados, pagos, legajo y trámites.",
  tecnico: "Firmás los certificados como asesor técnico y seguís las declaraciones de la empresa.",
};

export default async function PerfilPage() {
  const sesion = await requerirSesion();
  const { perfil, empresa } = sesion;
  const nombre = `${perfil.nombre} ${perfil.apellido}`.trim() || sesion.email;
  const staff = esStaff(perfil.rol);
  const inicio = inicioPorRol(perfil.rol);
  const tecnico = perfil.tecnico_id ? await getTecnicoVinculado(perfil.tecnico_id) : null;

  const estadoEmpresa =
    empresa && empresa.estado === "habilitada" && empresa.vencimiento_habilitacion && empresa.vencimiento_habilitacion < hoyISO()
      ? "vencida"
      : (empresa?.estado ?? null);

  return (
    <>
      <PageHeader
        title="Mi perfil"
        description="Tus datos personales, tu contraseña y la organización a la que pertenecés."
        icon={UserRound}
        breadcrumb={[{ label: staff ? "Gestión" : "Prestadores", href: inicio }, { label: "Mi perfil" }]}
      />

      {/* Identidad */}
      <section
        aria-label="Resumen de la cuenta"
        className="relative mb-6 overflow-hidden rounded-panel border border-border bg-gradient-brand-soft p-5 shadow-card sm:p-6 animate-fade-up"
      >
        <div aria-hidden className="bg-dots mask-fade pointer-events-none absolute inset-0 text-azul-600 opacity-50" />
        <PetalDecor variant="corner" tone="light" className="opacity-80" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar nombre={nombre} size="xl" className="shadow-brand" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{nombre}</h2>
            <p className="truncate text-sm text-muted-foreground">{sesion.email}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="azul" dot>
                {ETIQUETA_ROL[perfil.rol]}
              </Badge>
              {empresa ? (
                <Badge tone="neutral" className="max-w-full">
                  <Building2 aria-hidden />
                  <span className="truncate">{empresa.nombre_comercial}</span>
                </Badge>
              ) : null}
              <Badge tone="verde" dot>
                Cuenta activa
              </Badge>
            </div>
          </div>
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-noche-600 ring-1 ring-border sm:self-center">
            <CalendarDays className="size-3.5 text-azul-600" aria-hidden />
            En {APP.nombre} desde el {formatFechaLarga(perfil.created_at)}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard
            title="Datos personales"
            description="Así te identificamos en la plataforma y en la documentación."
            icon={UserRound}
          >
            <FormDatos
              email={sesion.email}
              inicial={{
                nombre: perfil.nombre,
                apellido: perfil.apellido,
                dni: perfil.dni ?? "",
                telefono: perfil.telefono ?? "",
              }}
            />
          </SectionCard>

          <SectionCard
            title="Contraseña"
            description="Usá una contraseña única, que no uses en otros sitios."
            icon={KeyRound}
          >
            <FormCambioClave modo="perfil" />
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {staff ? (
            <SectionCard title="Tu área" description={APP.direccion} icon={Landmark}>
              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-azul-50/70 p-4 ring-1 ring-azul-100">
                  <p className="font-display text-[15px] font-semibold text-azul-800">{ETIQUETA_ROL[perfil.rol]}</p>
                  <p className="mt-1 text-sm leading-relaxed text-noche-600">{QUE_HACE[perfil.rol]}</p>
                </div>
                <KeyValue
                  columns={1}
                  items={[
                    { label: "Organismo", value: `${APP.secretaria} · ${APP.municipio}` },
                    { label: "Domicilio", value: APP.contacto.domicilio },
                  ]}
                />
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Los roles y permisos del personal los asigna Administración desde la gestión de usuarios.
                </p>
              </div>
            </SectionCard>
          ) : empresa ? (
            <SectionCard
              title="Tu empresa"
              description={QUE_HACE[perfil.rol]}
              icon={Building2}
              footer={
                <>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/prestador/legajo">
                      Ver legajo
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  {empresa.estado !== "habilitada" ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/prestador/inscripcion">Estado de la inscripción</Link>
                    </Button>
                  ) : null}
                </>
              }
            >
              <KeyValue
                columns={1}
                items={[
                  { label: "Nombre comercial", value: empresa.nombre_comercial },
                  { label: "CUIT", value: <span className="nums-tabular">{empresa.cuit}</span> },
                  {
                    label: "N.º de registro",
                    value: empresa.numero_registro ? <span className="nums-tabular">{empresa.numero_registro}</span> : "En trámite",
                  },
                  { label: "Estado", value: <EstadoBadge mapa={ESTADO_EMPRESA} valor={estadoEmpresa} /> },
                  {
                    label: "Habilitación vigente hasta",
                    value: empresa.vencimiento_habilitacion ? formatFecha(empresa.vencimiento_habilitacion) : null,
                  },
                ]}
              />
            </SectionCard>
          ) : (
            <EmptyState
              compact
              icon={Building2}
              title="Todavía no inscribiste tu empresa"
              description="Completá la solicitud de inscripción en el registro de prestadores para empezar a operar."
              action={
                <Button asChild>
                  <Link href="/prestador/inscripcion">
                    Inscribir mi empresa
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            />
          )}

          {perfil.tecnico_id ? (
            <SectionCard title="Asesor técnico vinculado" description="Tu firma en los certificados." icon={FileSignature}>
              {tecnico ? (
                <KeyValue
                  columns={1}
                  items={[
                    { label: "Nombre", value: `${tecnico.nombre} ${tecnico.apellido}` },
                    { label: "Título", value: tecnico.institucion ? `${tecnico.titulo} · ${tecnico.institucion}` : tecnico.titulo },
                    { label: "Matrícula", value: tecnico.matricula },
                    {
                      label: "Estado en el padrón",
                      value: (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <EstadoBadge mapa={ESTADO_TECNICO} valor={tecnico.estado} />
                          {tecnico.es_representante ? (
                            <Badge tone="violeta" size="sm">
                              Representante técnico
                            </Badge>
                          ) : null}
                        </span>
                      ),
                    },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No pudimos mostrar los datos del asesor técnico vinculado. Comunicate con la Dirección.
                </p>
              )}
            </SectionCard>
          ) : null}

          <div className="relative overflow-hidden rounded-card bg-noche p-5 text-white shadow-card">
            <PetalDecor variant="corner" tone="dark" className="h-32 opacity-80" />
            <div className="relative flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-celeste-200 ring-1 ring-white/15"
              >
                <LifeBuoy className="size-5" />
              </span>
              <div className="min-w-0 text-sm leading-relaxed">
                <p className="font-display text-[15px] font-semibold">¿Necesitás ayuda?</p>
                <p className="text-noche-200">
                  {APP.contacto.domicilio}
                  <br />
                  {APP.contacto.horario}
                </p>
                <a
                  href={`mailto:${APP.contacto.email}`}
                  className="mt-1 inline-block font-medium text-celeste-300 underline-offset-2 hover:underline"
                >
                  {APP.contacto.email}
                </a>
              </div>
            </div>
          </div>

          <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-azul-600" aria-hidden />
            Tus acciones en la plataforma quedan registradas en el historial de auditoría de la Dirección.
          </p>
        </div>
      </div>
    </>
  );
}
