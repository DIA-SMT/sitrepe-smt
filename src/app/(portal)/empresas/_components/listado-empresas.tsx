"use client";

import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Droplets,
  FileBadge,
  Hash,
  MapPin,
  Phone,
  Search,
  SearchX,
  SprayCan,
  UserRound,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { EmpresaPortal } from "@/lib/data/portal";
import { diasHasta, formatFecha } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";

export type FiltroActividad = "todas" | "fumigacion" | "tanques";
type Orden = "registro" | "nombre";

const ACTIVIDADES: { valor: FiltroActividad; label: string; icono: typeof SprayCan }[] = [
  { valor: "todas", label: "Todas", icono: Building2 },
  { valor: "fumigacion", label: "Fumigación", icono: SprayCan },
  { valor: "tanques", label: "Limpieza de tanques", icono: Droplets },
];

/** Minúsculas y sin acentos, para buscar sin importar cómo se escriba. */
function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type Props = {
  empresas: EmpresaPortal[];
  busquedaInicial?: string;
  actividadInicial?: FiltroActividad;
};

/** Listado filtrable (en el navegador) de las empresas habilitadas. Los filtros se reflejan en la URL. */
export function ListadoEmpresas({ empresas, busquedaInicial = "", actividadInicial = "todas" }: Props) {
  const idBusqueda = useId();
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [actividad, setActividad] = useState<FiltroActividad>(actividadInicial);
  const [orden, setOrden] = useState<Orden>("registro");
  const consulta = useDeferredValue(busqueda);

  // Refleja los filtros en la URL para poder compartir el enlace (sin volver a pedir datos).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = consulta.trim();
    if (q) params.set("q", q);
    else params.delete("q");
    if (actividad !== "todas") params.set("actividad", actividad);
    else params.delete("actividad");
    const nueva = `${window.location.pathname}${params.size ? `?${params}` : ""}`;
    if (nueva !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", nueva);
  }, [consulta, actividad]);

  const indice = useMemo(
    () =>
      empresas.map((e) => ({
        empresa: e,
        texto: normalizar([e.nombre, e.titular, e.cuit, e.domicilio, e.numeroRegistro?.toString()].join(" ")),
        digitos: (e.cuit ?? "").replace(/\D/g, ""),
      })),
    [empresas],
  );

  const conteos = useMemo(
    () => ({
      todas: empresas.length,
      fumigacion: empresas.filter((e) => e.fumigacion).length,
      tanques: empresas.filter((e) => e.tanques).length,
    }),
    [empresas],
  );

  const resultados = useMemo(() => {
    const q = normalizar(consulta.trim());
    const qDigitos = consulta.replace(/\D/g, "");
    const filtradas = indice
      .filter(({ empresa }) =>
        actividad === "fumigacion" ? empresa.fumigacion : actividad === "tanques" ? empresa.tanques : true,
      )
      .filter(({ texto, digitos }) => {
        if (!q) return true;
        if (texto.includes(q)) return true;
        return qDigitos.length >= 3 && digitos.includes(qDigitos);
      })
      .map(({ empresa }) => empresa);
    return filtradas.sort((a, b) =>
      orden === "nombre"
        ? a.nombre.localeCompare(b.nombre, "es")
        : (a.numeroRegistro ?? Number.MAX_SAFE_INTEGER) - (b.numeroRegistro ?? Number.MAX_SAFE_INTEGER),
    );
  }, [indice, consulta, actividad, orden]);

  const hayFiltros = busqueda.trim() !== "" || actividad !== "todas";
  const limpiar = () => {
    setBusqueda("");
    setActividad("todas");
  };

  if (empresas.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Todavía no hay empresas publicadas"
        description="El listado se genera automáticamente con las empresas habilitadas en el registro municipal. Volvé a consultar en unos días."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <div className="sticky top-[73px] z-20 -mx-4 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:rounded-card sm:border sm:bg-card sm:p-4 sm:shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <label htmlFor={idBusqueda} className="sr-only">
              Buscar por nombre, CUIT o titular
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id={idBusqueda}
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscá por nombre, CUIT o titular"
              autoComplete="off"
              className="h-11 w-full rounded-control border border-input bg-card pr-10 pl-9 text-sm shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground hover:border-noche-500 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 [&::-webkit-search-cancel-button]:hidden"
            />
            {busqueda ? (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Borrar búsqueda"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>

          <fieldset className="min-w-0">
            <legend className="sr-only">Actividad habilitada</legend>
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
              {ACTIVIDADES.map((a) => {
                const Icono = a.icono;
                const activo = actividad === a.valor;
                return (
                  <label
                    key={a.valor}
                    className={cn(
                      "relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-ring",
                      activo ? "bg-card text-azul-700 shadow-[0_1px_3px_rgb(10_26_63/0.14)]" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <input
                      type="radio"
                      name="actividad"
                      value={a.valor}
                      checked={activo}
                      onChange={() => setActividad(a.valor)}
                      className="sr-only"
                    />
                    <Icono className="size-4" aria-hidden />
                    {a.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[11px] nums-tabular",
                        activo ? "bg-azul-50 text-azul-700" : "bg-white/70 text-muted-foreground",
                      )}
                    >
                      {conteos[a.valor]}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Select
            aria-label="Ordenar empresas"
            value={orden}
            onChange={(e) => setOrden(e.target.value === "nombre" ? "nombre" : "registro")}
            wrapperClassName="lg:w-48"
            className="h-11"
          >
            <option value="registro">Orden: N.º de registro</option>
            <option value="nombre">Orden: nombre (A-Z)</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
          {resultados.length === empresas.length
            ? `${empresas.length} ${empresas.length === 1 ? "empresa habilitada" : "empresas habilitadas"}`
            : `${resultados.length} de ${empresas.length} ${empresas.length === 1 ? "empresa" : "empresas"}`}
        </p>
        {hayFiltros ? (
          <Button type="button" variant="ghost" size="sm" onClick={limpiar}>
            <X aria-hidden />
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      {resultados.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No encontramos empresas con esos filtros"
          description="Revisá cómo escribiste el nombre o el CUIT, o probá con otra actividad. Si la empresa no figura, no está habilitada por la Municipalidad."
          action={
            <>
              <Button type="button" variant="outline" onClick={limpiar}>
                Limpiar filtros
              </Button>
              <Button asChild variant="ghost">
                <Link href="/denuncias">Denunciar a una empresa no habilitada</Link>
              </Button>
            </>
          }
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {resultados.map((e) => (
            <li key={e.id}>
              <TarjetaEmpresa empresa={e} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TarjetaEmpresa({ empresa: e }: { empresa: EmpresaPortal }) {
  const dias = diasHasta(e.vencimiento);
  const porVencer = dias !== null && dias <= 30;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-azul-200 hover:shadow-elevated">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-azul-600 via-celeste-400 to-sol-400 opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="flex items-start gap-4 p-5 pb-4">
        <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
          <span className="text-[9px] leading-none font-medium tracking-wide uppercase opacity-85">N.º</span>
          <span className="font-display text-lg leading-tight font-bold nums-tabular">{e.numeroRegistro ?? "—"}</span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[17px] leading-snug font-semibold text-foreground">
            <Link
              href={`/empresas/${e.id}`}
              className="rounded-sm after:absolute after:inset-0 after:content-[''] group-hover:text-azul-700"
            >
              {e.nombre}
            </Link>
          </h2>
          {e.titular ? (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-muted-foreground">
              <UserRound className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{e.titular}</span>
            </p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {e.fumigacion ? (
              <Badge tone="azul" size="sm" title="F · Fumigación y desinfección">
                <SprayCan aria-hidden />
                Fumigación
              </Badge>
            ) : null}
            {e.tanques ? (
              <Badge tone="celeste" size="sm" title="T · Limpieza de tanques">
                <Droplets aria-hidden />
                Tanques
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <dl className="grid gap-2.5 border-t border-border px-5 py-4 text-[13px]">
        <Dato icono={Hash} etiqueta="CUIT" valor={e.cuit} mono />
        <Dato
          icono={Phone}
          etiqueta="Teléfono"
          valor={
            e.telefono ? (
              <a
                href={`tel:${e.telefono.replace(/[^\d+]/g, "")}`}
                className="relative z-10 rounded-sm text-azul-700 hover:underline"
              >
                {e.telefono}
              </a>
            ) : null
          }
        />
        <Dato icono={MapPin} etiqueta="Domicilio" valor={e.domicilio} />
        <Dato
          icono={FileBadge}
          etiqueta="Habilitación"
          valor={
            e.habilitacionComercial || e.resolucionDsa ? (
              <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                {e.habilitacionComercial ? <span className="nums-tabular">Hab. {e.habilitacionComercial}</span> : null}
                {e.resolucionDsa ? <span className="nums-tabular">Res. {e.resolucionDsa}</span> : null}
              </span>
            ) : null
          }
        />
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border bg-subtle/70 px-5 py-3">
        <p className={cn("flex items-center gap-1.5 text-[13px]", porVencer ? "text-warning" : "text-muted-foreground")}>
          <CalendarCheck className="size-4 shrink-0" aria-hidden />
          {e.vencimiento ? (
            <span>
              Vigente hasta <span className="font-medium text-foreground nums-tabular">{formatFecha(e.vencimiento)}</span>
            </span>
          ) : (
            <span>Habilitación vigente</span>
          )}
        </p>
        <span aria-hidden className="inline-flex items-center gap-1 text-[13px] font-semibold text-azul-700">
          Ver ficha
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}

function Dato({
  icono: Icono,
  etiqueta,
  valor,
  mono = false,
}: {
  icono: typeof Hash;
  etiqueta: string;
  valor: React.ReactNode;
  mono?: boolean;
}) {
  // Dentro de <dl> cada grupo solo puede contener <dt> y <dd>: el ícono va dentro del <dd>.
  return (
    <div>
      <dt className="sr-only">{etiqueta}</dt>
      <dd className="flex items-start gap-2.5">
        <Icono className="mt-0.5 size-3.5 shrink-0 text-noche-400" aria-hidden />
        <span className={cn("min-w-0 break-words text-foreground", mono && "nums-tabular", !valor && "text-muted-foreground")}>
          {valor || "No informado"}
        </span>
      </dd>
    </div>
  );
}
