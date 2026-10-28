import type { Metadata } from "next";
import { CalendarDays, Clock, Eye, Landmark, ListChecks, Receipt, Settings, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { requerirStaff } from "@/lib/auth";
import { listarConceptosArancel, listarFeriados, listarParametros, listarRubrosAdmin } from "@/lib/data/admin";
import { formatFechaHora, hoyISO } from "@/lib/domain/formato";
import type { Json } from "@/lib/supabase/database.types";
import { SegmentosEnlace } from "./_compartido/segmentos";
import { PESTANAS, type Pestana } from "./_components/constantes";
import { FormParametros, type ValoresParametros } from "./_components/form-parametros";
import { SeccionAranceles } from "./_components/seccion-aranceles";
import { SeccionCuentas } from "./_components/seccion-cuentas";
import { SeccionFeriados } from "./_components/seccion-feriados";
import { SeccionRubros } from "./_components/seccion-rubros";
import type { ClaveParametro } from "./_components/validaciones";

export const metadata: Metadata = {
  title: "Configuración",
  description: "Aranceles, Anexo de rubros, parámetros operativos, feriados y cuentas recaudadoras.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function esPestana(valor: string | undefined): valor is Pestana {
  return (PESTANAS as readonly string[]).includes(valor ?? "");
}

/** Valor jsonb de un parámetro como texto para el formulario. */
function textoParametro(valor: Json | undefined): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean") return String(valor);
  return JSON.stringify(valor);
}

export default async function ConfiguracionPage({ searchParams }: Props) {
  const sesion = await requerirStaff();
  const editable = sesion.perfil.rol === "admin";
  const sp = await searchParams;

  const pestanaParam = primero(sp.pestana);
  const pestana: Pestana = esPestana(pestanaParam) ? pestanaParam : "aranceles";
  const hoy = hoyISO();
  const anioActual = Number(hoy.slice(0, 4));
  const anioParam = Number.parseInt(primero(sp.anio) ?? "", 10);
  const anio = anioParam >= 2000 && anioParam <= 2100 ? anioParam : anioActual;

  const [{ conceptos, cuentas }, rubros, parametros, { feriados, anios }] = await Promise.all([
    listarConceptosArancel(),
    listarRubrosAdmin(),
    listarParametros(),
    listarFeriados(anio),
  ]);

  const vigentes = conceptos.filter((c) => c.activo && c.vigente);
  const ordenanzas = [...new Set(vigentes.map((c) => c.vigente?.ordenanza).filter((o): o is string => Boolean(o)))].sort();
  const validados = rubros.filter((r) => r.validado).length;
  const porClave = new Map(parametros.map((p) => [p.clave, p]));
  const v = (clave: ClaveParametro) => textoParametro(porClave.get(clave)?.valor);
  const valores: ValoresParametros = {
    antelacion_min_horas: v("antelacion_min_horas"),
    antelacion_max_horas: v("antelacion_max_horas"),
    vencimiento_tanque_dias: v("vencimiento_tanque_dias"),
    dias_alerta_vencimiento: v("dias_alerta_vencimiento"),
    email_contacto: v("email_contacto"),
    domicilio_atencion: v("domicilio_atencion"),
    horario_atencion: v("horario_atencion"),
  };
  const ultimaEdicion = parametros.map((p) => p.updated_at).sort().at(-1) ?? null;
  const feriadosRestantes = anio === anioActual ? feriados.filter((f) => f.fecha >= hoy).length : null;

  const href = (p: Pestana) => `/gestion/configuracion${p === "aranceles" ? "" : `?pestana=${p}`}`;

  return (
    <>
      <PageHeader
        title="Configuración del sistema"
        description="Tablas que gobiernan el cálculo de importes, vencimientos y plazos: se actualizan sin tocar el sistema, con cada cambio normativo."
        icon={Settings}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Administración" }, { label: "Configuración" }]}
      />

      <div className="flex flex-col gap-6">
        {editable ? null : (
          <Alert tone="info" title="Modo consulta" icon={<Eye aria-hidden />}>
            Podés ver la configuración vigente. Solo Administración puede modificarla.
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Conceptos vigentes"
            value={vigentes.length}
            icon={Receipt}
            tone="azul"
            hint={ordenanzas.length ? `Ord. Tarifaria ${ordenanzas.join(" y ")}` : "Sin importes vigentes"}
            href={href("aranceles")}
          />
          <StatCard
            label="Rubros validados"
            value={`${validados}/${rubros.length}`}
            icon={ListChecks}
            tone={rubros.length > 0 && validados === rubros.length ? "verde" : "ambar"}
            hint="Cotejados contra el Anexo original"
            href={href("rubros")}
          />
          <StatCard
            label="Ventana de declaración"
            value={`${valores.antelacion_min_horas || "—"}–${valores.antelacion_max_horas || "—"} h`}
            icon={Clock}
            tone="celeste"
            hint="Antelación mínima y máxima"
            href={href("parametros")}
          />
          <StatCard
            label={`Feriados ${anio}`}
            value={feriados.length}
            icon={CalendarDays}
            tone="violeta"
            hint={feriadosRestantes !== null ? `${feriadosRestantes} por delante` : "Cargados para el año"}
            href={`/gestion/configuracion?pestana=feriados&anio=${anio}`}
          />
        </div>

        <SegmentosEnlace
          etiqueta="Secciones de la configuración"
          variante="linea"
          items={[
            { href: href("aranceles"), etiqueta: "Aranceles", icono: <Receipt aria-hidden />, activo: pestana === "aranceles", contador: conceptos.length },
            {
              href: href("rubros"),
              etiqueta: "Anexo de rubros",
              icono: <ListChecks aria-hidden />,
              activo: pestana === "rubros",
              contador: rubros.length - validados,
              alerta: true,
            },
            { href: href("parametros"), etiqueta: "Parámetros", icono: <SlidersHorizontal aria-hidden />, activo: pestana === "parametros" },
            {
              href: `/gestion/configuracion?pestana=feriados&anio=${anio}`,
              etiqueta: "Feriados",
              icono: <CalendarDays aria-hidden />,
              activo: pestana === "feriados",
              contador: feriados.length,
            },
            { href: href("cuentas"), etiqueta: "Cuentas recaudadoras", icono: <Landmark aria-hidden />, activo: pestana === "cuentas", contador: cuentas.length },
          ]}
        />

        <div key={pestana} className="animate-fade-in">
          {pestana === "aranceles" ? <SeccionAranceles conceptos={conceptos} cuentas={cuentas} editable={editable} hoy={hoy} /> : null}
          {pestana === "rubros" ? <SeccionRubros rubros={rubros} editable={editable} /> : null}
          {pestana === "parametros" ? (
            <SectionCard
              title="Parámetros operativos"
              description={ultimaEdicion ? `Última modificación: ${formatFechaHora(ultimaEdicion)}` : "Valores en uso"}
              icon={SlidersHorizontal}
            >
              <FormParametros valores={valores} editable={editable} />
            </SectionCard>
          ) : null}
          {pestana === "feriados" ? (
            <SeccionFeriados feriados={feriados} anio={anio} anios={anios} hoy={hoy} editable={editable} />
          ) : null}
          {pestana === "cuentas" ? <SeccionCuentas cuentas={cuentas} conceptos={conceptos} editable={editable} /> : null}
        </div>
      </div>
    </>
  );
}
