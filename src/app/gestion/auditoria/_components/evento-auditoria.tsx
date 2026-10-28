import Link from "next/link";
import { ArrowUpRight, ChevronDown, Cpu, FilePlus2, FilePen, FileX2, History, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { AccionAuditoria, CambioAuditoria, EventoAuditoria, Rol } from "@/lib/data/admin";
import { formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

export const ESTILO_ACCION: Record<AccionAuditoria, { etiqueta: string; tono: BadgeTone; icono: LucideIcon; punto: string }> = {
  INSERT: { etiqueta: "Alta", tono: "verde", icono: FilePlus2, punto: "bg-emerald-500" },
  UPDATE: { etiqueta: "Modificación", tono: "azul", icono: FilePen, punto: "bg-azul-600" },
  DELETE: { etiqueta: "Baja", tono: "rojo", icono: FileX2, punto: "bg-red-500" },
};

/** "fecha_vencimiento" → "Fecha vencimiento"; "empresa_id" → "Empresa (id)". */
function nombreCampo(campo: string): string {
  const base = campo.endsWith("_id") ? `${campo.slice(0, -3)} (id)` : campo;
  const texto = base.replace(/_/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function Valor({ valor, tono }: { valor: string | null; tono: "antes" | "despues" }) {
  if (valor === null) return <span className="text-muted-foreground/70 italic">vacío</span>;
  const largo = valor.length > 120 || valor.includes("\n");
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-xs break-all whitespace-pre-wrap",
        tono === "antes" ? "bg-red-50 text-red-800 line-through decoration-red-300" : "bg-emerald-50 text-emerald-900",
        largo && "block max-h-40 overflow-y-auto",
      )}
    >
      {valor}
    </span>
  );
}

function TablaCambios({ accion, cambios }: { accion: AccionAuditoria; cambios: CambioAuditoria[] }) {
  if (cambios.length === 0) {
    return <p className="text-[13px] text-muted-foreground">El registro no tiene campos con datos para mostrar.</p>;
  }
  const mostrarAntes = accion !== "INSERT";
  const mostrarDespues = accion !== "DELETE";
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-[13px]">
        <caption className="sr-only">
          {accion === "UPDATE" ? "Campos modificados" : accion === "INSERT" ? "Datos cargados" : "Datos eliminados"}
        </caption>
        <thead className="bg-subtle text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Campo
            </th>
            {mostrarAntes ? (
              <th scope="col" className="px-3 py-2 font-medium">
                {accion === "DELETE" ? "Valor eliminado" : "Antes"}
              </th>
            ) : null}
            {mostrarDespues ? (
              <th scope="col" className="px-3 py-2 font-medium">
                {accion === "INSERT" ? "Valor cargado" : "Después"}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cambios.map((c) => (
            <tr key={c.campo} className="align-top">
              <th scope="row" className="px-3 py-2 font-medium whitespace-nowrap text-foreground">
                {nombreCampo(c.campo)}
                <span className="block font-mono text-[11px] font-normal text-muted-foreground">{c.campo}</span>
              </th>
              {mostrarAntes ? (
                <td className="px-3 py-2">
                  <Valor valor={c.antes} tono="antes" />
                </td>
              ) : null}
              {mostrarDespues ? (
                <td className="px-3 py-2">
                  <Valor valor={c.despues} tono="despues" />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Fila expandible del registro de auditoría con el detalle de los cambios. */
export function EventoAuditoriaItem({ evento: e, etiquetas }: { evento: EventoAuditoria; etiquetas: Record<Rol, string> }) {
  const estilo = ESTILO_ACCION[e.accion];
  const Icono = estilo.icono;
  const nombreUsuario = e.usuario?.nombre ?? (e.usuarioId ? "Usuario eliminado" : "Sistema");
  const resumenCambios =
    e.accion === "UPDATE"
      ? e.cambios.length === 1
        ? `Cambió ${nombreCampo(e.cambios[0].campo).toLowerCase()}`
        : `${e.cambios.length} campos modificados`
      : e.accion === "INSERT"
        ? "Registro creado"
        : "Registro eliminado";

  return (
    <li>
      <details className="group">
        <summary
          className={cn(
            "flex cursor-pointer list-none items-start gap-3 px-5 py-3.5 transition-colors hover:bg-azul-50/40 sm:items-center sm:px-6",
            "group-open:bg-azul-50/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring [&::-webkit-details-marker]:hidden",
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 sm:mt-0",
              e.accion === "INSERT" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
              e.accion === "UPDATE" && "bg-azul-50 text-azul-700 ring-azul-200",
              e.accion === "DELETE" && "bg-red-50 text-red-600 ring-red-200",
            )}
          >
            <Icono className="size-[18px]" aria-hidden />
            <span className="sr-only">{estilo.etiqueta}</span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-semibold text-foreground">{e.tablaLabel}</span>
              {e.descriptor ? <span className="max-w-[28ch] truncate text-foreground/80">· {e.descriptor}</span> : null}
              <Badge tone={estilo.tono} size="sm">
                {estilo.etiqueta}
              </Badge>
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
              <span>{resumenCambios}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                {e.usuario ? (
                  <Avatar nombre={e.usuario.nombre} size="xs" />
                ) : (
                  <Cpu className="size-3.5" aria-hidden />
                )}
                {nombreUsuario}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <time
              dateTime={e.createdAt}
              title={formatFechaHora(e.createdAt)}
              className="hidden text-xs whitespace-nowrap text-muted-foreground sm:block"
            >
              {formatRelativo(e.createdAt)}
            </time>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </div>
        </summary>

        <div className="flex flex-col gap-4 border-t border-dashed border-border bg-subtle/40 px-5 py-4 sm:px-6">
          <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Fecha y hora</dt>
              <dd className="font-medium text-foreground nums-tabular">{formatFechaHora(e.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Usuario</dt>
              <dd className="font-medium text-foreground">
                {e.usuario ? (
                  <Link
                    href={`/gestion/auditoria?usuario=${e.usuario.id}`}
                    className="text-azul-700 underline-offset-2 hover:underline"
                  >
                    {e.usuario.nombre}
                  </Link>
                ) : (
                  nombreUsuario
                )}
                {e.usuario?.rol ? <span className="block text-xs font-normal text-muted-foreground">{etiquetas[e.usuario.rol]}</span> : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tabla</dt>
              <dd className="font-mono text-xs text-foreground">{e.tabla}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Id del registro</dt>
              <dd className="truncate font-mono text-xs text-foreground" title={e.registroId ?? undefined}>
                {e.registroId ?? "—"}
              </dd>
            </div>
          </dl>

          <TablaCambios accion={e.accion} cambios={e.cambios} />

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {e.registroId ? (
              <Link
                href={`/gestion/auditoria?tabla=${encodeURIComponent(e.tabla)}&registro=${encodeURIComponent(e.registroId)}`}
                className="inline-flex items-center gap-1.5 font-medium text-azul-700 underline-offset-2 hover:underline"
              >
                <History className="size-3.5" aria-hidden />
                Historial de este registro
              </Link>
            ) : null}
            {e.href ? (
              <Link href={e.href} className="inline-flex items-center gap-1.5 font-medium text-azul-700 underline-offset-2 hover:underline">
                <ArrowUpRight className="size-3.5" aria-hidden />
                Abrir la ficha
              </Link>
            ) : null}
          </div>
        </div>
      </details>
    </li>
  );
}
