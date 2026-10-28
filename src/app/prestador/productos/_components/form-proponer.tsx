"use client";

import { useMemo, useState } from "react";
import { Check, Clock, FlaskConical, PackagePlus, Search, Send, ShieldAlert, Syringe } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CLASE_PRODUCTO, ESTADO_MEMORIA, ORGANISMO } from "@/lib/domain/etiquetas";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { ErrorCampo } from "../../legajo/_components/error-campo";
import { useEnvio } from "../../legajo/_components/use-envio";
import { proponerProducto } from "../actions";
import { etiquetaToxicidad, textoReingreso } from "../_lib/toxicidad";

export type ProductoCatalogo = {
  id: string;
  nombre_comercial: string;
  principio_activo: string;
  concentracion: string | null;
  clase: Enums<"clase_producto">;
  formulacion: string | null;
  organismo: Enums<"organismo_registro">;
  registro_numero: string;
  categoria_toxicologica: string | null;
  antidoto: string | null;
  precauciones: string | null;
  plazo_reingreso_horas: number;
};

type FormProponerProps = {
  catalogo: ProductoCatalogo[];
  /** producto_id → estado en la memoria técnica de la empresa. */
  enMemoria: Record<string, Enums<"estado_memoria">>;
  bloqueado?: string | null;
  variante?: "primary" | "secondary";
};

