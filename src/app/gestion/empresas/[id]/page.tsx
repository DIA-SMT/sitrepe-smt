import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  ExternalLink,
  FlaskConical,
  FolderOpen,
  History,
  IdCard,
  PackageOpen,
  Plus,
  Receipt,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { requerirStaff } from "@/lib/auth";
import { getEmpresa, getHistorialEmpresa, getLegajoEmpresa } from "@/lib/data/empresas";
import { ESTADO_EMPRESA } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha } from "@/lib/domain/formato";
import { rutaNuevaInspeccion } from "../../_components/rutas";
import { TabsUrl, type PestanaUrl } from "../../_components/tabs-url";
import { Actividades, IconoObservaciones } from "../_components/celdas";
import { DialogoEmpresa } from "../_components/dialogo-empresa";
import { TabHistorial } from "./_components/tab-historial";
import { TabCertificados, TabEnvases, TabFiscalizacion, TabPagos, TabTramites } from "./_components/tabs-actividad";
import { TabDocumentos, TabMemoria, TabResumen, TabTecnicos, valoresEmpresa } from "./_components/tabs-registro";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const empresa = await getEmpresa(id).catch(() => null);
  return { title: empresa?.nombre_comercial ? `${empresa.nombre_comercial} · Legajo` : "Legajo de empresa" };
}

const TABS = ["resumen", "tecnicos", "memoria", "documentos", "certificados", "pagos", "tramites", "fiscalizacion", "envases", "historial"];

