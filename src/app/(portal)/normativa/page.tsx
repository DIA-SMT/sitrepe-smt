import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Backpack,
  BookOpenCheck,
  CalendarRange,
  ChevronDown,
  CircleDollarSign,
  Clock,
  ClipboardList,
  Droplets,
  ExternalLink,
  FileSignature,
  FlaskConical,
  Gavel,
  IdCard,
  Landmark,
  ListChecks,
  Mail,
  MapPin,
  PackageOpen,
  Scale,
  ScrollText,
  ShieldCheck,
  Stamp,
  UserPlus,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { APP } from "@/lib/config";
import { getArancelesVigentes, getRubros } from "@/lib/data/catalogos";
import { MEDIO_PAGO } from "@/lib/domain/etiquetas";
import { formatPesos } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { CopiarTexto } from "../_components/copiar-texto";
import { EncabezadoPortal, TituloSeccion } from "../_components/encabezado-portal";
import { AnexoRubros, type RubroAnexo } from "./_components/anexo-rubros";

export const metadata: Metadata = {
  title: "Normativa y requisitos",
  description:
    "Ordenanzas 2681/98 y 2004/92, Ordenanza Tarifaria 5487 y Proyecto SITREPE: requisitos de inscripción, obligaciones, aranceles vigentes y Anexo de rubros.",
};

const INDICE = [
  { id: "marco", label: "Marco normativo" },
  { id: "requisitos", label: "Requisitos de inscripción" },
  { id: "obligaciones", label: "Obligaciones" },
  { id: "aranceles", label: "Aranceles vigentes" },
  { id: "rubros", label: "Anexo de rubros" },
  { id: "atencion", label: "Atención al público" },
  { id: "preguntas", label: "Preguntas frecuentes" },
];

const NORMAS: { numero: string; titulo: string; texto: string; icono: LucideIcon; etiquetas: string[]; destacada?: boolean }[] = [
  {
    numero: "Ord. N.º 2681/98 · t.o. Ord. N.º 3737/06",
    titulo: "Fumigación obligatoria y Registro de Empresas",
    texto:
      "Declara obligatoria la desratización, desinsectación y desinfección de inmuebles de uso público, crea el Registro de Empresas de Fumigaciones y fija los controles de la Dirección. Su Anexo define cada cuánto debe repetirse el servicio según la actividad.",
    icono: Scale,
    etiquetas: ["Arts. 1.º a 12.º", "Anexo de rubros"],
    destacada: true,
  },
  {
    numero: "Ord. N.º 2004/92 · t.o. Ord. N.º 3098/01",
    titulo: "Limpieza de tanques y cisternas",
    texto:
      "Obliga a limpiar y desinfectar cada 180 días los tanques de reserva y cisternas de todo inmueble con afluencia de público, solo con empresas empadronadas, y a presentar el análisis del agua.",
    icono: Droplets,
    etiquetas: ["Cada 180 días", "Art. 4.º"],
  },
  {
    numero: "Ordenanza Tarifaria N.º 5487",
    titulo: "Aranceles",
    texto:
      "Fija el importe del timbrado de certificados, de la limpieza de tanques y de los demás conceptos que cobra el área, y las cuentas donde se pagan.",
    icono: CircleDollarSign,
    etiquetas: ["Art. 40", "Cuentas 505 y 091"],
  },
  {
    numero: "Proyecto de Ordenanza · Título V",
    titulo: "SITREPE",
    texto:
      "Crea el Sistema Informático de Trazabilidad de Empresas, Productos y Envases para la inscripción y renovación, la emisión de certificados, el control de productos autorizados y de envases vacíos.",
    icono: BookOpenCheck,
    etiquetas: ["En elaboración", "Arts. 5.º y 6.º"],
  },
];

