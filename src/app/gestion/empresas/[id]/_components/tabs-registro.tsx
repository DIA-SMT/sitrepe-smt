import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderOpen,
  IdCard,
  ListChecks,
  Mail,
  Phone,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { SectionCard } from "@/components/shared/section-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DOCUMENTOS_INSCRIPCION,
  type DocumentoLegajo,
  type EmpresaPadron,
  type EstadoRequisito,
  type Legajo,
  type MemoriaTecnica,
  type Requisito,
  type Tecnico,
  estadoDocumento,
} from "@/lib/data/empresas";
import {
  CLASE_PRODUCTO,
  ESTADO_DOCUMENTO,
  ESTADO_EMPRESA,
  ESTADO_MEMORIA,
  ESTADO_TECNICO,
  TIPO_DOCUMENTO,
} from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha, formatFechaHora, hoyISO } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { AccionesDocumento, AccionesMemoria, AccionesTecnico } from "../../../_components/acciones-revision";
import { Checklist, IconoRequisito } from "../../../_components/checklist";
import { rutaDocumento, rutaLegajo, rutaNuevaInspeccion } from "../../../_components/rutas";
import { BadgeToxicidad } from "../../../_components/toxicidad";
import { Actividades } from "../../_components/celdas";
import { DialogoEmpresa, type ValoresEmpresa } from "../../_components/dialogo-empresa";

/** Valores del formulario de edición a partir de la fila de v_empresas (columnas nulables). */
export function valoresEmpresa(e: EmpresaPadron): ValoresEmpresa {
  return {
    numero_registro: e.numero_registro,
    nombre_comercial: e.nombre_comercial ?? "",
    titular: e.titular,
    tipo_persona: e.tipo_persona ?? "humana",
    cuit: e.cuit ?? "",
    email: e.email,
    telefono: e.telefono,
    domicilio_oficina: e.domicilio_oficina,
    domicilio_deposito: e.domicilio_deposito,
    habilitacion_comercial: e.habilitacion_comercial,
    resolucion_dsa: e.resolucion_dsa,
    habilita_fumigacion: e.habilita_fumigacion ?? true,
    habilita_tanques: e.habilita_tanques ?? false,
    estado: e.estado ?? "en_tramite",
    fecha_habilitacion: e.fecha_habilitacion,
    vencimiento_habilitacion: e.vencimiento_habilitacion,
    ultima_inspeccion_deposito: e.ultima_inspeccion_deposito,
    observaciones: e.observaciones,
  };
}

function peor(estados: EstadoRequisito[]): EstadoRequisito {
  if (estados.includes("falta")) return "falta";
  if (estados.includes("pendiente")) return "pendiente";
  return "cumplido";
}

