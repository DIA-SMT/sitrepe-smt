import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraImpresion } from "@/components/print/barra-impresion";
import { Alert } from "@/components/ui/alert";
import { esStaff, requerirSesion } from "@/lib/auth";
import { getCertificadoDetalle } from "@/lib/data/certificados";
import { cn } from "@/lib/utils";
import { EJEMPLARES, HojaCertificado, type Ejemplar } from "../_components/hoja-certificado";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Opcion = Ejemplar | "todos";

const ORDEN: Ejemplar[] = ["original", "duplicado", "triplicado"];

const OPCIONES: { valor: Opcion; label: string }[] = [
  { valor: "todos", label: "Los 3 ejemplares" },
  { valor: "original", label: "Original" },
  { valor: "duplicado", label: "Duplicado" },
  { valor: "triplicado", label: "Triplicado" },
];

function leerEjemplar(valor: string | string[] | undefined): Opcion {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v === "original" || v === "duplicado" || v === "triplicado" ? v : "todos";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const detalle = await getCertificadoDetalle(id);
    return {
      title: detalle ? `Certificado N.º ${detalle.certificado.numero ?? ""} · Impresión` : "Certificado no encontrado",
      robots: { index: false },
    };
  } catch {
    // Sin sesión (la vista no se expone a anónimos) o error de lectura: la página redirige o muestra el error.
    return { title: "Certificado · Impresión", robots: { index: false } };
  }
}

/**
 * Certificado oficial para imprimir o guardar en PDF (A4). La RLS deja leerlo a la
 * empresa dueña y al staff; para cualquier otro usuario no hay fila y se responde 404.
 */
export default async function ImprimirCertificadoPage({ params, searchParams }: Props) {
  const sesion = await requerirSesion();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const detalle = await getCertificadoDetalle(id);
  if (!detalle) notFound();

  const staff = esStaff(sesion.perfil.rol);
  // Defensa adicional a la RLS: una empresa solo imprime sus propios certificados.
  if (!staff && detalle.certificado.empresa_id !== sesion.empresa?.id) notFound();

  const opcion = leerEjemplar(sp.ejemplar);
  const ejemplares = opcion === "todos" ? ORDEN : [opcion];
  const c = detalle.certificado;
  const timbrado = c.estado === "timbrado" && !!c.sello_codigo;
  const volverHref = staff ? `/gestion/certificados/${c.id}` : `/prestador/certificados/${c.id}`;

  return (
    <>
      <BarraImpresion volverHref={volverHref} volverTexto="Volver al certificado">
        <nav
          aria-label="Ejemplar a imprimir"
          className="flex flex-wrap items-center gap-0.5 rounded-control border border-border-strong bg-card p-0.5 shadow-xs"
        >
          {OPCIONES.map((o) => {
            const activo = o.valor === opcion;
            return (
              <Link
                key={o.valor}
                href={o.valor === "todos" ? `/imprimir/certificado/${c.id}` : `/imprimir/certificado/${c.id}?ejemplar=${o.valor}`}
                replace
                scroll={false}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                  activo ? "bg-azul-600 text-white shadow-brand" : "text-noche-600 hover:bg-azul-50 hover:text-azul-800",
                )}
              >
                {o.label}
              </Link>
            );
          })}
        </nav>
      </BarraImpresion>

      {!timbrado ? (
        <div className="no-print mx-auto mb-5 w-full max-w-[210mm] px-4 sm:px-0">
          <Alert
            tone={c.estado === "anulado" ? "danger" : "warning"}
            title={c.estado === "anulado" ? "Certificado anulado" : "Certificado sin timbrar"}
          >
            {c.estado === "anulado"
              ? "Se imprime con la marca de agua ANULADO y no tiene validez."
              : "Se imprime con la marca de agua SIN TIMBRAR – NO VÁLIDO. El certificado es válido recién cuando la Dirección verifica el pago y lo sella digitalmente."}
          </Alert>
        </div>
      ) : null}

      <p className="no-print mx-auto mb-3 w-full max-w-[210mm] px-4 text-[13px] text-muted-foreground sm:px-0">
        {ejemplares.length === 3
          ? "Se imprimen 3 hojas A4: original para el cliente, duplicado para la Dirección de Salud Ambiental y triplicado para la empresa."
          : `Se imprime solo el ${EJEMPLARES[ejemplares[0]].titulo.toLowerCase()} (${EJEMPLARES[ejemplares[0]].destino.toLowerCase()}).`}
      </p>

      {/* Al imprimir, bloque común: los saltos de página forzados entre ítems flex no son confiables. */}
      <div className="flex flex-col gap-8 print:block">
        {ejemplares.map((e, i) => (
          <HojaCertificado key={e} detalle={detalle} ejemplar={e} saltoDePagina={i < ejemplares.length - 1} />
        ))}
      </div>
    </>
  );
}