const REQUISITOS: { articulo: string; titulo: string; icono: LucideIcon; items: string[] }[] = [
  {
    articulo: "Art. 4.º",
    titulo: "Empadronamiento en el Registro",
    icono: IdCard,
    items: [
      "Identificación del titular y nombre comercial.",
      "Domicilio de la oficina y del depósito de productos químicos.",
      "Inscripción impositiva y CUIT.",
      "Datos del representante técnico.",
      "Pago de los aranceles correspondientes.",
      "Memoria técnica de los productos que se van a usar.",
    ],
  },
  {
    articulo: "Art. 5.º",
    titulo: "Representante técnico y memoria técnica",
    icono: FileSignature,
    items: [
      "Representante técnico con título terciario o universitario autenticado.",
      "Memoria técnica: productos, concentraciones, dosis, rodenticidas, precauciones, protección, toxicidad y antídotos.",
      "Se actualiza ante cada cambio de técnico o de productos.",
    ],
  },
  {
    articulo: "Art. 6.º",
    titulo: "Oficina y depósito",
    icono: Warehouse,
    items: [
      "Local de oficina y depósito de químicos con espacio exclusivo.",
      "Ambos domicilios declarados ante la Dirección.",
      "El cambio de domicilio requiere libre deuda.",
    ],
  },
  {
    articulo: "Art. 7.º",
    titulo: "Equipamiento mínimo",
    icono: Backpack,
    items: [
      "Titular con carnet de sanidad.",
      "Oficina y depósito habilitados.",
      "Al menos una mochila pulverizadora.",
      "Un equipo completo de seguridad.",
    ],
  },
];

const OBLIGACIONES: { titulo: string; texto: string; norma: string; icono: LucideIcon }[] = [
  {
    titulo: "Declaración anticipada de cada servicio",
    texto: "Planilla con domicilio, cliente, rubro, superficie y productos, presentada entre 24 y 48 horas antes del servicio.",
    norma: "Art. 9.º a",
    icono: ClipboardList,
  },
  {
    titulo: "Certificado por triplicado y timbrado",
    texto:
      "Un certificado por servicio, firmado por el asesor técnico y timbrado: original para el cliente, duplicado para la Municipalidad y triplicado para la empresa.",
    norma: "Art. 9.º b",
    icono: Stamp,
  },
  {
    titulo: "Planilla mensual",
    texto: "Resumen mensual de servicios por empresa, hasta el último día hábil del mes siguiente. La plataforma la genera sola.",
    norma: "Art. 10.º c",
    icono: ListChecks,
  },
  {
    titulo: "Renovación anual",
    texto:
      "Declaración Jurada Anual de Categorización y libre deuda, dentro de los tres meses siguientes al año declarado (hasta el 31 de marzo).",
    norma: "Art. 8.º",
    icono: CalendarRange,
  },
  {
    titulo: "Limpieza de tanques cada 180 días",
    texto: "Certificado de limpieza y desinfección con análisis bacteriológico y físico-químico del agua tomado después de la limpieza.",
    norma: "Ord. 2004/92",
    icono: Droplets,
  },
  {
    titulo: "Inspección anual de oficina y depósito",
    texto: "La Dirección inspecciona cada año el local y el depósito de químicos de las empresas habilitadas.",
    norma: "Art. 10.º d",
    icono: ShieldCheck,
  },
  {
    titulo: "Trazabilidad de envases vacíos",
    texto: "Registro de los envases vacíos de productos domisanitarios generados y entregados a operadores autorizados.",
    norma: "SITREPE, Art. 5.º",
    icono: PackageOpen,
  },
];

