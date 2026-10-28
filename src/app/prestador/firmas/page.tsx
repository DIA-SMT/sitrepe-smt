import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarClock, ClipboardList, FileSignature, History, IdCard, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirRol } from "@/lib/auth";
import {
  type CertificadoPlanilla,
  getAntelacion,
  getFirmadosRecientes,
  getFirmasPendientes,
  getTecnico,
} from "@/lib/data/declaraciones";
import { ESTADO_CERTIFICADO, ESTADO_TECNICO } from "@/lib/domain/etiquetas";
import { formatFechaHora, formatLitros, formatNumero, formatRelativo, formatSuperficie } from "@/lib/domain/formato";
import {
  type Antelacion,
  ahoraMs,
  describirAntelacion,
  errorFechaServicio,
  horasHasta,
} from "../declaraciones/_lib/reglas";
import { type GrupoFirma, ListaFirmas } from "./_components/lista-firmas";

export const metadata: Metadata = {
  title: "Firmas pendientes",
  description: "Certificados que esperan la firma digital del asesor técnico (Art. 5.º, Ord. 2681/98).",
};

/** Agrupa los pendientes por declaración y marca los que ya no podrán presentarse a tiempo. */
function agrupar(
  pendientes: CertificadoPlanilla[],
  antelacion: Antelacion,
): { grupos: GrupoFirma[]; urgentes: number; proximo: string | null } {
  const ahora = ahoraMs();
  const grupos = new Map<string, GrupoFirma>();
  let urgentes = 0;
  // Próximo servicio todavía no realizado (los pendientes vienen ordenados por fecha).
  const proximo = pendientes.find((c) => c.fechaServicio && Date.parse(c.fechaServicio) >= ahora)?.fechaServicio ?? null;
  for (const c of pendientes) {
    const clave = c.declaracionId ?? "sin-declaracion";
    const grupo = grupos.get(clave) ?? {
      declaracionId: c.declaracionId,
      codigo: c.declaracionCodigo ?? "Sin declaración",
      estado: c.declaracionEstado,
      filas: [],
    };
    const horas = c.fechaServicio ? horasHasta(c.fechaServicio, ahora) : null;
    const fueraDePlazo = c.fechaServicio ? errorFechaServicio(c.tipo, c.fechaServicio, antelacion, ahora) !== null : false;
    if (c.tipo === "fumigacion" && horas !== null && horas >= 0 && horas <= antelacion.maxHoras) urgentes += 1;
    grupo.filas.push({
      id: c.id,
      numero: c.numero,
      tipo: c.tipo,
      cliente: c.cliente,
      domicilio: c.domicilio,
      rubro: c.rubroNombre,
      fecha: formatFechaHora(c.fechaServicio),
      cuando: horas !== null ? describirAntelacion(horas) : null,
      medida: c.tipo === "tanque" ? formatLitros(c.capacidadLitros) : formatSuperficie(c.superficieM2),
      productos: c.productos.map((p) => `${p.nombre} ${formatNumero(p.cantidad)} ${p.unidad}`),
      observacion: c.estado === "observado" ? c.observaciones : null,
      alerta:
        fueraDePlazo && c.tipo === "fumigacion"
          ? `Fuera del plazo de ${antelacion.minHoras} a ${antelacion.maxHoras} h: la empresa tiene que corregir la fecha antes de presentar.`
          : fueraDePlazo
            ? "La limpieza figura con fecha futura: se declara una vez realizada."
            : null,
    });
    grupos.set(clave, grupo);
  }
  return { grupos: [...grupos.values()], urgentes, proximo };
}

