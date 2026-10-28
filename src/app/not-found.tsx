import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, House, LogIn, MessageSquareWarning, QrCode, Scale } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BrandGlow, BrandStripe, PetalDecor } from "@/components/brand/petal-decor";
import { Button } from "@/components/ui/button";
import { APP } from "@/lib/config";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

const ENLACES: { href: string; label: string; texto: string; icon: LucideIcon }[] = [
  { href: "/verificar", label: "Verificar un certificado", texto: "Con el código QR o el número.", icon: QrCode },
  { href: "/empresas", label: "Empresas habilitadas", texto: "Padrón oficial de prestadores.", icon: Building2 },
  { href: "/normativa", label: "Normativa", texto: "Ordenanzas y requisitos.", icon: Scale },
  { href: "/denuncias", label: "Hacer una denuncia", texto: "Servicios sin habilitación.", icon: MessageSquareWarning },
];

/** 404 global (rutas inexistentes y `notFound()` sin un not-found más cercano). */
export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-gradient-brand-soft">
      <BrandStripe className="h-[3px]" />
      <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 -z-10 text-azul-600 opacity-60" />
      <BrandGlow tone="light" className="-z-10" />
      <PetalDecor variant="hero" tone="light" animated className="-z-10 hidden opacity-70 lg:block" />

      <header className="mx-auto flex w-full max-w-6xl items-center px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="rounded-md" aria-label={`${APP.nombre} · Inicio`}>
          <Logo height={38} priority />
        </Link>
      </header>

      <main id="contenido" className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 pb-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-azul-800 shadow-xs ring-1 ring-azul-100">
            <span className="size-1.5 rounded-full bg-sol-400 ring-2 ring-sol-100" aria-hidden />
            Error 404
          </p>
          <p aria-hidden className="text-gradient-brand mt-4 font-display text-[6rem] leading-none font-bold tracking-tighter sm:text-[8rem]">
            404
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight font-bold tracking-tight text-foreground sm:text-4xl">
            No encontramos esta página
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Puede que el enlace esté mal escrito o que la página ya no exista. Te dejamos algunos accesos útiles para seguir.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/">
                <House aria-hidden />
                Ir al inicio
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/ingresar">
                <LogIn aria-hidden />
                Ir a mi cuenta
              </Link>
            </Button>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {ENLACES.map((e) => (
              <li key={e.href}>
                <Link
                  href={e.href}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card/90 p-3.5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-azul-200 hover:shadow-card"
                >
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100 transition-colors group-hover:bg-azul-600 group-hover:text-white"
                  >
                    <e.icon className="size-5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{e.label}</span>
                    <span className="block text-[13px] text-muted-foreground">{e.texto}</span>
                  </span>
                  <ArrowRight
                    className="size-4 text-noche-300 transition-all group-hover:translate-x-0.5 group-hover:text-azul-600"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="border-t border-border/70 bg-white/60 px-4 py-5 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {APP.nombre} · {APP.direccion} · {APP.municipio}
          </p>
          <p className="font-display font-medium text-azul-700">{APP.lema}</p>
        </div>
      </footer>
    </div>
  );
}
