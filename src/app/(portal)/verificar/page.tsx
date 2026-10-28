import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Ban,
  Camera,
  CircleHelp,
  Hourglass,
  MessageSquareWarning,
  MousePointerClick,
  QrCode,
  ScanLine,
  SearchX,
  ShieldCheck,
  ShieldX,
  Smartphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BuscadorCertificado } from "../_components/buscador-certificado";
import { EncabezadoPortal, TituloSeccion } from "../_components/encabezado-portal";
import { QrDecorativo } from "../_components/qr-decorativo";
import { EJEMPLO_CODIGO, EJEMPLO_SELLO, normalizarCodigo } from "../_lib/codigo";

export const metadata: Metadata = {
  title: "Verificar un certificado",
  description:
    "Confirmá en segundos si un certificado de fumigación o de limpieza de tanques está timbrado y vigente, con su código QR o su sello.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const RESULTADOS: { titulo: string; texto: string; icono: LucideIcon; clases: string }[] = [
  {
    titulo: "Válido y vigente",
    texto: "El certificado está timbrado por la Municipalidad y dentro de su plazo de validez.",
    icono: ShieldCheck,
    clases: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    titulo: "Vencido",
    texto: "El servicio se hizo, pero ya pasó su fecha de vencimiento: hay que renovarlo.",
    icono: ShieldX,
    clases: "bg-red-50 text-red-700 ring-red-200",
  },
  {
    titulo: "Sin timbrar",
    texto: "El servicio fue declarado, pero el certificado todavía no fue timbrado: no es válido.",
    icono: Hourglass,
    clases: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  {
    titulo: "Anulado",
    texto: "La Dirección anuló el certificado. No tiene validez.",
    icono: Ban,
    clases: "bg-noche-50 text-noche-700 ring-noche-200",
  },
  {
    titulo: "No encontrado",
    texto: "No existe un certificado con ese código. Revisalo o consultá con la Dirección.",
    icono: SearchX,
    clases: "bg-violet-50 text-violet-700 ring-violet-200",
  },
];

const PASOS_QR: { titulo: string; texto: string; icono: LucideIcon }[] = [
  { titulo: "Abrí la cámara", texto: "Usá la cámara del celular o una app para leer códigos QR.", icono: Camera },
  { titulo: "Apuntá al QR", texto: "Está impreso en el certificado que entrega la empresa.", icono: ScanLine },
  { titulo: "Tocá el enlace", texto: "Se abre esta página con el estado del certificado al instante.", icono: MousePointerClick },
];

export default async function VerificarPage({ searchParams }: Props) {
  const sp = await searchParams;
  const crudo = Array.isArray(sp.codigo) ? sp.codigo[0] : sp.codigo;
  // Envío sin JavaScript del buscador (GET ?codigo=): se redirige al resultado.
  if (crudo && crudo.trim()) {
    const codigo = normalizarCodigo(crudo).slice(0, 60);
    if (codigo) redirect(`/verificar/${encodeURIComponent(codigo)}`);
  }

  return (
    <>
      <EncabezadoPortal
        antetitulo="Verificación pública"
        titulo="Verificá un certificado"
        descripcion="Confirmá si un certificado de fumigación o de limpieza de tanques está timbrado y vigente. Es gratis, no necesitás cuenta y funciona desde el celular."
        icono={QrCode}
        migas={[{ label: "Verificar certificado" }]}
      >
        <div className="max-w-2xl rounded-panel border border-white/70 bg-white/90 p-4 shadow-elevated backdrop-blur sm:p-5">
          <BuscadorCertificado variante="panel" />
        </div>
      </EncabezadoPortal>

      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Dónde está el código */}
        <section aria-labelledby="donde-codigo" className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <TituloSeccion
              id="donde-codigo"
              antetitulo="¿Dónde está el código?"
              titulo="Todo certificado válido tiene un QR y un código"
              descripcion="Lo encontrás en el original que la empresa le entrega al cliente. Podés usar cualquiera de estos datos:"
            />
            <ol className="mt-6 flex flex-col gap-4">
              <li className="flex gap-4">
                <Numero n={1} />
                <div>
                  <p className="font-medium text-foreground">Código QR</p>
                  <p className="text-sm text-muted-foreground">Escanealo con el celular y llegás directo al resultado.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <Numero n={2} />
                <div>
                  <p className="font-medium text-foreground">Código de verificación</p>
                  <p className="text-sm text-muted-foreground">
                    Está debajo del QR, con el formato <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">{EJEMPLO_CODIGO}</code>.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <Numero n={3} />
                <div>
                  <p className="font-medium text-foreground">Sello de timbrado</p>
                  <p className="text-sm text-muted-foreground">
                    Lo asigna la Municipalidad al timbrar, con el formato{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">{EJEMPLO_SELLO}</code>.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Anatomía de un certificado */}
          <figure className="relative mx-auto w-full max-w-md">
            <div aria-hidden className="absolute -inset-4 rounded-[2rem] bg-linear-to-br from-azul-100 via-celeste-50 to-sol-100 blur-xl" />
            <div className="relative rounded-panel border border-border bg-card p-6 shadow-elevated">
              <div aria-hidden className="h-1 w-full rounded-full bg-linear-to-r from-azul-600 via-celeste-400 to-sol-400" />
              <div className="mt-5 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <span aria-hidden className="h-3 w-40 rounded bg-noche-100" />
                  <span aria-hidden className="h-2.5 w-28 rounded bg-noche-100" />
                  <span aria-hidden className="h-2.5 w-32 rounded bg-noche-100" />
                </div>
                <span className="relative rounded-lg bg-success-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-success ring-1 ring-emerald-200">
                  {EJEMPLO_SELLO}
                  <Marca n={3} className="-top-3 -right-3" />
                </span>
              </div>
              <div className="mt-6 flex items-end gap-5">
                <div className="relative flex flex-col items-center gap-2">
                  <QrDecorativo className="size-32" />
                  <Marca n={1} className="-top-3 -left-3" />
                  <span className="relative rounded-md bg-azul-50 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-azul-800">
                    {EJEMPLO_CODIGO}
                    <Marca n={2} className="-right-3 -bottom-3" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 pb-2">
                  <span aria-hidden className="h-2.5 w-full rounded bg-noche-100" />
                  <span aria-hidden className="h-2.5 w-4/5 rounded bg-noche-100" />
                  <span aria-hidden className="h-2.5 w-3/5 rounded bg-noche-100" />
                  <span aria-hidden className="mt-3 h-6 w-24 rounded border-b-2 border-noche-300" />
                  <span className="text-[10px] text-muted-foreground">Firma del asesor técnico</span>
                </div>
              </div>
            </div>
            <figcaption className="mt-4 text-center text-xs text-muted-foreground">
              Ejemplo ilustrativo: ubicación del QR (1), el código (2) y el sello de timbrado (3).
            </figcaption>
          </figure>
        </section>

        {/* Cómo escanear */}
        <section aria-labelledby="como-escanear" className="relative overflow-hidden rounded-panel bg-noche px-6 py-10 text-white sm:px-10">
          <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-20" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:items-center">
            <div className="flex items-start gap-4">
              <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sol-400 text-noche-950">
                <Smartphone className="size-6" />
              </span>
              <div>
                <h2 id="como-escanear" className="font-display text-2xl font-semibold">
                  Escaneá el QR desde el celular
                </h2>
                <p className="mt-1 text-sm text-noche-200">
                  La hora de la consulta se muestra en vivo: así un inspector distingue una verificación real de una captura de
                  pantalla.
                </p>
              </div>
            </div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {PASOS_QR.map((p, i) => {
                const Icono = p.icono;
                return (
                  <li key={p.titulo} className="rounded-card bg-white/[0.06] p-4 ring-1 ring-white/10">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{i + 1}</span>
                      <Icono className="size-4 text-celeste-300" aria-hidden />
                    </div>
                    <p className="mt-3 font-medium">{p.titulo}</p>
                    <p className="mt-0.5 text-sm text-noche-200">{p.texto}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Qué significa cada resultado */}
        <section aria-labelledby="resultados">
          <TituloSeccion
            id="resultados"
            antetitulo="Resultados posibles"
            titulo="¿Qué significa cada estado?"
            descripcion="Solo un certificado timbrado y dentro de su plazo es válido ante una inspección."
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {RESULTADOS.map((r) => {
              const Icono = r.icono;
              return (
                <li key={r.titulo} className="revelar flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-card">
                  <span aria-hidden className={cn("flex size-11 items-center justify-center rounded-xl ring-1", r.clases)}>
                    <Icono className="size-5" />
                  </span>
                  <p className="font-display font-semibold text-foreground">{r.titulo}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{r.texto}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <SectionCard
          title="¿El certificado no es válido o sospechás de una empresa?"
          description="Podés hacer una denuncia anónima. La Dirección de Salud Ambiental la investiga."
          icon={CircleHelp}
          actions={
            <Button asChild variant="danger">
              <Link href="/denuncias">
                <MessageSquareWarning aria-hidden />
                Hacer una denuncia
              </Link>
            </Button>
          }
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            También podés consultar el{" "}
            <Link href="/empresas" className="font-semibold text-azul-700 hover:underline">
              listado de empresas habilitadas
            </Link>{" "}
            antes de contratar: solo sus certificados timbrados son válidos.
          </p>
        </SectionCard>
      </div>
    </>
  );
}

function Numero({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-brand font-display text-sm font-bold text-white shadow-brand"
    >
      {n}
    </span>
  );
}

function Marca({ n, className }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute flex size-6 items-center justify-center rounded-full bg-sol-400 font-display text-xs font-bold text-noche-950 shadow-xs ring-2 ring-white",
        className,
      )}
    >
      {n}
    </span>
  );
}
