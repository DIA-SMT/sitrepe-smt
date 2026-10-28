import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { requerirStaff } from "@/lib/auth";
import { getRubros } from "@/lib/data/catalogos";
import { getEstablecimiento, getTerritorio, uuidValido, ZONAS } from "@/lib/data/fiscalizacion";
import { FormEstablecimiento } from "../../_components/form-establecimiento";

export const metadata: Metadata = { title: "Editar establecimiento" };

type Props = { params: Promise<{ id: string }> };

export default async function EditarEstablecimientoPage({ params }: Props) {
  await requerirStaff();
  const { id: idParam } = await params;
  const id = uuidValido(idParam);
  if (!id) notFound();
  const [est, rubros, territorio] = await Promise.all([getEstablecimiento(id), getRubros({ soloActivos: false }), getTerritorio()]);
  if (!est) notFound();

  return (
    <>
      <PageHeader
        title={`Editar ${est.nombre}`}
        description="Actualizá los datos del padrón. Los cambios quedan registrados en la auditoría."
        icon={Pencil}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Establecimientos", href: "/gestion/establecimientos" },
          { label: est.nombre, href: `/gestion/establecimientos/${est.id}` },
          { label: "Editar" },
        ]}
      />
      <div className="mx-auto w-full max-w-3xl">
        <SectionCard title="Datos del establecimiento" description="Los campos con * son obligatorios.">
          <FormEstablecimiento
            inicial={{
              id: est.id,
              nombre: est.nombre,
              nombre_fantasia: est.nombre_fantasia,
              cuit: est.cuit,
              domicilio: est.domicilio,
              barrio: est.barrio,
              zona: est.zona,
              lat: est.lat,
              lng: est.lng,
              rubro_id: est.rubro_id,
              tiene_tanque: est.tiene_tanque,
              afluencia_publico: est.afluencia_publico,
              telefono: est.telefono,
              email: est.email,
            }}
            rubros={rubros.filter((r) => r.activo || r.id === est.rubro_id)}
            zonas={ZONAS}
            barrios={territorio.barrios.map((b) => b.barrio)}
            cancelarHref={`/gestion/establecimientos/${est.id}`}
          />
        </SectionCard>
      </div>
    </>
  );
}
