import Link from "next/link";
import { ArrowLeft, ClipboardList, LifeBuoy, QrCode, Stamp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Asistente } from "@/components/asistente/asistente";
import { Logo } from "@/components/brand/logo";
import { BrandGlow, BrandStripe, PetalDecor } from "@/components/brand/petal-decor";
import { APP } from "@/lib/config";

const BENEFICIOS: { icon: LucideIcon; titulo: string; corto: string; texto: string }[] = [
  {
    icon: ClipboardList,
    titulo: "Declaraciones en línea",
    corto: "Declaraciones",
    texto: "Cargá la planilla de servicios 24 a 48 h antes, sin papeles ni traslados.",
  },
  {
    icon: QrCode,
    titulo: "Certificados verificables",
    corto: "Certificados con QR",
    texto: "Cada certificado lleva un código QR que vecinos e inspectores validan al instante.",
  },
  {
    icon: Stamp,
    titulo: "Pago y timbrado digital",
    corto: "Timbrado digital",
    texto: "Informá la transferencia y recibí el sellado digital de tus certificados.",
  },
];

/**
 * Pantallas de acceso (ingresar, registro, recuperar y actualizar contraseña):
 * panel de marca a la izquierda y tarjeta con el formulario a la derecha; apilado en móvil.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Panel de marca */}
      <aside className="relative isolate overflow-hidden bg-noche text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[44%] lg:max-w-[680px] lg:shrink-0 lg:flex-col">
        <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 -z-10 text-white opacity-30" />
        <BrandGlow className="-z-10" />
        <PetalDecor variant="hero" tone="dark" animated className="-z-10 right-[-38%] hidden opacity-80 lg:block" />
        <PetalDecor variant="corner" tone="dark" className="-z-10 lg:hidden" />

        <div className="flex h-full flex-col gap-6 px-5 pt-6 pb-7 sm:px-10 sm:pt-8 sm:pb-10 lg:justify-between lg:p-12">
          <Link href="/" className="w-fit rounded-md" aria-label={`${APP.municipio} · Ir al portal`}>
            <Logo variant="negativo" height={40} priority />
          </Link>

          <div className="flex max-w-lg flex-col gap-4 animate-fade-up">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-xs font-medium text-celeste-200 ring-1 ring-white/15">
              <span className="size-1.5 rounded-full bg-sol-400 ring-2 ring-sol-400/30" aria-hidden />
              {APP.direccion}
            </p>
            <div>
              <p className="font-display text-4xl leading-none font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {APP.nombre}
              </p>
              {/* En el celular se oculta para que el formulario quede más cerca del primer pliegue. */}
              <p className="mt-3 hidden max-w-md text-sm leading-relaxed text-noche-200 sm:block sm:text-base">
                {APP.nombreLargo}
              </p>
            </div>
            <p className="text-gradient-sol font-display text-lg font-semibold sm:text-xl">{APP.lema}</p>

            {/* Beneficios: chips en móvil, lista en pantallas medianas y grandes */}
            <ul className="flex flex-wrap gap-2 sm:hidden" aria-label="Beneficios de la plataforma">
              {BENEFICIOS.map((b) => (
                <li
                  key={b.titulo}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-xs font-medium text-noche-100 ring-1 ring-white/10"
                >
                  <b.icon className="size-3.5 text-celeste-300" aria-hidden />
                  {b.corto}
                </li>
              ))}
            </ul>
            <ul className="mt-4 hidden flex-col gap-3 sm:flex" aria-label="Beneficios de la plataforma">
              {BENEFICIOS.map((b, i) => (
                <li
                  key={b.titulo}
                  className="flex items-start gap-3.5 rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10 backdrop-blur-[2px] transition-colors hover:bg-white/[0.07] animate-fade-up"
                  style={{ animationDelay: `${120 + i * 90}ms` }}
                >
                  <span
                    aria-hidden
                    className={
                      i === 0
                        ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
                        : i === 1
                          ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-celeste-400/15 text-celeste-200 ring-1 ring-celeste-300/30"
                          : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-sol-400 text-noche-950"
                    }
                  >
                    <b.icon className="size-5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[15px] font-semibold text-white">{b.titulo}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-noche-200">{b.texto}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="hidden text-xs leading-relaxed text-noche-300 lg:block">
            {APP.municipio} · {APP.secretaria}
          </p>
        </div>
      </aside>

      {/* Formulario */}
      <main id="contenido" className="relative isolate flex flex-1 flex-col bg-gradient-brand-soft">
        <div aria-hidden className="bg-dots mask-fade pointer-events-none absolute inset-0 -z-10 text-azul-600 opacity-60" />

        <nav aria-label="Accesos" className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-noche-600 transition-colors hover:bg-white/70 hover:text-azul-700"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver al portal
          </Link>
          <Link
            href="/verificar"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-noche-600 transition-colors hover:bg-white/70 hover:text-azul-700"
          >
            <QrCode className="size-4" aria-hidden />
            <span className="hidden sm:inline">Verificar certificado</span>
            <span className="sm:hidden">Verificar</span>
          </Link>
        </nav>

        <div className="flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:px-6 sm:py-10 lg:py-12">
          <div className="w-full max-w-[460px]">
            <div className="relative overflow-hidden rounded-panel border border-border bg-card p-6 shadow-elevated sm:p-8">
              <BrandStripe className="absolute inset-x-0 top-0" />
              {children}
            </div>

            <p className="mt-6 flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground">
              <LifeBuoy className="mt-0.5 size-3.5 shrink-0 text-azul-600" aria-hidden />
              <span>
                ¿Necesitás ayuda? Escribinos a{" "}
                <a href={`mailto:${APP.contacto.email}`} className="font-medium text-azul-700 underline-offset-2 hover:underline">
                  {APP.contacto.email}
                </a>{" "}
                · {APP.contacto.horario}
              </span>
            </p>
          </div>
        </div>
      </main>
      <Asistente ambito="portal" />
    </div>
  );
}
