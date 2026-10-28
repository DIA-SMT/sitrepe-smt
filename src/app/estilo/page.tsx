import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileSearch,
  FlaskConical,
  LayoutDashboard,
  Palette,
  Plus,
  ShieldCheck,
  Sparkles,
  Stamp,
  Type,
} from "lucide-react";
import { Isotipo, Logo } from "@/components/brand/logo";
import { BrandGlow, BrandStripe, PetalDecor } from "@/components/brand/petal-decor";
import { CHART_COLORS } from "@/components/shared/chart-colors";
import { AreaChartCard, BarChartCard, DonutChart } from "@/components/shared/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { KeyValue } from "@/components/shared/key-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge, BADGE_TONES } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";
import { FormDemo, OverlaysDemo, TabsDemo, ToastDemo } from "./demos";

export const metadata: Metadata = {
  title: "Guía de estilo",
  description: "Sistema de diseño de SITREPE: colores, tipografía, componentes y layouts.",
};

/* --- Datos de muestra ------------------------------------------------------- */

const ESCALAS: { nombre: string; base: string; pasos: [string, string][] }[] = [
  {
    nombre: "azul",
    base: "600 = #0066FF (logo)",
    pasos: [
      ["50", "#f3f7fe"], ["100", "#e3edfe"], ["200", "#cadefe"], ["300", "#9ec2ff"], ["400", "#6aa0fe"], ["500", "#3980fe"],
      ["600", "#0066ff"], ["700", "#034ed4"], ["800", "#0e3da5"], ["900", "#11307c"], ["950", "#0c2055"],
    ],
  },
  {
    nombre: "celeste",
    base: "400 = #2EB1FF (logo)",
    pasos: [
      ["50", "#f1f9fe"], ["100", "#e0f1fe"], ["200", "#c0e3fe"], ["300", "#90cfff"], ["400", "#2eb1ff"], ["500", "#0499e8"],
      ["600", "#017ec8"], ["700", "#0766a4"], ["800", "#125080"], ["900", "#144065"], ["950", "#0e2a45"],
    ],
  },
  {
    nombre: "sol",
    base: "400 = #F4DC00 (logo) · nunca como texto sobre blanco",
    pasos: [
      ["50", "#fefbe4"], ["100", "#fff7c1"], ["200", "#fef08e"], ["300", "#fae657"], ["400", "#f4dc00"],
      ["500", "#e8c014"], ["600", "#cb9308"], ["700", "#a26f02"], ["800", "#7f5305"], ["900", "#674106"],
    ],
  },
  {
    nombre: "noche",
    base: "800 = #0A1A3F · 950 = #020626",
    pasos: [
      ["50", "#f2f5fb"], ["100", "#e4eaf4"], ["200", "#ccd5e5"], ["300", "#a4b1cb"], ["400", "#7586a8"], ["500", "#506389"],
      ["600", "#34476e"], ["700", "#203156"], ["800", "#0a1a3f"], ["900", "#051130"], ["950", "#020626"],
    ],
  },
];

const SEMANTICOS: { token: string; clase: string; hex: string; texto?: string }[] = [
  { token: "primary", clase: "bg-primary", hex: "#0066ff", texto: "text-white" },
  { token: "background", clase: "bg-background", hex: "#f6f8fc" },
  { token: "card", clase: "bg-card", hex: "#ffffff" },
  { token: "muted", clase: "bg-muted", hex: "#eef2f9" },
  { token: "muted-foreground", clase: "bg-muted-foreground", hex: "#5a6782", texto: "text-white" },
  { token: "foreground", clase: "bg-foreground", hex: "#16203a", texto: "text-white" },
  { token: "border", clase: "bg-border", hex: "#e3e8f1" },
  { token: "input", clase: "bg-input", hex: "#8793aa", texto: "text-white" },
  { token: "success", clase: "bg-success", hex: "#0e7c55", texto: "text-white" },
  { token: "warning", clase: "bg-warning", hex: "#b25e00", texto: "text-white" },
  { token: "danger", clase: "bg-danger", hex: "#d0303f", texto: "text-white" },
  { token: "info", clase: "bg-info", hex: "#0a6fb0", texto: "text-white" },
  { token: "accent (sol)", clase: "bg-accent", hex: "#f4dc00" },
];

