import { Fragment } from "react";
import Link from "next/link";
import { CalendarClock, Eye, FlaskConical, MapPin, MessageSquareWarning, Printer, UserRound } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import type { CertificadoPlanilla, ProductoAplicado } from "@/lib/data/declaraciones";
import { ESTADO_CERTIFICADO, PERIODICIDAD, VIGENCIA } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatLitros, formatNumero, formatSuperficie } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import type { Problema, TipoServicio } from "../../_lib/reglas";
import type { ServicioEditable } from "../../_lib/tipos";
import { BotonFirmar } from "../../_components/boton-firmar";
import { AccionesServicio } from "./acciones-servicio";

// -----------------------------------------------------------------------------
// Piezas comunes
// -----------------------------------------------------------------------------

function Productos({ productos, vacio = "Sin productos" }: { productos: ProductoAplicado[]; vacio?: string }) {
  if (productos.length === 0) return <span className="text-[13px] text-muted-foreground">{vacio}</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {productos.map((p) => (
        <li key={p.productoId}>
          <Badge tone="neutral" size="sm" title={[p.principioActivo, p.organismo && p.registro ? `${p.organismo} ${p.registro}` : null].filter(Boolean).join(" · ")}>
            <FlaskConical aria-hidden />
            {p.nombre} · {formatNumero(p.cantidad)} {p.unidad}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function Medida({ tipo, c }: { tipo: TipoServicio; c: CertificadoPlanilla }) {
  return <>{tipo === "tanque" ? formatLitros(c.capacidadLitros) : formatSuperficie(c.superficieM2)}</>;
}

function Rubro({ c }: { c: CertificadoPlanilla }) {
  if (!c.rubroNombre) return <span className="text-danger">Sin rubro</span>;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-medium text-foreground">{c.rubroNombre}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {c.rubroPeriodicidad && c.tipo === "fumigacion" ? (
          <Badge tone={PERIODICIDAD[c.rubroPeriodicidad].tono} size="sm">
            {PERIODICIDAD[c.rubroPeriodicidad].label}
          </Badge>
        ) : null}
        {c.rubroGrupo}
      </span>
    </div>
  );
}

function Vence({ c }: { c: CertificadoPlanilla }) {
  return c.fechaVencimiento ? (
    <span className="nums-tabular whitespace-nowrap">{formatFecha(c.fechaVencimiento)}</span>
  ) : (
    <span className="text-xs text-muted-foreground">{c.rubroPeriodicidad === "unica_vez" ? "Única vez" : "—"}</span>
  );
}

function ChipsProblemas({ problemas }: { problemas: Problema[] }) {
  const visibles = problemas.filter((p) => p.codigo !== "sin_firma");
  if (visibles.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {visibles.map((p) => (
        <Badge key={p.codigo} tone="ambar" size="sm" dot>
          {p.texto}
        </Badge>
      ))}
    </span>
  );
}

function Firma({ c, puedeFirmar }: { c: CertificadoPlanilla; puedeFirmar: boolean }) {
  if (c.firmado) {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge tone="verde" size="sm" dot>
          Firmado
        </Badge>
        <span className="text-xs text-muted-foreground">
          {c.tecnicoNombre ?? "Asesor técnico"}
          {c.firmadoAt ? ` · ${formatFechaHora(c.firmadoAt)}` : ""}
        </span>
      </div>
    );
  }
  if (puedeFirmar) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="text-xs font-medium text-azul-700">Te corresponde firmar</span>
        <BotonFirmar ids={[c.id]} etiqueta="Firmar" titulo={`Firmar el certificado N.º ${c.numero}`} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <Badge tone="ambar" size="sm" dot>
        Pendiente de firma
      </Badge>
      <span className="text-xs text-muted-foreground">de {c.tecnicoNombre ?? "el asesor técnico"}</span>
    </div>
  );
}

