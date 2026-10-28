import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  ExternalLink,
  FileText,
  Hourglass,
  MessageSquareReply,
  MessageSquareWarning,
  Paperclip,
  ScrollText,
  Send,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { type KeyValueItem, KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requerirEmpresa } from "@/lib/auth";
import { getItemMemoria, getTecnicoEmpresa, getTramiteEmpresa } from "@/lib/data/legajo";
import {
  CLASE_PRODUCTO,
  ESTADO_DOCUMENTO,
  ESTADO_MEMORIA,
  ESTADO_TECNICO,
  ESTADO_TRAMITE,
  TIPO_DOCUMENTO,
  TIPO_TRAMITE,
  etiqueta,
} from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora } from "@/lib/domain/formato";
import { idValido } from "../../legajo/_lib/esquemas";
import { type DatosLeidos, booleano, leerDatos, numero, respuestas, texto } from "../_lib/datos";
import { FormRespuesta, type ValoresRespuesta } from "./_components/form-respuesta";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Detalle del trámite",
  description: "Datos, documentación y seguimiento de un trámite ante la Dirección de Salud Ambiental.",
};

function siNo(valor: boolean | null) {
  return valor === null ? null : valor ? "Sí" : "No";
}

function Cambio({ nuevo, anterior }: { nuevo: string | null; anterior: string | null }) {
  if (!nuevo) return <span className="text-muted-foreground">Sin cambios{anterior ? ` (${anterior})` : ""}</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <span>{nuevo}</span>
      {anterior ? <span className="text-xs font-normal text-muted-foreground line-through">{anterior}</span> : null}
    </span>
  );
}