export default async function NormativaPage() {
  const [aranceles, rubros] = await Promise.all([getArancelesVigentes(), getRubros()]);
  const timbrado = aranceles.find((a) => a.codigo === "TIMBRADO_CERTIFICADO");
  const tanque = aranceles.find((a) => a.codigo === "LIMPIEZA_TANQUE");
  const cuentas = [...new Map(aranceles.flatMap((a) => (a.cuenta ? [[a.cuenta.id, a.cuenta] as const] : []))).values()];
  const rubrosAnexo: RubroAnexo[] = rubros.map((r) => ({
    id: r.id,
    grupo: r.grupo,
    nombre: r.nombre,
    periodicidad: r.periodicidad,
    validado: r.validado,
    descripcion: r.descripcion,
  }));

  const PREGUNTAS: { pregunta: string; respuesta: React.ReactNode }[] = [
    {
      pregunta: "¿Cómo sé si una empresa está habilitada?",
      respuesta: (
        <>
          Consultá el{" "}
          <Link href="/empresas" className="font-medium text-azul-700 underline underline-offset-2">
            listado de empresas habilitadas
          </Link>
          , que se genera automáticamente desde el registro. Ahí ves para qué actividades está habilitada y hasta cuándo.
        </>
      ),
    },
    {
      pregunta: "¿Cuánto dura un certificado de fumigación?",
      respuesta:
        "Depende de la actividad del establecimiento según el Anexo de la Ord. 2681/98: puede ser mensual, bimestral, trimestral o anual (por ejemplo, Sanidad y Educación son mensuales). Los certificados de limpieza de tanques duran 180 días. La plataforma calcula el vencimiento automáticamente.",
    },
    {
      pregunta: "¿Qué hago si un certificado no aparece al verificarlo?",
      respuesta: (
        <>
          Revisá que el código esté bien escrito. Si figura como «sin timbrar», el servicio fue declarado pero todavía no tiene
          validez. Si no aparece, pedile explicaciones a la empresa o{" "}
          <Link href="/denuncias" className="font-medium text-azul-700 underline underline-offset-2">
            hacé una denuncia
          </Link>
          .
        </>
      ),
    },
    {
      pregunta: "¿Cuánto cuesta el timbrado?",
      respuesta: timbrado
        ? `El timbrado cuesta ${formatPesos(timbrado.importe)} ${timbrado.unidad} (Ord. Tarifaria ${timbrado.ordenanza}, ${timbrado.articulo}). Se cobra una vez por certificado, no por ejemplar.${
            tanque ? ` La limpieza de tanques, ${formatPesos(tanque.importe)} ${tanque.unidad}.` : ""
          }`
        : "El importe lo fija la Ordenanza Tarifaria vigente y se cobra una vez por certificado, no por ejemplar.",
    },
    {
      pregunta: "¿Con cuánta anticipación se declara un servicio?",
      respuesta:
        "Entre 24 y 48 horas antes de realizarlo. La plataforma rechaza las declaraciones fuera de plazo y las de empresas no habilitadas.",
    },
    {
      pregunta: "¿Quién firma el certificado?",
      respuesta:
        "El asesor o representante técnico registrado en el padrón, con firma digital. No es válida la firma del dueño o responsable comercial de la empresa.",
    },
    {
      pregunta: "¿Qué es el plazo de reingreso?",
      respuesta:
        "Es el tiempo que hay que esperar después de la aplicación para volver a ocupar el ambiente tratado. Figura en el certificado y en el detalle de cada producto.",
    },
    {
      pregunta: "¿Qué pasa si mi establecimiento no tiene el certificado al día?",
      respuesta:
        "Los inspectores pueden labrar un acta de infracción, que se eleva al Tribunal Municipal de Faltas (Código de Faltas, Ord. 758/82). En limpieza de tanques, la Dirección notifica con un plazo de 5 días hábiles para presentar la documentación, o de 48 horas hábiles si el servicio se hizo pero no se registró.",
    },
    {
      pregunta: "¿Cómo pagan las empresas el timbrado y dónde envían el comprobante?",
      respuesta:
        "Desde la plataforma generan la liquidación de los certificados controlados, pagan por transferencia a la cuenta indicada y suben el comprobante. El área lo verifica y el sistema timbra los certificados automáticamente.",
    },
  ];

  return (
    <>
      <EncabezadoPortal
        antetitulo="Marco legal"
        titulo="Normativa y requisitos"
        descripcion="Todo lo que necesitás saber para prestar servicios de control de plagas urbanas y limpieza de tanques en San Miguel de Tucumán, o para contratarlos."
        icono={Landmark}
        migas={[{ label: "Normativa" }]}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/registro">
              <UserPlus aria-hidden />
              Inscribir mi empresa
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="#aranceles">
              <CircleDollarSign aria-hidden />
              Ver aranceles
            </a>
          </Button>
        </div>
      </EncabezadoPortal>

      {/* Índice móvil */}
      <nav aria-label="Secciones de la página" className="border-b border-border bg-card lg:hidden">
        <ul className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-4 py-3 sm:px-6">
          {INDICE.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                className="inline-flex rounded-full bg-muted px-3 py-1.5 text-xs font-medium whitespace-nowrap text-noche-600 transition-colors hover:bg-azul-50 hover:text-azul-700"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[14rem_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <nav aria-label="Índice" className="sticky top-28">
            <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">En esta página</p>
            <ol className="flex flex-col gap-0.5 border-l border-border">
              {INDICE.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted-foreground transition-colors hover:border-azul-500 hover:text-foreground"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-20">
          {/* Marco normativo */}
          <section aria-labelledby="marco">
            <TituloSeccion
              id="marco"
              antetitulo="01 · Marco normativo"
              titulo="Las normas que rigen el servicio"
              descripcion="Las empresas se autorizan según la Ordenanza 2681/98. Algunas referencias de 1998 (DIPASA, Banco San Miguel S.A.) hoy corresponden a la Dirección de Salud Ambiental y al pago por transferencia."
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {NORMAS.map((n) => {
                const Icono = n.icono;
                return (
                  <article
                    key={n.numero}
                    className={cn(
                      "revelar relative flex flex-col gap-4 overflow-hidden rounded-card border p-6 shadow-card",
                      n.destacada ? "border-transparent bg-gradient-brand text-white shadow-brand md:col-span-2" : "border-border bg-card",
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                          n.destacada ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-azul-50 text-azul-600 ring-1 ring-azul-100",
                        )}
                      >
                        <Icono className="size-6" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <p className={cn("text-xs font-semibold tracking-wide uppercase", n.destacada ? "text-sol-300" : "text-azul-600")}>
                          {n.numero}
                        </p>
                        <h3 className={cn("mt-1 font-display text-lg font-semibold", n.destacada ? "text-white" : "text-foreground")}>
                          {n.titulo}
                        </h3>
                      </div>
                    </div>
                    <p className={cn("text-sm leading-relaxed", n.destacada ? "text-white/90" : "text-muted-foreground")}>{n.texto}</p>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {n.etiquetas.map((e) =>
                        n.destacada ? (
                          <span key={e} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white ring-1 ring-white/25">
                            {e}
                          </span>
                        ) : (
                          <Badge key={e} tone={e === "En elaboración" ? "ambar" : "azul"} size="sm">
                            {e}
                          </Badge>
                        ),
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <Gavel className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
              Las infracciones las sanciona el Tribunal Municipal de Faltas según el Código de Faltas (Ord. 758/82).
            </p>
          </section>

          {/* Requisitos */}
          <section aria-labelledby="requisitos">
            <TituloSeccion
              id="requisitos"
              antetitulo="02 · Inscripción"
              titulo="Requisitos para inscribir una empresa"
              descripcion="Arts. 4.º a 7.º de la Ord. 2681/98. Presentada la solicitud, la Dirección inspecciona la oficina y el depósito dentro de los 15 días y emite el Certificado de Inscripción."
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {REQUISITOS.map((r) => {
                const Icono = r.icono;
                return (
                  <article key={r.articulo} className="revelar rounded-card border border-border bg-card p-6 shadow-card">
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100">
                        <Icono className="size-5" strokeWidth={1.9} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-azul-600">{r.articulo}</p>
                        <h3 className="font-display font-semibold text-foreground">{r.titulo}</h3>
                      </div>
                    </div>
                    <ul className="mt-4 flex flex-col gap-2">
                      {r.items.map((it) => (
                        <li key={it} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
                          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                          {it}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
            <Alert
              className="mt-4"
              tone="info"
              title="Limpieza de tanques (Ord. 3098/01, Art. 4.º)"
              action={
                <Button asChild size="sm">
                  <Link href="/registro">
                    Solicitar inscripción
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            >
              Solo pueden hacerla empresas empadronadas y autorizadas que cumplan los requisitos técnicos: la habilitación para
              tanques se otorga en el mismo registro.
            </Alert>
          </section>

          {/* Obligaciones */}
          <section aria-labelledby="obligaciones">
            <TituloSeccion
              id="obligaciones"
              antetitulo="03 · Obligaciones"
              titulo="Qué tiene que cumplir una empresa habilitada"
              descripcion="Las obligaciones se gestionan en línea desde la plataforma, con validaciones que evitan los errores más frecuentes."
            />
            <ol className="relative mt-8 flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[1.4rem] before:w-px before:bg-linear-to-b before:from-azul-300 before:via-celeste-300 before:to-sol-300">
              {OBLIGACIONES.map((o) => {
                const Icono = o.icono;
                return (
                  <li key={o.titulo} className="revelar relative flex gap-4">
                    <span
                      aria-hidden
                      className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-azul-600 shadow-card ring-1 ring-azul-100"
                    >
                      <Icono className="size-5" strokeWidth={1.9} />
                    </span>
                    <div className="flex-1 rounded-card border border-border bg-card p-4 shadow-card sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-semibold text-foreground">{o.titulo}</h3>
                        <Badge tone="neutral" size="sm">
                          {o.norma}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{o.texto}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Aranceles */}
          <section aria-labelledby="aranceles">
            <TituloSeccion
              id="aranceles"
              antetitulo="04 · Aranceles"
              titulo="Aranceles vigentes"
              descripcion="Importes de la Ordenanza Tarifaria N.º 5487. Cada pago se asocia a su concepto y a su cuenta. El timbrado se cobra una vez por certificado, no por ejemplar."
            />
            {aranceles.length === 0 ? (
              <EmptyState
                className="mt-8"
                compact
                icon={CircleDollarSign}
                title="No hay aranceles vigentes publicados"
                description="Consultá los importes en la Dirección de Salud Ambiental."
              />
            ) : (
              <>
                <SectionCard className="mt-8" title="Conceptos y montos" icon={CircleDollarSign} flush>
                  {/* Tabla en pantallas medianas y grandes */}
                  <div className="hidden md:block">
                    <Table framed={false}>
                      <THead>
                        <TR>
                          <TH>Concepto</TH>
                          <TH>Norma</TH>
                          <TH numeric>Importe</TH>
                          <TH>Cuenta</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {aranceles.map((a) => (
                          <TR key={a.id}>
                            <TD>
                              <span className="font-medium text-foreground">{a.concepto}</span>
                            </TD>
                            <TD className="text-muted-foreground">
                              Ord. {a.ordenanza} · {a.articulo}
                            </TD>
                            <TD numeric>
                              <span className="font-semibold text-foreground">{formatPesos(a.importe)}</span>
                              <span className="block text-xs text-muted-foreground">{a.unidad}</span>
                            </TD>
                            <TD>
                              {a.cuenta ? (
                                <Badge tone={a.cuenta.codigo === "505" ? "azul" : "violeta"} size="sm">
                                  Cuenta {a.cuenta.codigo}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                  {/* Lista en celulares */}
                  <ul className="divide-y divide-border md:hidden">
                    {aranceles.map((a) => (
                      <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{a.concepto}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Ord. {a.ordenanza} · {a.articulo}
                            {a.cuenta ? ` · Cuenta ${a.cuenta.codigo}` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 text-right">
                          <span className="font-semibold text-foreground nums-tabular">{formatPesos(a.importe)}</span>
                          <span className="block text-xs text-muted-foreground">{a.unidad}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </SectionCard>

                {cuentas.length > 0 ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {cuentas.map((c) => (
                      <article key={c.id} className="revelar relative overflow-hidden rounded-card border border-border bg-card p-6 shadow-card">
                        <span
                          aria-hidden
                          className="absolute -top-4 -right-2 font-display text-8xl leading-none font-bold text-azul-50"
                        >
                          {c.codigo}
                        </span>
                        <div className="relative flex flex-col gap-3">
                          <div>
                            <p className="text-xs font-semibold tracking-wide text-azul-600 uppercase">
                              Cuenta {c.codigo} · {c.banco}
                            </p>
                            <h3 className="mt-1 font-display font-semibold text-foreground">{c.nombre}</h3>
                          </div>
                          <dl className="grid gap-2 text-sm">
                            <div>
                              <dt className="text-xs text-muted-foreground">N.º de cuenta</dt>
                              <dd className="font-medium text-foreground nums-tabular">{c.numero_cuenta}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">CBU</dt>
                              <dd className="flex items-center gap-2">
                                <span className="font-mono text-[13px] font-medium break-all text-foreground">{c.cbu}</span>
                                <CopiarTexto texto={c.cbu} descripcion={`el CBU de la cuenta ${c.codigo}`} variant="ghost" />
                              </dd>
                            </div>
                          </dl>
                          <div className="flex flex-wrap gap-1.5">
                            {c.medios_pago.map((m) => (
                              <Badge key={m} tone={MEDIO_PAGO[m].tono} size="sm">
                                {MEDIO_PAGO[m].label}
                              </Badge>
                            ))}
                          </div>
                          {c.descripcion ? <p className="text-[13px] leading-relaxed text-muted-foreground">{c.descripcion}</p> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </section>

          {/* Anexo de rubros */}
          <section aria-labelledby="rubros">
            <TituloSeccion
              id="rubros"
              antetitulo="05 · Anexo de la Ord. 2681/98"
              titulo="Planilla de exigencias según usos y actividades"
              descripcion="Define cada cuánto debe repetirse el servicio y, por lo tanto, el vencimiento de cada certificado. Las demoliciones y obras en construcción requieren el servicio por única vez al iniciar los trabajos; la limpieza de tanques vence a los 180 días, sin importar el rubro."
            />
            <div className="mt-8">
              {rubrosAnexo.length === 0 ? (
                <EmptyState compact icon={FlaskConical} title="El Anexo todavía no está cargado" />
              ) : (
                <AnexoRubros rubros={rubrosAnexo} />
              )}
            </div>
          </section>

          {/* Atención */}
          <section aria-labelledby="atencion">
            <div className="relative overflow-hidden rounded-panel bg-noche p-6 text-white shadow-elevated sm:p-10">
              <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-20" />
              <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
                <div>
                  <TituloSeccion
                    id="atencion"
                    claro
                    antetitulo="06 · Atención al público"
                    titulo={APP.direccion}
                    descripcion={`${APP.secretaria} · ${APP.municipio}. Presentaciones en papel, consultas y notificaciones.`}
                  />
                </div>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-sol-400" aria-hidden />
                    <div>
                      <p className="font-medium">{APP.contacto.domicilio}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(APP.contacto.domicilio)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm text-celeste-300 hover:text-white hover:underline"
                      >
                        Cómo llegar
                        <ExternalLink className="size-3.5" aria-hidden />
                        <span className="sr-only">(se abre en una pestaña nueva)</span>
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                    <Clock className="mt-0.5 size-5 shrink-0 text-sol-400" aria-hidden />
                    <p className="font-medium">{APP.contacto.horario}</p>
                  </li>
                  <li className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                    <Mail className="mt-0.5 size-5 shrink-0 text-sol-400" aria-hidden />
                    <a href={`mailto:${APP.contacto.email}`} className="font-medium break-all hover:underline">
                      {APP.contacto.email}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Preguntas frecuentes */}
          <section aria-labelledby="preguntas">
            <TituloSeccion id="preguntas" antetitulo="07 · Ayuda" titulo="Preguntas frecuentes" />
            <div className="mt-8 flex flex-col gap-3">
              {PREGUNTAS.map((p) => (
                <details
                  key={p.pregunta}
                  className="group rounded-card border border-border bg-card shadow-card transition-[border-color,box-shadow] open:border-azul-200 open:shadow-elevated"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-4 font-display text-[15px] font-semibold text-foreground hover:text-azul-700 sm:px-6 [&::-webkit-details-marker]:hidden">
                    {p.pregunta}
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-[rotate,background-color,color] duration-200 group-open:rotate-180 group-open:bg-azul-50 group-open:text-azul-700"
                    >
                      <ChevronDown className="size-4" />
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6">{p.respuesta}</div>
                </details>
              ))}
            </div>
            <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
              <ScrollText className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
              Este resumen es informativo. Ante cualquier diferencia prevalece el texto oficial de las ordenanzas.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