function Observacion({ texto, className }: { texto: string; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border border-amber-200 bg-warning-soft px-3 py-2.5 text-sm", className)}>
      <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="min-w-0">
        <span className="font-semibold text-amber-900">Observación del área: </span>
        <span className="text-foreground/85">{texto}</span>
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Planilla editable (borrador / observada)
// -----------------------------------------------------------------------------

type PropsEditable = {
  tipo: TipoServicio;
  certificados: CertificadoPlanilla[];
  problemas: Record<string, Problema[]>;
  firmables: string[];
  servicios: Record<string, ServicioEditable>;
};

export function PlanillaEditable({ tipo, certificados, problemas, firmables, servicios }: PropsEditable) {
  const columnas = 8;
  return (
    <>
      {/* Escritorio */}
      <div className="hidden md:block">
        <Table framed={false}>
          <THead>
            <TR>
              <TH>N.º</TH>
              <TH>Cliente y domicilio</TH>
              <TH>Rubro</TH>
              <TH numeric>{tipo === "tanque" ? "Capacidad" : "Superficie"}</TH>
              <TH>Fecha y hora</TH>
              <TH>Productos</TH>
              <TH>Firma</TH>
              <TH>
                <span className="sr-only">Acciones</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {certificados.map((c) => {
              const servicio = servicios[c.id];
              const puedeFirmar = firmables.includes(c.id);
              const observado = c.estado === "observado" && c.observaciones;
              return (
                <Fragment key={c.id}>
                  <TR className={cn(observado && "border-b-0 bg-warning-soft/40")}>
                    <TD className="align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-display font-semibold whitespace-nowrap text-foreground">{c.numero}</span>
                        {c.estado !== "borrador" ? <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" /> : null}
                        <ChipsProblemas problemas={problemas[c.id] ?? []} />
                      </div>
                    </TD>
                    <TD className="max-w-64 align-top">
                      <p className="truncate font-medium" title={c.cliente}>
                        {c.cliente}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground" title={c.domicilio}>
                        <MapPin className="size-3 shrink-0" aria-hidden />
                        {c.domicilio}
                      </p>
                    </TD>
                    <TD className="max-w-56 align-top">
                      <Rubro c={c} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Vence: <Vence c={c} />
                      </p>
                    </TD>
                    <TD numeric className="align-top whitespace-nowrap">
                      <Medida tipo={tipo} c={c} />
                    </TD>
                    <TD className="align-top whitespace-nowrap">
                      <span className="nums-tabular">{formatFechaHora(c.fechaServicio)}</span>
                    </TD>
                    <TD className="max-w-64 align-top">
                      <Productos productos={c.productos} vacio={tipo === "tanque" ? "—" : "Sin productos"} />
                      {tipo === "tanque" ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Análisis: {[c.analisisBacteriologico, c.analisisFisicoquimico].filter(Boolean).length} de 2
                        </p>
                      ) : null}
                    </TD>
                    <TD className="align-top">
                      <Firma c={c} puedeFirmar={puedeFirmar} />
                    </TD>
                    <TD className="align-top">
                      {servicio || c.estado === "borrador" ? (
                        <AccionesServicio id={c.id} numero={c.numero} servicio={servicio} puedeEliminar={c.estado === "borrador"} />
                      ) : (
                        <AccionesLectura c={c} />
                      )}
                    </TD>
                  </TR>
                  {observado ? (
                    <TR className="bg-warning-soft/40 hover:bg-warning-soft/40">
                      <TD colSpan={columnas} className="pt-0">
                        <Observacion texto={c.observaciones ?? ""} />
                      </TD>
                    </TR>
                  ) : null}
                </Fragment>
              );
            })}
          </TBody>
        </Table>
      </div>

      {/* Celular */}
      <ul className="flex flex-col divide-y divide-border md:hidden">
        {certificados.map((c) => {
          const servicio = servicios[c.id];
          const puedeFirmar = firmables.includes(c.id);
          return (
            <li key={c.id} className={cn("flex flex-col gap-3 px-5 py-4", c.estado === "observado" && "bg-warning-soft/40")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-foreground">N.º {c.numero}</p>
                  <p className="truncate text-sm font-medium">{c.cliente}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    {c.domicilio}
                  </p>
                </div>
                {servicio || c.estado === "borrador" ? (
                  <AccionesServicio id={c.id} numero={c.numero} servicio={servicio} puedeEliminar={c.estado === "borrador"} />
                ) : (
                  <AccionesLectura c={c} />
                )}
              </div>
              {c.estado !== "borrador" || (problemas[c.id] ?? []).some((p) => p.codigo !== "sin_firma") ? (
                <div className="flex flex-wrap gap-1">
                  {c.estado !== "borrador" ? <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" /> : null}
                  <ChipsProblemas problemas={problemas[c.id] ?? []} />
                </div>
              ) : null}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Fecha y hora</dt>
                  <dd className="nums-tabular font-medium">{formatFechaHora(c.fechaServicio)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{tipo === "tanque" ? "Capacidad" : "Superficie"}</dt>
                  <dd className="font-medium">
                    <Medida tipo={tipo} c={c} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rubro</dt>
                  <dd className="font-medium">{c.rubroNombre ?? "Sin rubro"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Vence</dt>
                  <dd className="font-medium">
                    <Vence c={c} />
                  </dd>
                </div>
              </dl>
              <Productos productos={c.productos} vacio={tipo === "tanque" ? "Sin productos declarados" : "Sin productos"} />
              <Firma c={c} puedeFirmar={puedeFirmar} />
              {c.estado === "observado" && c.observaciones ? <Observacion texto={c.observaciones} /> : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

// -----------------------------------------------------------------------------
// Planilla de solo lectura (presentada / controlada / rechazada)
// -----------------------------------------------------------------------------

function AccionesLectura({ c }: { c: CertificadoPlanilla }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="icon-sm">
        <Link href={`/prestador/certificados/${c.id}`} aria-label={`Ver el certificado N.º ${c.numero}`}>
          <Eye aria-hidden />
        </Link>
      </Button>
      {c.estado !== "anulado" ? (
        <Button asChild variant="ghost" size="icon-sm">
          <Link
            href={`/imprimir/certificado/${c.id}`}
            target="_blank"
            rel="noopener"
            aria-label={`Imprimir el certificado N.º ${c.numero} (se abre en otra pestaña)`}
          >
            <Printer aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function EstadoCertificado({ c }: { c: CertificadoPlanilla }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" />
      {c.estado === "timbrado" && c.vigencia ? <EstadoBadge mapa={VIGENCIA} valor={c.vigencia} size="sm" /> : null}
      {c.selloCodigo ? <span className="font-mono text-[11px] text-muted-foreground">Sello {c.selloCodigo}</span> : null}
      {!c.selloCodigo && c.pagoCodigo ? <span className="font-mono text-[11px] text-muted-foreground">{c.pagoCodigo}</span> : null}
    </div>
  );
}

export function PlanillaLectura({ tipo, certificados }: { tipo: TipoServicio; certificados: CertificadoPlanilla[] }) {
  const columnas = 8;
  return (
    <>
      <div className="hidden md:block">
        <Table framed={false}>
          <THead>
            <TR>
              <TH>N.º</TH>
              <TH>Cliente y domicilio</TH>
              <TH>Rubro</TH>
              <TH numeric>{tipo === "tanque" ? "Capacidad" : "Superficie"}</TH>
              <TH>Fecha y hora</TH>
              <TH>Vence</TH>
              <TH>Estado</TH>
              <TH>
                <span className="sr-only">Acciones</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {certificados.map((c) => {
              const nota = c.estado === "anulado" ? c.anuladoMotivo : c.estado === "observado" ? c.observaciones : null;
              return (
                <Fragment key={c.id}>
                  <TR className={cn(nota && "border-b-0", c.estado === "anulado" && "opacity-75")}>
                    <TD className="align-top">
                      <Link
                        href={`/prestador/certificados/${c.id}`}
                        className="font-display font-semibold whitespace-nowrap text-foreground hover:text-azul-700"
                      >
                        {c.numero}
                      </Link>
                    </TD>
                    <TD className="max-w-64 align-top">
                      <p className="truncate font-medium" title={c.cliente}>
                        {c.cliente}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground" title={c.domicilio}>
                        <MapPin className="size-3 shrink-0" aria-hidden />
                        {c.domicilio}
                      </p>
                    </TD>
                    <TD className="max-w-56 align-top">
                      <Rubro c={c} />
                    </TD>
                    <TD numeric className="align-top whitespace-nowrap">
                      <Medida tipo={tipo} c={c} />
                    </TD>
                    <TD className="align-top whitespace-nowrap">
                      <span className="nums-tabular">{formatFechaHora(c.fechaServicio)}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <UserRound className="size-3" aria-hidden />
                        {c.tecnicoNombre ?? "—"}
                      </span>
                    </TD>
                    <TD className="align-top">
                      <Vence c={c} />
                    </TD>
                    <TD className="align-top">
                      <EstadoCertificado c={c} />
                    </TD>
                    <TD className="align-top">
                      <AccionesLectura c={c} />
                    </TD>
                  </TR>
                  {nota ? (
                    <TR className="hover:bg-transparent">
                      <TD colSpan={columnas} className="pt-0">
                        {c.estado === "anulado" ? (
                          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-red-900">
                            <span className="font-semibold">Motivo de la anulación: </span>
                            {nota}
                          </p>
                        ) : (
                          <Observacion texto={nota} />
                        )}
                      </TD>
                    </TR>
                  ) : null}
                </Fragment>
              );
            })}
          </TBody>
        </Table>
      </div>

      <ul className="flex flex-col divide-y divide-border md:hidden">
        {certificados.map((c) => (
          <li key={c.id} className="flex flex-col gap-2.5 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/prestador/certificados/${c.id}`} className="font-display text-base font-semibold hover:text-azul-700">
                  N.º {c.numero}
                </Link>
                <p className="truncate text-sm font-medium">{c.cliente}</p>
                <p className="truncate text-xs text-muted-foreground">{c.domicilio}</p>
              </div>
              <AccionesLectura c={c} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarClock className="size-3.5" aria-hidden />
                {formatFechaHora(c.fechaServicio)}
              </span>
              <span>{c.rubroNombre ?? "Sin rubro"}</span>
              <span>
                Vence <Vence c={c} />
              </span>
            </div>
            <EstadoCertificado c={c} />
            {c.estado === "anulado" && c.anuladoMotivo ? (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-red-900">Anulado: {c.anuladoMotivo}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