export default async function TramitePage({ params }: Props) {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const { id } = await params;
  if (!idValido.safeParse(id).success) notFound();

  const resultado = await getTramiteEmpresa(empresaId, id);
  if (!resultado || resultado.tramite.estado === "borrador") notFound();
  const { tramite, documentos } = resultado;
  const d: DatosLeidos = leerDatos(tramite.datos);
  const tipo = tramite.tipo;

  // Entidades relacionadas según el tipo de trámite.
  const tecnicoId = tipo === "cambio_tecnico" ? texto(d, "tecnico_id") : null;
  const itemId = tipo === "alta_producto" ? texto(d, "empresa_producto_id") : null;
  const [tecnico, item] = await Promise.all([
    tecnicoId && idValido.safeParse(tecnicoId).success ? getTecnicoEmpresa(empresaId, tecnicoId) : Promise.resolve(null),
    itemId && idValido.safeParse(itemId).success ? getItemMemoria(empresaId, itemId) : Promise.resolve(null),
  ]);

  const tipoEtiqueta = etiqueta(TIPO_TRAMITE, tipo);
  const estado = tramite.estado;

  let items: KeyValueItem[] = [];
  let valores: ValoresRespuesta = {};
  switch (tipo) {
    case "inscripcion":
      items = [
        { label: "Nombre comercial", value: texto(d, "nombre_comercial") },
        { label: "CUIT", value: texto(d, "cuit") },
        { label: "Titular o razón social", value: texto(d, "titular") },
        { label: "Tipo de persona", value: texto(d, "tipo_persona") === "juridica" ? "Persona jurídica" : "Persona humana" },
        { label: "Domicilio de la oficina", value: texto(d, "domicilio_oficina") },
        { label: "Depósito de químicos", value: texto(d, "domicilio_deposito") },
        { label: "Habilitación comercial", value: texto(d, "habilitacion_comercial") },
        { label: "Limpieza de tanques", value: siNo(booleano(d, "habilita_tanques")) },
        { label: "Correo electrónico", value: texto(d, "email") },
        { label: "Teléfono", value: texto(d, "telefono") },
      ];
      break;
    case "renovacion": {
      const anio = numero(d, "anio");
      items = [
        { label: "Año declarado", value: anio ? `DDJJ ${anio}` : null },
        { label: "Categoría", value: texto(d, "categoria") ? `Categoría ${texto(d, "categoria")}` : null },
        { label: "Libre deuda", value: booleano(d, "libre_deuda") ? "Declarado y adjunto" : "No declarado" },
        { label: "Plazo de presentación", value: anio ? `Hasta el ${formatFecha(`${anio + 1}-03-31`)}` : null },
      ];
      valores = { categoria: texto(d, "categoria") };
      break;
    }
    case "cambio_tecnico":
      items = [
        {
          label: "Asesor técnico",
          value: tecnico ? `${tecnico.nombre} ${tecnico.apellido}` : (texto(d, "tecnico_nombre") ?? "Asesor eliminado"),
        },
        { label: "DNI", value: tecnico?.dni ?? texto(d, "tecnico_dni") },
        { label: "Título", value: tecnico?.titulo },
        { label: "Matrícula", value: tecnico?.matricula },
        { label: "Representante técnico", value: siNo(tecnico?.es_representante ?? booleano(d, "es_representante")) },
        { label: "Reemplaza a", value: texto(d, "tecnico_baja_nombre") ?? "No reemplaza a nadie" },
        {
          label: "Estado del asesor",
          value: !tecnico ? (
            "Ya no figura en el legajo"
          ) : tecnico.estado === "pendiente" && tramite.estado === "rechazado" ? (
            // resolver_tramite no cambia el estado del asesor al rechazar: queda sin efecto.
            <StatusBadge label="Sin efecto: podés eliminarlo del legajo" tone="rojo" size="sm" />
          ) : (
            <EstadoBadge mapa={ESTADO_TECNICO} valor={tecnico.estado} size="sm" />
          ),
        },
      ];
      break;
    case "cambio_domicilio":
      items = [
        {
          label: "Oficina",
          value: <Cambio nuevo={texto(d, "domicilio_oficina")} anterior={texto(d, "domicilio_oficina_anterior")} />,
        },
        {
          label: "Depósito de químicos",
          value: <Cambio nuevo={texto(d, "domicilio_deposito")} anterior={texto(d, "domicilio_deposito_anterior")} />,
        },
        { label: "Motivo", value: texto(d, "motivo"), full: true },
        { label: "Libre deuda", value: booleano(d, "libre_deuda_declarado") ? "Declarado por la empresa" : null },
      ];
      valores = {
        domicilio_oficina: texto(d, "domicilio_oficina"),
        domicilio_deposito: texto(d, "domicilio_deposito"),
        motivo: texto(d, "motivo"),
      };
      break;
    case "alta_producto":
      items = [
        { label: "Producto", value: item?.producto_nombre ?? texto(d, "producto_nombre") },
        { label: "Principio activo", value: item?.principio_activo },
        { label: "Registro", value: item?.organismo ? `${item.organismo} ${item.registro_numero ?? ""}` : texto(d, "registro") },
        { label: "Clase", value: item?.clase ? etiqueta(CLASE_PRODUCTO, item.clase).label : null },
        { label: "Dosis", value: item?.dosis },
        { label: "Concentración de uso", value: item?.concentracion_uso },
        { label: "Precauciones", value: item?.precauciones, full: true },
        {
          label: "Estado en la memoria técnica",
          value: !item ? (
            "Propuesta retirada de la memoria técnica"
          ) : item.estado === "propuesto" && tramite.estado === "rechazado" ? (
            // resolver_tramite no cambia la propuesta al rechazar: queda sin efecto.
            <StatusBadge label="Sin efecto: retirala desde Productos" tone="rojo" size="sm" />
          ) : (
            <EstadoBadge mapa={ESTADO_MEMORIA} valor={item.estado} size="sm" />
          ),
        },
      ];
      valores = { dosis: item?.dosis, concentracion_uso: item?.concentracion_uso, precauciones: item?.precauciones };
      break;
    case "baja":
      items = [
        { label: "Solicitud", value: "Baja del registro de empresas", full: true },
        { label: "Motivo", value: texto(d, "motivo"), full: true },
      ];
      break;
    default:
      items = [{ label: "Detalle", value: "Sin datos adicionales", full: true }];
  }

  // Seguimiento: del más reciente al más antiguo.
  const historial = respuestas(d);
  const eventos: TimelineItem[] = [];
  if (estado === "aprobado" || estado === "rechazado") {
    eventos.push({
      id: "resolucion",
      date: tramite.resuelto_at ?? tramite.updated_at ?? "—",
      title: estado === "aprobado" ? "Aprobado por la Dirección" : "Rechazado por la Dirección",
      description: tramite.resolucion ?? tramite.observaciones ?? undefined,
      tone: estado === "aprobado" ? "verde" : "rojo",
      icon: estado === "aprobado" ? CircleCheck : CircleX,
    });
  } else if (estado === "observado") {
    eventos.push({
      id: "observado",
      date: tramite.updated_at ?? "—",
      title: "Observado por la Dirección",
      description: tramite.observaciones ?? undefined,
      tone: "ambar",
      icon: MessageSquareWarning,
    });
  } else if (estado === "presentado") {
    eventos.push({ id: "revision", date: "En curso", title: "En revisión por la Dirección", tone: "neutral", icon: Hourglass });
  }
  for (const [i, r] of [...historial].reverse().entries()) {
    eventos.push({
      id: `respuesta-${i}`,
      date: r.fecha,
      title: "Respuesta de la empresa",
      description: (
        <span className="flex flex-col gap-1">
          {r.observacion ? <span className="text-xs italic">Observación: “{r.observacion}”</span> : null}
          <span>{r.texto}</span>
        </span>
      ),
      tone: "celeste",
      icon: MessageSquareReply,
    });
  }
  eventos.push({
    id: "presentado",
    date: tramite.presentado_at ?? tramite.created_at ?? "—",
    title: "Trámite presentado",
    description: tramite.codigo ? `Se asignó el número ${tramite.codigo}.` : undefined,
    tone: "azul",
    icon: Send,
  });

  return (
    <>
      <PageHeader
        title={`Trámite ${tramite.codigo ?? ""}`.trim()}
        description={tipoEtiqueta.label}
        icon={ScrollText}
        breadcrumb={[
          { label: "Prestadores", href: "/prestador" },
          { label: "Trámites", href: "/prestador/tramites" },
          { label: tramite.codigo ?? "Detalle" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/prestador/tramites">
              <ArrowLeft aria-hidden />
              Volver
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge mapa={ESTADO_TRAMITE} valor={estado} size="lg" pulse={estado === "observado"} />
          <Badge tone={tipoEtiqueta.tono} size="lg">
            {tipoEtiqueta.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Presentado el {formatFechaHora(tramite.presentado_at ?? tramite.created_at)}
          </span>
        </div>
      </PageHeader>

      {estado === "observado" ? (
        <Alert
          tone="warning"
          title="La Dirección hizo observaciones"
          className="mb-6"
          action={
            <Button asChild size="sm">
              <a href="#responder">Responder</a>
            </Button>
          }
        >
          <span className="whitespace-pre-line">{tramite.observaciones ?? "Revisá los datos y la documentación del trámite."}</span>
        </Alert>
      ) : null}
      {estado === "rechazado" ? (
        <Alert tone="danger" title="Trámite rechazado" className="mb-6">
          <span className="whitespace-pre-line">{tramite.observaciones ?? tramite.resolucion ?? "Consultá el motivo con la Dirección."}</span>
        </Alert>
      ) : null}
      {estado === "aprobado" ? (
        <Alert tone="success" title="Trámite aprobado" className="mb-6">
          {tramite.resolucion ? `Resolución: ${tramite.resolucion}. ` : null}
          Los cambios ya se reflejan en tu legajo.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SectionCard title="Datos de la solicitud" icon={FileText}>
            <KeyValue items={items} columns={2} />
          </SectionCard>

          <SectionCard
            title="Documentación adjunta"
            description={`${documentos.length} documento${documentos.length === 1 ? "" : "s"}`}
            icon={Paperclip}
            flush
          >
            {documentos.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState compact icon={Paperclip} title="Sin documentos adjuntos" description="Este trámite no tiene archivos vinculados." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {documentos.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={`/prestador/legajo/documento/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/50 sm:px-6"
                    >
                      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-azul-50 text-azul-600 ring-1 ring-azul-100">
                        <FileText className="size-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{TIPO_DOCUMENTO[doc.tipo].label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{doc.nombre_archivo}</span>
                      </span>
                      <EstadoBadge mapa={ESTADO_DOCUMENTO} valor={doc.estado} size="sm" />
                      <ExternalLink className="size-4 text-muted-foreground group-hover:text-azul-600" aria-hidden />
                      <span className="sr-only">(se abre en una pestaña nueva)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {estado === "observado" && tipo ? (
            <SectionCard
              id="responder"
              title="Corregir y volver a presentar"
              description="Actualizá los datos observados, agregá la documentación que falte y explicá los cambios."
              icon={MessageSquareReply}
              className="scroll-mt-24 ring-2 ring-sol-300"
            >
              <FormRespuesta tramiteId={tramite.id ?? id} tipo={tipo} empresaId={empresaId} valores={valores} />
            </SectionCard>
          ) : null}
        </div>

        <SectionCard
          title="Seguimiento"
          description="Movimientos del trámite"
          icon={Hourglass}
          className="self-start"
          actions={<StatusBadge label={etiqueta(ESTADO_TRAMITE, estado).label} tone={etiqueta(ESTADO_TRAMITE, estado).tono} size="sm" />}
        >
          <Timeline items={eventos} />
        </SectionCard>
      </div>
    </>
  );
}
