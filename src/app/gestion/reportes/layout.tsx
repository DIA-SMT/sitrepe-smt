import { ChartColumn } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { requerirStaff } from "@/lib/auth";
import { SubnavReportes } from "./_components/subnav-reportes";

/** Sección de reportes: encabezado común y pestañas (resumen, recaudación, planilla mensual, estadísticas). */
export default async function ReportesLayout({ children }: { children: React.ReactNode }) {
  await requerirStaff();

  return (
    <div className="flex min-w-0 flex-col">
      <PageHeader
        title="Reportes e información estratégica"
        description="Rendición mensual a Ingresos Municipales, planilla mensual por empresa (Art. 10.º c, Ord. 2681/98) y estadísticas por rubro, zona y producto para planificar operativos."
        icon={ChartColumn}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Reportes" }]}
        className="pb-4"
      >
        <SubnavReportes />
      </PageHeader>
      <div className="flex min-w-0 flex-col gap-6 pt-2">{children}</div>
    </div>
  );
}
