import type { Metadata } from "next";
import { Building2, CalendarClock, FolderCheck, IdCard, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Alert } from "@/components/ui/alert";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requerirEmpresa } from "@/lib/auth";
import {
  getDocumentosEmpresa,
  getEmpresaLegajo,
  getRenovaciones,
  getTecnicosEmpresa,
  getTramitesAbiertos,
  getTramitesCambioTecnico,
} from "@/lib/data/legajo";
import { hoyISO } from "@/lib/domain/formato";
import { REQUISITOS_LEGAJO, evaluarRequisito } from "./_lib/requisitos";
import { motivoBloqueo } from "./_lib/tramites";
import { ultimoTramiteDe } from "./_lib/vinculos";
import { FichaEmpresa } from "./_components/ficha-empresa";
import { PestanaDocumentacion } from "./_components/pestana-documentacion";
import { PestanaEmpresa } from "./_components/pestana-empresa";
import { PestanaRenovacion } from "./_components/pestana-renovacion";
import { PestanaTecnicos } from "./_components/pestana-tecnicos";
import { TabsUrl } from "./_components/tabs-url";
import type { RequisitoEvaluado } from "./_components/tipos";

export const metadata: Metadata = {
  title: "Legajo digital",
  description: "Datos registrales, asesores técnicos, documentación obligatoria y renovación anual de la empresa.",
};

const PESTANAS = ["empresa", "tecnicos", "documentacion", "renovacion"] as const;
type Pestana = (typeof PESTANAS)[number];

function esPestana(valor: string | undefined): valor is Pestana {
  return PESTANAS.some((p) => p === valor);
}