const NOMBRES_CHART = ["Azul", "Naranja", "Celeste", "Ámbar", "Magenta", "Verde", "Violeta", "Rojo"];

const EMPRESAS = [
  { razon: "Plagas Cero S.A.", cuit: "30-71234567-8", tecnico: "Ing. Agr. Laura Medina", decl: 128, estado: { label: "Habilitada", tone: "verde" as const } },
  { razon: "Fumigaciones del Norte S.R.L.", cuit: "30-70987654-1", tecnico: "Lic. Martín Ríos", decl: 94, estado: { label: "En revisión", tone: "celeste" as const } },
  { razon: "Tucumán Sanidad Ambiental", cuit: "20-28765432-9", tecnico: "Ing. Qco. Sofía Paz", decl: 61, estado: { label: "Pendiente de firma", tone: "ambar" as const } },
  { razon: "BioControl NOA", cuit: "30-71555222-4", tecnico: "Ing. Agr. Diego Lazarte", decl: 37, estado: { label: "Observada", tone: "violeta" as const } },
  { razon: "Desinsectaciones Yerba Buena", cuit: "27-31222333-5", tecnico: "Lic. Ana Juárez", decl: 12, estado: { label: "Suspendida", tone: "rojo" as const } },
];

const DECLARACIONES_MES = [
  { label: "May", value: 142 },
  { label: "Jun", value: 168 },
  { label: "Jul", value: 155 },
  { label: "Ago", value: 189 },
  { label: "Sep", value: 214 },
  { label: "Oct", value: 236 },
];

const CERTIFICADOS = [
  { label: "May", emitidos: 120, anulados: 4 },
  { label: "Jun", emitidos: 148, anulados: 6 },
  { label: "Jul", emitidos: 139, anulados: 3 },
  { label: "Ago", emitidos: 171, anulados: 7 },
  { label: "Sep", emitidos: 196, anulados: 5 },
  { label: "Oct", emitidos: 221, anulados: 4 },
];

const SERVICIOS = [
  { label: "Desinsectación", value: 412 },
  { label: "Desratización", value: 268 },
  { label: "Desinfección", value: 155 },
  { label: "Limpieza de tanques", value: 98 },
  { label: "Control de palomas", value: 21 },
];

const INSPECCIONES_ZONA = [
  { label: "Centro", value: 48 },
  { label: "Norte", value: 31 },
  { label: "Sur", value: 27 },
  { label: "Oeste", value: 22 },
  { label: "Este", value: 15 },
];

const SECCIONES = [
  { id: "marca", label: "Marca" },
  { id: "colores", label: "Colores" },
  { id: "tipografia", label: "Tipografía" },
  { id: "botones", label: "Botones" },
  { id: "badges", label: "Badges" },
  { id: "formularios", label: "Formularios" },
  { id: "feedback", label: "Feedback" },
  { id: "overlays", label: "Overlays" },
  { id: "datos", label: "Datos" },
  { id: "graficos", label: "Gráficos" },
  { id: "layouts", label: "Layouts" },
];

/* --- Helpers de la página -------------------------------------------------- */

