import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleCheck,
  MessageSquareWarning,
  QrCode,
  Scale,
  Search,
  ShieldCheck,
} from "lucide-react";
import { BrandGlow, PetalDecor } from "@/components/brand/petal-decor";
import { PortalFooter } from "@/components/layout/portal-footer";
import { PortalHeader } from "@/components/layout/portal-header";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP } from "@/lib/config";

export const metadata: Metadata = { title: "Demo · Portal público" };

const ACCESOS = [
  {
    titulo: "Verificar certificado",
    texto: "Escaneá el QR o ingresá el código para confirmar que el servicio está registrado.",
    href: "/verificar",
    icon: QrCode,
    tono: "bg-gradient-brand text-white shadow-brand",
  },
  {
    titulo: "Empresas habilitadas",
    texto: "Consultá el padrón oficial de prestadores de control de plagas urbanas.",
    href: "/empresas",
    icon: Building2,
    tono: "bg-celeste-100 text-celeste-700 ring-1 ring-celeste-200",
  },
  {
    titulo: "Normativa",
    texto: "Ordenanzas, resoluciones y requisitos para prestadores y establecimientos.",
    href: "/normativa",
    icon: Scale,
    tono: "bg-sol-100 text-sol-800 ring-1 ring-sol-300",
  },
  {
    titulo: "Denuncias",
    texto: "Informá servicios sin certificado o prácticas que pongan en riesgo la salud.",
    href: "/denuncias",
    icon: MessageSquareWarning,
    tono: "bg-red-50 text-red-600 ring-1 ring-red-200",
  },
];

/** Patrón decorativo con aspecto de QR (no es un código real ni se puede escanear). */
const QR_N = 21;
const QR_CELDAS = Array.from({ length: QR_N * QR_N }, (_, i) => {
  const x = i % QR_N;
  const y = Math.floor(i / QR_N);
  const enBuscador = (x < 8 && y < 8) || (x >= QR_N - 8 && y < 8) || (x < 8 && y >= QR_N - 8);
  const h = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0;
  return !enBuscador && h % 100 < 46 ? { x, y } : null;
}).filter((c): c is { x: number; y: number } => c !== null);

function QrDecorativo() {
  const buscadores = [
    [0, 0],
    [QR_N - 7, 0],
    [0, QR_N - 7],
  ];
  return (
    <svg aria-hidden viewBox={`-1 -1 ${QR_N + 2} ${QR_N + 2}`} className="size-28 shrink-0 rounded-xl bg-white ring-1 ring-border" shapeRendering="crispEdges">
      {QR_CELDAS.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} className="fill-noche-900" />
      ))}
      {buscadores.map(([x, y]) => (
        <g key={`${x}-${y}`} className="fill-noche-900">
          <path d={`M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z`} fillRule="evenodd" />
          <rect x={x + 2} y={y + 2} width={3} height={3} />
        </g>
      ))}
    </svg>
  );
}