export default async function LegajoEmpresaPage({ params, searchParams }: Props) {
  const sesion = await requerirStaff();
  const { id } = await params;
  const sp = await searchParams;
  const rol = sesion.perfil.rol;
  const puedeEditar = rol === "admin" || rol === "control";
  const esAdmin = rol === "admin";

  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  const [legajo, historial] = await Promise.all([
    getLegajoEmpresa(id),
    esAdmin ? getHistorialEmpresa(id) : Promise.resolve([]),
  ]);

  const tabParam = typeof sp.tab === "string" ? sp.tab : "resumen";
  const tab = TABS.includes(tabParam) && (tabParam !== "historial" || esAdmin) ? tabParam : "resumen";
  const archivoNoDisponible = sp.archivo === "no-disponible";

  const tecnicosPendientes = legajo.tecnicos.filter((t) => t.estado === "pendiente").length;
  const memoriasPendientes = legajo.memorias.filter((m) => m.estado === "propuesto").length;
  const documentosPendientes = legajo.documentos.filter((d) => d.estado === "pendiente").length;
  const tramitesPendientes = legajo.tramites.filter((t) => t.estado === "presentado").length;

  const pestanas: PestanaUrl[] = [
    { valor: "resumen", etiqueta: "Resumen", icono: <IdCard aria-hidden /> },
    { valor: "tecnicos", etiqueta: "Técnicos", icono: <UsersRound aria-hidden />, contador: tecnicosPendientes, alerta: true },
    { valor: "memoria", etiqueta: "Memoria técnica", icono: <FlaskConical aria-hidden />, contador: memoriasPendientes, alerta: true },
    { valor: "documentos", etiqueta: "Documentos", icono: <FolderOpen aria-hidden />, contador: documentosPendientes, alerta: true },
    { valor: "certificados", etiqueta: "Certificados", icono: <BadgeCheck aria-hidden />, contador: legajo.certificados.total },
    { valor: "pagos", etiqueta: "Pagos", icono: <Receipt aria-hidden />, contador: legajo.pagos.total },
    { valor: "tramites", etiqueta: "Trámites", icono: <ScrollText aria-hidden />, contador: tramitesPendientes, alerta: true },
    {
      valor: "fiscalizacion",
      etiqueta: "Inspecciones y actas",
      icono: <ShieldCheck aria-hidden />,
      contador: legajo.inspecciones.total + legajo.actas.total,
    },
    { valor: "envases", etiqueta: "Envases", icono: <PackageOpen aria-hidden />, contador: legajo.envases.length },
    ...(esAdmin ? [{ valor: "historial", etiqueta: "Historial", icono: <History aria-hidden /> }] : []),
  ];

  const nombre = empresa.nombre_comercial ?? "Empresa";
  const efectivo = empresa.estado_efectivo;
  const dias = empresa.dias_para_vencer;
  const diasDeposito = diasHasta(empresa.ultima_inspeccion_deposito);
  const depositoVencido = efectivo === "habilitada" && (diasDeposito === null || diasDeposito < -365);
  const sinTecnico = (efectivo === "habilitada" || efectivo === "en_tramite") && (empresa.tecnicos_aprobados ?? 0) === 0;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {nombre}
            <IconoObservaciones texto={empresa.observaciones} />
          </span>
        }
        description={[
          empresa.numero_registro ? `Registro N.º ${empresa.numero_registro}` : "Sin N.º de registro",
          empresa.cuit ? `CUIT ${empresa.cuit}` : null,
          empresa.titular,
        ]
          .filter(Boolean)
          .join(" · ")}
        icon={Building2}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Empresas", href: "/gestion/empresas" },
          { label: nombre },
        ]}
        actions={
          <>
            {efectivo === "habilitada" ? (
              <Button asChild variant="ghost">
                <Link href={`/empresas/${id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden />
                  Ficha pública
                  <span className="sr-only">(se abre en una pestaña nueva)</span>
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={rutaNuevaInspeccion({ empresa: id, tipo: "deposito_anual" })}>
                <Plus aria-hidden />
                Programar inspección
              </Link>
            </Button>
            {puedeEditar ? <DialogoEmpresa modo="editar" valores={valoresEmpresa(empresa)} empresaId={id} /> : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_EMPRESA} valor={efectivo} size="lg" />
          <Actividades fumigacion={empresa.habilita_fumigacion} tanques={empresa.habilita_tanques} />
          {empresa.resolucion_dsa ? (
            <span className="inline-flex h-7 items-center rounded-full bg-card px-3 text-[13px] font-medium text-foreground ring-1 ring-border ring-inset">
              Res. {empresa.resolucion_dsa}
            </span>
          ) : null}
          {empresa.vencimiento_habilitacion ? (
            <span className="inline-flex h-7 items-center rounded-full bg-card px-3 text-[13px] text-muted-foreground ring-1 ring-border ring-inset">
              Vence el&nbsp;<span className="font-medium text-foreground">{formatFecha(empresa.vencimiento_habilitacion)}</span>
            </span>
          ) : null}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6">
        {archivoNoDisponible ? (
          <Alert tone="danger" title="No se pudo abrir el archivo">
            El documento no existe o el archivo ya no está disponible en el almacenamiento. Pedile a la empresa que lo cargue nuevamente.
          </Alert>
        ) : null}
        {efectivo === "vencida" ? (
          <Alert tone="danger" title={`Habilitación vencida el ${formatFecha(empresa.vencimiento_habilitacion)}`}>
            La empresa no puede presentar declaraciones ni sus certificados son válidos hasta que renueve (DDJJ anual y libre deuda, Art. 8.º).
          </Alert>
        ) : efectivo === "habilitada" && dias !== null && dias <= 30 ? (
          <Alert tone="warning" title={dias === 0 ? "La habilitación vence hoy" : `La habilitación vence en ${dias} día${dias === 1 ? "" : "s"}`}>
            Recordale a la empresa que presente la renovación anual antes del {formatFecha(empresa.vencimiento_habilitacion)}.
          </Alert>
        ) : null}
        {efectivo === "suspendida" ? (
          <Alert tone="danger" title="Empresa suspendida">
            No puede declarar servicios ni timbrar certificados mientras dure la suspensión.
          </Alert>
        ) : null}
        {efectivo === "baja" ? (
          <Alert tone="info" title="Empresa dada de baja del registro">
            El legajo se conserva para consulta. No figura en el listado público de empresas habilitadas.
          </Alert>
        ) : null}
        {sinTecnico ? (
          <Alert tone="warning" title="Sin asesor técnico aprobado">
            Sin un asesor técnico aprobado la empresa no puede firmar certificados (Art. 5.º).
            {tecnicosPendientes > 0 ? ` Hay ${tecnicosPendientes} pendiente${tecnicosPendientes === 1 ? "" : "s"} de revisión.` : ""}
          </Alert>
        ) : null}
        {depositoVencido ? (
          <Alert
            tone="info"
            title="Inspección anual de depósito pendiente"
            action={
              <Button asChild size="sm" variant="outline">
                <Link href={rutaNuevaInspeccion({ empresa: id, tipo: "deposito_anual" })}>Programar</Link>
              </Button>
            }
          >
            {empresa.ultima_inspeccion_deposito
              ? `La última inspección conforme fue el ${formatFecha(empresa.ultima_inspeccion_deposito)}.`
              : "No hay inspecciones de depósito registradas para esta empresa."}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Asesores técnicos"
            value={empresa.tecnicos_aprobados ?? 0}
            icon={UsersRound}
            tone={(empresa.tecnicos_aprobados ?? 0) > 0 ? "azul" : "rojo"}
            hint={tecnicosPendientes > 0 ? `${tecnicosPendientes} pendiente${tecnicosPendientes === 1 ? "" : "s"} de aprobación` : "Aprobados para firmar"}
          />
          <StatCard
            label="Productos aprobados"
            value={empresa.productos_aprobados ?? 0}
            icon={FlaskConical}
            tone="celeste"
            hint={memoriasPendientes > 0 ? `${memoriasPendientes} por revisar` : "En la memoria técnica"}
          />
          <StatCard
            label="Certificados del mes"
            value={empresa.certificados_mes ?? 0}
            icon={BadgeCheck}
            tone="verde"
            hint={`${legajo.certificados.total.toLocaleString("es-AR")} en total`}
            href={`/gestion/certificados?empresa=${id}`}
          />
          <StatCard
            label="Pagos pendientes"
            value={empresa.pagos_pendientes ?? 0}
            icon={Receipt}
            tone={(empresa.pagos_pendientes ?? 0) > 0 ? "ambar" : "neutral"}
            hint="Liquidaciones sin pagar o a verificar"
            href={`/gestion/pagos?empresa=${id}`}
          />
        </div>

        <TabsUrl key={tab} pestanas={pestanas} valorInicial={tab} etiqueta="Secciones del legajo">
          <TabsContent value="resumen">
            <TabResumen empresaId={id} empresa={empresa} legajo={legajo} puedeEditar={puedeEditar} />
          </TabsContent>
          <TabsContent value="tecnicos">
            <TabTecnicos empresaId={id} tecnicos={legajo.tecnicos} documentos={legajo.documentos} puedeEditar={puedeEditar} />
          </TabsContent>
          <TabsContent value="memoria">
            <TabMemoria memorias={legajo.memorias} puedeEditar={puedeEditar} />
          </TabsContent>
          <TabsContent value="documentos">
            <TabDocumentos empresaId={id} documentos={legajo.documentos} puedeEditar={puedeEditar} />
          </TabsContent>
          <TabsContent value="certificados">
            <TabCertificados empresaId={id} certificados={legajo.certificados} />
          </TabsContent>
          <TabsContent value="pagos">
            <TabPagos empresaId={id} pagos={legajo.pagos} />
          </TabsContent>
          <TabsContent value="tramites">
            <TabTramites tramites={legajo.tramites} />
          </TabsContent>
          <TabsContent value="fiscalizacion">
            <TabFiscalizacion empresaId={id} empresa={empresa} inspecciones={legajo.inspecciones} actas={legajo.actas} />
          </TabsContent>
          <TabsContent value="envases">
            <TabEnvases envases={legajo.envases} />
          </TabsContent>
          {esAdmin ? (
            <TabsContent value="historial">
              <TabHistorial entradas={historial} />
            </TabsContent>
          ) : null}
        </TabsUrl>
      </div>
    </>
  );
}