const MAX_RESULTADOS = 40;

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Búsqueda en el catálogo de productos registrados y propuesta para la memoria técnica. */
export function FormProponer({ catalogo, enMemoria, bloqueado, variante = "primary" }: FormProponerProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const { pendiente, onSubmit, error, reiniciar } = useEnvio(proponerProducto, { alExito: () => setAbierto(false) });

  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const filtrados = q
      ? catalogo.filter((p) =>
          normalizar(`${p.nombre_comercial} ${p.principio_activo} ${p.registro_numero} ${p.clase}`).includes(q),
        )
      : catalogo;
    return { lista: filtrados.slice(0, MAX_RESULTADOS), total: filtrados.length };
  }, [busqueda, catalogo]);

  const producto = catalogo.find((p) => p.id === seleccionado) ?? null;
  const toxicidad = etiquetaToxicidad(producto?.categoria_toxicologica);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (pendiente) return;
        setAbierto(v);
        if (v) {
          setBusqueda("");
          setSeleccionado(null);
          reiniciar();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variante} disabled={Boolean(bloqueado)} title={bloqueado ?? undefined}>
          <PackagePlus aria-hidden />
          Proponer producto
        </Button>
      </DialogTrigger>
      <DialogContent size="xl">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Proponer producto para la memoria técnica</DialogTitle>
            <DialogDescription>
              Buscá el producto en el catálogo de productos domisanitarios registrados (ANMAT o SENASA) e indicá cómo
              lo vas a aplicar. Se presenta un trámite de alta de producto.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-3">
              <Input
                type="search"
                aria-label="Buscar en el catálogo"
                placeholder="Nombre, principio activo o N.º de registro…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                leading={<Search aria-hidden />}
              />
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {resultados.total === 0
                  ? "No hay productos que coincidan."
                  : resultados.total > MAX_RESULTADOS
                    ? `Mostrando ${MAX_RESULTADOS} de ${resultados.total}: refiná la búsqueda.`
                    : `${resultados.total} producto${resultados.total === 1 ? "" : "s"}`}
              </p>
              <fieldset className="min-w-0">
                <legend className="sr-only">Producto del catálogo</legend>
                <ul className="flex max-h-[min(22rem,45dvh)] flex-col gap-2 overflow-y-auto pr-1">
                  {resultados.lista.map((p) => {
                    const estado = enMemoria[p.id];
                    const deshabilitado = Boolean(estado);
                    const activo = seleccionado === p.id;
                    return (
                      <li key={p.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-[border-color,background-color,box-shadow]",
                            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                            activo ? "border-azul-500 bg-azul-50/70 shadow-[0_0_0_3px_rgb(0_102_255/0.12)]" : "border-border hover:border-azul-200",
                            deshabilitado && "cursor-not-allowed opacity-60 hover:border-border",
                          )}
                        >
                          <input
                            type="radio"
                            name="producto_id"
                            value={p.id}
                            required
                            disabled={deshabilitado}
                            checked={activo}
                            onChange={() => setSeleccionado(p.id)}
                            className="sr-only"
                          />
                          <span
                            aria-hidden
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                              activo ? "border-azul-600 bg-azul-600 text-white" : "border-input bg-card",
                            )}
                          >
                            {activo ? <Check className="size-3" strokeWidth={3} /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm leading-snug font-semibold">{p.nombre_comercial}</span>
                            <span className="block text-xs text-muted-foreground">
                              {p.principio_activo}
                              {p.concentracion ? ` ${p.concentracion}` : null}
                            </span>
                            <span className="mt-1.5 flex flex-wrap gap-1">
                              <Badge size="sm" tone={CLASE_PRODUCTO[p.clase].tono}>
                                {CLASE_PRODUCTO[p.clase].label}
                              </Badge>
                              <Badge size="sm" tone={ORGANISMO[p.organismo].tono} variant="outline">
                                {p.organismo} {p.registro_numero}
                              </Badge>
                              {estado ? (
                                <StatusBadge size="sm" label={`En tu memoria: ${ESTADO_MEMORIA[estado].label.toLowerCase()}`} tone="neutral" />
                              ) : null}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
              <ErrorCampo mensaje={error("producto_id")} />
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              {producto ? (
                <>
                  <div className="relative overflow-hidden rounded-xl border border-azul-100 bg-gradient-brand-soft p-4">
                    <p className="text-xs font-semibold tracking-wide text-azul-700 uppercase">Ficha del producto</p>
                    <p className="mt-1 font-display text-base font-semibold">{producto.nombre_comercial}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {producto.principio_activo}
                      {producto.formulacion ? ` · ${producto.formulacion}` : null}
                    </p>
                    <ul className="mt-3 grid gap-2 text-[13px]">
                      <li className="flex items-start gap-2">
                        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                        <span>{toxicidad ? toxicidad.label : "Categoría toxicológica sin informar"}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Clock className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                        <span>Plazo de reingreso: {textoReingreso(producto.plazo_reingreso_horas)}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Syringe className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
                        <span>Antídoto / tratamiento: {producto.antidoto ?? "sin informar"}</span>
                      </li>
                    </ul>
                  </div>
                  <Field htmlFor="prop-dosis" label="Dosis de aplicación" required error={error("dosis")}>
                    <Input id="prop-dosis" name="dosis" required maxLength={200} placeholder="Ej.: 50 ml cada 10 litros de agua" />
                  </Field>
                  <Field htmlFor="prop-concentracion" label="Concentración de uso" error={error("concentracion_uso")}>
                    <Input id="prop-concentracion" name="concentracion_uso" maxLength={200} placeholder="Ej.: 0,5 % del principio activo" />
                  </Field>
                  <Field
                    htmlFor="prop-precauciones"
                    label="Precauciones y protección personal"
                    hint="Sugeridas a partir del rótulo: ajustalas a tu protocolo."
                    error={error("precauciones")}
                  >
                    <Textarea
                      key={producto.id}
                      id="prop-precauciones"
                      name="precauciones"
                      rows={4}
                      maxLength={1500}
                      defaultValue={producto.precauciones ?? ""}
                    />
                  </Field>
                </>
              ) : (
                <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong bg-subtle p-6 text-center">
                  <span aria-hidden className="flex size-12 items-center justify-center rounded-2xl bg-card text-azul-600 ring-1 ring-azul-100">
                    <FlaskConical className="size-6" />
                  </span>
                  <p className="text-sm font-medium">Elegí un producto de la lista</p>
                  <p className="max-w-xs text-[13px] text-muted-foreground">
                    Vas a ver su ficha (toxicidad, reingreso y antídoto) y podrás indicar la dosis y las precauciones.
                  </p>
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={pendiente} disabled={!producto}>
              {pendiente ? null : <Send aria-hidden />}
              Presentar propuesta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