function Seccion({
  id,
  numero,
  titulo,
  descripcion,
  children,
}: {
  id: string;
  numero: string;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-border py-14 first:border-t-0">
      <div className="mb-8 flex flex-col gap-2">
        <p className="font-display text-xs font-semibold tracking-[0.14em] text-azul-600 uppercase">{numero}</p>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{titulo}</h2>
        {descripcion ? <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{descripcion}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Muestra({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</p>
      {children}
    </div>
  );
}

/* --- Página ------------------------------------------------------------------ */

export default function EstiloPage() {
  return (
    <div className="min-h-dvh">
      {/* Barra superior de la guía */}
      <header className="glass sticky top-0 z-40 border-b border-border/70">
        <BrandStripe className="h-[3px]" />
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/estilo" className="flex shrink-0 items-center gap-3 rounded-lg">
            <Isotipo size={30} priority />
            <span className="flex flex-col leading-none">
              <span className="font-display text-base font-bold tracking-tight">{APP.nombre}</span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">Guía de estilo</span>
            </span>
          </Link>
          <nav aria-label="Secciones de la guía" className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex">
            {SECCIONES.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap text-noche-600 transition-colors hover:bg-muted hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/estilo/portal-demo">Portal</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/estilo/shell-demo">
                App shell
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
        <nav aria-label="Secciones de la guía (móvil)" className="flex gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:hidden">
          {SECCIONES.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium whitespace-nowrap text-noche-600 transition-colors hover:bg-azul-50 hover:text-azul-700"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden bg-noche text-white">
        <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-40" />
        <BrandGlow />
        <PetalDecor variant="hero" tone="dark" animated className="hidden md:block" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-2xl animate-fade-up">
            <Logo variant="negativo" size="md" priority />
            <p className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-xs font-medium text-celeste-200 ring-1 ring-white/15">
              <Sparkles className="size-3.5 text-sol-400" aria-hidden />
              Sistema de diseño · v1
            </p>
            <h1 className="mt-4 font-display text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Diseño institucional, <span className="text-gradient-light">con energía de producto.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-noche-200 sm:text-lg">
              Tokens, componentes y layouts de {APP.nombre} para la {APP.direccion}. Colores del isotipo, Poppins + Inter,
              accesibilidad AA y microinteracciones sutiles.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="sol">
                <a href="#colores">
                  <Palette aria-hidden />
                  Explorar tokens
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/[0.06] text-white hover:border-white/40 hover:bg-white/10 hover:text-white">
                <Link href="/estilo/shell-demo">
                  <LayoutDashboard aria-hidden />
                  Ver app shell
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ---------------- Marca ---------------- */}
        <Seccion
          id="marca"
          numero="01 · Marca"
          titulo="Logo e isotipo oficiales"
          descripcion="Se usan siempre los archivos PNG oficiales (positivo sobre claro, negativo sobre oscuro). Los pétalos decorativos se inspiran en el isotipo pero nunca lo reemplazan."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="items-center justify-center overflow-hidden p-10">
              <Logo variant="positivo" size="xl" />
              <p className="mt-6 text-xs text-muted-foreground">Positivo · fondos claros</p>
            </Card>
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-card bg-noche p-10 shadow-card">
              <PetalDecor variant="corner" tone="dark" />
              <Logo variant="negativo" size="xl" className="relative" />
              <p className="relative mt-6 text-xs text-noche-300">Negativo · fondos noche</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="items-center justify-center gap-3 p-6">
              <Isotipo size={64} alt="Isotipo de la Municipalidad de San Miguel de Tucumán" />
              <p className="text-xs text-muted-foreground">Isotipo</p>
            </Card>
            <div className="relative h-40 overflow-hidden rounded-card border border-border bg-gradient-brand-soft shadow-card">
              <PetalDecor variant="corner" tone="light" />
              <p className="absolute bottom-3 left-4 text-xs font-medium text-muted-foreground">PetalDecor · light</p>
            </div>
            <div className="relative h-40 overflow-hidden rounded-card border border-border bg-card shadow-card">
              <PetalDecor variant="scatter" tone="light" />
              <p className="absolute bottom-3 left-4 text-xs font-medium text-muted-foreground">PetalDecor · scatter</p>
            </div>
            <div className="relative h-40 overflow-hidden rounded-card bg-gradient-brand shadow-brand">
              <PetalDecor variant="corner" tone="dark" />
              <p className="absolute bottom-3 left-4 text-xs font-medium text-white">bg-gradient-brand</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="relative flex h-28 items-end overflow-hidden rounded-card border border-border bg-card p-4 shadow-card">
              <div aria-hidden className="bg-grid mask-fade absolute inset-0 text-azul-600" />
              <code className="relative text-xs font-medium text-foreground">.bg-grid</code>
            </div>
            <div className="relative flex h-28 items-end overflow-hidden rounded-card border border-border bg-card p-4 shadow-card">
              <div aria-hidden className="bg-dots mask-fade absolute inset-0 text-azul-600" />
              <code className="relative text-xs font-medium text-foreground">.bg-dots</code>
            </div>
            <div className="ring-gradient-brand flex h-28 items-end rounded-card p-4 shadow-card">
              <code className="text-xs font-medium text-foreground">.ring-gradient-brand</code>
            </div>
          </div>
        </Seccion>

        {/* ---------------- Colores ---------------- */}
        <Seccion
          id="colores"
          numero="02 · Colores"
          titulo="Paletas y tokens"
          descripcion="Escalas derivadas en OKLCH de los colores del logo. Usá los tokens semánticos (bg-primary, text-muted-foreground, border-border…) en la UI y las escalas para acentos."
        >
          <div className="flex flex-col gap-8">
            {ESCALAS.map((escala) => (
              <div key={escala.nombre} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-display text-base font-semibold capitalize">{escala.nombre}</h3>
                  <code className="text-xs text-muted-foreground">--color-{escala.nombre}-*</code>
                  <span className="text-xs text-muted-foreground">{escala.base}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-11">
                  {escala.pasos.map(([paso, hex], i) => (
                    <div key={paso} className="flex flex-col gap-1.5">
                      <div
                        className="h-14 rounded-xl ring-1 ring-black/5 ring-inset"
                        style={{ backgroundColor: `var(--color-${escala.nombre}-${paso})` }}
                      />
                      <div className="flex flex-col px-0.5 leading-tight">
                        <span className={cn("text-xs font-semibold", i === 6 && escala.nombre === "azul" && "text-azul-700")}>{paso}</span>
                        <span className="font-mono text-[10px] text-muted-foreground uppercase">{hex}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <SectionCard title="Tokens semánticos" description="Utilidades: bg-*, text-*, border-*, ring-*.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SEMANTICOS.map((t) => (
                  <div key={t.token} className="flex items-center gap-3 rounded-xl border border-border p-2">
                    <span className={cn("size-10 shrink-0 rounded-lg ring-1 ring-black/5 ring-inset", t.clase)} />
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[13px] font-semibold">{t.token}</p>
                      <p className="font-mono text-[11px] text-muted-foreground uppercase">{t.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard
              title="Paleta de gráficos"
              description="Orden fijo, validado para daltonismo (ΔE ≥ 16 entre vecinos). Nunca ciclar: más de 8 series → “Otros”."
            >
              <ol className="grid grid-cols-2 gap-2">
                {CHART_COLORS.map((c, i) => (
                  <li key={c} className="flex items-center gap-2.5 rounded-lg border border-border p-2">
                    <span className="size-7 shrink-0 rounded-md" style={{ backgroundColor: c }} />
                    <span className="text-[13px] leading-tight">
                      <span className="font-semibold">
                        {i + 1}. {NOMBRES_CHART[i]}
                      </span>
                      <span className="block font-mono text-[11px] text-muted-foreground uppercase">{c}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </SectionCard>
          </div>
        </Seccion>

        {/* ---------------- Tipografía ---------------- */}
        <Seccion
          id="tipografia"
          numero="03 · Tipografía"
          titulo="Poppins para títulos, Inter para la interfaz"
          descripcion="Poppins (la fuente del sitio oficial) en títulos con font-display; Inter en textos, tablas y números (font-sans)."
        >
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card className="gap-6 p-6 sm:p-8">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Display · Poppins 700 · 48–60 px</span>
                <p className="text-gradient-brand font-display text-5xl leading-tight font-bold tracking-tight">{APP.lema}</p>
              </div>
              <Separator />
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">H1 · Poppins 600 · 28 px</span>
                  <p className="font-display text-[1.75rem] font-semibold tracking-tight">Declaraciones de servicio</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">H2 · Poppins 600 · 20 px</span>
                  <p className="font-display text-xl font-semibold">Certificados emitidos este mes</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">H3 · Poppins 600 · 16 px</span>
                  <p className="font-display text-base font-semibold">Datos del director técnico</p>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-3">
                <span className="text-xs text-muted-foreground">Cuerpo · Inter 400 · 15 px</span>
                <p className="max-w-2xl text-[15px] leading-relaxed">
                  Cargá la declaración dentro de las 48 horas de realizado el servicio. Consultá el estado de tus trámites y
                  descargá los certificados con QR desde el panel de tu empresa.
                </p>
                <p className="text-sm text-muted-foreground">Texto secundario · muted-foreground (contraste 5,7:1).</p>
              </div>
            </Card>
            <Card className="gap-5 p-6 sm:p-8">
              <div>
                <span className="text-xs text-muted-foreground">Cifras · Inter 600 (proporcionales)</span>
                <p className="text-5xl font-semibold tracking-tight">1.284</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Columnas · tabular-nums</span>
                <div className="nums-tabular mt-1 flex flex-col text-right text-sm">
                  <span>$ 1.250.000</span>
                  <span>$ 98.400</span>
                  <span>$ 11.111</span>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-2 text-sm">
                <span className="text-xs text-muted-foreground">Voseo en toda la interfaz</span>
                <p>
                  <strong>Ingresá</strong> · <strong>Cargá</strong> · <strong>Consultá</strong> · <strong>Descargá</strong>
                </p>
              </div>
              <div className="mt-auto flex items-center gap-2 rounded-xl bg-azul-50 p-3 text-xs text-azul-800">
                <Type className="size-4 shrink-0" aria-hidden />
                <span>
                  <code>font-display</code> → Poppins · <code>font-sans</code> → Inter
                </span>
              </div>
            </Card>
          </div>
        </Seccion>

        {/* ---------------- Botones ---------------- */}
        <Seccion id="botones" numero="04 · Botones" titulo="Botones" descripcion="Variantes, tamaños, íconos, carga y asChild (Link).">
          <Card className="gap-8 p-6 sm:p-8">
            <Muestra titulo="Variantes">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Primario</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="outline">Contorno</Button>
                <Button variant="ghost">Fantasma</Button>
                <Button variant="danger">Peligro</Button>
                <Button variant="sol">Destacado</Button>
                <Button variant="link">Enlace</Button>
              </div>
            </Muestra>
            <Muestra titulo="Tamaños">
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Chico</Button>
                <Button size="md">Mediano</Button>
                <Button size="lg">Grande</Button>
                <Button size="icon" aria-label="Agregar">
                  <Plus aria-hidden />
                </Button>
                <Button size="icon-sm" variant="outline" aria-label="Descargar">
                  <Download aria-hidden />
                </Button>
              </div>
            </Muestra>
            <Muestra titulo="Con ícono, carga, deshabilitado y como enlace">
              <div className="flex flex-wrap items-center gap-3">
                <Button>
                  <Plus aria-hidden />
                  Nueva declaración
                </Button>
                <Button variant="secondary">
                  <Stamp aria-hidden />
                  Timbrar
                </Button>
                <Button loading>Procesando</Button>
                <Button disabled variant="outline">
                  Deshabilitado
                </Button>
                <Button asChild variant="outline">
                  <Link href="/estilo/portal-demo">
                    Ir al portal
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            </Muestra>
          </Card>
        </Seccion>

        {/* ---------------- Badges ---------------- */}
        <Seccion id="badges" numero="05 · Badges" titulo="Badges y estados" descripcion="Siempre texto + punto: el estado nunca depende solo del color.">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="gap-6 p-6">
              <Muestra titulo="Suave (por defecto)">
                <div className="flex flex-wrap gap-2">
                  {BADGE_TONES.map((t) => (
                    <Badge key={t} tone={t} dot>
                      {t}
                    </Badge>
                  ))}
                </div>
              </Muestra>
              <Muestra titulo="Sólido">
                <div className="flex flex-wrap gap-2">
                  {BADGE_TONES.map((t) => (
                    <Badge key={t} tone={t} variant="solid">
                      {t}
                    </Badge>
                  ))}
                </div>
              </Muestra>
              <Muestra titulo="Contorno y tamaños">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Contorno</Badge>
                  <Badge tone="azul" size="sm">
                    Chico
                  </Badge>
                  <Badge tone="azul">Mediano</Badge>
                  <Badge tone="azul" size="lg">
                    Grande
                  </Badge>
                </div>
              </Muestra>
            </Card>
            <Card className="gap-6 p-6">
              <Muestra titulo="StatusBadge · estados de dominio">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label="Vigente" tone="verde" />
                  <StatusBadge label="Vencido" tone="rojo" />
                  <StatusBadge label="Pendiente de firma" tone="ambar" />
                  <StatusBadge label="En revisión" tone="celeste" />
                  <StatusBadge label="Timbrado" tone="azul" />
                  <StatusBadge label="Observada" tone="violeta" />
                  <StatusBadge label="Borrador" tone="neutral" />
                  <StatusBadge label="Inspección en curso" tone="azul" pulse />
                </div>
              </Muestra>
              <Muestra titulo="Avatares">
                <div className="flex items-center gap-3">
                  <Avatar nombre="Laura Medina" size="sm" />
                  <Avatar nombre="Martín Ríos" />
                  <Avatar nombre="Sofía de la Paz" size="lg" online />
                  <div className="flex -space-x-2">
                    <Avatar nombre="Ana Juárez" size="sm" />
                    <Avatar nombre="Diego Lazarte" size="sm" />
                    <Avatar nombre="Carla Núñez" size="sm" />
                  </div>
                </div>
              </Muestra>
            </Card>
          </div>
        </Seccion>

        {/* ---------------- Formularios ---------------- */}
        <Seccion
          id="formularios"
          numero="06 · Formularios"
          titulo="Campos y formularios"
          descripcion="Controles nativos estilizados (funcionan sin JS). Field vincula label, ayuda y error con aria-describedby. Probá el envío: SubmitButton muestra el estado pendiente."
        >
          <SectionCard title="Legajo de la empresa" description="Ejemplo con Field, Input, Select, Textarea, Checkbox y SubmitButton." icon={Building2}>
            <FormDemo />
          </SectionCard>
        </Seccion>

        {/* ---------------- Feedback ---------------- */}
        <Seccion id="feedback" numero="07 · Feedback" titulo="Avisos, progreso y carga">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <Alert tone="info" title="Nueva normativa vigente">
                Desde el 1/11 la declaración debe incluir el lote de cada producto aplicado.
              </Alert>
              <Alert tone="success" title="Pago acreditado">
                El timbrado N.º 88231 fue conciliado correctamente.
              </Alert>
              <Alert
                tone="warning"
                title="Tu certificado vence en 5 días"
                action={
                  <Button size="sm" variant="outline">
                    Renovar
                  </Button>
                }
              >
                Renovalo para seguir operando sin interrupciones.
              </Alert>
              <Alert tone="danger" title="Declaración rechazada">
                Falta la firma del director técnico.
              </Alert>
            </div>
            <div className="flex flex-col gap-6">
              <Card className="gap-5 p-6">
                <Progress label="Legajo completo" value={80} showValue />
                <Progress label="Cupo de timbrado" value={45} tone="sol" showValue />
                <Progress label="Inspecciones del mes" value={92} tone="verde" showValue size="sm" />
                <Progress label="Observaciones abiertas" value={30} tone="rojo" showValue size="sm" />
              </Card>
              <Card className="gap-4 p-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <SkeletonText lines={3} />
              </Card>
              <Card className="gap-3 p-6">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Toasts (sonner)</p>
                <ToastDemo />
              </Card>
            </div>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <EmptyState
              icon={FileSearch}
              title="Todavía no hay declaraciones"
              description="Cuando cargues tu primera declaración de servicio vas a verla acá."
              action={
                <Button>
                  <Plus aria-hidden />
                  Cargar declaración
                </Button>
              }
            />
            <EmptyState
              compact
              icon={ShieldCheck}
              title="Sin inspecciones programadas"
              description="Consultá la hoja de ruta para asignar nuevas visitas."
              action={
                <Button variant="outline" size="sm">
                  Ver hoja de ruta
                </Button>
              }
            />
          </div>
        </Seccion>

        {/* ---------------- Overlays ---------------- */}
        <Seccion id="overlays" numero="08 · Overlays" titulo="Diálogos, menús, tooltips y pestañas">
          <Card className="gap-8 p-6 sm:p-8">
            <OverlaysDemo />
            <Separator />
            <TabsDemo />
          </Card>
        </Seccion>

        {/* ---------------- Datos ---------------- */}
        <Seccion
          id="datos"
          numero="09 · Datos"
          titulo="Encabezados, indicadores y tablas"
          descripcion="Así se ve una pantalla típica de gestión."
        >
          <div className="rounded-panel border border-border bg-background p-4 sm:p-6">
            <PageHeader
              title="Empresas prestadoras"
              description="Consultá el estado de habilitación, técnicos responsables y actividad de cada empresa."
              icon={Building2}
              breadcrumb={[{ label: "Gestión", href: "/estilo/shell-demo" }, { label: "Prestadores" }, { label: "Empresas" }]}
              actions={
                <>
                  <Button variant="outline">
                    <Download aria-hidden />
                    Exportar
                  </Button>
                  <Button>
                    <Plus aria-hidden />
                    Alta de empresa
                  </Button>
                </>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Empresas habilitadas" value={86} icon={Building2} delta="+4" trend="up" hint="vs. sep." href="/estilo#datos" />
              <StatCard label="Declaraciones del mes" value={1284} icon={ClipboardList} tone="celeste" delta="+12,4 %" trend="up" hint="vs. sep." />
              <StatCard label="Pendientes de control" value={37} icon={ClipboardCheck} tone="ambar" delta="+9" trend="up" upIsGood={false} hint="vs. sep." />
              <StatCard label="Recaudación timbrado" value={4250000} format="currency" icon={Stamp} tone="verde" delta="−3,1 %" trend="down" hint="vs. sep." />
            </div>

            <SectionCard
              className="mt-6"
              title="Listado de empresas"
              description="5 de 86 resultados"
              icon={Building2}
              flush
              actions={
                <Button variant="ghost" size="sm">
                  Ver todas
                  <ArrowRight aria-hidden />
                </Button>
              }
              footer={<span className="text-muted-foreground">Mostrando 1–5 de 86</span>}
            >
              <Table framed={false}>
                <THead>
                  <TR>
                    <TH>Empresa</TH>
                    <TH>CUIT</TH>
                    <TH>Director técnico</TH>
                    <TH numeric>Declaraciones</TH>
                    <TH>Estado</TH>
                    <TH>
                      <span className="sr-only">Acciones</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {EMPRESAS.map((e) => (
                    <TR key={e.cuit}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar nombre={e.razon} size="sm" />
                          <span className="font-medium whitespace-nowrap">{e.razon}</span>
                        </div>
                      </TD>
                      <TD className="nums-tabular whitespace-nowrap text-muted-foreground">{e.cuit}</TD>
                      <TD className="whitespace-nowrap">{e.tecnico}</TD>
                      <TD numeric>{e.decl}</TD>
                      <TD>
                        <StatusBadge label={e.estado.label} tone={e.estado.tone} />
                      </TD>
                      <TD align="right">
                        <Button variant="ghost" size="sm">
                          Ver legajo
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </SectionCard>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <SectionCard title="Certificado N.º 004512" description="Emitido con QR de verificación" icon={BadgeCheck} actions={<StatusBadge label="Vigente" tone="verde" />}>
                <KeyValue
                  items={[
                    { label: "Empresa", value: "Plagas Cero S.A." },
                    { label: "CUIT", value: "30-71234567-8" },
                    { label: "Servicio", value: "Desinsectación y desratización" },
                    { label: "Establecimiento", value: "Escuela N.º 123 · Av. Mate de Luna 2100" },
                    { label: "Producto", value: "Cipermetrina 25 % (lote 7781)" },
                    { label: "Vencimiento", value: "26/01/2027" },
                    { label: "Observaciones", value: null, full: true },
                  ]}
                />
              </SectionCard>
              <SectionCard title="Historial del trámite" description="Movimientos registrados" icon={FlaskConical}>
                <Timeline
                  items={[
                    { date: "2026-10-26T13:20:00Z", title: "Certificado emitido", description: "Se generó el QR de verificación.", tone: "verde", icon: BadgeCheck },
                    { date: "2026-10-25T18:05:00Z", title: "Timbrado acreditado", description: "Pago conciliado con el banco.", tone: "azul", icon: Stamp },
                    { date: "2026-10-24T15:40:00Z", title: "Firma del director técnico", tone: "celeste" },
                    { date: "2026-10-23", title: "Declaración observada", description: "Faltaba el lote del producto.", tone: "ambar" },
                    { date: "2026-10-22", title: "Declaración cargada", tone: "neutral" },
                  ]}
                />
              </SectionCard>
            </div>
          </div>
        </Seccion>

        {/* ---------------- Gráficos ---------------- */}
        <Seccion
          id="graficos"
          numero="10 · Gráficos"
          titulo="Gráficos con la paleta de marca"
          descripcion="Recharts con marcas finas, grilla sutil, tooltip con el valor primero y vista de tabla accesible (botón “Ver tabla”)."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <BarChartCard title="Declaraciones por mes" description="Últimos 6 meses" data={DECLARACIONES_MES} />
            <AreaChartCard
              title="Certificados"
              description="Emitidos vs. anulados por mes"
              data={CERTIFICADOS}
              series={[
                { key: "emitidos", label: "Emitidos" },
                { key: "anulados", label: "Anulados" },
              ]}
            />
            <DonutChart title="Servicios declarados" description="Por tipo, octubre 2026" data={SERVICIOS} centerLabel="servicios" />
            <BarChartCard title="Inspecciones por zona" description="Octubre 2026" data={INSPECCIONES_ZONA} orientation="horizontal" />
          </div>
        </Seccion>

        {/* ---------------- Layouts ---------------- */}
        <Seccion id="layouts" numero="11 · Layouts" titulo="Estructuras de página" descripcion="Dos áreas autenticadas (gestión y prestadores) y el portal público.">
          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/estilo/shell-demo"
              className="group relative flex min-h-80 flex-col justify-end overflow-hidden rounded-panel bg-noche p-6 text-white shadow-elevated transition-transform hover:-translate-y-1"
            >
              <PetalDecor variant="corner" tone="dark" className="h-56" />
              <div aria-hidden className="absolute top-6 right-6 left-6 flex gap-3 opacity-90">
                <div className="h-28 w-16 rounded-xl bg-white/10 ring-1 ring-white/15" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-5 rounded-md bg-white/15" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-10 rounded-md bg-white/10" />
                    <div className="h-10 rounded-md bg-white/10" />
                    <div className="h-10 rounded-md bg-sol-400/70" />
                  </div>
                  <div className="h-9 rounded-md bg-white/10" />
                </div>
              </div>
              <div className="relative">
                <p className="font-display text-xl font-semibold">App shell · Gestión</p>
                <p className="mt-1 text-sm text-noche-200">Barra lateral noche, campana de alertas y menú de usuario.</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-celeste-300">
                  Abrir demo <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
            </Link>
            <Link
              href="/estilo/portal-demo"
              className="group relative flex min-h-80 flex-col justify-end overflow-hidden rounded-panel border border-border bg-gradient-brand-soft p-6 shadow-card transition-transform hover:-translate-y-1"
            >
              <PetalDecor variant="corner" tone="light" className="h-56" />
              <div aria-hidden className="absolute top-6 right-6 left-6 flex flex-col gap-2">
                <div className="h-6 rounded-md bg-white shadow-xs ring-1 ring-border" />
                <div className="mt-2 h-4 w-2/3 rounded bg-azul-200" />
                <div className="h-4 w-1/2 rounded bg-azul-100" />
                <div className="mt-2 flex gap-2">
                  <div className="h-7 w-24 rounded-md bg-azul-600" />
                  <div className="h-7 w-20 rounded-md bg-white ring-1 ring-border" />
                </div>
              </div>
              <div className="relative">
                <p className="font-display text-xl font-semibold text-foreground">Portal público</p>
                <p className="mt-1 text-sm text-muted-foreground">Encabezado vidrio, hero de marca y pie institucional.</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-azul-700">
                  Abrir demo <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card interactive>
              <CardHeader>
                <CardTitle>Card</CardTitle>
                <CardDescription>Con encabezado, contenido y pie.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Usá interactive para tarjetas clickeables.</CardContent>
              <CardFooter>
                <Button size="sm" variant="secondary">
                  Acción
                </Button>
              </CardFooter>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Imprimible: los elementos con</p>
              <code className="mt-1 text-sm font-semibold">.no-print</code>
              <p className="mt-1 text-sm text-muted-foreground">se ocultan al imprimir; el fondo pasa a blanco.</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Foco visible en todos los controles:</p>
              <p className="mt-1 text-sm">navegá con <kbd className="rounded border border-border-strong bg-subtle px-1.5 py-0.5 font-mono text-xs">Tab</kbd> para verlo.</p>
            </Card>
          </div>
        </Seccion>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            {APP.nombre} · {APP.direccion} · <span className="font-medium text-azul-700">{APP.lema}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
