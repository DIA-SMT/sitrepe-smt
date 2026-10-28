import type { Metadata } from "next";
import {
  BadgeCheck,
  BellRing,
  Building2,
  ClipboardCheck,
  FileSearch,
  MessageSquareWarning,
  Receipt,
  ScrollText,
  ShieldCheck,
  Store,
} from "lucide-react";
import { AreaChartCard, BarChartCard } from "@/components/shared/charts";
import { StatCard } from "@/components/shared/stat-card";
import { ETIQUETA_ROL, requerirStaff, usuarioParaUI } from "@/lib/auth";
import { fechaDeHoyLarga, getAgendaServicios, getAlertas, getDashboardKpis, saludoSegunHora } from "@/lib/data/gestion";
import { formatMes, formatMesCorto, hoyISO } from "@/lib/domain/formato";
import { AgendaHoy } from "./_components/agenda-hoy";
import { AlertasPanel } from "./_components/alertas-panel";
import { Bienvenida } from "./_components/bienvenida";
import { RecaudacionMes } from "./_components/recaudacion-mes";

export const metadata: Metadata = {
  title: "Panel",
  description: "Indicadores, alertas y agenda del registro de prestadores de fumigación.",
};

const plural = (n: number, singular: string, pluralTexto: string) => `${n.toLocaleString("es-AR")} ${n === 1 ? singular : pluralTexto}`;

export default async function PanelGestionPage() {
  const sesion = await requerirStaff();
  const [kpis, alertas, agenda] = await Promise.all([getDashboardKpis(), getAlertas(), getAgendaServicios()]);
  const usuario = usuarioParaUI(sesion);
  const rol = sesion.perfil.rol;

  const { empresas, certificados, pagos, fiscalizacion } = kpis;
  const serieCertificados = kpis.serie_certificados.map((m) => ({
    label: formatMesCorto(m.mes),
    fumigacion: m.fumigacion,
    tanque: m.tanque,
  }));
  const serieRecaudacion = kpis.serie_recaudacion.map((m) => ({
    label: formatMesCorto(m.mes),
    c505: m.c505,
    c091: m.c091,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Bienvenida
        saludo={saludoSegunHora()}
        nombre={usuario.nombre}
        rol={rol}
        rolLabel={ETIQUETA_ROL[rol]}
        fecha={fechaDeHoyLarga()}
        urgentes={alertas.totales.urgente}
        contadores={{
          aControlar: certificados.a_controlar,
          pagosAVerificar: pagos.a_verificar,
          tramites: kpis.tramites_pendientes,
          establecimientosVencidos: fiscalizacion.establecimientos_vencidos,
          inspeccionesHoy: fiscalizacion.inspecciones_programadas_hoy,
        }}
      />

      <section aria-labelledby="titulo-indicadores" className="flex flex-col gap-4">
        <h2 id="titulo-indicadores" className="sr-only">
          Indicadores del registro
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Empresas habilitadas"
            value={empresas.habilitadas}
            icon={Building2}
            tone="azul"
            hint={`${plural(empresas.por_vencer_30, "vence", "vencen")} en 30 días · ${empresas.con_tanques} con tanques`}
            href="/gestion/empresas?estado=habilitada"
          />
          <StatCard
            label="Certificados del mes"
            value={certificados.mes}
            icon={BadgeCheck}
            tone="celeste"
            hint={`${plural(certificados.timbrados_mes, "timbrado", "timbrados")} · ${plural(certificados.vigentes, "vigente", "vigentes")}`}
            href="/gestion/certificados"
          />
          <StatCard
            label="A controlar"
            value={certificados.a_controlar}
            icon={ClipboardCheck}
            tone="ambar"
            hint="Certificados declarados sin controlar"
            href="/gestion/control"
          />
          <StatCard
            label="Pagos a verificar"
            value={pagos.a_verificar}
            icon={Receipt}
            tone="violeta"
            hint={`${plural(certificados.pendientes_pago, "certificado espera", "certificados esperan")} el pago`}
            href="/gestion/pagos"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <RecaudacionMes
            mes={formatMes(hoyISO())}
            total={pagos.recaudado_mes}
            c505={pagos.recaudado_mes_505}
            c091={pagos.recaudado_mes_091}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Establecimientos vencidos"
              value={fiscalizacion.establecimientos_vencidos}
              icon={Store}
              tone="rojo"
              hint="Fumigación o tanques vencidos"
              href="/gestion/hoja-de-ruta"
            />
            <StatCard
              label="Sin certificado"
              value={fiscalizacion.establecimientos_sin_certificado}
              icon={FileSearch}
              tone="violeta"
              hint="Establecimientos que nunca presentaron"
              href="/gestion/hoja-de-ruta"
            />
            <StatCard
              label="Notificaciones vencidas"
              value={fiscalizacion.notificaciones_vencidas}
              icon={BellRing}
              tone="rojo"
              hint="Plazo cumplido sin regularizar"
              href="/gestion/notificaciones"
            />
            <StatCard
              label="Trámites pendientes"
              value={kpis.tramites_pendientes}
              icon={ScrollText}
              tone="celeste"
              hint={`${plural(empresas.en_tramite, "empresa", "empresas")} en trámite de inscripción`}
              href="/gestion/tramites"
            />
            <StatCard
              label="Denuncias abiertas"
              value={fiscalizacion.denuncias_abiertas}
              icon={MessageSquareWarning}
              tone="ambar"
              hint="Recibidas o en curso"
              href="/gestion/denuncias"
            />
            <StatCard
              label="Inspecciones de hoy"
              value={fiscalizacion.inspecciones_programadas_hoy}
              icon={ShieldCheck}
              tone="verde"
              hint={`${plural(fiscalizacion.actas_mes, "acta labrada", "actas labradas")} este mes`}
              href="/gestion/inspecciones"
            />
          </div>
        </div>
      </section>

      <section aria-label="Evolución de los últimos 12 meses" className="grid gap-4 lg:grid-cols-2">
        <AreaChartCard
          title="Certificados timbrados por mes"
          description="Últimos 12 meses, según la fecha del servicio"
          data={serieCertificados}
          series={[
            { key: "fumigacion", label: "Fumigación y desinfección" },
            { key: "tanque", label: "Limpieza de tanques" },
          ]}
        />
        <BarChartCard
          title="Recaudación verificada por mes"
          description="Últimos 12 meses, por cuenta recaudadora"
          data={serieRecaudacion}
          series={[
            { key: "c505", label: "Cuenta 505" },
            { key: "c091", label: "Cuenta 091" },
          ]}
          format="currency"
          stacked
        />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <AlertasPanel alertas={alertas} />
        <AgendaHoy hoy={agenda.hoy} proximos={agenda.proximos} puedeInspeccionar={rol === "admin" || rol === "inspector"} />
      </div>
    </div>
  );
}