export default function PortalDemoPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PortalHeader />

      {/* Hero (se extiende detrás del encabezado transparente) */}
      <section className="relative -mt-[73px] overflow-hidden bg-gradient-brand-soft pt-[73px]">
        <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-azul-600 opacity-70" />
        <BrandGlow tone="light" />
        <PetalDecor variant="hero" tone="light" animated className="hidden opacity-70 lg:block" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8 lg:pt-20 lg:pb-28">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-azul-800 shadow-xs ring-1 ring-azul-100">
              <span className="size-1.5 rounded-full bg-sol-400 ring-2 ring-sol-100" aria-hidden />
              {APP.direccion} · {APP.municipio}
            </p>
            <h1 className="mt-5 font-display text-4xl leading-[1.08] font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
              Control de plagas urbanas, <span className="text-gradient-brand">transparente y verificable.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {APP.nombre} registra cada servicio de fumigación de la ciudad. Consultá empresas habilitadas y verificá
              certificados con QR en segundos.
            </p>

            <form action="/verificar" method="get" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-elevated ring-1 ring-border sm:flex-row">
              <label htmlFor="codigo" className="sr-only">
                Código del certificado
              </label>
              <Input
                id="codigo"
                name="codigo"
                placeholder="Ingresá el código del certificado"
                leading={<Search aria-hidden />}
                className="h-12 border-transparent shadow-none hover:border-transparent focus-visible:border-ring"
              />
              <Button type="submit" size="lg" className="shrink-0">
                <QrCode aria-hidden />
                Verificar
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <Link href="/empresas" className="inline-flex items-center gap-1.5 font-medium text-azul-700 hover:underline">
                Consultá empresas habilitadas <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/ingresar" className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline">
                Ingresá como prestador <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>

          {/* Tarjeta de certificado de ejemplo */}
          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
            <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-linear-to-br from-azul-200/60 via-celeste-100/40 to-sol-100/60 blur-2xl" />
            <div className="relative animate-fade-up rounded-panel border border-white/70 bg-white/90 p-6 shadow-elevated backdrop-blur [animation-delay:150ms]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Certificado de servicio</p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-tight">N.º 004512</p>
                </div>
                <StatusBadge label="Vigente" tone="verde" size="lg" />
              </div>
              <div className="mt-6 flex items-center gap-5">
                <QrDecorativo />
                <dl className="grid flex-1 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Empresa</dt>
                    <dd className="font-medium">Plagas Cero S.A.</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Servicio</dt>
                    <dd className="font-medium">Desinsectación</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Vence</dt>
                    <dd className="nums-tabular font-medium">26/01/2027</dd>
                  </div>
                </dl>
              </div>
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-sm font-medium text-success">
                <CircleCheck className="size-4 shrink-0" aria-hidden />
                Servicio registrado y firmado por el director técnico
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 flex animate-fade-up items-center gap-2 rounded-2xl bg-noche-900 px-4 py-3 text-sm font-medium text-white shadow-elevated [animation-delay:350ms] sm:-left-8">
              <ShieldCheck className="size-5 text-sol-400" aria-hidden />
              Verificado por la Municipalidad
            </div>
          </div>
        </div>
      </section>

      {/* Cifras */}
      <section className="relative z-10 mx-auto -mt-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border shadow-card md:grid-cols-4">
          {[
            { v: 86, l: "Empresas habilitadas" },
            { v: 15420, l: "Servicios registrados en 2026" },
            { v: 912, l: "Certificados vigentes" },
            { v: 340, l: "Inspecciones realizadas" },
          ].map((c) => (
            <div key={c.l} className="bg-card px-5 py-6 sm:px-6">
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                <AnimatedNumber value={c.v} />
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{c.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Accesos */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-display text-xs font-semibold tracking-[0.14em] text-azul-600 uppercase">Servicios</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">¿Qué podés hacer en {APP.nombre}?</h2>
          <p className="mt-3 text-muted-foreground">Información pública para vecinos, establecimientos y empresas prestadoras.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ACCESOS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group relative flex flex-col gap-4 overflow-hidden rounded-card border border-border bg-card p-6 shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-azul-200 hover:shadow-elevated"
              >
                <span aria-hidden className={`flex size-12 items-center justify-center rounded-2xl ${a.tono}`}>
                  <Icon className="size-6" strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold">{a.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a.texto}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-azul-700">
                  Ir <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="relative mt-16 overflow-hidden rounded-panel bg-gradient-brand px-6 py-10 text-white shadow-brand sm:px-10">
          <PetalDecor variant="corner" tone="dark" className="h-64" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">¿Sos una empresa prestadora?</h2>
              <p className="mt-2 text-white/90">
                Cargá tus declaraciones, pagá el timbrado y descargá certificados con QR desde un solo lugar.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="sol" size="lg">
                <Link href="/ingresar">
                  <BadgeCheck aria-hidden />
                  Ingresar al sistema
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:border-white/60 hover:bg-white/15 hover:text-white">
                <Link href="/normativa">Ver requisitos</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-auto">
        <PortalFooter />
      </div>
    </div>
  );
}