/** Requisitos para operar (Arts. 4.º a 8.º): lo que el área controla en cada legajo. */
function requisitosLegajo(empresa: EmpresaPadron, legajo: Legajo, empresaId: string): Requisito[] {
  const hoy = hoyISO();
  const docs = legajo.documentos;
  const aprobados = legajo.tecnicos.filter((t) => t.estado === "aprobado").length;
  const pendientes = legajo.tecnicos.filter((t) => t.estado === "pendiente").length;
  const items = DOCUMENTOS_INSCRIPCION.map((tipo) => ({ label: TIPO_DOCUMENTO[tipo].label, ...estadoDocumento(docs, tipo, null, hoy) }));
  const memAprobadas = legajo.memorias.filter((m) => m.estado === "aprobado").length;
  const memPropuestas = legajo.memorias.filter((m) => m.estado === "propuesto").length;
  const ddjj = estadoDocumento(docs, "ddjj_anual", null, hoy);
  const libreDeuda = estadoDocumento(docs, "libre_deuda", null, hoy);
  const ultima = empresa.ultima_inspeccion_deposito;
  const dias = diasHasta(ultima, hoy);
  const depositoAlDia = dias !== null && dias >= -365;

  return [
    {
      clave: "tecnico",
      titulo: "Asesor técnico aprobado",
      detalle:
        aprobados > 0
          ? `${aprobados} aprobado${aprobados === 1 ? "" : "s"}${pendientes ? ` · ${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : ""}`
          : pendientes > 0
            ? `${pendientes} pendiente${pendientes === 1 ? "" : "s"} de aprobación`
            : "Sin asesor técnico: no puede firmar certificados",
      estado: aprobados > 0 ? "cumplido" : pendientes > 0 ? "pendiente" : "falta",
      enlace: { label: "Técnicos", href: rutaLegajo(empresaId, "tecnicos") },
    },
    {
      clave: "documentos",
      titulo: "Documentación obligatoria",
      detalle: `${items.filter((i) => i.estado === "cumplido").length} de ${items.length} documentos aprobados y vigentes`,
      estado: peor(items.map((i) => i.estado)),
      enlace: { label: "Documentos", href: rutaLegajo(empresaId, "documentos") },
      items,
    },
    {
      clave: "memoria",
      titulo: "Memoria técnica de productos",
      detalle:
        memAprobadas > 0
          ? `${memAprobadas} producto${memAprobadas === 1 ? "" : "s"} aprobado${memAprobadas === 1 ? "" : "s"}${memPropuestas ? ` · ${memPropuestas} por revisar` : ""}`
          : memPropuestas > 0
            ? `${memPropuestas} producto${memPropuestas === 1 ? "" : "s"} por revisar`
            : "Sin productos propuestos",
      estado: memAprobadas > 0 ? "cumplido" : memPropuestas > 0 ? "pendiente" : "falta",
      enlace: { label: "Memoria", href: rutaLegajo(empresaId, "memoria") },
    },
    {
      clave: "renovacion",
      titulo: "Renovación anual (Art. 8.º)",
      detalle: "DDJJ anual de categorización y libre deuda",
      estado: peor([ddjj.estado, libreDeuda.estado]),
      items: [
        { label: "DDJJ anual", ...ddjj },
        { label: "Libre deuda", ...libreDeuda },
      ],
    },
    {
      clave: "deposito",
      titulo: "Inspección anual de depósito",
      detalle: ultima
        ? `Última conforme: ${formatFecha(ultima)}${depositoAlDia ? "" : " (hace más de un año)"}`
        : "Sin inspección de depósito registrada",
      estado: depositoAlDia ? "cumplido" : "falta",
      enlace: depositoAlDia ? undefined : { label: "Programar", href: rutaNuevaInspeccion({ empresa: empresaId, tipo: "deposito_anual" }) },
    },
  ];
}

/* --- Resumen ----------------------------------------------------------------------- */

export function TabResumen({
  empresaId,
  empresa,
  legajo,
  puedeEditar,
}: {
  empresaId: string;
  empresa: EmpresaPadron;
  legajo: Legajo;
  puedeEditar: boolean;
}) {
  const requisitos = requisitosLegajo(empresa, legajo, empresaId);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <SectionCard
        title="Datos del registro"
        description="Datos mínimos del listado oficial de empresas habilitadas (Anexo II)"
        icon={IdCard}
        actions={puedeEditar ? <DialogoEmpresa modo="editar" valores={valoresEmpresa(empresa)} empresaId={empresaId} /> : null}
      >
        <KeyValue
          columns={2}
          items={[
            { label: "Nombre comercial", value: empresa.nombre_comercial },
            { label: "Titular o razón social", value: empresa.titular },
            { label: "Tipo de persona", value: empresa.tipo_persona === "juridica" ? "Persona jurídica" : "Persona humana" },
            { label: "CUIT", value: empresa.cuit ? <span className="nums-tabular">{empresa.cuit}</span> : null },
            { label: "N.º de registro", value: empresa.numero_registro ? `N.º ${empresa.numero_registro}` : null },
            {
              label: "Actividades",
              value: <Actividades fumigacion={empresa.habilita_fumigacion} tanques={empresa.habilita_tanques} />,
            },
            {
              label: "Correo electrónico",
              value: empresa.email ? (
                <a href={`mailto:${empresa.email}`} className="inline-flex items-center gap-1.5 text-azul-700 hover:underline">
                  <Mail className="size-3.5" aria-hidden />
                  {empresa.email}
                </a>
              ) : null,
            },
            {
              label: "Teléfono",
              value: empresa.telefono ? (
                <a href={`tel:${empresa.telefono.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-azul-700 hover:underline">
                  <Phone className="size-3.5" aria-hidden />
                  {empresa.telefono}
                </a>
              ) : null,
            },
            { label: "Domicilio de oficina", value: empresa.domicilio_oficina },
            { label: "Depósito de químicos", value: empresa.domicilio_deposito },
            { label: "Habilitación comercial", value: empresa.habilitacion_comercial ? `Res. ${empresa.habilitacion_comercial}` : null },
            { label: "Resolución DSA", value: empresa.resolucion_dsa ? `Res. ${empresa.resolucion_dsa}` : null },
            {
              label: "Estado registrado",
              value: (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <EstadoBadge mapa={ESTADO_EMPRESA} valor={empresa.estado} size="sm" />
                  {empresa.estado !== empresa.estado_efectivo ? (
                    <span className="text-xs text-muted-foreground">
                      (efectivo: {ESTADO_EMPRESA[empresa.estado_efectivo ?? "vencida"].label.toLowerCase()})
                    </span>
                  ) : null}
                </span>
              ),
            },
            { label: "Fecha de habilitación", value: empresa.fecha_habilitacion ? formatFecha(empresa.fecha_habilitacion) : null },
            {
              label: "Vencimiento de la habilitación",
              value: empresa.vencimiento_habilitacion ? formatFecha(empresa.vencimiento_habilitacion) : null,
            },
            {
              label: "Última inspección de depósito",
              value: empresa.ultima_inspeccion_deposito ? formatFecha(empresa.ultima_inspeccion_deposito) : null,
            },
            { label: "Alta en la plataforma", value: empresa.created_at ? formatFechaHora(empresa.created_at) : null },
            { label: "Última modificación", value: empresa.updated_at ? formatFechaHora(empresa.updated_at) : null },
          ]}
        />
      </SectionCard>

      <div className="flex flex-col gap-6">
        <SectionCard title="Estado del legajo" description="Requisitos para operar (Arts. 4.º a 8.º)" icon={ListChecks}>
          <Checklist requisitos={requisitos} />
        </SectionCard>
        {empresa.observaciones ? (
          <SectionCard title="Observaciones" description="Notas internas e inconsistencias a regularizar" icon={TriangleAlert}>
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{empresa.observaciones}</p>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}

/* --- Técnicos -------------------------------------------------------------------------- */

export function TabTecnicos({
  empresaId,
  tecnicos,
  documentos,
  puedeEditar,
}: {
  empresaId: string;
  tecnicos: Tecnico[];
  documentos: DocumentoLegajo[];
  puedeEditar: boolean;
}) {
  if (tecnicos.length === 0) {
    return (
      <EmptyState
        icon={UserRound}
        title="Sin asesores técnicos"
        description="La empresa todavía no propuso un representante o asesor técnico con título terciario o universitario (Art. 5.º). Lo carga desde su legajo en la plataforma."
      />
    );
  }
  const aprobados = tecnicos.filter((t) => t.estado === "aprobado").length;

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {tecnicos.map((t) => {
        const nombre = `${t.nombre} ${t.apellido}`;
        const docs = documentos.filter((d) => d.tecnico_id === t.id);
        return (
          <li key={t.id}>
            <Card
              className={cn(
                "h-full gap-4 p-5",
                t.estado === "pendiente" && "ring-gradient-brand",
                (t.estado === "baja" || t.estado === "rechazado") && "bg-subtle/60",
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar nombre={nombre} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-display text-base leading-snug font-semibold text-foreground">{nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.titulo}
                    {t.institucion ? ` · ${t.institucion}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <EstadoBadge mapa={ESTADO_TECNICO} valor={t.estado} size="sm" pulse={t.estado === "pendiente"} />
                    {t.es_representante ? (
                      <Badge tone="violeta" size="sm">
                        Representante técnico
                      </Badge>
                    ) : (
                      <Badge tone="neutral" size="sm">
                        Asesor técnico
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <KeyValue
                columns={2}
                items={[
                  { label: "DNI", value: t.dni },
                  { label: "Matrícula", value: t.matricula },
                  { label: "Correo", value: t.email },
                  { label: "Teléfono", value: t.telefono },
                  { label: "Alta", value: t.fecha_alta ? formatFecha(t.fecha_alta) : null },
                  { label: "Baja", value: t.fecha_baja ? formatFecha(t.fecha_baja) : null },
                ]}
              />

              {docs.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Documentos</p>
                  <ul className="flex flex-col gap-1.5">
                    {docs.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-subtle px-3 py-2 text-sm">
                        <a
                          href={d.id ? rutaDocumento(empresaId, d.id) : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-w-0 items-center gap-1.5 font-medium text-azul-700 hover:underline"
                        >
                          <FileText className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">{TIPO_DOCUMENTO[d.tipo ?? "otro"].label}</span>
                          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                          <span className="sr-only">(se abre en una pestaña nueva)</span>
                        </a>
                        <EstadoBadge mapa={ESTADO_DOCUMENTO} valor={d.estado} size="sm" />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : t.estado === "pendiente" ? (
                <p className="rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-amber-900">
                  No hay título cargado para este asesor: pedí la copia autenticada antes de aprobarlo.
                </p>
              ) : null}

              {t.observaciones ? (
                <p className="rounded-lg border border-border bg-subtle/60 px-3 py-2 text-[13px] text-muted-foreground">
                  <span className="font-medium text-foreground">Observaciones: </span>
                  {t.observaciones}
                </p>
              ) : null}

              {puedeEditar ? (
                <div className="mt-auto border-t border-border pt-4">
                  <AccionesTecnico
                    id={t.id}
                    nombre={nombre}
                    estado={t.estado}
                    unicoAprobado={t.estado === "aprobado" && aprobados === 1}
                  />
                </div>
              ) : null}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

/* --- Memoria técnica --------------------------------------------------------------------- */

export function TabMemoria({ memorias, puedeEditar }: { memorias: MemoriaTecnica[]; puedeEditar: boolean }) {
  return (
    <SectionCard
      title="Memoria técnica"
      description="Productos autorizados: concentraciones, dosis y precauciones (Art. 5.º)"
      icon={FlaskConical}
      flush
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/gestion/productos">
            Catálogo de productos
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      }
    >
      {memorias.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState
            compact
            icon={FlaskConical}
            title="Sin productos en la memoria técnica"
            description="La empresa propone los productos que utiliza desde su legajo; acá vas a poder aprobarlos o rechazarlos."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {memorias.map((m) => (
            <li
              key={m.id}
              className={cn(
                "grid gap-3 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_auto] md:items-start md:gap-6",
                m.estado === "propuesto" && "bg-sol-50/50",
              )}
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="font-semibold text-foreground">{m.producto_nombre}</p>
                <p className="text-[13px] text-muted-foreground">{m.principio_activo}</p>
                <div className="flex flex-wrap gap-1.5">
                  <EstadoBadge mapa={CLASE_PRODUCTO} valor={m.clase} size="sm" />
                  <Badge tone="neutral" size="sm" variant="outline">
                    {m.organismo} {m.registro_numero}
                  </Badge>
                  <BadgeToxicidad categoria={m.categoria_toxicologica} />
                </div>
              </div>
              <dl className="grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[auto_1fr]">
                <dt className="text-muted-foreground">Dosis</dt>
                <dd className="text-foreground">{m.dosis || "—"}</dd>
                <dt className="text-muted-foreground">Concentración</dt>
                <dd className="text-foreground">{m.concentracion_uso || "—"}</dd>
                <dt className="text-muted-foreground">Precauciones</dt>
                <dd className="text-foreground">{m.precauciones || "—"}</dd>
                <dt className="text-muted-foreground">Reingreso</dt>
                <dd className="text-foreground">{m.plazo_reingreso_horas !== null ? `${m.plazo_reingreso_horas} h` : "—"}</dd>
              </dl>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <EstadoBadge mapa={ESTADO_MEMORIA} valor={m.estado} size="sm" pulse={m.estado === "propuesto"} />
                {m.revisado_at ? <span className="text-xs text-muted-foreground">Revisado el {formatFecha(m.revisado_at)}</span> : null}
                {puedeEditar && m.id && m.estado ? (
                  <AccionesMemoria id={m.id} producto={m.producto_nombre ?? "el producto"} estado={m.estado} />
                ) : null}
              </div>
              {m.observaciones ? (
                <p className="text-[13px] text-muted-foreground md:col-span-3">
                  <span className="font-medium text-foreground">Observaciones: </span>
                  {m.observaciones}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* --- Documentos ------------------------------------------------------------------------- */

export function TabDocumentos({
  empresaId,
  documentos,
  puedeEditar,
}: {
  empresaId: string;
  documentos: DocumentoLegajo[];
  puedeEditar: boolean;
}) {
  const hoy = hoyISO();
  const obligatorios = DOCUMENTOS_INSCRIPCION.map((tipo) => ({ tipo, ...estadoDocumento(documentos, tipo, null, hoy) }));

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Documentación obligatoria" description="Requisitos de inscripción (Arts. 4.º, 5.º y 7.º)" icon={ListChecks}>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {obligatorios.map((o) => (
            <li key={o.tipo} className="flex items-start gap-2.5 rounded-xl border border-border bg-subtle/50 px-3 py-2.5">
              <IconoRequisito estado={o.estado} className="mt-0.5" />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium text-foreground">{TIPO_DOCUMENTO[o.tipo].label}</span>
                <span className="text-xs text-muted-foreground">{o.detalle}</span>
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Legajo digital"
        description={`${documentos.length} documento${documentos.length === 1 ? "" : "s"} cargado${documentos.length === 1 ? "" : "s"}`}
        icon={FolderOpen}
        flush
      >
        {documentos.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              compact
              icon={FolderOpen}
              title="El legajo no tiene documentos"
              description="La empresa sube la documentación desde la plataforma. Cuando lo haga, vas a poder revisarla acá."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {documentos.map((d) => {
              const dias = diasHasta(d.vence, hoy);
              const etiquetaTipo = TIPO_DOCUMENTO[d.tipo ?? "otro"].label;
              return (
                <li
                  key={d.id}
                  className={cn(
                    "flex flex-col gap-3 px-5 py-4 sm:px-6 md:flex-row md:items-start md:justify-between md:gap-6",
                    d.estado === "pendiente" && "bg-sol-50/50",
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100"
                    >
                      <FileText className="size-5" strokeWidth={1.9} />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="font-semibold text-foreground">{etiquetaTipo}</p>
                      {d.id ? (
                        <a
                          href={rutaDocumento(empresaId, d.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-w-0 items-center gap-1.5 text-sm text-azul-700 hover:underline"
                        >
                          <span className="truncate">{d.nombre_archivo ?? "Ver archivo"}</span>
                          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                          <span className="sr-only">(se abre en una pestaña nueva)</span>
                        </a>
                      ) : null}
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Cargado el {formatFecha(d.created_at)}</span>
                        {d.tecnico_nombre ? <span>Asesor: {d.tecnico_nombre}</span> : null}
                        {d.vence ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              dias !== null && dias < 0 && "font-semibold text-danger",
                              dias !== null && dias >= 0 && dias <= 30 && "font-semibold text-warning",
                            )}
                          >
                            <CalendarClock className="size-3.5" aria-hidden />
                            {dias !== null && dias < 0 ? "Venció" : "Vence"} el {formatFecha(d.vence)}
                          </span>
                        ) : null}
                        {d.revisado_at ? <span>Revisado el {formatFecha(d.revisado_at)}</span> : null}
                      </p>
                      {d.observaciones ? (
                        <p className="text-[13px] text-muted-foreground">
                          <span className="font-medium text-foreground">Observaciones: </span>
                          {d.observaciones}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 pl-13 md:items-end md:pl-0">
                    <EstadoBadge mapa={ESTADO_DOCUMENTO} valor={d.estado} size="sm" pulse={d.estado === "pendiente"} />
                    {puedeEditar && d.id && d.estado ? (
                      <AccionesDocumento id={d.id} tipo={etiquetaTipo} estado={d.estado} vence={d.vence} />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

