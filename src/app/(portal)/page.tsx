import { unstable_rethrow } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bug,
  Building2,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Droplets,
  FileSignature,
  FlaskConical,
  GraduationCap,
  HardHat,
  HeartPulse,
  LogIn,
  MapPin,
  MessageSquareWarning,
  Newspaper,
  QrCode,
  Rat,
  Receipt,
  ShieldCheck,
  Sparkles,
  Stamp,
  Store,
  Timer,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandGlow, PetalDecor } from "@/components/brand/petal-decor";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP } from "@/lib/config";
import { getCapacitacionesPortal, getEstadisticasPortal, getNoticias } from "@/lib/data/portal";
import { MODALIDAD_CAPACITACION } from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatHora, formatMes, hoyISO } from "@/lib/domain/formato";
import { calcularVencimiento } from "@/lib/domain/vencimiento";
import { cn } from "@/lib/utils";
import { BuscadorCertificado } from "./_components/buscador-certificado";
import { TituloSeccion } from "./_components/encabezado-portal";
import { FechaChip } from "./_components/fecha-chip";
import { QrDecorativo } from "./_components/qr-decorativo";
import { TarjetaNoticia } from "./_components/tarjeta-noticia";
import { EJEMPLO_SELLO } from "./_lib/codigo";

export const metadata: Metadata = {
  title: { absolute: `${APP.nombre} · Control de plagas urbanas · ${APP.municipio}` },
  description:
    "Verificá certificados de fumigación y limpieza de tanques con QR, consultá las empresas habilitadas y conocé la normativa de control de plagas urbanas de San Miguel de Tucumán.",
};

/* --- Contenido (tomado del informe de la Dirección de Salud Ambiental) ---------------------- */

const PASOS: { titulo: string; texto: string; chip: string; icono: LucideIcon }[] = [
  {
    titulo: "Declaración anticipada",
    texto:
      "La empresa declara en línea cada servicio entre 24 y 48 horas antes: domicilio, cliente, rubro del Anexo, superficie y productos.",
    chip: "24 a 48 h antes",
    icono: ClipboardList,
  },
  {
    titulo: "Firma del asesor técnico",
    texto:
      "El responsable técnico registrado en el padrón firma digitalmente cada certificado. Se terminan las firmas incorrectas.",
    chip: "Firma digital",
    icono: FileSignature,
  },
  {
    titulo: "Timbrado",
    texto:
      "Control de Empresas coteja la planilla, la empresa paga el arancel y el sistema sella digitalmente cada certificado.",
    chip: "Pago + sello digital",
    icono: Stamp,
  },
  {
    titulo: "Certificado con QR",
    texto:
      "El cliente recibe el certificado con QR y vencimiento calculado según el rubro. Cualquiera puede verificarlo en segundos.",
    chip: "Verificable siempre",
    icono: QrCode,
  },
];

const PUBLICOS: {
  titulo: string;
  bajada: string;
  icono: LucideIcon;
  acento: string;
  items: string[];
  cta: { label: string; href: string };
}[] = [
  {
    titulo: "Vecinos y comunidad",
    bajada: "Una ciudad con control de plagas al día.",
    icono: UsersRound,
    acento: "bg-gradient-brand text-white shadow-brand",
    items: [
      "Menos riesgo de enfermedades transmitidas por vectores, como el dengue o las asociadas a roedores.",
      "Agua segura: seguimiento de la limpieza de tanques y cisternas en lugares con afluencia de público.",
      "Uso responsable de productos químicos y trazabilidad de los envases vacíos.",
      "Información pública y un canal para denunciar servicios sin habilitación o mal realizados.",
    ],
    cta: { label: "Hacer una denuncia", href: "/denuncias" },
  },
  {
    titulo: "Establecimientos",
    bajada: "Contratá con tranquilidad y evitá multas.",
    icono: Store,
    acento: "bg-celeste-100 text-celeste-700 ring-1 ring-celeste-200",
    items: [
      "Contratación segura: verificá que la empresa esté habilitada y para qué actividades.",
      "Certificado verificable: ante una inspección, el QR acredita al instante que el servicio es válido y está vigente.",
      "Avisos de vencimiento para renovar a tiempo la fumigación y la limpieza de tanques.",
      "Constancia de los productos aplicados, su registro ANMAT o SENASA, el responsable técnico y el plazo de reingreso.",
    ],
    cta: { label: "Buscar una empresa", href: "/empresas" },
  },
  {
    titulo: "Empresas prestadoras",
    bajada: "Trámites en línea, reglas claras.",
    icono: Building2,
    acento: "bg-sol-100 text-sol-800 ring-1 ring-sol-300",
    items: [
      "Declaración de servicios, certificados, pago y renovación en línea, sin filas ni horarios.",
      "Menos rechazos: la validación al cargar evita certificados sin rubro, sin fecha o con firma incorrecta.",
      "Competencia leal: el listado público y el QR distinguen a quienes trabajan habilitados.",
      "Canal formal con el municipio: novedades normativas, avisos y capacitaciones en un mismo lugar.",
    ],
    cta: { label: "Inscribir mi empresa", href: "/registro" },
  },
];

