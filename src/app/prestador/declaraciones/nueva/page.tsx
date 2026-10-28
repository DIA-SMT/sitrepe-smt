import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck2,
  CircleCheck,
  ClipboardList,
  Droplets,
  FileSignature,
  Lock,
  PenLine,
  Send,
  SprayCan,
  Stamp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { PageHeader } from "@/components/shared/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requerirEmpresa } from "@/lib/auth";
import { getAntelacion, getVencimientoTanqueDias } from "@/lib/data/declaraciones";
import { cn } from "@/lib/utils";
import { habilitacionPara } from "../_lib/habilitacion";
import { BotonCrear } from "./_components/boton-crear";

export const metadata: Metadata = {
  title: "Nueva declaración",
  description: "Elegí el tipo de planilla de servicios a declarar.",
};

type Opcion = {
  tipo: "fumigacion" | "tanque";
  titulo: string;
  bajada: string;
  icon: LucideIcon;
  reglas: string[];
  disponible: boolean;
  motivo?: string;
  estilo: { cabecera: string; icono: string };
};

const PASOS: { titulo: string; detalle: string; icon: LucideIcon }[] = [
  { titulo: "Cargá los servicios", detalle: "Cliente, domicilio, rubro del Anexo, fecha y productos.", icon: PenLine },
  { titulo: "Firma del asesor", detalle: "El técnico registrado firma desde su usuario.", icon: FileSignature },
  { titulo: "Presentá la planilla", detalle: "Dentro del plazo, ante Control de Empresas.", icon: Send },
  { titulo: "Control y timbrado", detalle: "Pagás el arancel y el certificado se sella con QR.", icon: Stamp },
];

export default async function NuevaDeclaracionPage() {
  const sesion = await requerirEmpresa();
  const empresa = sesion.empresa;
  const [antelacion, diasTanque] = await Promise.all([getAntelacion(), getVencimientoTanqueDias()]);
  // El aviso general refleja el tipo que la empresa puede declarar (si solo tiene tanques, no se le habla de fumigación).
  const habilitacion = habilitacionPara(empresa, empresa.habilita_fumigacion || !empresa.habilita_tanques ? "fumigacion" : "tanque");

  const opciones: Opcion[] = [
    {
      tipo: "fumigacion",
      titulo: "Fumigación y desinfección",
      bajada: "Desinsectación, desratización y desinfección de establecimientos (Ord. 2681/98).",
      icon: SprayCan,
      reglas: [
        `Se presenta entre ${antelacion.minHoras} y ${antelacion.maxHoras} horas antes de cada servicio.`,
        "Vencimiento según la periodicidad del rubro en el Anexo.",
        "Productos de tu memoria técnica aprobada, con cantidades.",
      ],
      disponible: empresa.habilita_fumigacion,
      motivo: "Tu empresa no está habilitada para servicios de fumigación.",
      estilo: { cabecera: "bg-gradient-brand", icono: "bg-white/15 text-white ring-white/25" },
    },
    {
      tipo: "tanque",
      titulo: "Limpieza de tanques",
      bajada: "Tanques de reserva y cisternas de inmuebles con afluencia de público (Ord. 2004/92, t.o. 3098/01).",
      icon: Droplets,
      reglas: [
        "Se declara una vez realizada la limpieza.",
        "Adjuntás los análisis bacteriológico y físico-químico del agua.",
        `El certificado vence a los ${diasTanque} días.`,
      ],
      disponible: empresa.habilita_tanques,
      motivo: "Requiere habilitación específica para tanques (Ord. 3098/01, Art. 4.º). Podés solicitarla desde Trámites.",
      estilo: { cabecera: "bg-linear-to-br from-celeste-500 to-azul-600", icono: "bg-white/15 text-white ring-white/25" },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nueva declaración"
        description="Elegí el tipo de servicio. Vas a poder cargar todos los servicios de la planilla y presentarlos juntos."
        icon={ClipboardList}
        breadcrumb={[
          { label: "Inicio", href: "/prestador" },
          { label: "Declaraciones", href: "/prestador/declaraciones" },
          { label: "Nueva" },
        ]}
      />

      {!habilitacion.ok ? (
        <Alert
          tone="warning"
          title={habilitacion.titulo}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/prestador/tramites">Ver trámites</Link>
            </Button>
          }
        >
          {habilitacion.detalle}
        </Alert>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {opciones.map((o) => {
          const Icono = o.icon;
          return (
            <article
              key={o.tipo}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-panel border border-border bg-card shadow-card transition-[transform,box-shadow] duration-200",
                o.disponible ? "hover:-translate-y-0.5 hover:shadow-elevated" : "opacity-80",
              )}
            >
              <div className={cn("relative overflow-hidden px-6 pt-6 pb-8 text-white", o.disponible ? o.estilo.cabecera : "bg-noche-400")}>
                <PetalDecor variant="corner" tone="dark" />
                <span aria-hidden className={cn("relative flex size-12 items-center justify-center rounded-2xl ring-1", o.estilo.icono)}>
                  <Icono className="size-6" strokeWidth={1.9} />
                </span>
                <h2 className="relative mt-4 font-display text-xl font-semibold">{o.titulo}</h2>
                <p className="relative mt-1 max-w-sm text-sm text-white/85">{o.bajada}</p>
              </div>
              <div className="flex flex-1 flex-col gap-5 p-6">
                <ul className="flex flex-col gap-2.5 text-sm">
                  {o.reglas.map((r) => (
                    <li key={r} className="flex items-start gap-2.5">
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                      <span className="text-foreground/85">{r}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  {o.disponible ? (
                    <BotonCrear
                      tipo={o.tipo}
                      etiqueta={o.tipo === "fumigacion" ? "Crear planilla de fumigación" : "Crear planilla de tanques"}
                      variante={o.tipo === "fumigacion" ? "primary" : "secondary"}
                    />
                  ) : (
                    <div className="flex flex-col gap-2 rounded-xl bg-muted p-3 text-sm">
                      <Badge tone="neutral" size="sm">
                        <Lock aria-hidden />
                        No disponible
                      </Badge>
                      <p className="text-muted-foreground">{o.motivo}</p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section aria-labelledby="como-funciona" className="rounded-panel border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="size-5 text-azul-600" aria-hidden />
          <h2 id="como-funciona" className="font-display text-base font-semibold">
            Cómo sigue
          </h2>
        </div>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((p, i) => {
            const Icono = p.icon;
            return (
              <li key={p.titulo} className="relative flex gap-3">
                <span
                  aria-hidden
                  className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100"
                >
                  <Icono className="size-5" strokeWidth={1.9} />
                  <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-sol-400 text-[11px] font-bold text-noche-950 ring-2 ring-card">
                    {i + 1}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{p.titulo}</span>
                  <span className="block text-[13px] leading-snug text-muted-foreground">{p.detalle}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
