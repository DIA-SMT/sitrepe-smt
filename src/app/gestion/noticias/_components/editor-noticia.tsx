"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  Eye,
  ImagePlus,
  Link2,
  PenLine,
  RefreshCw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { SubirArchivo } from "@/components/shared/subir-archivo";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatFechaLarga } from "@/lib/domain/formato";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AccionConfirmada } from "../../configuracion/_compartido/acciones-cliente";
import { useEnvio } from "../../configuracion/_compartido/use-envio";
import { eliminarNoticia, guardarNoticia } from "../actions";
import { CATEGORIAS_NOTICIA, contarPalabras, estiloCategoria, generarSlug, minutosLectura, parrafos } from "./categorias";
import { PortadaNoticia } from "./portada";

type Noticia = Tables<"noticias">;

const MAX_RESUMEN = 300;
const MAX_TITULO = 160;

/** Editor de noticias con vista previa en vivo (en pantallas chicas, en una pestaña aparte). */
export function EditorNoticia({ noticia, categorias = [] }: { noticia?: Noticia; categorias?: string[] }) {
  const router = useRouter();
  const id = useId();
  const editar = Boolean(noticia);

  const [titulo, setTitulo] = useState(noticia?.titulo ?? "");
  const [slug, setSlug] = useState(noticia?.slug ?? "");
  const [slugManual, setSlugManual] = useState(editar);
  const [resumen, setResumen] = useState(noticia?.resumen ?? "");
  const [cuerpo, setCuerpo] = useState(noticia?.cuerpo ?? "");
  const [categoria, setCategoria] = useState(noticia?.categoria ?? "Institucional");
  const [publicada, setPublicada] = useState(noticia?.publicada ?? false);
  const [imagenUrl, setImagenUrl] = useState<string | null>(noticia?.imagen_url ?? null);
  const [imagenPath, setImagenPath] = useState("");
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [subiendo, setSubiendo] = useState(!noticia?.imagen_url);
  const [claveSubida, setClaveSubida] = useState(0);
  const [modo, setModo] = useState<"editar" | "vista">("editar");

  const [estado, despachar, pendiente] = useAccion<{ id: string }>(guardarNoticia, {
    alExito: (r) => {
      if (!editar && r.datos?.id) router.replace(`/gestion/noticias/${r.datos.id}`);
    },
  });
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];
  const f = (campo: string) => `${id}-${campo}`;

  const slugVisible = slugManual ? slug : generarSlug(titulo);
  const opcionesCategoria = [...new Set([...CATEGORIAS_NOTICIA, ...categorias, categoria])].filter(Boolean);
  const listaParrafos = parrafos(cuerpo);

  const alSubir = (path: string) => {
    const supabase = createClient();
    setImagenUrl(supabase.storage.from("publico").getPublicUrl(path).data.publicUrl);
    setImagenPath(path);
    setQuitarImagen(false);
    setSubiendo(false);
  };

  const quitar = () => {
    setImagenUrl(null);
    setImagenPath("");
    setQuitarImagen(Boolean(noticia?.imagen_url));
    setSubiendo(true);
    setClaveSubida((k) => k + 1);
  };

  const formulario = (
    <form onSubmit={enviar} className="flex flex-col gap-6" noValidate>
      {noticia ? <input type="hidden" name="id" value={noticia.id} /> : null}
      <input type="hidden" name="imagen_path" value={imagenPath} />
      <input type="hidden" name="quitar_imagen" value={quitarImagen ? "1" : ""} />
      <input type="hidden" name="slug" value={slugVisible} />

      {estado.mensaje && !estado.ok ? (
        <Alert tone="danger" title="No se pudo guardar la noticia">
          {estado.errores ? "Revisá los campos marcados." : estado.mensaje}
        </Alert>
      ) : null}

      <Card className="gap-5 p-5 sm:p-6">
        <Field
          htmlFor={f("titulo")}
          label="Título"
          required
          error={error("titulo")}
          hint={`${titulo.length}/${MAX_TITULO} caracteres. Claro y directo: es lo primero que se lee.`}
        >
          <Input
            id={f("titulo")}
            name="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={MAX_TITULO}
            placeholder="Ej.: Nueva campaña de prevención del dengue"
            required
            autoFocus={!editar}
          />
        </Field>

        <Field
          htmlFor={f("slug")}
          label="Dirección en el portal"
          error={error("slug")}
          hint={
            slugManual
              ? "Personalizada. Si la cambiás en una noticia publicada, el enlace anterior deja de funcionar."
              : "Se genera a partir del título. Si ya existe, se agrega un número al final."
          }
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={f("slug")}
              value={slugVisible}
              onChange={(e) => {
                setSlugManual(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              leading={<Link2 aria-hidden />}
              placeholder="se-genera-del-titulo"
              maxLength={90}
              className="font-mono text-[13px]"
              wrapperClassName="flex-1"
            />
            {slugManual ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSlugManual(false);
                  setSlug("");
                }}
              >
                <RefreshCw aria-hidden />
                Usar el título
              </Button>
            ) : null}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor={f("categoria")} label="Categoría" required error={error("categoria")}>
            <Select id={f("categoria")} name="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {opcionesCategoria.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col justify-end rounded-control border border-border bg-subtle px-3.5 py-3">
            <Checkbox
              name="publicada"
              checked={publicada}
              onChange={(e) => setPublicada(e.target.checked)}
              label="Publicar en el portal"
              description={publicada ? "Visible para todos en Noticias." : "Queda como borrador, solo visible en gestión."}
            />
          </div>
        </div>

        <Field
          htmlFor={f("resumen")}
          label="Resumen"
          required
          error={error("resumen")}
          hint={`${resumen.length}/${MAX_RESUMEN}. Se muestra en el listado y debajo del título.`}
        >
          <Textarea
            id={f("resumen")}
            name="resumen"
            rows={3}
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            maxLength={MAX_RESUMEN}
            placeholder="Contá en una o dos oraciones de qué se trata."
            required
          />
        </Field>

        <Field
          htmlFor={f("cuerpo")}
          label="Cuerpo"
          required
          error={error("cuerpo")}
          hint={`${listaParrafos.length} ${listaParrafos.length === 1 ? "párrafo" : "párrafos"} · ${contarPalabras(cuerpo)} palabras. Separá los párrafos con una línea en blanco; el primero se destaca como entrada.`}
        >
          <Textarea
            id={f("cuerpo")}
            name="cuerpo"
            rows={14}
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            placeholder={"Primer párrafo: la información principal.\n\nSegundo párrafo: detalles, fechas, requisitos…"}
            className="min-h-64"
            required
          />
        </Field>
      </Card>

      <Card className="gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100"
          >
            <ImagePlus className="size-[18px]" strokeWidth={1.9} />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">Imagen de portada</h2>
            <p className="text-[13px] text-muted-foreground">
              Opcional. Sin imagen, el portal muestra una ilustración con el color de la categoría.
            </p>
          </div>
        </div>
        {imagenUrl && !subiendo ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PortadaNoticia
              imagenUrl={imagenUrl}
              categoria={categoria}
              className="aspect-[16/9] w-full rounded-xl ring-1 ring-border sm:w-56"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSubiendo(true)}>
                <RefreshCw aria-hidden />
                Cambiar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={quitar}>
                <X aria-hidden />
                Quitar imagen
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <SubirArchivo
              key={claveSubida}
              name="imagen_subida"
              bucket="publico"
              carpeta={["noticias"]}
              label="Archivo de imagen"
              hint="JPG, PNG o WEBP de hasta 5 MB. Ideal: horizontal, 1600 × 900 px."
              accept="image/jpeg,image/png,image/webp"
              onSubido={alSubir}
            />
            {imagenUrl ? (
              <Button type="button" variant="link" size="sm" className="self-start" onClick={() => setSubiendo(false)}>
                Conservar la imagen actual
              </Button>
            ) : null}
          </div>
        )}
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost">
            <Link href="/gestion/noticias">Volver al listado</Link>
          </Button>
          {noticia ? (
            <AccionConfirmada
              accion={eliminarNoticia}
              campos={{ id: noticia.id }}
              redirigir="/gestion/noticias"
              titulo="¿Eliminar esta noticia?"
              descripcion="Se quita del portal y se borra su imagen. La eliminación queda registrada en la auditoría."
              confirmar="Sí, eliminar"
              trigger={
                <Button type="button" variant="ghost" className="text-danger hover:bg-danger-soft">
                  <Trash2 aria-hidden />
                  Eliminar
                </Button>
              }
            />
          ) : null}
        </div>
        <Button type="submit" loading={pendiente} variant={publicada ? "primary" : "secondary"} size="lg">
          {publicada ? <Send aria-hidden /> : <Save aria-hidden />}
          {pendiente ? "Guardando…" : publicada ? (editar && noticia?.publicada ? "Guardar cambios" : "Guardar y publicar") : "Guardar borrador"}
        </Button>
      </div>
    </form>
  );

  const vistaPrevia = (
    <VistaPrevia
      titulo={titulo}
      resumen={resumen}
      parrafos={listaParrafos}
      categoria={categoria}
      imagenUrl={imagenUrl}
      publicada={publicada}
      fecha={noticia?.publicada_at ?? null}
      slug={slugVisible}
      minutos={minutosLectura(cuerpo)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Móvil y tablet: alterna entre edición y vista previa (en escritorio se ven lado a lado). */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 lg:hidden" role="group" aria-label="Modo del editor">
        {(
          [
            { valor: "editar", etiqueta: "Editar", icono: PenLine },
            { valor: "vista", etiqueta: "Vista previa", icono: Eye },
          ] as const
        ).map((m) => (
          <button
            key={m.valor}
            type="button"
            aria-pressed={modo === m.valor}
            onClick={() => setModo(m.valor)}
            className={cn(
              "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
              modo === m.valor
                ? "bg-card text-azul-700 shadow-[0_1px_3px_rgb(10_26_63/0.14)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <m.icono className="size-4" aria-hidden />
            {m.etiqueta}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className={cn("min-w-0", modo !== "editar" && "hidden lg:block")}>{formulario}</div>
        <div className={cn("min-w-0", modo !== "vista" && "hidden lg:block")}>
          <div className="lg:sticky lg:top-24">{vistaPrevia}</div>
        </div>
      </div>
    </div>
  );
}

function VistaPrevia({
  titulo,
  resumen,
  parrafos: lista,
  categoria,
  imagenUrl,
  publicada,
  fecha,
  slug,
  minutos,
}: {
  titulo: string;
  resumen: string;
  parrafos: string[];
  categoria: string;
  imagenUrl: string | null;
  publicada: boolean;
  fecha: string | null;
  slug: string;
  minutos: number;
}) {
  const estilo = estiloCategoria(categoria);
  const [entrada, ...resto] = lista;
  return (
    <section aria-label="Vista previa de la noticia" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Eye className="size-3.5 text-azul-600" aria-hidden />
          Así se verá en el portal
        </p>
        <Badge tone={publicada ? "verde" : "neutral"} dot>
          {publicada ? "Se publica al guardar" : "Borrador"}
        </Badge>
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-subtle px-4 py-2 text-xs text-muted-foreground">
          <span className="flex gap-1" aria-hidden>
            <span className="size-2.5 rounded-full bg-red-300" />
            <span className="size-2.5 rounded-full bg-sol-300" />
            <span className="size-2.5 rounded-full bg-emerald-300" />
          </span>
          <span className="truncate font-mono">/noticias/{slug || "…"}</span>
          {publicada && slug ? <ExternalLink className="ml-auto size-3.5 shrink-0" aria-hidden /> : null}
        </div>
        <PortadaNoticia imagenUrl={imagenUrl} categoria={categoria} grande className="aspect-[21/9] w-full" />
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Badge tone={estilo.tono} dot>
              {categoria || "Sin categoría"}
            </Badge>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {fecha ? formatFechaLarga(fecha) : "Fecha de publicación"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden />
              {minutos} min de lectura
            </span>
          </div>
          <h2
            className={cn(
              "font-display text-2xl leading-tight font-semibold tracking-tight text-balance",
              titulo ? "text-foreground" : "text-muted-foreground/60",
            )}
          >
            {titulo || "El título de la noticia"}
          </h2>
          <p className={cn("text-[15px] leading-relaxed", resumen ? "text-muted-foreground" : "text-muted-foreground/60")}>
            {resumen || "El resumen aparece acá, debajo del título y en las tarjetas del listado."}
          </p>
          <div className="h-px bg-linear-to-r from-azul-200 via-celeste-200 to-sol-200" aria-hidden />
          {entrada ? (
            <p className="text-base leading-relaxed whitespace-pre-line text-foreground">{entrada}</p>
          ) : (
            <p className="text-sm text-muted-foreground/70">Empezá a escribir el cuerpo para verlo acá.</p>
          )}
          {resto.map((p, i) => (
            <p key={i} className="text-[15px] leading-[1.75] whitespace-pre-line text-foreground/90">
              {p}
            </p>
          ))}
        </div>
      </Card>
    </section>
  );
}
