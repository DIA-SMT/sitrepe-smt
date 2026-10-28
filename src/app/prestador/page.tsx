import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ClipboardCheck, ClipboardPlus, House, Stamp, TriangleAlert, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requerirEmpresa } from "@/lib/auth";
import { APP } from "@/lib/config";
import {
  diasMesActual,
  getAlertasEmpresa,
  getAvisosRecientes,
  getCertificadosPorMes,
  getHabilitacion,
  getRecordatoriosVencimiento,
  getResumenCertificados,
  getServiciosProximos,
  type HabilitacionEmpresa,
} from "@/lib/data/certificados";
import { formatMes, hoyISO } from "@/lib/domain/formato";
import { AccesosRapidos } from "./_components/accesos-rapidos";
import { AvisosRecientes } from "./_components/avisos-recientes";
import { GraficoCertificados } from "./_components/grafico-certificados";
import { ListaAlertas } from "./_components/lista-alertas";
import { RecordatoriosVencimiento } from "./_components/recordatorios-vencimiento";
import { ServiciosProximos } from "./_components/servicios-proximos";
import { TarjetaHabilitacion } from "./_components/tarjeta-habilitacion";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Resumen de la empresa prestadora: habilitación, certificados, pagos y alertas.",
};

const fmtHora = new Intl.DateTimeFormat("es-AR", { timeZone: APP.zonaHoraria, hour: "numeric", hourCycle: "h23" });

/** Saludo según la hora de Tucumán. */
function saludo(): string {
  const hora = Number(fmtHora.format(new Date()));
  if (hora >= 5 && hora < 12) return "Buen día";
  if (hora >= 12 && hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString("es-AR")} ${n === 1 ? uno : varios}`;

export default async function InicioPrestadorPage() {
  const sesion = await requerirEmpresa();
  const empresa = sesion.empresa;
  const esTecnico = sesion.perfil.rol === "tecnico";

  const [habilitacion, resumen, alertas, proximos, porMes, recordatorios, avisos] = await Promise.all([
    getHabilitacion(empresa.id),
    getResumenCertificados(empresa.id, esTecnico ? sesion.perfil.tecnico_id : null),
    getAlertasEmpresa(empresa.id),
    getServiciosProximos(empresa.id),
    getCertificadosPorMes(empresa.id),
    getRecordatoriosVencimiento(empresa.id),
    getAvisosRecientes(sesion.userId),
  ]);

  // Si la vista no devolviera la fila (no debería), se usa lo que ya trae la sesión.
  const h: HabilitacionEmpresa = habilitacion ?? {
    id: empresa.id,
    nombre_comercial: empresa.nombre_comercial,
    cuit: empresa.cuit,
    numero_registro: empresa.numero_registro,
    resolucion_dsa: null,
    habilitacion_comercial: null,
    habilita_fumigacion: empresa.habilita_fumigacion,
    habilita_tanques: empresa.habilita_tanques,
    estado: empresa.estado,
    estado_efectivo: empresa.estado,
    fecha_habilitacion: null,
    vencimiento_habilitacion: empresa.vencimiento_habilitacion,
    dias_para_vencer: null,
    certificados_mes: null,
    pagos_pendientes: null,
  };

  const nombre = sesion.perfil.nombre.trim() || sesion.email.split("@")[0];
  const mes = diasMesActual();

  const resumenTexto: string[] = [];
  if (proximos.length > 0) resumenTexto.push(`${plural(proximos.length, "servicio", "servicios")} en las próximas 48 h`);
  if (resumen.listosParaPagar > 0)
    resumenTexto.push(`${plural(resumen.listosParaPagar, "certificado listo", "certificados listos")} para pagar`);
  if (resumen.observados > 0) resumenTexto.push(`${plural(resumen.observados, "observado", "observados")} para corregir`);
  if (esTecnico && resumen.pendientesFirma) {
    resumenTexto.push(`${plural(resumen.pendientesFirma, "certificado", "certificados")} para firmar`);
  }

  return (
    <>
      <PageHeader
        title={`${saludo()}, ${nombre}`}
        icon={House}
        description={
          <>
            Este es el resumen de <strong className="font-semibold text-foreground">{empresa.nombre_comercial}</strong>
            {resumenTexto.length > 0 ? (
              <>
                : tenés {resumenTexto.slice(0, -1).join(", ")}
                {resumenTexto.length > 1 ? " y " : ""}
                {resumenTexto[resumenTexto.length - 1]}.
              </>
            ) : (
              <>. No tenés tareas pendientes por ahora.</>
            )}
          </>
        }
        actions={
          <Button asChild>
            <Link href="/prestador/declaraciones/nueva">
              <ClipboardPlus aria-hidden /> Nueva declaración
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-5">
          <TarjetaHabilitacion h={h} className="animate-fade-up lg:col-span-3" />
          <AccesosRapidos
            className="lg:col-span-2"
            esTecnico={esTecnico}
            pendientesFirma={resumen.pendientesFirma}
            listosParaPagar={resumen.listosParaPagar}
          />
        </div>

        <section aria-label="Indicadores de certificados" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Certificados del mes"
            value={resumen.delMes}
            icon={BadgeCheck}
            tone="azul"
            hint={formatMes(hoyISO())}
            href={`/prestador/certificados?desde=${mes.primero}&hasta=${mes.ultimo}`}
          />
          <StatCard
            label="Timbrados este mes"
            value={resumen.timbradosMes}
            icon={Stamp}
            tone="verde"
            hint={`${plural(resumen.vigentes, "vigente", "vigentes")} en total`}
            href="/prestador/certificados?estado=timbrado"
          />
          <StatCard
            label="A controlar"
            value={resumen.aControlar}
            icon={ClipboardCheck}
            tone="celeste"
            hint="Declarados, en revisión"
            href="/prestador/certificados?estado=declarado"
          />
          <StatCard
            label="Listos para pagar"
            value={resumen.listosParaPagar}
            icon={Wallet}
            tone="ambar"
            hint="Controlados sin pago"
            href="/prestador/pagos"
          />
          <StatCard
            label="Observados"
            value={resumen.observados}
            icon={TriangleAlert}
            tone={resumen.observados > 0 ? "rojo" : "neutral"}
            hint={resumen.observados > 0 ? "Corregilos y volvé a presentar" : "Sin observaciones"}
            href="/prestador/declaraciones"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <GraficoCertificados
            className="xl:col-span-2"
            meses={porMes}
            habilitaTanques={!!h.habilita_tanques}
          />
          <ListaAlertas alertas={alertas} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ServiciosProximos servicios={proximos} />
          <RecordatoriosVencimiento recordatorios={recordatorios} />
        </div>

        <AvisosRecientes avisos={avisos} />
      </div>
    </>
  );
}