const RECOMENDACIONES: { texto: string; detalle: string; icono: LucideIcon }[] = [
  {
    texto: "Verificá que la empresa figure en el listado oficial",
    detalle: "Solo las empresas habilitadas por la Dirección pueden emitir certificados válidos.",
    icono: Building2,
  },
  {
    texto: "Exigí el detalle de los productos",
    detalle: "Cada producto debe tener su número de registro ANMAT o SENASA.",
    icono: FlaskConical,
  },
  {
    texto: "Pedí la firma del responsable técnico",
    detalle: "El certificado lo firma el asesor técnico registrado, no el dueño de la empresa.",
    icono: FileSignature,
  },
  {
    texto: "Consultá el plazo de reingreso",
    detalle: "Es el tiempo que hay que esperar para volver a usar el ambiente tratado.",
    icono: Timer,
  },
  {
    texto: "Controlá la protección personal y los envases",
    detalle: "El personal debe usar equipo de protección y los envases tienen que estar rotulados.",
    icono: HardHat,
  },
  {
    texto: "Pedí factura a nombre del titular habilitado",
    detalle: "La factura tiene que coincidir con la empresa que figura en el registro.",
    icono: Receipt,
  },
];

const PREVENCION: { titulo: string; bajada: string; icono: LucideIcon; acento: string; items: string[] }[] = [
  {
    titulo: "Dengue",
    bajada: "El mosquito Aedes aegypti se cría en agua limpia acumulada.",
    icono: Bug,
    acento: "bg-sol-400 text-noche-950",
    items: [
      "Vaciá, cepillá y dalo vuelta: baldes, macetas, botellas y cubiertas.",
      "Cambiá el agua de bebederos y floreros cada tres días.",
      "Mantené limpios patios, techos y canaletas.",
      "Ante fiebre, consultá en el centro de salud y no te automediques.",
    ],
  },
  {
    titulo: "Roedores",
    bajada: "Buscan alimento, agua y refugio cerca de las personas.",
    icono: Rat,
    acento: "bg-celeste-400 text-noche-950",
    items: [
      "Guardá los residuos en bolsas cerradas y sacalos en el horario de recolección.",
      "No acumules escombros, chatarra ni malezas.",
      "Sellá huecos en paredes, rejillas y desagües.",
      "Los rodenticidas los aplican solo empresas habilitadas.",
    ],
  },
  {
    titulo: "Agua segura",
    bajada: "Tanques y cisternas de inmuebles con afluencia de público.",
    icono: Droplets,
    acento: "bg-white text-azul-700",
    items: [
      "Limpieza y desinfección obligatoria cada 180 días (Ord. 2004/92, t.o. Ord. 3098/01).",
      "Con certificado y análisis bacteriológico y físico-químico del agua.",
      "Solo valen los certificados de empresas empadronadas.",
    ],
  },
];

/* --- Página ------------------------------------------------------------------------------------ */

