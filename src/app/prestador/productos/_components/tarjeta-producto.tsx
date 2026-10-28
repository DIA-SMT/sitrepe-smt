import Link from "next/link";
import { Clock, ShieldAlert, Trash2 } from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { getMemoriaTecnica } from "@/lib/data/legajo";
import { CLASE_PRODUCTO, ESTADO_MEMORIA, ESTADO_TRAMITE, ORGANISMO, etiqueta } from "@/lib/domain/etiquetas";
import { formatFecha } from "@/lib/domain/formato";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { AccionConfirmada } from "../../legajo/_components/accion-confirmada";
import { retirarPropuesta } from "../actions";
import { etiquetaToxicidad, textoReingreso } from "../_lib/toxicidad";

export type ItemMemoria = Awaited<ReturnType<typeof getMemoriaTecnica>>[number];
export type TramiteProducto = {
  id: string;
  codigo: string | null;
  estado: Enums<"estado_tramite">;
  observaciones: string | null;
};

/** Tarjeta de un producto de la memoria técnica. */
export function TarjetaProducto({ item, tramite }: { item: ItemMemoria; tramite?: TramiteProducto | null }) {
  const clase = etiqueta(CLASE_PRODUCTO, item.clase);
  const toxicidad = etiquetaToxicidad(item.categoria_toxicologica);
  const organismo = item.organismo ? ORGANISMO[item.organismo] : null;
  // El rechazo del trámite no cambia el estado de la propuesta (sigue "propuesto"): se muestra como rechazada.
  const sinEfecto = item.estado === "propuesto" && tramite?.estado === "rechazado";
  const observada = item.estado === "propuesto" && tramite?.estado === "observado";
  const retirable = item.estado === "propuesto" && tramite?.estado !== "presentado" && Boolean(item.id);

  return (
    <Card className={cn("h-full gap-4 p-5", (item.estado === "rechazado" || sinEfecto) && "bg-subtle/60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display leading-snug font-semibold break-words">{item.producto_nombre ?? "Producto"}</p>
          <p className="text-[13px] break-words text-muted-foreground">{item.principio_activo}</p>
        </div>
        {sinEfecto ? (
          <StatusBadge label="Trámite rechazado" tone="rojo" size="sm" className="shrink-0" />
        ) : observada ? (
          <StatusBadge label="Observado" tone="ambar" size="sm" pulse className="shrink-0" />
        ) : (
          <EstadoBadge mapa={ESTADO_MEMORIA} valor={item.estado} size="sm" pulse={item.estado === "propuesto"} />
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge size="sm" tone={clase.tono}>
          {clase.label}
        </Badge>
        {organismo ? (
          <Badge size="sm" tone={organismo.tono} variant="outline">
            {item.organismo} {item.registro_numero}
          </Badge>
        ) : null}
        <Badge size="sm" tone="neutral">
          <Clock aria-hidden />
          Reingreso: {textoReingreso(item.plazo_reingreso_horas)}
        </Badge>
      </div>

      {toxicidad ? (
        <p className="flex items-center gap-2 text-[13px]">
          <ShieldAlert
            className={cn(
              "size-4 shrink-0",
              toxicidad.tono === "rojo" ? "text-danger" : toxicidad.tono === "ambar" ? "text-warning" : "text-azul-600",
            )}
            aria-hidden
          />
          <span className="font-medium">{toxicidad.label}</span>
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-subtle/70 p-3 text-[13px]">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Dosis</dt>
          <dd className="font-medium break-words">{item.dosis ?? "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Concentración de uso</dt>
          <dd className="font-medium break-words">{item.concentracion_uso ?? "—"}</dd>
        </div>
        {item.precauciones ? (
          <div className="col-span-2 min-w-0">
            <dt className="text-muted-foreground">Precauciones</dt>
            <dd className="line-clamp-3 break-words" title={item.precauciones}>
              {item.precauciones}
            </dd>
          </div>
        ) : null}
      </dl>

      {item.estado === "rechazado" && item.observaciones ? (
        <Alert tone="danger" title="Motivo del rechazo">
          <span className="whitespace-pre-line">{item.observaciones}</span>
        </Alert>
      ) : null}
      {(sinEfecto || observada) && tramite?.observaciones ? (
        <Alert tone={sinEfecto ? "danger" : "warning"} title={sinEfecto ? "Motivo del rechazo" : "Observaciones de la Dirección"}>
          <span className="whitespace-pre-line">{tramite.observaciones}</span>
        </Alert>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[13px] text-muted-foreground">
        {item.estado === "aprobado" ? (
          <span>Aprobado {item.revisado_at ? `el ${formatFecha(item.revisado_at)}` : "por la Dirección"}</span>
        ) : item.estado === "rechazado" ? (
          <span>Para volver a proponerlo, consultá con la Dirección.</span>
        ) : sinEfecto ? (
          <span>Retirala para volver a proponerlo.</span>
        ) : (
          <span>Propuesto el {formatFecha(item.created_at)}</span>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {tramite ? (
            <Link href={`/prestador/tramites/${tramite.id}`} className="font-medium text-azul-700 hover:underline">
              {observada ? `Responder (${tramite.codigo ?? "trámite"})` : `${tramite.codigo ?? "Trámite"} · ${ESTADO_TRAMITE[tramite.estado].label.toLowerCase()}`}
            </Link>
          ) : null}
          {retirable && item.id ? (
            <AccionConfirmada
              accion={retirarPropuesta}
              campos={{ id: item.id }}
              titulo={`¿Retirar ${item.producto_nombre ?? "este producto"} de tu memoria técnica?`}
              descripcion={
                observada
                  ? "Desistís de la propuesta y el trámite observado queda sin efecto. Podés volver a proponer el producto cuando quieras."
                  : "Se borra la propuesta. Podés volver a proponer el producto con la dosis y las precauciones corregidas."
              }
              confirmar="Sí, retirar"
              trigger={
                <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger">
                  <Trash2 aria-hidden />
                  Retirar
                </Button>
              }
            />
          ) : null}
        </div>
      </div>
    </Card>
  );
}
