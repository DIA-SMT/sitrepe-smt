import Link from "next/link";
import { ArrowRight, Building, CircleCheck, CircleDashed, Landmark, ListChecks, MapPin, Warehouse } from "lucide-react";
import { KeyValue } from "@/components/shared/key-value";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ESTADO_EMPRESA, etiqueta } from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { textoDias } from "../_lib/plazos";
import { ESTADO_REQUISITO } from "../_lib/requisitos";
import { FormDomicilio } from "./form-domicilio";
import type { EmpresaLegajo, RequisitoEvaluado, TramiteAbierto } from "./tipos";

type PestanaEmpresaProps = {
  empresa: EmpresaLegajo;
  empresaId: string;
  hoy: string;
  cambioDomicilio: TramiteAbierto | null;
  requisitos: RequisitoEvaluado[];
  bloqueo: string | null;
};

type ItemChecklist = { titulo: string; detalle: string; ok: boolean; norma: string; href?: string; accion?: string };

export function PestanaEmpresa({ empresa, empresaId, hoy, cambioDomicilio, requisitos, bloqueo }: PestanaEmpresaProps) {
  const estado = etiqueta(ESTADO_EMPRESA, empresa.estado_efectivo ?? empresa.estado);
  const carnet = requisitos.find((r) => r.tipo === "carnet_sanidad");
  const carnetOk = carnet?.estado === "cumplido" || carnet?.estado === "por_vencer";
  const diasInspeccion = diasHasta(empresa.ultima_inspeccion_deposito, hoy);

  const checklist: ItemChecklist[] = [
    {
      titulo: "Oficina declarada",
      detalle: empresa.domicilio_oficina ?? "Falta declarar el domicilio de la oficina.",
      ok: Boolean(empresa.domicilio_oficina),
      norma: "Art. 6.º",
    },
    {
      titulo: "Depósito de químicos declarado",
      detalle: empresa.domicilio_deposito ?? "Falta declarar el depósito con espacio exclusivo.",
      ok: Boolean(empresa.domicilio_deposito),
      norma: "Art. 6.º",
    },
    {
      titulo: "Asesor técnico aprobado",
      detalle:
        (empresa.tecnicos_aprobados ?? 0) > 0
          ? `${empresa.tecnicos_aprobados} asesor${empresa.tecnicos_aprobados === 1 ? "" : "es"} habilitado${empresa.tecnicos_aprobados === 1 ? "" : "s"} para firmar.`
          : "Sin asesores aprobados: no podés emitir certificados.",
      ok: (empresa.tecnicos_aprobados ?? 0) > 0,
      norma: "Art. 5.º",
      href: "/prestador/legajo?tab=tecnicos",
      accion: "Asesores",
    },
    {
      titulo: "Memoria técnica aprobada",
      detalle:
        (empresa.productos_aprobados ?? 0) > 0
          ? `${empresa.productos_aprobados} producto${empresa.productos_aprobados === 1 ? "" : "s"} aprobado${empresa.productos_aprobados === 1 ? "" : "s"}.`
          : "Sin productos aprobados para declarar.",
      ok: (empresa.productos_aprobados ?? 0) > 0,
      norma: "Art. 5.º",
      href: "/prestador/productos",
      accion: "Productos",
    },
    {
      titulo: "Carnet de sanidad del titular",
      detalle: !carnetOk
        ? carnet?.estado === "en_revision"
          ? "Cargado: en revisión por la Dirección."
          : `${ESTADO_REQUISITO[carnet?.estado ?? "faltante"].label}.`
        : carnet?.documento?.vence
          ? `Aprobado, vence el ${formatFecha(carnet.documento.vence)}.`
          : "Aprobado y vigente.",
      ok: carnetOk,
      norma: "Art. 7.º",
      href: "/prestador/legajo?tab=documentacion",
      accion: "Documentación",
    },
    {
      titulo: "Inspección anual del depósito",
      detalle: empresa.ultima_inspeccion_deposito
        ? `Última inspección conforme: ${formatFecha(empresa.ultima_inspeccion_deposito)}.`
        : "Todavía no hay una inspección de depósito registrada.",
      ok: diasInspeccion !== null && diasInspeccion >= -365,
      norma: "Art. 10.º d",
    },
    {
      titulo: "Habilitación vigente",
      detalle: empresa.vencimiento_habilitacion
        ? `${textoDias(empresa.dias_para_vencer)} (${formatFecha(empresa.vencimiento_habilitacion)}).`
        : "Se fija al aprobarse la inscripción.",
      ok: empresa.estado_efectivo === "habilitada",
      norma: "Art. 8.º",
      href: "/prestador/legajo?tab=renovacion",
      accion: "Renovación",
    },
  ];
  const cumplidos = checklist.filter((c) => c.ok).length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <SectionCard
        className="lg:col-span-2"
        title="Datos registrales"
        description="Los datos del registro solo los modifica la Dirección. Si hay un error, comunicate con Control de Empresas."
        icon={Landmark}
        actions={<StatusBadge label={estado.label} tone={estado.tono} />}
      >
        <KeyValue
          columns={2}
          items={[
            { label: "N.º de registro", value: empresa.numero_registro ? `N.º ${empresa.numero_registro}` : "Se asigna al habilitar" },
            { label: "CUIT", value: <span className="nums-tabular">{empresa.cuit}</span> },
            { label: "Titular o razón social", value: empresa.titular },
            { label: "Tipo de persona", value: empresa.tipo_persona === "juridica" ? "Persona jurídica" : "Persona humana" },
            { label: "Habilitación comercial (SHN)", value: empresa.habilitacion_comercial },
            { label: "Resolución de autorización (DSA)", value: empresa.resolucion_dsa },
            { label: "Fecha de habilitación", value: empresa.fecha_habilitacion ? formatFecha(empresa.fecha_habilitacion) : null },
            {
              label: "Vencimiento de la habilitación",
              value: empresa.vencimiento_habilitacion ? (
                <span className="flex flex-wrap items-center gap-2">
                  {formatFecha(empresa.vencimiento_habilitacion)}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      (empresa.dias_para_vencer ?? 0) < 0
                        ? "text-danger"
                        : (empresa.dias_para_vencer ?? 99) <= 30
                          ? "text-warning"
                          : "text-muted-foreground",
                    )}
                  >
                    {textoDias(empresa.dias_para_vencer)}
                  </span>
                </span>
              ) : null,
            },
            {
              label: "Última inspección de depósito",
              value: empresa.ultima_inspeccion_deposito ? formatFecha(empresa.ultima_inspeccion_deposito) : "Sin registrar",
            },
            { label: "Correo electrónico", value: empresa.email },
            { label: "Teléfono", value: empresa.telefono },
            {
              label: "Actividades habilitadas",
              value: (
                <span className="flex flex-wrap gap-1.5">
                  {empresa.habilita_fumigacion ? <Badge tone="azul">Fumigación y desinfección</Badge> : null}
                  {empresa.habilita_tanques ? <Badge tone="celeste">Limpieza de tanques</Badge> : null}
                  {!empresa.habilita_fumigacion && !empresa.habilita_tanques ? "Ninguna" : null}
                </span>
              ),
              full: true,
            },
          ]}
        />
      </SectionCard>

      <div className="flex flex-col gap-6">
        <SectionCard
          title="Domicilios declarados"
          description="Oficina y depósito de químicos (Art. 6.º)"
          icon={MapPin}
          actions={
            <FormDomicilio
              empresaId={empresaId}
              oficinaActual={empresa.domicilio_oficina}
              depositoActual={empresa.domicilio_deposito}
              bloqueado={bloqueo ?? (cambioDomicilio ? "Ya hay una solicitud de cambio de domicilio en curso." : null)}
            />
          }
        >
          <ul className="flex flex-col gap-3">
            {[
              { icono: Building, titulo: "Oficina", valor: empresa.domicilio_oficina },
              { icono: Warehouse, titulo: "Depósito de químicos", valor: empresa.domicilio_deposito },
            ].map(({ icono: Icono, titulo, valor }) => (
              <li key={titulo} className="flex items-start gap-3 rounded-xl border border-border bg-subtle/60 p-3">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-azul-600 ring-1 ring-azul-100"
                >
                  <Icono className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{titulo}</p>
                  <p className={cn("text-sm font-medium break-words", !valor && "text-muted-foreground")}>
                    {valor ?? "Sin declarar"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {cambioDomicilio ? (
            <Alert
              className="mt-4"
              tone={cambioDomicilio.estado === "observado" ? "warning" : "info"}
              title={cambioDomicilio.estado === "observado" ? "Cambio de domicilio observado" : "Cambio de domicilio en revisión"}
            >
              {cambioDomicilio.estado === "observado"
                ? `La Dirección hizo observaciones a la solicitud ${cambioDomicilio.codigo ?? ""}: respondelas para continuar.`
                : `La Dirección está revisando la solicitud ${cambioDomicilio.codigo ?? ""} y el libre deuda.`}{" "}
              <Link href={`/prestador/tramites/${cambioDomicilio.id}`} className="font-medium text-azul-700 underline-offset-4 hover:underline">
                Ver trámite
              </Link>
            </Alert>
          ) : (
            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              El cambio de domicilio se tramita en línea y requiere libre deuda municipal.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Checklist de habilitación"
          description={`${cumplidos} de ${checklist.length} requisitos al día`}
          icon={ListChecks}
        >
          <ul className="flex flex-col gap-3">
            {checklist.map((item) => (
              <li key={item.titulo} className="flex items-start gap-3">
                {item.ok ? (
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                ) : (
                  <CircleDashed className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {item.titulo}
                    <span className="sr-only">{item.ok ? ": cumplido" : ": pendiente"}</span>
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{item.norma}</span>
                  </p>
                  <p className="text-[13px] leading-snug break-words text-muted-foreground">{item.detalle}</p>
                </div>
                {!item.ok && item.href ? (
                  <Link
                    href={item.href}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md text-[13px] font-medium text-azul-700 hover:underline"
                  >
                    {item.accion}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
