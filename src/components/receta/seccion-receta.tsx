import Link from "next/link";
import { ExternalLink, FileText, Printer } from "lucide-react";
import { CodigoQR } from "@/components/shared/codigo-qr";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { CertificadoDetalle, ProductoDetalle } from "@/lib/data/certificados";
import { formatFecha, formatFechaHora } from "@/lib/domain/formato";
import { formatNumeroReceta } from "@/lib/domain/receta";

/**
 * Receta domisanitaria de un servicio de fumigación: número, prescripción, QR para el
 * comercio, lote de cada producto e impresión por triplicado.
 */
export function SeccionReceta({
  detalle,
  accionLote,
}: {
  detalle: CertificadoDetalle;
  /** Botón para registrar el lote de un producto (solo la empresa). */
  accionLote?: (producto: ProductoDetalle) => React.ReactNode;
}) {
  const { certificado: c, productos, empresa } = detalle;
  if (c.tipo !== "fumigacion") return null;
  const numero = formatNumeroReceta(empresa?.numero_registro ?? c.empresa_numero_registro, c.receta_numero);
  const emitida = Boolean(c.firma_hash && numero);
  const anulada = c.estado === "anulado";
  const codigo = c.receta_codigo;

  return (
    <SectionCard
      title="Receta domisanitaria"
      description="Compra y aplicación (Anexo I): la emite el asesor al firmar"
      icon={FileText}
      actions={
        <StatusBadge
          label={anulada ? "Anulada" : emitida ? "Emitida" : "Sin emitir"}
          tone={anulada ? "rojo" : emitida ? "verde" : "ambar"}
          size="sm"
        />
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {emitida && codigo ? (
            <div className="self-center rounded-xl bg-white p-2 shadow-card ring-1 ring-border sm:self-start">
              <CodigoQR codigo={codigo} receta tamanio={112} />
            </div>
          ) : null}
          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">N.º de receta</dt>
              <dd className="font-mono font-semibold">{numero ?? "Se asigna al firmar"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Emitida</dt>
              <dd className="font-medium">{emitida && c.firmado_at ? formatFechaHora(c.firmado_at) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Plaga objetivo</dt>
              <dd className="font-medium">{c.plaga_objetivo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Método de aplicación</dt>
              <dd className="font-medium">{c.metodo_aplicacion ?? "—"}</dd>
            </div>
          </dl>
        </div>

        {!emitida && !anulada ? (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-amber-900">
            La receta queda emitida, con número y código QR, cuando el asesor técnico firma el servicio.
          </p>
        ) : null}

        {productos.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {productos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[13px]">
                <span className="min-w-0">
                  <span className="block font-medium">{p.nombre}</span>
                  <span className="text-muted-foreground">
                    {p.lote ? (
                      <>
                        Lote <span className="font-mono text-foreground">{p.lote}</span>
                        {p.loteVence ? ` · vence ${formatFecha(p.loteVence)}` : ""}
                      </>
                    ) : (
                      "Lote sin registrar"
                    )}
                  </span>
                </span>
                {accionLote && emitida && !anulada ? accionLote(p) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/imprimir/receta/${c.id}`}>
              <Printer aria-hidden />
              Imprimir receta (3 copias)
            </Link>
          </Button>
          {emitida && codigo ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/receta/${encodeURIComponent(codigo)}`} target="_blank" rel="noopener noreferrer">
                Ver como el comercio <ExternalLink aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
