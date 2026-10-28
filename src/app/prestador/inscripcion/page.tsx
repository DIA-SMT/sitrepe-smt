import type { Metadata } from "next";
import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  FileText,
  FlaskConical,
  IdCard,
  Info,
  MapPin,
  PartyPopper,
  ScrollText,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { PageHeader } from "@/components/shared/page-header";
import { Alert } from "@/components/ui/alert";
import { ROLES_EMPRESA, requerirRol } from "@/lib/auth";
import { APP } from "@/lib/config";
import { getEstadoInscripcion } from "@/lib/data/cuenta";
import { AsistenteInscripcion } from "./_components/asistente-inscripcion";
import { EstadoInscripcionVista } from "./_components/estado-inscripcion";

export const metadata: Metadata = {
  title: "Inscripción en el registro",
  description: "Solicitud de inscripción en el Registro de Empresas de control de plagas urbanas (SITREPE).",
};

type InscripcionPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const REQUISITOS: { icon: LucideIcon; titulo: string; texto: string }[] = [
  { icon: IdCard, titulo: "CUIT y DNI del titular", texto: "Constancia de inscripción en ARCA (ex AFIP)." },
  { icon: BadgeCheck, titulo: "Habilitación comercial", texto: "Número y año de la habilitación municipal (N.º/SHN/año)." },
  { icon: MapPin, titulo: "Oficina y depósito", texto: "Ambos domicilios; el depósito, con espacio exclusivo para químicos." },
  { icon: UserCheck, titulo: "Asesor técnico", texto: "Con título terciario o universitario autenticado." },
  { icon: FlaskConical, titulo: "Memoria técnica", texto: "Productos registrados en ANMAT o SENASA, dosis y precauciones." },
  { icon: FileText, titulo: "Carnet de sanidad", texto: "Del titular, junto con el equipo mínimo de seguridad." },
];

/**
 * Inscripción en el registro de prestadores. Vive bajo el layout de /prestador (que exige rol
 * empresa o técnico); no usa requerirEmpresa porque esta es justamente la página a la que redirige.
 */
export default async function InscripcionPage({ searchParams }: InscripcionPageProps) {
  const sesion = await requerirRol(ROLES_EMPRESA);
  const params = await searchParams;
  const recienEnviada = params.enviada === "1";

  if (sesion.empresa) {
    const datos = await getEstadoInscripcion(sesion.empresa.id);
    return (
      <>
        <PageHeader
          title="Inscripción en el registro"
          description={`Estado de la inscripción de ${sesion.empresa.nombre_comercial} y lo que falta para completarla.`}
          icon={ScrollText}
          breadcrumb={[{ label: "Prestadores", href: "/prestador" }, { label: "Inscripción" }]}
        />
        {recienEnviada ? (
          <Alert tone="success" icon={<PartyPopper />} title="¡Recibimos tu solicitud de inscripción!" className="mb-6 animate-fade-up">
            La Dirección de Salud Ambiental la va a revisar y coordinar la inspección de la oficina y el depósito dentro de los
            15 días (Art. 4.º). Mientras tanto, completá el legajo con los pasos de abajo.
          </Alert>
        ) : null}
        {datos ? (
          <EstadoInscripcionVista datos={datos} creadaCuenta={sesion.perfil.created_at} />
        ) : (
          <Alert tone="warning" title="No pudimos mostrar los datos de tu empresa">
            Tu cuenta está vinculada a una empresa que no podemos consultar en este momento. Intentá de nuevo más tarde o
            escribinos a {APP.contacto.email}.
          </Alert>
        )}
      </>
    );
  }

  if (sesion.perfil.empresa_id) {
    // Vínculo existente pero la empresa no es visible (p. ej. por permisos): no ofrecer una nueva solicitud.
    return (
      <>
        <PageHeader
          title="Inscripción en el registro"
          description="Estado de la inscripción de tu empresa en el registro de prestadores."
          icon={ScrollText}
          breadcrumb={[{ label: "Prestadores", href: "/prestador" }, { label: "Inscripción" }]}
        />
        <Alert tone="warning" title="Tu cuenta ya está vinculada a una empresa">
          No podemos mostrar sus datos en este momento. Comunicate con la {APP.direccion} ({APP.contacto.email}).
        </Alert>
      </>
    );
  }

  const nombreCuenta = `${sesion.perfil.nombre} ${sesion.perfil.apellido}`.trim();

  return (
    <>
      <PageHeader
        title="Inscribí tu empresa"
        description="Solicitá la inscripción en el Registro de Empresas de control de plagas urbanas. Te lleva unos minutos y podés seguir el trámite desde acá."
        icon={Building2}
        breadcrumb={[{ label: "Prestadores", href: "/prestador" }, { label: "Inscripción" }]}
      />

      {sesion.perfil.rol === "tecnico" ? (
        <Alert tone="info" icon={<Info />} title="¿Sos asesor técnico de una empresa ya inscripta?" className="mb-6">
          No hace falta que inscribas otra empresa: pedile a la empresa o a la Dirección que vinculen tu cuenta a su legajo.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <AsistenteInscripcion emailCuenta={sesion.email} nombreCuenta={nombreCuenta} />

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start" aria-label="Requisitos de la inscripción">
          <div className="relative overflow-hidden rounded-card bg-noche p-5 text-white shadow-card">
            <PetalDecor variant="corner" tone="dark" className="h-36 opacity-90" />
            <p className="relative font-display text-xs font-semibold tracking-[0.12em] text-celeste-300 uppercase">
              Ord. 2681/98 · Arts. 4.º a 7.º
            </p>
            <h2 className="relative mt-1 font-display text-lg font-semibold">Qué vas a necesitar</h2>
            <p className="relative mt-1 text-sm leading-relaxed text-noche-200">
              Hoy cargás los datos de la empresa. La documentación se sube después, desde el legajo.
            </p>
            <ul className="relative mt-4 flex flex-col gap-3">
              {REQUISITOS.map((r) => (
                <li key={r.titulo} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-celeste-200 ring-1 ring-white/15"
                  >
                    <r.icon className="size-4" />
                  </span>
                  <span className="min-w-0 text-sm leading-snug">
                    <span className="block font-semibold text-white">{r.titulo}</span>
                    <span className="text-noche-200">{r.texto}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <p className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
              <CalendarCheck className="size-4 text-azul-600" aria-hidden />
              Después de enviar
            </p>
            <ol className="mt-3 flex flex-col gap-2.5 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-azul-50 text-[11px] font-bold text-azul-700 ring-1 ring-azul-100">
                  1
                </span>
                Cargá el asesor técnico, la documentación y la memoria técnica.
              </li>
              <li className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-azul-50 text-[11px] font-bold text-azul-700 ring-1 ring-azul-100">
                  2
                </span>
                Un inspector visita la oficina y el depósito dentro de los 15 días.
              </li>
              <li className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sol-100 text-[11px] font-bold text-sol-800 ring-1 ring-sol-300">
                  3
                </span>
                La Dirección dicta la resolución y te asigna el número de registro.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}
