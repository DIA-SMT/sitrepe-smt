import { unstable_rethrow } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, EyeOff, Inbox, MessageSquareWarning, Phone, SearchCheck, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { getEmpresasPortal } from "@/lib/data/portal";
import { EncabezadoPortal } from "../_components/encabezado-portal";
import { PanelDenuncias } from "./_components/panel-denuncias";

export const metadata: Metadata = {
  title: "Denuncias",
  description:
    "Denunciá servicios de fumigación sin habilitación o mal realizados, establecimientos sin certificado, envases descartados o tanques sin limpieza. Podés hacerlo de forma anónima.",
};

const CIRCUITO: { titulo: string; texto: string; icono: LucideIcon }[] = [
  { titulo: "Recibimos tu denuncia", texto: "Te damos un código para seguirla.", icono: Inbox },
  { titulo: "La analizamos", texto: "El área cruza la información con el registro y los certificados.", icono: SearchCheck },
  { titulo: "Inspección", texto: "Si corresponde, un inspector visita el lugar.", icono: ClipboardCheck },
  { titulo: "Resolución", texto: "Se labran actas o se cierra con una respuesta.", icono: ShieldCheck },
];

export default async function DenunciasPage() {
  // Sugerencias para el campo "empresa mencionada": si el listado no está disponible, el formulario funciona igual.
  const empresas = await getEmpresasPortal()
    .then((lista) => lista.map((e) => e.nombre))
    .catch((e: unknown) => {
      unstable_rethrow(e);
      console.error("[portal] No se pudo cargar el listado de empresas para sugerencias:", e);
      return [];
    });

  return (
    <>
      <EncabezadoPortal
        antetitulo="Participación vecinal"
        titulo="Denuncias"
        descripcion="Si detectás un servicio sin habilitación o mal realizado, un establecimiento sin certificado, envases descartados o un tanque sin limpieza, avisanos. Cada denuncia ayuda a cuidar la salud de la ciudad."
        icono={MessageSquareWarning}
        migas={[{ label: "Denuncias" }]}
      >
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 font-medium text-foreground shadow-xs ring-1 ring-border">
            <EyeOff className="size-4 text-azul-600" aria-hidden />
            Podés hacerla de forma anónima
          </span>
          <a
            href="#consulta"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 font-medium text-azul-700 shadow-xs ring-1 ring-border hover:bg-white"
          >
            <SearchCheck className="size-4" aria-hidden />
            Consultá una denuncia
          </a>
        </div>
      </EncabezadoPortal>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <PanelDenuncias
          empresas={empresas}
          lateral={
            <>
              <section aria-labelledby="que-pasa" className="rounded-card border border-border bg-card p-5 shadow-card sm:p-6">
                <h2 id="que-pasa" className="font-display text-base font-semibold text-foreground">
                  ¿Qué pasa después?
                </h2>
                <ol className="relative mt-4 flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-4 before:w-px before:bg-border">
                  {CIRCUITO.map((p) => {
                    const Icono = p.icono;
                    return (
                      <li key={p.titulo} className="relative flex gap-3">
                        <span
                          aria-hidden
                          className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-azul-50 text-azul-600 ring-4 ring-card"
                        >
                          <Icono className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.titulo}</p>
                          <p className="text-[13px] text-muted-foreground">{p.texto}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <Alert tone="warning" title="¿Es una emergencia?" icon={<Phone />}>
                Ante una intoxicación o un malestar después de una fumigación, acudí al centro de salud más cercano o llamá al
                107. Esta página no reemplaza la atención de urgencias.
              </Alert>

              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Antes de contratar, consultá el{" "}
                <Link href="/empresas" className="font-medium text-azul-700 hover:underline">
                  listado de empresas habilitadas
                </Link>{" "}
                y{" "}
                <Link href="/verificar" className="font-medium text-azul-700 hover:underline">
                  verificá el certificado
                </Link>{" "}
                que te entreguen.
              </p>
            </>
          }
        />
      </div>
    </>
  );
}
