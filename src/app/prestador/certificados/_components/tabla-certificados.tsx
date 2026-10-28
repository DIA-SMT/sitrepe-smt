import Link from "next/link";
import { CalendarDays, Droplets, Eye, MapPin, Printer, SprayCan, Stamp } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import type { CertificadoListado } from "@/lib/data/certificados";
import { ESTADO_CERTIFICADO, TIPO_SERVICIO_CORTO } from "@/lib/domain/etiquetas";
import { formatFecha, formatHora } from "@/lib/domain/formato";
import { VencimientoCelda } from "../../_components/vencimiento-celda";

function TipoServicio({ tipo }: { tipo: CertificadoListado["tipo"] }) {
  const Icon = tipo === "tanque" ? Droplets : SprayCan;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="size-3.5 text-azul-600" aria-hidden />
      {tipo ? TIPO_SERVICIO_CORTO[tipo] : "—"}
    </span>
  );
}

function Sello({ codigo }: { codigo: string | null }) {
  if (!codigo) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold whitespace-nowrap text-emerald-800">
      <Stamp className="size-3.5 text-emerald-600" aria-hidden />
      {codigo}
    </span>
  );
}

/** Listado de certificados: tabla en pantallas anchas y tarjetas en el celular. */
export function TablaCertificados({ filas }: { filas: CertificadoListado[] }) {
  return (
    <>
      {/* Celular: tarjetas */}
      <ul className="divide-y divide-border md:hidden">
        {filas.map((c) => (
          <li key={c.id} className="relative flex flex-col gap-2.5 px-5 py-4 transition-colors hover:bg-azul-50/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <Link
                  href={`/prestador/certificados/${c.id}`}
                  className="font-mono text-sm font-bold text-foreground after:absolute after:inset-0 hover:text-azul-700"
                >
                  N.º {c.numero}
                </Link>
                <TipoServicio tipo={c.tipo} />
              </div>
              <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold text-foreground">{c.cliente ?? "—"}</span>
              <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{c.domicilio ?? "—"}</span>
              </span>
              <span className="truncate text-xs text-noche-400">{c.rubro_nombre ?? "Sin rubro"}</span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" aria-hidden />
                  Servicio {formatFecha(c.fecha_servicio)} {formatHora(c.fecha_servicio)}
                </span>
                <Sello codigo={c.sello_codigo} />
              </div>
              <VencimientoCelda fecha={c.fecha_vencimiento} vigencia={c.vigencia} className="items-end" />
            </div>
            <div className="relative z-10 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href={`/imprimir/certificado/${c.id}`} aria-label={`Imprimir el certificado N.º ${c.numero}`}>
                  <Printer aria-hidden /> Imprimir
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <Table framed={false} containerClassName="hidden md:block">
        <THead>
          <TR>
            <TH>N.º</TH>
            <TH>Cliente y domicilio</TH>
            <TH>Rubro</TH>
            <TH>Servicio</TH>
            <TH>Vencimiento</TH>
            <TH>Estado</TH>
            <TH>Sello</TH>
            <TH align="right">
              <span className="sr-only">Acciones</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {filas.map((c) => (
            <TR key={c.id}>
              <TD>
                <div className="flex flex-col gap-0.5">
                  <Link
                    href={`/prestador/certificados/${c.id}`}
                    className="font-mono text-sm font-bold whitespace-nowrap text-foreground hover:text-azul-700 hover:underline"
                  >
                    {c.numero}
                  </Link>
                  <TipoServicio tipo={c.tipo} />
                </div>
              </TD>
              <TD>
                <div className="flex w-56 flex-col gap-0.5 xl:w-64">
                  <span className="truncate font-medium" title={c.cliente ?? undefined}>
                    {c.cliente ?? "—"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground" title={c.domicilio ?? undefined}>
                    {c.domicilio ?? "—"}
                  </span>
                </div>
              </TD>
              <TD>
                <div className="flex w-40 flex-col gap-0.5 xl:w-48">
                  <span className="truncate text-[13px]" title={c.rubro_nombre ?? undefined}>
                    {c.rubro_nombre ?? "—"}
                  </span>
                  {c.rubro_grupo ? <span className="truncate text-xs text-muted-foreground">{c.rubro_grupo}</span> : null}
                </div>
              </TD>
              <TD className="whitespace-nowrap">
                <div className="nums-tabular flex flex-col gap-0.5">
                  <span className="font-medium">{formatFecha(c.fecha_servicio)}</span>
                  <span className="text-xs text-muted-foreground">{formatHora(c.fecha_servicio)} h</span>
                </div>
              </TD>
              <TD>
                <VencimientoCelda fecha={c.fecha_vencimiento} vigencia={c.vigencia} />
              </TD>
              <TD>
                <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" />
              </TD>
              <TD>
                <Sello codigo={c.sello_codigo} />
              </TD>
              <TD align="right">
                <div className="flex items-center justify-end gap-1">
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link
                      href={`/prestador/certificados/${c.id}`}
                      aria-label={`Ver el certificado N.º ${c.numero}`}
                      title="Ver detalle"
                    >
                      <Eye aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link
                      href={`/imprimir/certificado/${c.id}`}
                      aria-label={`Imprimir el certificado N.º ${c.numero}`}
                      title="Imprimir (3 ejemplares)"
                    >
                      <Printer aria-hidden />
                    </Link>
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  );
}