export default async function FirmasPage() {
  const sesion = await requerirRol(["tecnico"]);
  const tecnicoId = sesion.perfil.tecnico_id;
  const empresa = sesion.empresa;

  const encabezado = (
    <PageHeader
      title="Firmas pendientes"
      description="Revisá los servicios que tenés asignados y firmalos digitalmente. Sin tu firma, la empresa no puede presentar la planilla."
      icon={FileSignature}
      breadcrumb={[{ label: "Inicio", href: "/prestador" }, { label: "Firmas pendientes" }]}
      actions={
        <Button asChild variant="outline">
          <Link href="/prestador/declaraciones">
            <ClipboardList aria-hidden />
            Declaraciones
          </Link>
        </Button>
      }
    />
  );

  if (!tecnicoId || !empresa) {
    return (
      <div className="flex flex-col gap-6">
        {encabezado}
        <EmptyState
          icon={IdCard}
          title="Tu usuario no está vinculado a un asesor técnico"
          description="Para firmar certificados, tu cuenta tiene que estar asociada a un asesor técnico aprobado en el padrón de la empresa. Pedile a la administración de tu empresa o a la Dirección de Salud Ambiental que lo vincule."
        />
      </div>
    );
  }

  const [tecnico, pendientes, recientes, antelacion] = await Promise.all([
    getTecnico(empresa.id, tecnicoId),
    getFirmasPendientes(empresa.id, tecnicoId),
    getFirmadosRecientes(empresa.id, tecnicoId, 10),
    getAntelacion(),
  ]);
  const { grupos, urgentes, proximo } = agrupar(pendientes, antelacion);
  const nombreTecnico = tecnico ? `${tecnico.nombre} ${tecnico.apellido}` : "Asesor técnico";
  const aprobado = tecnico?.estado === "aprobado";

  return (
    <div className="flex flex-col gap-6">
      {encabezado}

      <div className="relative flex flex-col gap-4 overflow-hidden rounded-panel bg-noche p-5 text-white shadow-elevated sm:flex-row sm:items-center sm:p-6">
        <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-25" />
        <Avatar nombre={nombreTecnico} size="lg" className="relative ring-white/20" />
        <div className="relative min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-celeste-200 uppercase">Firma digital del asesor técnico</p>
          <p className="truncate font-display text-xl font-semibold">{nombreTecnico}</p>
          <p className="text-sm text-noche-200">
            {[tecnico?.titulo, tecnico?.matricula ? `Mat. ${tecnico.matricula}` : null, empresa.nombre_comercial]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {tecnico ? (
          <EstadoBadge mapa={ESTADO_TECNICO} valor={tecnico.estado} size="lg" className="relative self-start sm:self-center" />
        ) : null}
      </div>

      {!aprobado ? (
        <Alert tone="warning" title="Tu registro como asesor técnico no está aprobado">
          Solo los asesores aprobados por la Dirección de Salud Ambiental pueden firmar certificados. Consultá el estado de tu
          legajo con la administración de tu empresa.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pendientes de firma"
          value={pendientes.length}
          icon={FileSignature}
          tone={pendientes.length > 0 ? "ambar" : "verde"}
          hint={pendientes.length > 0 ? "Certificados asignados a vos" : "Estás al día"}
        />
        <StatCard
          label={`Para las próximas ${antelacion.maxHoras} h`}
          value={urgentes}
          icon={CalendarClock}
          tone={urgentes > 0 ? "rojo" : "neutral"}
          hint={proximo ? `Próximo servicio ${formatRelativo(proximo)}` : "Sin servicios próximos"}
        />
        <StatCard label="Planillas involucradas" value={grupos.length} icon={ClipboardList} tone="celeste" hint="Declaraciones con pendientes" />
      </div>

      {pendientes.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="No tenés certificados pendientes de firma"
          description="Cuando la empresa cargue un servicio y te asigne como asesor técnico, lo vas a ver acá para firmarlo."
          action={
            <Button asChild variant="outline">
              <Link href="/prestador/declaraciones">Ver declaraciones</Link>
            </Button>
          }
        />
      ) : (
        <ListaFirmas grupos={grupos} bloqueado={!aprobado} />
      )}

      <SectionCard
        title="Firmados recientemente"
        description="Tus últimas firmas registradas"
        icon={History}
        flush
      >
        {recientes.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState compact icon={ShieldCheck} title="Todavía no firmaste certificados" />
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table framed={false}>
                <THead>
                  <TR>
                    <TH>N.º</TH>
                    <TH>Cliente</TH>
                    <TH>Declaración</TH>
                    <TH>Servicio</TH>
                    <TH>Firmado</TH>
                    <TH>Estado</TH>
                  </TR>
                </THead>
                <TBody>
                  {recientes.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-display font-semibold whitespace-nowrap">{c.numero}</TD>
                      <TD className="max-w-64">
                        <p className="truncate font-medium">{c.cliente}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.domicilio}</p>
                      </TD>
                      <TD className="whitespace-nowrap">
                        {c.declaracionId ? (
                          <Link href={`/prestador/declaraciones/${c.declaracionId}`} className="font-medium text-azul-700 hover:text-azul-800">
                            {c.declaracionCodigo ?? "Ver"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD className="whitespace-nowrap nums-tabular">{formatFechaHora(c.fechaServicio)}</TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{formatRelativo(c.firmadoAt)}</TD>
                      <TD>
                        <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <ul className="flex flex-col divide-y divide-border md:hidden">
              {recientes.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="font-display font-semibold">N.º {c.numero}</p>
                    <p className="truncate text-sm">{c.cliente}</p>
                    <p className="text-xs text-muted-foreground">Firmado {formatRelativo(c.firmadoAt)}</p>
                  </div>
                  <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" />
                </li>
              ))}
            </ul>
          </>
        )}
      </SectionCard>
    </div>
  );
}