export default async function LegajoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const sp = await searchParams;
  const tabParam = typeof sp.tab === "string" ? sp.tab : undefined;
  const tab: Pestana = esPestana(tabParam) ? tabParam : "empresa";

  const [empresa, tecnicos, documentos, abiertos, renovaciones, tramitesTecnico] = await Promise.all([
    getEmpresaLegajo(empresaId),
    getTecnicosEmpresa(empresaId),
    getDocumentosEmpresa(empresaId),
    getTramitesAbiertos(empresaId),
    getRenovaciones(empresaId),
    // Todos los trámites de asesores (también los resueltos): un rechazo deja al asesor "pendiente".
    getTramitesCambioTecnico(empresaId),
  ]);

  const encabezado = (
    <PageHeader
      title="Legajo digital"
      description="Datos de la empresa, asesores técnicos, documentación obligatoria y renovación anual (Arts. 4.º a 8.º, Ord. 2681/98)."
      icon={IdCard}
      breadcrumb={[{ label: "Prestadores", href: "/prestador" }, { label: "Legajo digital" }]}
    />
  );

  if (!empresa) {
    return (
      <>
        {encabezado}
        <EmptyState
          icon={Building2}
          title="No encontramos el legajo de tu empresa"
          description="Tu usuario está vinculado a una empresa que no podemos consultar. Comunicate con la Dirección de Salud Ambiental."
        />
      </>
    );
  }

  const hoy = hoyISO();
  const bloqueo = motivoBloqueo(sesion.empresa.estado);

  const requisitos: RequisitoEvaluado[] = REQUISITOS_LEGAJO.map((r) => ({
    ...r,
    ...evaluarRequisito(
      documentos.filter((d) => d.tipo === r.tipo),
      hoy,
    ),
  }));
  const cumplidos = requisitos.filter((r) => r.estado === "cumplido" || r.estado === "por_vencer").length;
  const pendientesRevision = requisitos.filter((r) => r.estado !== "cumplido" && r.estado !== "en_revision").length;

  const aprobados = tecnicos.filter((t) => t.estado === "aprobado");
  // Un asesor "pendiente" cuyo último trámite fue rechazado ya no está en revisión.
  const pendientes = tecnicos.filter(
    (t) => t.estado === "pendiente" && ultimoTramiteDe(tramitesTecnico, "tecnico_id", t.id)?.estado !== "rechazado",
  );
  const opcionesTecnico = tecnicos
    .filter((t) => t.estado === "aprobado" || t.estado === "pendiente")
    .map((t) => ({ id: t.id, nombre: `${t.nombre} ${t.apellido}` }));
  const cambioDomicilio = abiertos.find((t) => t.tipo === "cambio_domicilio") ?? null;
  const renovacionPendiente =
    !renovaciones.some((r) => r.estado === "presentado" || r.estado === "observado") &&
    empresa.dias_para_vencer !== null &&
    empresa.dias_para_vencer <= 90 &&
    empresa.estado !== "en_tramite";

  return (
    <>
      {encabezado}

      {bloqueo ? (
        <Alert tone="danger" title="Empresa dada de baja" className="mb-6">
          {bloqueo} El legajo queda disponible solo para consulta.
        </Alert>
      ) : null}

      <FichaEmpresa
        empresa={empresa}
        tecnicosAprobados={aprobados.length}
        tecnicosPendientes={pendientes.length}
        requisitosCumplidos={cumplidos}
        requisitosTotal={requisitos.length}
      />

      <TabsUrl valorInicial={tab} valores={PESTANAS} className="gap-6">
        <TabsList aria-label="Secciones del legajo" className="max-w-full">
          <TabsTrigger value="empresa">
            <Building2 aria-hidden />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="tecnicos">
            <UsersRound aria-hidden />
            Asesores técnicos
            <ContadorPestana valor={tecnicos.filter((t) => t.estado !== "baja").length} />
          </TabsTrigger>
          <TabsTrigger value="documentacion">
            <FolderCheck aria-hidden />
            Documentación
            <ContadorPestana valor={pendientesRevision} alerta={pendientesRevision > 0} etiqueta="requisitos por completar" />
          </TabsTrigger>
          <TabsTrigger value="renovacion">
            <CalendarClock aria-hidden />
            Renovación anual
            {renovacionPendiente ? (
              <span className="size-2 rounded-full bg-sol-400 ring-2 ring-sol-100" aria-label="Renovación próxima" role="img" />
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <PestanaEmpresa
            empresa={empresa}
            empresaId={empresaId}
            hoy={hoy}
            cambioDomicilio={cambioDomicilio}
            requisitos={requisitos}
            bloqueo={bloqueo}
          />
        </TabsContent>
        <TabsContent value="tecnicos">
          <PestanaTecnicos
            empresaId={empresaId}
            tecnicos={tecnicos}
            documentos={documentos.filter((d) => d.tipo === "titulo_tecnico")}
            tramitesTecnico={tramitesTecnico}
            aprobados={aprobados.map((t) => ({ id: t.id, nombre: `${t.nombre} ${t.apellido}` }))}
            bloqueo={bloqueo}
          />
        </TabsContent>
        <TabsContent value="documentacion">
          <PestanaDocumentacion
            empresaId={empresaId}
            hoy={hoy}
            requisitos={requisitos}
            documentos={documentos}
            tecnicos={opcionesTecnico}
            bloqueo={bloqueo}
          />
        </TabsContent>
        <TabsContent value="renovacion">
          <PestanaRenovacion empresa={empresa} empresaId={empresaId} hoy={hoy} renovaciones={renovaciones} bloqueo={bloqueo} />
        </TabsContent>
      </TabsUrl>
    </>
  );
}

function ContadorPestana({ valor, alerta = false, etiqueta }: { valor: number; alerta?: boolean; etiqueta?: string }) {
  if (valor <= 0) return null;
  return (
    <span
      className={
        alerta
          ? "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sol-400 px-1.5 text-[11px] font-semibold text-noche-950"
          : "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-azul-100 px-1.5 text-[11px] font-semibold text-azul-700"
      }
    >
      {valor}
      {etiqueta ? <span className="sr-only"> {etiqueta}</span> : null}
    </span>
  );
}
