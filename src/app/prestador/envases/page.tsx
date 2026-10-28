import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, Check, History, Minus, PackageCheck, PackageOpen, Paperclip, Recycle, Warehouse } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { type CampoFiltro, FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requerirEmpresa } from "@/lib/auth";
import { getEnvasesSaldo, getMemoriaTecnica, getMovimientosEnvases } from "@/lib/data/legajo";
import { MOVIMIENTO_ENVASE } from "@/lib/domain/etiquetas";
import { formatFecha, formatNumero } from "@/lib/domain/formato";
import { Constants, type Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { idValido } from "../legajo/_lib/esquemas";
import { motivoBloqueo } from "../legajo/_lib/tramites";
import { BarraAvance } from "./_components/barra-avance";
import { FormEntrega } from "./_components/form-entrega";
import { FormGenerados } from "./_components/form-generados";

export const metadata: Metadata = {
  title: "Envases vacíos",
  description: "Trazabilidad de envases vacíos de productos domisanitarios (SITREPE, Art. 5.º).",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function primero(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function esMovimiento(valor: string | undefined): valor is Enums<"movimiento_envase"> {
  return Constants.public.Enums.movimiento_envase.some((m) => m === valor);
}

export default async function EnvasesPage({ searchParams }: Props) {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const sp = await searchParams;
  const tipoParam = primero(sp.tipo);
  const productoParam = primero(sp.producto);
  const tipo = esMovimiento(tipoParam) ? tipoParam : undefined;
  const productoId = productoParam && idValido.safeParse(productoParam).success ? productoParam : undefined;
  const { pagina, desde, hasta, tamanio } = rangoPagina(sp.pagina);

  const [saldos, memoria, movimientos] = await Promise.all([
    getEnvasesSaldo(empresaId),
    getMemoriaTecnica(empresaId),
    getMovimientosEnvases(empresaId, { tipo, productoId, desde, hasta }),
  ]);
  const bloqueo = motivoBloqueo(sesion.empresa.estado);

  const generados = saldos.reduce((t, s) => t + (s.generados ?? 0), 0);
  const entregados = saldos.reduce((t, s) => t + (s.entregados ?? 0), 0);
  const enDeposito = saldos.reduce((t, s) => t + Math.max(0, s.saldo ?? 0), 0);
  const cumplimiento = generados > 0 ? Math.round((entregados / generados) * 1000) / 10 : 0;

  const productosAprobados = memoria
    .filter((m) => m.estado === "aprobado" && m.producto_id)
    .map((m) => ({
      id: m.producto_id ?? "",
      nombre: m.producto_nombre ?? "Producto",
      registro: m.organismo && m.registro_numero ? `${m.organismo} ${m.registro_numero}` : null,
    }));
  const saldosForm = saldos
    .filter((s) => s.producto_id)
    .map((s) => ({ id: s.producto_id ?? "", nombre: s.producto_nombre ?? "Producto", saldo: s.saldo ?? 0 }));

  const opcionesProducto = new Map<string, string>();
  for (const s of saldos) if (s.producto_id) opcionesProducto.set(s.producto_id, s.producto_nombre ?? "Producto");
  for (const p of productosAprobados) if (!opcionesProducto.has(p.id)) opcionesProducto.set(p.id, p.nombre);
  const filtros: CampoFiltro[] = [
    {
      tipo: "select",
      nombre: "tipo",
      etiqueta: "Movimiento",
      opciones: Constants.public.Enums.movimiento_envase.map((m) => ({ valor: m, label: MOVIMIENTO_ENVASE[m].label })),
    },
    {
      tipo: "select",
      nombre: "producto",
      etiqueta: "Producto",
      opciones: [...opcionesProducto].map(([valor, label]) => ({ valor, label })),
    },
  ];

  return (
    <>
      <PageHeader
        title="Envases vacíos"
        description="Trazabilidad de los envases vacíos de productos domisanitarios: lo que generan tus servicios y lo que entregás a operadores habilitados."
        icon={PackageOpen}
        breadcrumb={[{ label: "Prestadores", href: "/prestador" }, { label: "Envases vacíos" }]}
        actions={
          <>
            <FormEntrega empresaId={empresaId} saldos={saldosForm} bloqueado={bloqueo} />
            <FormGenerados productos={productosAprobados} bloqueado={bloqueo} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Envases generados" value={generados} icon={ArrowDownLeft} tone="celeste" hint="Total registrado" />
        <StatCard label="Entregados a operador" value={entregados} icon={PackageCheck} tone="verde" hint="Con destino final informado" />
        <StatCard
          label="En depósito"
          value={enDeposito}
          icon={Warehouse}
          tone={enDeposito > 0 ? "ambar" : "neutral"}
          hint={enDeposito > 0 ? "Pendientes de entrega" : "Sin envases pendientes"}
        />
        <StatCard
          label="Trazabilidad cerrada"
          value={cumplimiento}
          format="percent"
          icon={Recycle}
          tone="azul"
          hint="Entregados sobre generados"
        />
      </div>

      <Alert tone="info" title="Trazabilidad de envases (SITREPE, Art. 5.º)" className="my-6">
        Los envases vacíos de productos domisanitarios no se descartan con los residuos comunes: hacé el triple lavado,
        inutilizalos, guardalos en el depósito y entregalos a un operador habilitado. Registrá cada movimiento para que
        tu saldo coincida con lo que hay en el depósito.
      </Alert>

      <div className="flex flex-col gap-6">
        <SectionCard
          title="Saldo por producto"
          description="Envases generados, entregados y pendientes en el depósito"
          icon={Warehouse}
          flush
        >
          {saldos.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={PackageOpen}
                title="Todavía no registraste envases"
                description="Cuando un servicio deje envases vacíos, registralos para llevar el control hasta su entrega."
              />
            </div>
          ) : (
            <Table framed={false}>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH numeric>Generados</TH>
                  <TH numeric>Entregados</TH>
                  <TH numeric>En depósito</TH>
                  <TH className="min-w-40">Entregado</TH>
                  <TH>Último movimiento</TH>
                </TR>
              </THead>
              <TBody>
                {saldos.map((s) => {
                  const total = s.generados ?? 0;
                  const avance = total > 0 ? ((s.entregados ?? 0) / total) * 100 : 0;
                  const saldo = s.saldo ?? 0;
                  return (
                    <TR key={s.producto_id ?? s.producto_nombre}>
                      <TD className="min-w-48">
                        <p className="font-medium">{s.producto_nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.organismo} {s.registro_numero}
                        </p>
                      </TD>
                      <TD numeric>{formatNumero(s.generados ?? 0, 0)}</TD>
                      <TD numeric>{formatNumero(s.entregados ?? 0, 0)}</TD>
                      <TD numeric>
                        <Badge tone={saldo > 0 ? "ambar" : "verde"} size="sm" className="nums-tabular">
                          {formatNumero(saldo, 0)}
                        </Badge>
                      </TD>
                      <TD>
                        <BarraAvance valor={avance} etiqueta={`Envases entregados de ${s.producto_nombre ?? "este producto"}`} />
                      </TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{formatFecha(s.ultimo_movimiento)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </SectionCard>

        <SectionCard
          title="Historial de movimientos"
          description={`${movimientos.total.toLocaleString("es-AR")} movimiento${movimientos.total === 1 ? "" : "s"}${tipo || productoId ? " con los filtros aplicados" : ""}`}
          icon={History}
          flush
          footer={
            movimientos.total > tamanio ? (
              <Paginacion pagina={pagina} total={movimientos.total} tamanio={tamanio} params={sp} ruta="/prestador/envases" className="w-full" />
            ) : undefined
          }
        >
          <div className="border-b border-border px-5 py-3 sm:px-6">
            <FiltrosUrl campos={filtros} />
          </div>
          {movimientos.filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={History}
                title={tipo || productoId ? "No hay movimientos con esos filtros" : "Sin movimientos registrados"}
                description={tipo || productoId ? "Probá con otro producto o tipo de movimiento." : "Los envases generados y entregados aparecerán acá."}
              />
            </div>
          ) : (
            <Table framed={false}>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Movimiento</TH>
                  <TH>Producto</TH>
                  <TH numeric>Cantidad</TH>
                  <TH>Detalle</TH>
                  <TH align="center">Triple lavado</TH>
                  <TH>
                    <span className="sr-only">Comprobante</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {movimientos.filas.map((m) => {
                  const entrega = m.tipo === "entregado";
                  return (
                    <TR key={m.id}>
                      <TD className="whitespace-nowrap nums-tabular">{formatFecha(m.fecha)}</TD>
                      <TD>
                        <EstadoBadge mapa={MOVIMIENTO_ENVASE} valor={m.tipo} size="sm" />
                      </TD>
                      <TD className="min-w-40">
                        <p className="font-medium">{m.producto?.nombre_comercial ?? "Producto"}</p>
                        {m.producto ? (
                          <p className="text-xs text-muted-foreground">
                            {m.producto.organismo} {m.producto.registro_numero}
                          </p>
                        ) : null}
                      </TD>
                      <TD numeric>
                        <span className={cn("inline-flex items-center gap-1 font-semibold", entrega ? "text-success" : "text-foreground")}>
                          {entrega ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownLeft className="size-3.5 text-celeste-600" aria-hidden />}
                          {entrega ? "−" : "+"}
                          {formatNumero(m.cantidad, 0)}
                        </span>
                      </TD>
                      <TD className="min-w-48 text-[13px]">
                        {entrega ? (
                          <>
                            <p className="font-medium">{m.destinatario}</p>
                            {m.manifiesto ? <p className="text-muted-foreground">Manifiesto {m.manifiesto}</p> : null}
                          </>
                        ) : (
                          <p className="text-muted-foreground">
                            {[m.capacidad, m.lote ? `Lote ${m.lote}` : null].filter(Boolean).join(" · ") || "—"}
                          </p>
                        )}
                        {m.observaciones ? <p className="mt-0.5 line-clamp-2 text-muted-foreground">{m.observaciones}</p> : null}
                      </TD>
                      <TD align="center">
                        {m.triple_lavado ? (
                          <Check className="mx-auto size-4 text-success" aria-label="Sí" />
                        ) : (
                          <Minus className="mx-auto size-4 text-muted-foreground" aria-label="No" />
                        )}
                      </TD>
                      <TD align="right">
                        {m.comprobante_path ? (
                          <Button asChild variant="ghost" size="sm">
                            <a href={`/prestador/envases/comprobante/${m.id}`} target="_blank" rel="noopener noreferrer">
                              <Paperclip aria-hidden />
                              Comprobante
                              <span className="sr-only">(se abre en una pestaña nueva)</span>
                            </a>
                          </Button>
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </SectionCard>
      </div>
    </>
  );
}
