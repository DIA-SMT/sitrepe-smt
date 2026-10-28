"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Building2, Droplets, LoaderCircle, MapPin, Plus, Search, Store, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TipoServicio } from "../../_lib/reglas";
import type { EstablecimientoOpcion, RubroOpcion } from "../../_lib/tipos";
import { buscarEstablecimientos, crearEstablecimiento } from "../actions";
import { usePlanilla } from "./contexto-planilla";
import { OpcionesRubro } from "./opciones-rubro";

type Vinculado = { id: string; nombre: string; domicilio: string };

type Props = {
  tipo: TipoServicio;
  rubros: RubroOpcion[];
  vinculado: Vinculado | null;
  onVincular: (establecimiento: EstablecimientoOpcion) => void;
  onDesvincular: () => void;
  error?: string;
};

type Alta = { nombre: string; domicilio: string; barrio: string; cuit: string; rubroId: string; tieneTanque: boolean };

/**
 * Vincula el servicio con un establecimiento del padrón (lo que permite seguir sus
 * vencimientos en la hoja de ruta): busca por nombre o domicilio, o lo da de alta.
 * Los campos no tienen `name`: no viajan con el formulario del servicio.
 */
export function BuscadorEstablecimiento({ tipo, rubros, vinculado, onVincular, onDesvincular, error }: Props) {
  const id = useId();
  const { diasTanque } = usePlanilla();
  const [modo, setModo] = useState<"buscar" | "alta">("buscar");
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<EstablecimientoOpcion[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consulta = useRef(0);

  const altaInicial: Alta = { nombre: "", domicilio: "", barrio: "", cuit: "", rubroId: "", tieneTanque: tipo === "tanque" };
  const [alta, setAlta] = useState<Alta>(altaInicial);
  const [erroresAlta, setErroresAlta] = useState<Record<string, string[] | undefined>>({});
  const [creando, startTransition] = useTransition();

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const nombreRubro = (rubroId: number | null) => rubros.find((r) => r.id === rubroId)?.nombre ?? null;

  const cambiarTexto = (valor: string) => {
    setTexto(valor);
    if (temporizador.current) clearTimeout(temporizador.current);
    const n = ++consulta.current;
    if (valor.trim().length < 2) {
      setResultados(null);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    temporizador.current = setTimeout(async () => {
      const r = await buscarEstablecimientos(valor);
      if (n !== consulta.current) return;
      setBuscando(false);
      if (r.ok) setResultados(r.datos ?? []);
      else {
        setResultados([]);
        toast.error(r.mensaje ?? "No se pudo buscar establecimientos.");
      }
    }, 300);
  };

  const elegir = (e: EstablecimientoOpcion) => {
    onVincular(e);
    setTexto("");
    setResultados(null);
  };

  const irAlAlta = () => {
    setAlta((a) => ({ ...a, nombre: a.nombre || texto.trim() }));
    setModo("alta");
  };

  const darDeAlta = () =>
    startTransition(async () => {
      const r = await crearEstablecimiento({
        nombre: alta.nombre,
        domicilio: alta.domicilio,
        barrio: alta.barrio,
        cuit: alta.cuit,
        rubroId: alta.rubroId,
        tieneTanque: alta.tieneTanque,
      });
      if (r.ok && r.datos) {
        toast.success(r.mensaje);
        setErroresAlta({});
        setAlta(altaInicial);
        setModo("buscar");
        elegir(r.datos);
      } else {
        setErroresAlta(r.errores ?? {});
        toast.error(r.mensaje ?? "No se pudo dar de alta el establecimiento.");
      }
    });

  const sinEnviar = (e: React.KeyboardEvent<HTMLInputElement>, accion?: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      accion?.();
    }
  };

  if (vinculado) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-azul-200 bg-azul-50/60 p-3 sm:items-center">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-azul-600 shadow-card ring-1 ring-azul-100"
        >
          <Store className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-azul-700 uppercase">Establecimiento vinculado</p>
          <p className="truncate font-medium text-foreground">{vinculado.nombre}</p>
          <p className="flex items-center gap-1 truncate text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {vinculado.domicilio}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDesvincular}>
          <Unlink aria-hidden />
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-dashed border-border-strong bg-subtle/60 p-3", error && "border-danger/60")}>
      <div role="group" aria-label="Cómo vincular el establecimiento" className="inline-flex w-fit gap-1 rounded-lg bg-muted p-1">
        {(
          [
            ["buscar", "Buscar existente", Search],
            ["alta", "Dar de alta", Plus],
          ] as const
        ).map(([valor, etiqueta, Icono]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={modo === valor}
            onClick={() => setModo(valor)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              modo === valor && "bg-card text-azul-700 shadow-[0_1px_3px_rgb(10_26_63/0.14)]",
            )}
          >
            <Icono className="size-3.5" aria-hidden />
            {etiqueta}
          </button>
        ))}
      </div>

      {modo === "buscar" ? (
        <div className="flex flex-col gap-2">
          <Input
            id={`${id}-buscar`}
            type="search"
            aria-label="Buscar establecimiento por nombre o domicilio"
            placeholder="Nombre, razón social o domicilio…"
            value={texto}
            onChange={(e) => cambiarTexto(e.target.value)}
            onKeyDown={(e) => sinEnviar(e)}
            leading={<Search aria-hidden />}
            trailing={buscando ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            autoComplete="off"
          />
          <p aria-live="polite" className="sr-only">
            {resultados ? `${resultados.length} establecimientos encontrados` : ""}
          </p>
          {resultados && resultados.length > 0 ? (
            <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
              {resultados.map((e) => {
                const rubro = nombreRubro(e.rubroId);
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => elegir(e)}
                      className="group flex w-full items-start gap-3 rounded-lg border border-transparent bg-card px-3 py-2.5 text-left shadow-xs transition-colors hover:border-azul-200 hover:bg-azul-50/60 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Building2 className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {e.nombre}
                          {e.nombreFantasia ? <span className="font-normal text-muted-foreground"> · {e.nombreFantasia}</span> : null}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {e.domicilio}
                          {e.barrio ? ` · ${e.barrio}` : ""}
                          {rubro ? ` · ${rubro}` : ""}
                        </span>
                      </span>
                      {tipo === "tanque" && e.tieneTanque ? (
                        <Badge tone="celeste" size="sm">
                          <Droplets aria-hidden />
                          Tanque
                        </Badge>
                      ) : null}
                      <span className="text-xs font-semibold text-azul-700 opacity-0 transition-opacity group-hover:opacity-100">
                        Vincular
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {resultados && resultados.length === 0 && !buscando ? (
            <div className="flex flex-col items-start gap-2 rounded-lg bg-card px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">No encontramos establecimientos con “{texto.trim()}”.</span>
              <Button type="button" size="sm" variant="secondary" onClick={irAlAlta}>
                <Plus aria-hidden />
                Darlo de alta
              </Button>
            </div>
          ) : null}
          {!resultados ? (
            <p className="text-[13px] leading-snug text-muted-foreground">
              Vincular el establecimiento permite que la Dirección siga sus vencimientos en la hoja de ruta. Si no lo encontrás,
              dalo de alta.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field htmlFor={`${id}-nombre`} label="Nombre o razón social" required error={erroresAlta.nombre?.[0]}>
            <Input
              id={`${id}-nombre`}
              value={alta.nombre}
              onChange={(e) => setAlta({ ...alta, nombre: e.target.value })}
              onKeyDown={(e) => sinEnviar(e)}
              placeholder="Ej.: Escuela N.º 123"
              autoComplete="off"
            />
          </Field>
          <Field htmlFor={`${id}-domicilio`} label="Domicilio" required error={erroresAlta.domicilio?.[0]}>
            <Input
              id={`${id}-domicilio`}
              value={alta.domicilio}
              onChange={(e) => setAlta({ ...alta, domicilio: e.target.value })}
              onKeyDown={(e) => sinEnviar(e)}
              placeholder="Calle y número"
              autoComplete="off"
            />
          </Field>
          <Field htmlFor={`${id}-barrio`} label="Barrio" error={erroresAlta.barrio?.[0]}>
            <Input
              id={`${id}-barrio`}
              value={alta.barrio}
              onChange={(e) => setAlta({ ...alta, barrio: e.target.value })}
              onKeyDown={(e) => sinEnviar(e)}
              autoComplete="off"
            />
          </Field>
          <Field htmlFor={`${id}-cuit`} label="CUIT" hint="Opcional." error={erroresAlta.cuit?.[0]}>
            <Input
              id={`${id}-cuit`}
              inputMode="numeric"
              value={alta.cuit}
              onChange={(e) => setAlta({ ...alta, cuit: e.target.value })}
              onKeyDown={(e) => sinEnviar(e)}
              placeholder="30-12345678-9"
              autoComplete="off"
            />
          </Field>
          <Field htmlFor={`${id}-rubro`} label="Rubro (actividad)" className="sm:col-span-2" error={erroresAlta.rubroId?.[0]}>
            <Select
              id={`${id}-rubro`}
              value={alta.rubroId}
              onChange={(e) => setAlta({ ...alta, rubroId: e.target.value })}
            >
              <option value="">Sin indicar</option>
              <OpcionesRubro rubros={rubros} />
            </Select>
          </Field>
          <Checkbox
            wrapperClassName="sm:col-span-2"
            checked={alta.tieneTanque}
            onChange={(e) => setAlta({ ...alta, tieneTanque: e.target.checked })}
            label="Tiene tanque de reserva o cisterna"
            description={`Alcanzado por la limpieza obligatoria cada ${diasTanque} días (Ord. 2004/92).`}
          />
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button type="button" size="sm" onClick={darDeAlta} loading={creando}>
              <Plus aria-hidden />
              Dar de alta y vincular
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setModo("buscar")} disabled={creando}>
              Volver a buscar
            </Button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
