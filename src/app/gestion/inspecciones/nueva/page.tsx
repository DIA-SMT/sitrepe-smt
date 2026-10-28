import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { requerirStaff } from "@/lib/auth";
import {
  enLista,
  getContextoInspeccion,
  getEmpresaBasica,
  getEmpresasOpciones,
  getEstablecimientoConEstado,
  getInspectores,
  getOpcionEstablecimiento,
  uuidValido,
} from "@/lib/data/fiscalizacion";
import { hoyISO } from "@/lib/domain/formato";
import { Constants } from "@/lib/supabase/database.types";
import { TarjetaCertificado, TarjetaDenuncia, TarjetaEmpresa, TarjetaEstablecimiento } from "../_components/contexto";
import { FormNuevaInspeccion } from "../_components/form-nueva-inspeccion";

export const metadata: Metadata = { title: "Programar inspección" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Fecha local (Tucumán) de un timestamptz. */
const diaLocal = (iso: string) => hoyISO(new Date(iso));

export default async function NuevaInspeccionPage({ searchParams }: Props) {
  const sesion = await requerirStaff();
  const sp = await searchParams;
  const certificadoId = uuidValido(sp.certificado) ?? null;
  const denunciaId = uuidValido(sp.denuncia) ?? null;
  const tipo =
    enLista(Constants.public.Enums.tipo_inspeccion, sp.tipo) ??
    (certificadoId ? "muestreo_servicio" : denunciaId ? "denuncia" : "control_vencimiento");

  // Certificado y denuncia aportan el lugar y la empresa cuando no vienen en la URL.
  const base = await getContextoInspeccion({
    establecimiento_id: null,
    empresa_id: null,
    certificado_id: certificadoId,
    denuncia_id: denunciaId,
  });
  const establecimientoId =
    base.certificado?.establecimiento_id ?? uuidValido(sp.establecimiento) ?? base.denuncia?.establecimiento_id ?? null;
  const empresaId = base.certificado?.empresa_id ?? uuidValido(sp.empresa) ?? base.denuncia?.empresa_id ?? null;

  const [establecimiento, opcionEstablecimiento, empresa, inspectores, empresas] = await Promise.all([
    establecimientoId ? getEstablecimientoConEstado(establecimientoId) : Promise.resolve(null),
    establecimientoId ? getOpcionEstablecimiento(establecimientoId) : Promise.resolve(null),
    empresaId ? getEmpresaBasica(empresaId) : Promise.resolve(null),
    getInspectores(),
    getEmpresasOpciones(),
  ]);

  const hoy = hoyISO();
  const fechaServicio = base.certificado?.fecha_servicio ? diaLocal(base.certificado.fecha_servicio) : null;
  const fechaInicial = fechaServicio && fechaServicio > hoy ? fechaServicio : hoy;
  const inspectorInicial = inspectores.some((p) => p.id === sesion.userId) ? sesion.userId : "";
  const cancelarHref = denunciaId
    ? `/gestion/denuncias/${denunciaId}`
    : establecimientoId
      ? `/gestion/establecimientos/${establecimientoId}`
      : "/gestion/inspecciones";

  const avisoFaltante =
    (sp.certificado && !base.certificado) || (sp.denuncia && !base.denuncia) || (sp.establecimiento && !opcionEstablecimiento);
  const hayContexto = Boolean(base.certificado || base.denuncia || establecimiento || (empresa && tipo !== "control_vencimiento"));

  return (
    <>
      <PageHeader
        title="Programar inspección"
        description="Asigná la visita a un inspector o inspectora. Desde el celular va a poder registrar el resultado en el lugar."
        icon={CalendarPlus}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Inspecciones", href: "/gestion/inspecciones" },
          { label: "Programar" },
        ]}
      />

      <div className={hayContexto ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start" : "mx-auto w-full max-w-3xl"}>
        <div className="flex flex-col gap-4">
          {avisoFaltante ? (
            <Alert tone="warning" title="No encontramos alguno de los datos vinculados">
              El enlace hace referencia a un registro que no existe o no tenés permiso para ver. Completá los datos a mano.
            </Alert>
          ) : null}
          <SectionCard title="Datos de la inspección" icon={CalendarPlus}>
            <FormNuevaInspeccion
              tipoInicial={tipo}
              fechaInicial={fechaInicial}
              fechaMinima={hoy}
              inspectores={inspectores}
              inspectorInicial={inspectorInicial}
              empresas={empresas}
              empresaInicial={empresaId}
              establecimientoInicial={opcionEstablecimiento}
              certificadoId={base.certificado?.id ?? null}
              denunciaId={base.denuncia?.id ?? null}
              lugarFijo={Boolean(base.certificado)}
              cancelarHref={cancelarHref}
            />
          </SectionCard>
        </div>

        {hayContexto ? (
          <aside className="flex flex-col gap-4" aria-label="Datos vinculados">
            {base.certificado ? <TarjetaCertificado certificado={base.certificado} /> : null}
            {base.denuncia ? <TarjetaDenuncia denuncia={base.denuncia} /> : null}
            {establecimiento ? <TarjetaEstablecimiento establecimiento={establecimiento} compacta /> : null}
            {empresa && !base.certificado && tipo !== "control_vencimiento" ? (
              <TarjetaEmpresa empresa={empresa} deposito={tipo === "deposito_anual" || tipo === "habilitacion"} />
            ) : null}
          </aside>
        ) : null}
      </div>
    </>
  );
}
