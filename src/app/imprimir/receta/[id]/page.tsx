import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraImpresion } from "@/components/print/barra-impresion";
import { Alert } from "@/components/ui/alert";
import { esStaff, requerirSesion } from "@/lib/auth";
import { getCertificadoDetalle } from "@/lib/data/certificados";
import { COPIAS_RECETA } from "@/lib/domain/receta";
import { cn } from "@/lib/utils";
import { type CopiaReceta, HojaReceta } from "../_components/hoja-receta";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TODAS: CopiaReceta[] = [0, 1, 2];

function leerCopia(valor: string | string[] | undefined): CopiaReceta | null {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v === "0" || v === "1" || v === "2" ? (Number(v) as CopiaReceta) : null;
}

export const metadata: Metadata = { title: "Receta domisanitaria · Impresión", robots: { index: false } };

/**
 * Receta domisanitaria (Anexo I) para imprimir o guardar en PDF, por triplicado.
 * La leen la empresa dueña y el staff (RLS); solo existe para servicios de fumigación.
 */
export default async function ImprimirRecetaPage({ params, searchParams }: Props) {
  const sesion = await requerirSesion();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const detalle = await getCertificadoDetalle(id);
  if (!detalle || detalle.certificado.tipo !== "fumigacion") notFound();

  const staff = esStaff(sesion.perfil.rol);
  if (!staff && detalle.certificado.empresa_id !== sesion.empresa?.id) notFound();

  const copia = leerCopia(sp.copia);
  const copias = copia === null ? TODAS : [copia];
  const c = detalle.certificado;
  const emitida = Boolean(c.firma_hash && c.receta_numero);
  const volverHref = staff ? `/gestion/certificados/${c.id}` : `/prestador/certificados/${c.id}`;

  const opciones: { valor: CopiaReceta | null; label: string }[] = [
    { valor: null, label: "Las 3 copias" },
    ...TODAS.map((i) => ({ valor: i, label: COPIAS_RECETA[i].etiqueta })),
  ];

  return (
    <>
      <BarraImpresion volverHref={volverHref} volverTexto="Volver al servicio">
        <nav
          aria-label="Copia a imprimir"
          className="flex flex-wrap items-center gap-0.5 rounded-control border border-border-strong bg-card p-0.5 shadow-xs"
        >
          {opciones.map((o) => {
            const activo = o.valor === copia;
            return (
              <Link
                key={o.label}
                href={o.valor === null ? `/imprimir/receta/${c.id}` : `/imprimir/receta/${c.id}?copia=${o.valor}`}
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

      {!emitida || c.estado === "anulado" ? (
        <div className="no-print mx-auto mb-5 w-full max-w-[210mm] px-4 sm:px-0">
          <Alert tone={c.estado === "anulado" ? "danger" : "warning"} title={c.estado === "anulado" ? "Receta anulada" : "Receta sin emitir"}>
            {c.estado === "anulado"
              ? "El servicio fue anulado: la receta no tiene validez."
              : "La receta queda emitida, con número y QR, cuando el asesor técnico firma el servicio. Hasta entonces se imprime con la marca SIN FIRMA."}
          </Alert>
        </div>
      ) : null}

      <p className="no-print mx-auto mb-3 w-full max-w-[210mm] px-4 text-[13px] text-muted-foreground sm:px-0">
        {copias.length === 3
          ? "Se imprimen 3 hojas A4: original para el comercio que vende el producto, duplicado para la empresa y triplicado para el asesor técnico."
          : `Se imprime solo el ${COPIAS_RECETA[copias[0]].etiqueta.toLowerCase()} (${COPIAS_RECETA[copias[0]].destinatario.toLowerCase()}).`}
      </p>

      <div className="flex flex-col gap-8 print:block">
        {copias.map((i, n) => (
          <HojaReceta key={i} detalle={detalle} copia={i} saltoDePagina={n < copias.length - 1} />
        ))}
      </div>
    </>
  );
}
