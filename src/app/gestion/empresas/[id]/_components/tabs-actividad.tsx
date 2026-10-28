import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  FilePenLine,
  PackageOpen,
  Plus,
  Receipt,
  Recycle,
  ScrollText,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import type { EmpresaPadron, EnvaseSaldo, Legajo, TramiteVista } from "@/lib/data/empresas";
import {
  ESTADO_ACTA,
  ESTADO_CERTIFICADO,
  ESTADO_INSPECCION,
  ESTADO_PAGO,
  ESTADO_TRAMITE,
  MEDIO_PAGO,
  MOTIVO_ACTA,
  RESULTADO_INSPECCION,
  TIPO_INSPECCION,
  TIPO_SERVICIO_CORTO,
  TIPO_TRAMITE,
  VIGENCIA,
} from "@/lib/domain/etiquetas";
import { diasHasta, formatFecha, formatFechaHora, formatPesos, formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { rutaNuevaInspeccion, rutaTramite } from "../../../_components/rutas";

/* --- Certificados ------------------------------------------------------------------------ */

export function TabCertificados({ empresaId, certificados }: { empresaId: string; certificados: Legajo["certificados"] }) {
  const verTodos = `/gestion/certificados?empresa=${empresaId}`;
  return (
    <SectionCard
      title="Últimos certificados"
      description={`${certificados.total.toLocaleString("es-AR")} certificados emitidos en total`}
      icon={BadgeCheck}
      flush
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href={verTodos}>
            Ver todos
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      }
      footer={
        certificados.total > certificados.filas.length ? (
          <Link href={verTodos} className="font-semibold text-azul-700 hover:underline">
            Ver los {certificados.total.toLocaleString("es-AR")} certificados de la empresa
          </Link>
        ) : undefined
      }
    >
      {certificados.filas.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState
            compact
            icon={BadgeCheck}
            title="Sin certificados"
            description="La empresa todavía no declaró servicios en la plataforma."
          />
        </div>
      ) : (
        <Table framed={false}>
          <THead>
            <TR>
              <TH>N.º</TH>
              <TH>Servicio</TH>
              <TH>Cliente</TH>
              <TH>Fecha</TH>
              <TH>Vence</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {certificados.filas.map((c) => (
              <TR key={c.id}>
                <TD className="font-semibold whitespace-nowrap">
                  <Link href={`/gestion/certificados/${c.id}`} className="text-azul-700 hover:underline">
                    {c.numero}
                  </Link>
                </TD>
                <TD className="whitespace-nowrap">
                  <span className="text-sm">{c.tipo ? TIPO_SERVICIO_CORTO[c.tipo] : "—"}</span>
                  {c.rubro_nombre ? <span className="block max-w-48 truncate text-xs text-muted-foreground">{c.rubro_nombre}</span> : null}
                </TD>
                <TD>
                  <span className="block max-w-56 truncate font-medium">{c.cliente}</span>
                  <span className="block max-w-56 truncate text-xs text-muted-foreground">{c.domicilio}</span>
                </TD>
                <TD className="whitespace-nowrap text-muted-foreground nums-tabular">{formatFecha(c.fecha_servicio)}</TD>
                <TD className="whitespace-nowrap nums-tabular">{formatFecha(c.fecha_vencimiento)}</TD>
                <TD>
                  <div className="flex flex-col items-start gap-1">
                    <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} size="sm" />
                    {c.estado === "timbrado" && c.vigencia && c.vigencia !== "vigente" ? (
                      <EstadoBadge mapa={VIGENCIA} valor={c.vigencia} size="sm" />
                    ) : null}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </SectionCard>
  );
}

/* --- Pagos ---------------------------------------------------------------------------------- */

export function TabPagos({ empresaId, pagos }: { empresaId: string; pagos: Legajo["pagos"] }) {
  const verTodos = `/gestion/pagos?empresa=${empresaId}`;
  return (
    <SectionCard
      title="Liquidaciones y pagos"
      description={`${pagos.total.toLocaleString("es-AR")} liquidaciones en total`}
      icon={Receipt}
      flush
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href={verTodos}>
            Ver todos
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      }
      footer={
        pagos.total > pagos.filas.length ? (
          <Link href={verTodos} className="font-semibold text-azul-700 hover:underline">
            Ver las {pagos.total.toLocaleString("es-AR")} liquidaciones de la empresa
          </Link>
        ) : undefined
      }
    >
      {pagos.filas.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState compact icon={Receipt} title="Sin liquidaciones" description="La empresa todavía no generó liquidaciones de aranceles." />
        </div>
      ) : (
        <Table framed={false}>
          <THead>
            <TR>
              <TH>Código</TH>
              <TH>Concepto</TH>
              <TH numeric>Cant.</TH>
              <TH numeric>Importe</TH>
              <TH>Cuenta</TH>
              <TH>Estado</TH>
              <TH>Pago</TH>
            </TR>
          </THead>
          <TBody>
            {pagos.filas.map((p) => (
              <TR key={p.id}>
                <TD className="font-semibold whitespace-nowrap">
                  <Link href={`/gestion/pagos/${p.id}`} className="text-azul-700 hover:underline">
                    {p.codigo ?? "—"}
                  </Link>
                </TD>
                <TD>
                  <span className="block max-w-64 truncate">{p.arancel_concepto}</span>
                  {p.medio ? <span className="text-xs text-muted-foreground">{MEDIO_PAGO[p.medio].label}</span> : null}
                </TD>
                <TD numeric>{p.cantidad}</TD>
                <TD numeric className="font-semibold whitespace-nowrap">
                  {formatPesos(p.importe_total)}
                </TD>
                <TD className="whitespace-nowrap">{p.cuenta_codigo ? `Cta. ${p.cuenta_codigo}` : "—"}</TD>
                <TD>
                  <EstadoBadge mapa={ESTADO_PAGO} valor={p.estado} size="sm" />
                </TD>
                <TD className="whitespace-nowrap text-muted-foreground nums-tabular">
                  {p.fecha_pago ? formatFecha(p.fecha_pago) : `Liq. ${formatFecha(p.created_at)}`}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </SectionCard>
  );
}

/* --- Trámites -------------------------------------------------------------------------------- */

export function TabTramites({ tramites }: { tramites: TramiteVista[] }) {
  return (
    <SectionCard title="Trámites del registro" description="Inscripción, renovaciones y cambios presentados" icon={ScrollText} flush>
      {tramites.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState compact icon={ScrollText} title="Sin trámites presentados" description="Los trámites que presente la empresa aparecerán acá." />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {tramites.map((t) => (
            <li key={t.id}>
              <Link
                href={t.id ? rutaTramite(t.id) : "/gestion/tramites"}
                className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/50 sm:px-6"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{t.tipo ? TIPO_TRAMITE[t.tipo].label : "Trámite"}</span>
                    <span className="text-xs text-muted-foreground nums-tabular">{t.codigo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Presentado {formatRelativo(t.presentado_at ?? t.created_at)}
                    {t.resuelto_at ? ` · resuelto el ${formatFecha(t.resuelto_at)}` : ""}
                    {t.resolucion ? ` · Res. ${t.resolucion}` : ""}
                  </p>
                </div>
                <EstadoBadge mapa={ESTADO_TRAMITE} valor={t.estado} size="sm" pulse={t.estado === "presentado"} />
                <ChevronRight className="size-4 shrink-0 text-noche-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* --- Inspecciones y actas ---------------------------------------------------------------------- */

export function TabFiscalizacion({
  empresaId,
  empresa,
  inspecciones,
  actas,
}: {
  empresaId: string;
  empresa: EmpresaPadron;
  inspecciones: Legajo["inspecciones"];
  actas: Legajo["actas"];
}) {
  const dias = diasHasta(empresa.ultima_inspeccion_deposito);
  const depositoAlDia = dias !== null && dias >= -365;
  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          "flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
          depositoAlDia ? "border-emerald-200 bg-success-soft" : "border-amber-200 bg-warning-soft",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1",
              depositoAlDia ? "text-success ring-emerald-200" : "text-warning ring-amber-200",
            )}
          >
            <Warehouse className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">Inspección anual de depósito (Art. 10.º d)</p>
            <p className="text-sm text-foreground/80">
              {empresa.ultima_inspeccion_deposito
                ? `Última inspección conforme: ${formatFecha(empresa.ultima_inspeccion_deposito)}${depositoAlDia ? "." : " — corresponde una nueva inspección."}`
                : "No hay inspecciones de depósito registradas."}
            </p>
          </div>
        </div>
        <Button asChild variant={depositoAlDia ? "outline" : "primary"} size="sm" className="self-start sm:self-center">
          <Link href={rutaNuevaInspeccion({ empresa: empresaId, tipo: "deposito_anual" })}>
            <Plus aria-hidden />
            Programar inspección de depósito
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <SectionCard
          title="Inspecciones"
          description={`${inspecciones.total.toLocaleString("es-AR")} registradas`}
          icon={ShieldCheck}
          flush
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href={`/gestion/inspecciones?empresa=${empresaId}`}>
                Ver todas
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          {inspecciones.filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState compact icon={ShieldCheck} title="Sin inspecciones" description="Todavía no se inspeccionó a esta empresa." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {inspecciones.filas.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/gestion/inspecciones/${i.id}`}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/50 sm:px-6"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{i.tipo ? TIPO_INSPECCION[i.tipo].label : "Inspección"}</span>
                        <span className="text-xs text-muted-foreground nums-tabular">{i.codigo}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {i.realizada_at ? `Realizada el ${formatFechaHora(i.realizada_at)}` : `Programada para el ${formatFecha(i.fecha_programada)}`}
                        {i.establecimiento_nombre ? ` · ${i.establecimiento_nombre}` : ""}
                        {i.inspector_nombre ? ` · ${i.inspector_nombre}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <EstadoBadge mapa={ESTADO_INSPECCION} valor={i.estado} size="sm" />
                      {i.resultado ? <EstadoBadge mapa={RESULTADO_INSPECCION} valor={i.resultado} size="sm" /> : null}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-noche-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Actas de infracción"
          description={`${actas.total.toLocaleString("es-AR")} labradas`}
          icon={FilePenLine}
          flush
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href={`/gestion/actas/nueva?empresa=${empresaId}`}>
                <Plus aria-hidden />
                Labrar acta
              </Link>
            </Button>
          }
        >
          {actas.filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState compact icon={FilePenLine} title="Sin actas" description="No se labraron actas de infracción a esta empresa." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {actas.filas.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/gestion/actas/${a.id}`}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/50 sm:px-6"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{a.motivo ? MOTIVO_ACTA[a.motivo].label : "Acta"}</span>
                        <span className="text-xs text-muted-foreground nums-tabular">{a.numero}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatFecha(a.fecha)}
                        {a.establecimiento_nombre ? ` · ${a.establecimiento_nombre}` : ""}
                        {a.inspector_nombre ? ` · ${a.inspector_nombre}` : ""}
                      </p>
                    </div>
                    <EstadoBadge mapa={ESTADO_ACTA} valor={a.estado} size="sm" />
                    <ChevronRight className="size-4 shrink-0 text-noche-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/* --- Envases vacíos ------------------------------------------------------------------------------ */

export function TabEnvases({ envases }: { envases: EnvaseSaldo[] }) {
  const generados = envases.reduce((a, e) => a + (e.generados ?? 0), 0);
  const entregados = envases.reduce((a, e) => a + (e.entregados ?? 0), 0);
  const saldo = envases.reduce((a, e) => a + (e.saldo ?? 0), 0);

  if (envases.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Sin movimientos de envases"
        description="La empresa todavía no registró envases vacíos generados ni entregas a operadores (SITREPE, Art. 5.º)."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Envases generados" value={generados} icon={PackageOpen} tone="ambar" hint="Vacíos de productos domisanitarios" />
        <StatCard label="Entregados a operador" value={entregados} icon={Recycle} tone="verde" hint="Con triple lavado y manifiesto" />
        <StatCard
          label="Saldo en depósito"
          value={saldo}
          icon={Warehouse}
          tone={saldo > 0 ? "violeta" : "neutral"}
          hint={saldo > 0 ? "Pendientes de entrega" : "Sin envases pendientes"}
        />
      </div>
      <SectionCard title="Saldo por producto" description="Trazabilidad de envases vacíos" icon={Recycle} flush>
        <Table framed={false}>
          <THead>
            <TR>
              <TH>Producto</TH>
              <TH>Registro</TH>
              <TH numeric>Generados</TH>
              <TH numeric>Entregados</TH>
              <TH numeric>Saldo</TH>
              <TH>Último movimiento</TH>
            </TR>
          </THead>
          <TBody>
            {envases.map((e) => (
              <TR key={e.producto_id}>
                <TD className="font-medium">{e.producto_nombre}</TD>
                <TD className="whitespace-nowrap text-muted-foreground">
                  {e.organismo} {e.registro_numero}
                </TD>
                <TD numeric>{e.generados ?? 0}</TD>
                <TD numeric>{e.entregados ?? 0}</TD>
                <TD numeric className={cn("font-semibold", (e.saldo ?? 0) > 0 && "text-violet-700")}>
                  {e.saldo ?? 0}
                </TD>
                <TD className="whitespace-nowrap text-muted-foreground nums-tabular">{formatFecha(e.ultimo_movimiento)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </SectionCard>
    </div>
  );
}
