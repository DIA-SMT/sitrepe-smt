import type { Metadata } from "next";
import { Store } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { requerirStaff } from "@/lib/auth";
import { getRubros } from "@/lib/data/catalogos";
import { getTerritorio, ZONAS } from "@/lib/data/fiscalizacion";
import { FormEstablecimiento } from "../_components/form-establecimiento";

export const metadata: Metadata = { title: "Nuevo establecimiento" };

export default async function NuevoEstablecimientoPage() {
  await requerirStaff();
  const [rubros, territorio] = await Promise.all([getRubros(), getTerritorio()]);

  return (
    <>
      <PageHeader
        title="Nuevo establecimiento"
        description="Sumá al padrón un inmueble alcanzado por la fumigación obligatoria (Ord. 2681/98) o la limpieza de tanques (Ord. 2004/92)."
        icon={Store}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Establecimientos", href: "/gestion/establecimientos" },
          { label: "Nuevo" },
        ]}
      />
      <div className="mx-auto w-full max-w-3xl">
        <SectionCard title="Datos del establecimiento" description="Los campos con * son obligatorios.">
          <FormEstablecimiento
            rubros={rubros}
            zonas={ZONAS}
            barrios={territorio.barrios.map((b) => b.barrio)}
            cancelarHref="/gestion/establecimientos"
          />
        </SectionCard>
      </div>
    </>
  );
}
