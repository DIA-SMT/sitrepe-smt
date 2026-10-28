import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CircleAlert, FileQuestion, Hourglass, Route, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { getResumenHojaRuta } from "@/lib/data/fiscalizacion";
import { PestaniasHojaRuta } from "./_components/pestanias";

export const metadata: Metadata = {
  title: "Hoja de ruta",
  description: "Establecimientos con certificados vencidos, por vencer o no presentados y agenda de servicios para muestreo.",
};

export default async function HojaDeRutaLayout({ children }: { children: React.ReactNode }) {
  await requerirStaff();
  const resumen = await getResumenHojaRuta();

  return (
    <>
      <PageHeader
        title="Hoja de ruta"
        description="Salí a terreno con información precisa: establecimientos con certificados vencidos, sin presentar o por vencer, y los servicios declarados para hoy y mañana."
        icon={Route}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Fiscalización" }, { label: "Hoja de ruta" }]}
        actions={
          <Button asChild variant="outline">
            <Link href="/gestion/inspecciones">
              <ShieldCheck aria-hidden />
              Inspecciones
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Certificados vencidos"
            value={resumen.vencidos}
            icon={CircleAlert}
            tone="rojo"
            hint="Prioridad alta"
            href="/gestion/hoja-de-ruta?estado=vencido"
          />
          <StatCard
            label="Sin certificado"
            value={resumen.sinCertificado}
            icon={FileQuestion}
            tone="violeta"
            hint="Nunca presentaron"
            href="/gestion/hoja-de-ruta?estado=sin_certificado"
          />
          <StatCard
            label="Por vencer"
            value={resumen.porVencer}
            icon={Hourglass}
            tone="ambar"
            hint="Próximos 15 días"
            href="/gestion/hoja-de-ruta?estado=por_vencer"
          />
          <StatCard
            label="Servicios a muestrear"
            value={resumen.agendaPendiente}
            icon={CalendarClock}
            tone="azul"
            hint="Hoy y mañana, sin inspección"
            href="/gestion/hoja-de-ruta/agenda"
          />
        </div>

        <PestaniasHojaRuta agendaPendiente={resumen.agendaPendiente} />

        {children}
      </div>
    </>
  );
}
