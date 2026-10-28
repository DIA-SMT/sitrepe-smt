import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Plus,
  Route,
  Stamp,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ROL_LABEL, filtrarNav, navGestion, navPrestador } from "@/components/layout/nav";
import { AreaChartCard, DonutChart } from "@/components/shared/charts";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";

export const metadata: Metadata = { title: "Demo · App shell" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function salirDemo() {
  "use server";
  redirect("/estilo");
}

const PENDIENTES = [
  { n: "2026-001284", empresa: "Plagas Cero S.A.", lugar: "Escuela N.º 123", fecha: "26/10/2026", estado: { label: "En revisión", tone: "celeste" as const } },
  { n: "2026-001283", empresa: "BioControl NOA", lugar: "Mercado del Norte", fecha: "25/10/2026", estado: { label: "Observada", tone: "violeta" as const } },
  { n: "2026-001279", empresa: "Fumigaciones del Norte", lugar: "Hospital Padilla", fecha: "25/10/2026", estado: { label: "Pendiente de firma", tone: "ambar" as const } },
  { n: "2026-001270", empresa: "Tucumán Sanidad Ambiental", lugar: "Shopping Portal", fecha: "24/10/2026", estado: { label: "Timbrada", tone: "azul" as const } },
];

export default async function ShellDemoPage({ searchParams }: Props) {
  const sp = await searchParams;
  const area = sp.area === "prestador" ? "prestador" : "gestion";

  const usuario =
    area === "gestion"
      ? { nombre: "Mariana Gómez", email: "mgomez@smt.gob.ar", rol: "admin" as const, rolLabel: ROL_LABEL.admin, empresa: null }
      : {
          nombre: "Laura Medina",
          email: "lmedina@plagascero.com.ar",
          rol: "tecnico" as const,
          rolLabel: ROL_LABEL.tecnico,
          empresa: "Plagas Cero S.A.",
        };

  const nav = filtrarNav(area === "gestion" ? navGestion : navPrestador, usuario.rol);

  return (
    <AppShell area={area} nav={nav} usuario={usuario} alertas={area === "gestion" ? 7 : 2} onLogoutAction={salirDemo}>
      <PageHeader
        title={area === "gestion" ? "Panel de gestión" : "Hola, Laura"}
        description={
          area === "gestion"
            ? "Resumen de la actividad de prestadores, control y fiscalización."
            : "Consultá el estado de tus declaraciones, certificados y pagos."
        }
        icon={LayoutDashboard}
        breadcrumb={[{ label: "Guía de estilo", href: "/estilo" }, { label: "App shell" }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={area === "gestion" ? "/estilo/shell-demo?area=prestador" : "/estilo/shell-demo"}>
                Ver área {area === "gestion" ? "prestador" : "gestión"}
              </Link>
            </Button>
            <Button>
              <Plus aria-hidden />
              {area === "gestion" ? "Nueva inspección" : "Nueva declaración"}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {area === "prestador" ? (
          <Alert tone="warning" title="Tenés 2 declaraciones esperando tu firma" action={<Button size="sm" variant="outline">Firmar ahora</Button>}>
            Firmalas antes del viernes para no demorar la emisión de certificados.
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Empresas habilitadas" value={86} icon={Building2} delta="+4" trend="up" hint="vs. sep." href="/estilo/shell-demo" />
          <StatCard label="Declaraciones del mes" value={1284} icon={ClipboardList} tone="celeste" delta="+12,4 %" trend="up" hint="vs. sep." />
          <StatCard label="Pendientes de control" value={37} icon={ClipboardCheck} tone="ambar" delta="+9" trend="up" upIsGood={false} hint="vs. sep." />
          <StatCard label="Certificados vigentes" value={912} icon={BadgeCheck} tone="verde" hint="Al día de hoy" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <AreaChartCard
            title="Declaraciones por semana"
            description="Últimas 8 semanas"
            data={[
              { label: "S36", value: 238 },
              { label: "S37", value: 251 },
              { label: "S38", value: 247 },
              { label: "S39", value: 276 },
              { label: "S40", value: 289 },
              { label: "S41", value: 301 },
              { label: "S42", value: 296 },
              { label: "S43", value: 322 },
            ]}
          />
          <DonutChart
            title="Estado de declaraciones"
            description="Mes en curso"
            centerLabel="declaraciones"
            data={[
              { label: "Aprobadas", value: 1012 },
              { label: "En revisión", value: 184 },
              { label: "Observadas", value: 51 },
              { label: "Rechazadas", value: 37 },
            ]}
          />
        </div>

        <SectionCard
          title="Últimas declaraciones"
          description="Requieren seguimiento"
          icon={Stamp}
          flush
          actions={
            <Button variant="ghost" size="sm">
              <Route aria-hidden />
              Ver todas
            </Button>
          }
        >
          <Table framed={false}>
            <THead>
              <TR>
                <TH>N.º</TH>
                <TH>Empresa</TH>
                <TH>Establecimiento</TH>
                <TH>Fecha</TH>
                <TH>Estado</TH>
              </TR>
            </THead>
            <TBody>
              {PENDIENTES.map((d) => (
                <TR key={d.n}>
                  <TD className="nums-tabular font-medium whitespace-nowrap text-azul-700">{d.n}</TD>
                  <TD className="whitespace-nowrap">{d.empresa}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{d.lugar}</TD>
                  <TD className="nums-tabular whitespace-nowrap text-muted-foreground">{d.fecha}</TD>
                  <TD>
                    <StatusBadge label={d.estado.label} tone={d.estado.tone} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </SectionCard>
      </div>
    </AppShell>
  );
}
