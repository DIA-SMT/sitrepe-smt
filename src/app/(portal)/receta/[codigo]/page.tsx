import type { Metadata } from "next";
import Link from "next/link";
import { Ban, FileSignature, FileText, FlaskConical, MapPin, SearchX, ShieldAlert, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { KeyValue } from "@/components/shared/key-value";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { type VerificacionReceta, verificarReceta } from "@/lib/data/portal";
import { formatFecha, formatFechaHora, formatNumero } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { normalizarCodigo } from "../../_lib/codigo";
import { plazoReingreso } from "../../_lib/reingreso";

type Props = { params: Promise<{ codigo: string }> };

function decodificar(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

export const metadata: Metadata = {
  title: "Verificación de receta",
  description: "Resultado de la verificación de una receta domisanitaria de compra y aplicación.",
  // Contiene datos del servicio (cliente, domicilio): no se indexa.
  robots: { index: false, follow: false },
};

type Estado = "valida" | "observada" | "sin_firma" | "anulada" | "no_encontrada";

const VISTAS: Record<Estado, { titulo: string; detalle: string; icono: LucideIcon; fondo: string }> = {
  valida: {
    titulo: "Receta válida",
    detalle: "Emitida y firmada por un asesor técnico con la matrícula al día, de una empresa habilitada.",
    icono: ShieldCheck,
    fondo: "bg-linear-to-br from-emerald-600 via-emerald-700 to-emerald-900",
  },
  observada: {
    titulo: "Receta con observaciones",
    detalle: "La receta existe, pero la empresa no está habilitada o el asesor no tiene la matrícula al día. No vendas el producto.",
    icono: ShieldAlert,
    fondo: "bg-linear-to-br from-amber-500 via-amber-600 to-amber-800",
  },
  sin_firma: {
    titulo: "Receta sin firma",
    detalle: "Se modificó después de firmarla y el asesor técnico todavía no la volvió a firmar. No vendas el producto.",
    icono: ShieldAlert,
    fondo: "bg-linear-to-br from-amber-500 via-amber-600 to-amber-800",
  },
  anulada: {
    titulo: "Receta anulada",
    detalle: "El servicio fue anulado: la receta no tiene validez.",
    icono: Ban,
    fondo: "bg-linear-to-br from-red-600 via-red-700 to-red-900",
  },
  no_encontrada: {
    titulo: "No encontramos la receta",
    detalle: "Revisá el código. Si lo escribiste a mano, comparalo con el que figura debajo del QR.",
    icono: SearchX,
    fondo: "bg-linear-to-br from-noche-700 via-noche-800 to-noche-950",
  },
};

function estadoDe(r: VerificacionReceta | null): Estado {
  if (!r) return "no_encontrada";
  if (r.estado !== "valida") return r.estado;
  return r.empresa.habilitada && r.tecnico.matricula_vigente ? "valida" : "observada";
}

export default async function VerificarRecetaPage({ params }: Props) {
  const { codigo: crudo } = await params;
  const codigo = normalizarCodigo(decodificar(crudo));
  const receta = await verificarReceta(codigo);
  const estado = estadoDe(receta);
  const vista = VISTAS[estado];
  const Icono = vista.icono;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <section className={cn("relative overflow-hidden rounded-panel p-6 text-white shadow-elevated sm:p-8", vista.fondo)}>
        <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-20" />
        <div className="relative flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Icono className="size-7" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/75 uppercase">Receta domisanitaria</p>
            <h1 className="font-display text-2xl leading-tight font-bold sm:text-3xl">{vista.titulo}</h1>
            <p className="mt-1 text-sm text-white/85">{vista.detalle}</p>
            {receta ? (
              <p className="mt-3 font-mono text-sm font-semibold">
                N.º {receta.numero} · código {receta.codigo}
              </p>
            ) : (
              <p className="mt-3 font-mono text-sm font-semibold">{codigo}</p>
            )}
          </div>
        </div>
      </section>

      {receta ? (
        <>
          <SectionCard title="Prescripción" description="Lo que autoriza la receta" icon={FlaskConical}>
            <div className="flex flex-col gap-4">
              <KeyValue
                columns={2}
                items={[
                  { label: "Plaga objetivo", value: receta.plaga_objetivo },
                  { label: "Método de aplicación", value: receta.metodo_aplicacion },
                  { label: "Emitida", value: receta.emitida_at ? formatFechaHora(receta.emitida_at) : null },
                  { label: "Reingreso", value: plazoReingreso(receta.plazo_reingreso_horas) },
                ]}
              />
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                {receta.productos.map((p) => (
                  <li key={p.nombre} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold">{p.nombre}</span>
                      <span className="nums-tabular font-medium">
                        {p.cantidad !== null ? formatNumero(p.cantidad, 3) : "—"} {p.unidad ?? ""}
                      </span>
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {[p.principio_activo && `${p.principio_activo}${p.concentracion ? ` ${p.concentracion}` : ""}`, p.formulacion, p.organismo && p.registro ? `${p.organismo} N.º ${p.registro}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {p.lote ? (
                      <span className="text-[13px]">
                        Lote <span className="font-mono">{p.lote}</span>
                        {p.lote_vence ? ` · vence ${formatFecha(p.lote_vence)}` : ""}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>

          <SectionCard title="Empresa y asesor técnico" icon={FileSignature}>
            <KeyValue
              columns={2}
              items={[
                { label: "Empresa aplicadora", value: receta.empresa.nombre },
                {
                  label: "Habilitación municipal",
                  value: `${receta.empresa.habilitada ? "Habilitada" : "No habilitada"}${receta.empresa.numero_registro ? ` · Registro N.º ${receta.empresa.numero_registro}` : ""}`,
                },
                { label: "Asesor técnico", value: receta.tecnico.nombre },
                {
                  label: "Matrícula",
                  value: `${receta.tecnico.matricula ?? "—"} · ${receta.tecnico.matricula_vigente ? "al día" : "no vigente"}`,
                },
              ]}
            />
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Link href={`/empresas/${receta.empresa.id}`}>Ver ficha pública de la empresa</Link>
            </Button>
          </SectionCard>

          <SectionCard title="Destino de aplicación" icon={MapPin}>
            <KeyValue
              columns={2}
              items={[
                { label: "Cliente", value: receta.cliente },
                { label: "Domicilio", value: receta.domicilio },
                { label: "Rubro", value: receta.rubro },
                { label: "Fecha del servicio", value: formatFechaHora(receta.fecha_servicio) },
              ]}
            />
          </SectionCard>

          <Alert tone="info" title="Para el comercio">
            Quedate con el original de la receta impresa y registrá en la factura el lote vendido. La empresa lo carga en
            SITREPE y queda asociado al servicio.
          </Alert>
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/receta">
            <FileText aria-hidden />
            Verificar otra receta
          </Link>
        </Button>
      </div>
    </div>
  );
}