export default async function InicioPage() {
  const [resEstadisticas, resNoticias, resCapacitaciones] = await Promise.allSettled([
    getEstadisticasPortal(),
    getNoticias({ desde: 0, hasta: 2 }),
    getCapacitacionesPortal(),
  ]);
  // La portada no se cae si falla un bloque: se registra el error y se muestra un estado alternativo.
  for (const r of [resEstadisticas, resNoticias, resCapacitaciones]) {
    if (r.status === "rejected") {
      unstable_rethrow(r.reason);
      console.error("[portal] No se pudo cargar un bloque de la portada:", r.reason);
    }
  }
  const estadisticas = resEstadisticas.status === "fulfilled" ? resEstadisticas.value : null;
  const noticias = resNoticias.status === "fulfilled" ? resNoticias.value.noticias : null;
  const proximas = resCapacitaciones.status === "fulfilled" ? resCapacitaciones.value.proximas.slice(0, 3) : null;

  const hoy = hoyISO();
  const vencimientoEjemplo = calcularVencimiento("fumigacion", "mensual", hoy);
  const ahora = new Date();

  return (
    <>
      {/* ------------------------------------------------------------------ Hero */}
      <section aria-labelledby="titulo-portada" className="relative -mt-[73px] bg-gradient-brand-soft pt-[73px]">
        <div aria-hidden className="bg-dots mask-fade-b pointer-events-none absolute inset-0 text-azul-600 opacity-50" />
        <div className="relative mx-auto max-w-[90rem] px-2 pt-2 sm:px-4 sm:pt-3">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-brand text-white shadow-brand sm:rounded-[2.25rem]">
            <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-25" />
            <BrandGlow />
            <PetalDecor variant="hero" tone="dark" animated className="hidden md:block" />

            <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pt-10 pb-24 sm:px-8 sm:pt-14 sm:pb-28 lg:grid-cols-[1.2fr_1fr] lg:px-10 lg:pt-20 lg:pb-36">
              <div className="flex min-w-0 animate-fade-up flex-col">
                <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-sm">
                  <span className="relative flex size-2" aria-hidden>
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-sol-400 opacity-70" />
                    <span className="relative inline-flex size-2 rounded-full bg-sol-400" />
                  </span>
                  {APP.direccion} · {APP.nombre}
                </p>
                <h1
                  id="titulo-portada"
                  className="mt-5 font-display text-[2.35rem] leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-[3.6rem]"
                >
                  Control de plagas urbanas, <span className="text-sol-300">transparente y en línea.</span>
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
                  Cada servicio de fumigación y de limpieza de tanques de la ciudad queda registrado. Verificá un certificado,
                  consultá las empresas habilitadas y contratá con tranquilidad.
                </p>

                <div className="mt-8 max-w-xl">
                  <p className="mb-2.5 flex items-center gap-2 font-display text-sm font-semibold text-white">
                    <QrCode className="size-4 text-sol-300" aria-hidden />
                    Verificá un certificado
                  </p>
                  <BuscadorCertificado variante="hero" />
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:border-white/60 hover:bg-white/15 hover:text-white"
                  >
                    <Link href="/empresas">
                      <Building2 aria-hidden />
                      Empresas habilitadas
                    </Link>
                  </Button>
                  <Link
                    href="/normativa"
                    className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline"
                  >
                    Conocé la normativa
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>

              <CertificadoEjemplo vencimiento={vencimientoEjemplo} />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Indicadores */}
      <section aria-labelledby="indicadores" className="relative z-10 mx-auto -mt-16 max-w-7xl px-4 sm:-mt-20 sm:px-6 lg:px-8">
        <h2 id="indicadores" className="sr-only">
          Indicadores del registro en vivo
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Empresas habilitadas"
            value={estadisticas?.empresas_habilitadas ?? "—"}
            icon={Building2}
            tone="azul"
            hint="Registro municipal vigente"
            href="/empresas"
          />
          <StatCard
            label="Con limpieza de tanques"
            value={estadisticas?.empresas_tanques ?? "—"}
            icon={Droplets}
            tone="celeste"
            hint="Habilitadas también para tanques"
            href="/empresas?actividad=tanques"
          />
          <StatCard
            label="Certificados vigentes"
            value={estadisticas?.certificados_vigentes ?? "—"}
            icon={BadgeCheck}
            tone="verde"
            hint="Timbrados y sin vencer"
          />
          <StatCard
            label="Timbrados este mes"
            value={estadisticas?.certificados_mes ?? "—"}
            icon={Stamp}
            tone="ambar"
            hint={`En ${formatMes(ahora)}`}
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          {estadisticas ? (
            <>
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Datos en vivo del registro municipal · actualizados el {formatFechaHora(ahora)}
            </>
          ) : (
            "Los indicadores no están disponibles en este momento. Intentá de nuevo en unos minutos."
          )}
        </p>
      </section>

      {/* ----------------------------------------------------------- Cómo funciona */}
      <section aria-labelledby="como-funciona" className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 sm:pt-24 lg:px-8">
        <TituloSeccion
          id="como-funciona"
          antetitulo="Cómo funciona"
          titulo="Del servicio declarado al certificado con QR"
          descripcion="El circuito que antes se hacía en papel ahora es digital de punta a punta: cada certificado se coteja, se firma, se timbra y queda disponible para verificar."
        />
        <ol className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <span
            aria-hidden
            className="absolute top-8 right-[12%] left-[12%] hidden h-px border-t-2 border-dashed border-azul-200 lg:block"
          />
          {PASOS.map((p, i) => {
            const Icono = p.icono;
            return (
              <li
                key={p.titulo}
                className="revelar group relative flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-azul-200 hover:shadow-elevated"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    aria-hidden
                    className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-brand transition-transform duration-300 group-hover:rotate-[-4deg]"
                  >
                    <Icono className="size-7" strokeWidth={1.8} />
                    <span className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-sol-400 font-display text-sm font-bold text-noche-950 ring-4 ring-card">
                      {i + 1}
                    </span>
                  </span>
                  <Badge tone="azul" size="sm">
                    {p.chip}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    <span className="sr-only">Paso {i + 1}: </span>
                    {p.titulo}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ------------------------------------------------------- Beneficios por público */}
      <section aria-labelledby="beneficios" className="relative overflow-hidden border-y border-border bg-card">
        <div aria-hidden className="bg-dots mask-fade pointer-events-none absolute inset-0 text-azul-600 opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <TituloSeccion
            id="beneficios"
            antetitulo="Para todos"
            titulo="Una relación público-privada con reglas claras"
            descripcion="La plataforma pasa de un control basado en papel a información compartida: ganan los vecinos, los establecimientos y las empresas que trabajan habilitadas."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PUBLICOS.map((p) => {
              const Icono = p.icono;
              return (
                <article
                  key={p.titulo}
                  className="revelar flex flex-col gap-5 rounded-card border border-border bg-background/60 p-6 transition-[border-color,box-shadow] duration-200 hover:border-azul-200 hover:shadow-card sm:p-7"
                >
                  <div className="flex items-center gap-4">
                    <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", p.acento)}>
                      <Icono className="size-6" strokeWidth={1.8} />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">{p.titulo}</h3>
                      <p className="text-sm text-muted-foreground">{p.bajada}</p>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-3">
                    {p.items.map((it) => (
                      <li key={it} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
                        <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        {it}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={p.cta.href}
                    className="group mt-auto inline-flex w-fit items-center gap-1.5 rounded-sm pt-1 text-sm font-semibold text-azul-700 hover:underline"
                  >
                    {p.cta.label}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Recomendaciones al contratar */}
      <section aria-labelledby="recomendaciones" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <TituloSeccion
              id="recomendaciones"
              antetitulo="Antes de contratar"
              titulo="Recomendaciones para contratar un servicio"
              descripcion="Un servicio bien hecho protege tu salud y la de tu familia, clientes o alumnos. Seguí estos pasos antes, durante y después de la aplicación."
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/empresas">
                  <Building2 aria-hidden />
                  Ver empresas habilitadas
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/verificar">
                  <QrCode aria-hidden />
                  Verificar un certificado
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Fuente: recomendaciones del listado oficial de empresas habilitadas de la {APP.direccion}.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {RECOMENDACIONES.map((r, i) => {
              const Icono = r.icono;
              return (
                <li
                  key={r.texto}
                  className="revelar group relative flex gap-4 overflow-hidden rounded-card border border-border bg-card p-5 shadow-card transition-[translate,border-color] duration-200 hover:-translate-y-0.5 hover:border-azul-200"
                >
                  <span
                    aria-hidden
                    className="absolute -top-3 -right-1 font-display text-7xl leading-none font-bold text-azul-50 transition-colors group-hover:text-azul-100"
                  >
                    {i + 1}
                  </span>
                  <span
                    aria-hidden
                    className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100"
                  >
                    <Icono className="size-5" strokeWidth={1.9} />
                  </span>
                  <div className="relative">
                    <p className="font-display text-[15px] leading-snug font-semibold text-foreground">{r.texto}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.detalle}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Prevención */}
      <section aria-labelledby="prevencion" className="relative overflow-hidden bg-noche text-white">
        <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-20" />
        <BrandGlow />
        <PetalDecor variant="scatter" tone="dark" className="opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <TituloSeccion
              id="prevencion"
              claro
              antetitulo="Prevención"
              titulo="Dengue, roedores y agua segura"
              descripcion="El control de plagas empieza en casa y en cada establecimiento. Estas medidas simples reducen el riesgo de enfermedades transmitidas por vectores."
            />
            <Button asChild variant="sol" size="lg" className="w-fit">
              <Link href="/denuncias">
                <MessageSquareWarning aria-hidden />
                Denunciar un servicio irregular
              </Link>
            </Button>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PREVENCION.map((p) => {
              const Icono = p.icono;
              return (
                <article
                  key={p.titulo}
                  className="revelar flex flex-col gap-5 rounded-card bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur-sm transition-colors duration-200 hover:bg-white/[0.09]"
                >
                  <div className="flex items-center gap-4">
                    <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", p.acento)}>
                      <Icono className="size-6" strokeWidth={1.9} />
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-semibold text-white">{p.titulo}</h3>
                      <p className="text-sm text-noche-200">{p.bajada}</p>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {p.items.map((it) => (
                      <li key={it} className="flex gap-2.5 text-sm leading-relaxed text-noche-100">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sol-400" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          <p className="mt-8 flex items-start gap-2 text-sm text-noche-200">
            <HeartPulse className="mt-0.5 size-4 shrink-0 text-celeste-300" aria-hidden />
            Más establecimientos con control de plagas al día es menos riesgo para toda la ciudad.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------- Noticias y capacitaciones */}
      <section aria-label="Novedades" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.75fr_1fr]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <TituloSeccion id="noticias" antetitulo="Novedades" titulo="Últimas noticias" />
              <Button asChild variant="ghost" size="sm">
                <Link href="/noticias">
                  Ver todas
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="mt-8">
              {noticias === null ? (
                <EmptyState
                  compact
                  icon={Newspaper}
                  title="No pudimos cargar las noticias"
                  description="Intentá de nuevo en unos minutos."
                />
              ) : noticias.length === 0 ? (
                <EmptyState
                  compact
                  icon={Newspaper}
                  title="Todavía no hay noticias publicadas"
                  description="Las novedades de la Dirección de Salud Ambiental se publicarán acá."
                />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {noticias.map((n, i) => (
                    <TarjetaNoticia
                      key={n.id}
                      noticia={n}
                      destacada={i === 0}
                      prioridad={i === 0}
                      className={cn("revelar", i === 0 && "sm:col-span-2")}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <TituloSeccion id="capacitaciones" antetitulo="Formación" titulo="Próximas capacitaciones" />
              <Button asChild variant="ghost" size="sm">
                <Link href="/capacitaciones">
                  Ver todas
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="mt-8">
              {proximas === null ? (
                <EmptyState
                  compact
                  icon={GraduationCap}
                  title="No pudimos cargar las capacitaciones"
                  description="Intentá de nuevo en unos minutos."
                />
              ) : proximas.length === 0 ? (
                <EmptyState
                  compact
                  icon={GraduationCap}
                  title="No hay capacitaciones programadas"
                  description="Cuando se abra una nueva convocatoria la vas a ver acá."
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link href="/capacitaciones">Ver capacitaciones anteriores</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {proximas.map((c) => (
                    <li key={c.id} className="revelar">
                      <Link
                        href={`/capacitaciones#capacitacion-${c.id}`}
                        className="group flex gap-4 rounded-card border border-border bg-card p-4 shadow-card transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-azul-200 hover:shadow-elevated"
                      >
                        <FechaChip fecha={c.fechaInicio} />
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge tone={MODALIDAD_CAPACITACION[c.modalidad].tono} size="sm">
                              {MODALIDAD_CAPACITACION[c.modalidad].label}
                            </Badge>
                            {c.admiteInscripcion ? (
                              <Badge tone="verde" size="sm" dot>
                                Inscripción abierta
                              </Badge>
                            ) : (
                              <Badge tone="ambar" size="sm" dot>
                                {c.vacantes === 0 ? "Sin vacantes" : "Inscripción cerrada"}
                              </Badge>
                            )}
                          </div>
                          <p className="font-display text-[15px] leading-snug font-semibold text-foreground group-hover:text-azul-700">
                            {c.titulo}
                          </p>
                          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="size-3.5" aria-hidden />
                              {formatHora(c.fechaInicio)} h
                            </span>
                            {c.lugar ? (
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <MapPin className="size-3.5 shrink-0" aria-hidden />
                                <span className="truncate">{c.lugar}</span>
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- CTA empresas */}
      <section aria-labelledby="cta-empresas" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="revelar relative overflow-hidden rounded-panel bg-gradient-brand px-6 py-10 text-white shadow-brand sm:px-10 sm:py-14">
          <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-20" />
          <PetalDecor variant="corner" tone="dark" animated className="h-64 sm:h-80" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-sol-300 uppercase">
                <Sparkles className="size-3.5" aria-hidden />
                Para empresas prestadoras
              </p>
              <h2 id="cta-empresas" className="mt-3 font-display text-2xl leading-tight font-semibold sm:text-3xl lg:text-4xl">
                ¿Tu empresa hace control de plagas o limpieza de tanques?
              </h2>
              <p className="mt-3 text-base leading-relaxed text-white/90">
                Inscribila en el registro municipal y gestioná todo en línea: declaraciones, firma de certificados, pago del
                timbrado y renovación anual.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button asChild variant="sol" size="lg">
                <Link href="/registro">
                  <UserPlus aria-hidden />
                  Solicitar inscripción
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:border-white/60 hover:bg-white/15 hover:text-white"
              >
                <Link href="/ingresar">
                  <LogIn aria-hidden />
                  Ingresar
                </Link>
              </Button>
            </div>
          </div>
          <p className="relative mt-8 text-sm text-white/85">
            ¿Qué necesitás para inscribirte?{" "}
            <Link href="/normativa#requisitos" className="font-semibold text-white underline underline-offset-4 hover:text-sol-200">
              Consultá los requisitos
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}

/* --- Ilustración del hero ---------------------------------------------------------------------- */

function CertificadoEjemplo({ vencimiento }: { vencimiento: string | null }) {
  return (
    <figure className="relative mx-auto hidden w-full max-w-md sm:block lg:mx-0 lg:justify-self-end">
      <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-linear-to-br from-white/25 via-celeste-300/20 to-sol-300/30 blur-2xl" />
      <div className="relative animate-fade-up rounded-panel border border-white/60 bg-white/95 p-6 text-foreground shadow-elevated backdrop-blur [animation-delay:150ms] lg:rotate-[1.5deg]">
        <span className="absolute -top-3 right-6 rounded-full bg-noche-900 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase shadow-xs">
          Ejemplo
        </span>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Certificado de fumigación</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-tight">N.º 004512</p>
          </div>
          <StatusBadge label="Vigente" tone="verde" size="lg" pulse />
        </div>
        <div className="mt-6 flex items-center gap-5">
          <QrDecorativo className="size-28" />
          <dl className="grid flex-1 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Rubro</dt>
              <dd className="font-medium">Restaurantes y bares</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Asesor técnico</dt>
              <dd className="font-medium">Firma digital registrada</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Vence</dt>
              <dd className="nums-tabular font-medium">{formatFecha(vencimiento)}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-sm font-medium text-success">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          Timbrado · sello <span className="font-mono text-[13px]">{EJEMPLO_SELLO}</span>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-3 flex animate-fade-up items-center gap-2 rounded-2xl bg-noche-900 px-4 py-3 text-sm font-medium text-white shadow-elevated [animation-delay:350ms] sm:-left-8">
        <BadgeCheck className="size-5 text-sol-400" aria-hidden />
        Verificado por la Municipalidad
      </div>
      <figcaption className="sr-only">Ejemplo ilustrativo de un certificado verificado.</figcaption>
    </figure>
  );
}
