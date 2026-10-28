import Link from "next/link";
import { BarChart3, ClipboardPlus } from "lucide-react";
import { BarChartCard, type ChartRow, type ChartSeries } from "@/components/shared/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import type { MesCertificados } from "@/lib/data/certificados";

/** Certificados presentados por mes (planilla mensual propia, Art. 10.º c). */
export function GraficoCertificados({
  meses,
  habilitaTanques,
  className,
}: {
  meses: MesCertificados[];
  habilitaTanques: boolean;
  className?: string;
}) {
  const totalFumigacion = meses.reduce((acc, m) => acc + m.fumigacion, 0);
  const totalTanques = meses.reduce((acc, m) => acc + m.tanque, 0);
  const total = totalFumigacion + totalTanques;

  if (total === 0) {
    return (
      <SectionCard title="Certificados por mes" description="Últimos 12 meses" icon={BarChart3} className={className}>
        <EmptyState
          compact
          icon={BarChart3}
          title="Todavía no hay certificados presentados"
          description="Cuando presentes tus primeras declaraciones vas a ver acá la evolución mensual."
          className="border-none"
          action={
            <Button asChild size="sm">
              <Link href="/prestador/declaraciones/nueva">
                <ClipboardPlus aria-hidden /> Nueva declaración
              </Link>
            </Button>
          }
        />
      </SectionCard>
    );
  }

  const conTanques = habilitaTanques || totalTanques > 0;
  const series: ChartSeries[] = conTanques
    ? [
        { key: "fumigacion", label: "Fumigación" },
        { key: "tanque", label: "Limpieza de tanques" },
      ]
    : [{ key: "fumigacion", label: "Fumigación" }];
  const filas = meses.map((m): ChartRow => {
    const fila: ChartRow = { label: m.label, fumigacion: m.fumigacion };
    if (conTanques) fila.tanque = m.tanque;
    return fila;
  });

  return (
    <BarChartCard
      className={className}
      title="Certificados por mes"
      description={`${total.toLocaleString("es-AR")} presentados en los últimos 12 meses (sin anulados)`}
      data={filas}
      series={series}
      stacked={conTanques}
      height={300}
    />
  );
}
