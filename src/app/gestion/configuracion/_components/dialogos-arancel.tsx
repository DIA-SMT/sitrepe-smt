"use client";

import { useId, useState } from "react";
import { ArrowRight, CalendarClock, Plus, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
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
import { Select } from "@/components/ui/select";
import { formatFecha, formatPesos } from "@/lib/domain/formato";
import type { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { useEnvio } from "../_compartido/use-envio";
import { nuevaVersionArancel, nuevoConceptoArancel } from "../actions";

type Arancel = Tables<"aranceles">;
type Cuenta = Tables<"cuentas_recaudadoras">;

/** Día siguiente a una fecha 'AAAA-MM-DD'. */
function diaSiguiente(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1, 12)).toISOString().slice(0, 10);
}

function diaAnterior(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d - 1, 12)).toISOString().slice(0, 10);
}

/** Las Ordenanzas Tarifarias rigen desde el 1.º de enero: se propone el próximo. */
function vigenciaSugerida(ultimaDesde: string, hoy: string): string {
  const proximoEnero = `${Number(hoy.slice(0, 4)) + 1}-01-01`;
  return proximoEnero > ultimaDesde ? proximoEnero : diaSiguiente(ultimaDesde);
}

function EncabezadoDialogo({ titulo, descripcion }: { titulo: string; descripcion: React.ReactNode }) {
  return (
    <DialogHeader className="flex-row items-start gap-4">
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
      >
        <Receipt className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <DialogTitle>{titulo}</DialogTitle>
        <DialogDescription>{descripcion}</DialogDescription>
      </div>
    </DialogHeader>
  );
}

function OpcionesCuenta({ cuentas }: { cuentas: Cuenta[] }) {
  return cuentas.map((c) => (
    <option key={c.id} value={c.id}>
      Cuenta {c.codigo} · {c.nombre}
      {c.activo ? "" : " (inactiva)"}
    </option>
  ));
}

/* =============================================================================
 * Nueva versión de un concepto
 * ========================================================================== */

type PropsVersion = {
  codigo: string;
  concepto: string;
  /** Última versión cargada (la más nueva). */
  ultima: Arancel;
  /** Importe vigente hoy, para mostrar la variación. */
  importeVigente: number | null;
  cuentas: Cuenta[];
  hoy: string;
};

export function DialogoNuevaVersion(props: PropsVersion) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <CalendarClock aria-hidden />
          Nueva versión
        </Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <FormularioVersion {...props} onCerrar={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioVersion({ codigo, concepto, ultima, importeVigente, cuentas, hoy, onCerrar }: PropsVersion & { onCerrar: () => void }) {
  const id = useId();
  const f = (campo: string) => `${id}-${campo}`;
  const [importe, setImporte] = useState("");
  const [desde, setDesde] = useState(vigenciaSugerida(ultima.vigente_desde, hoy));
  const [estado, despachar, pendiente] = useAccion(nuevaVersionArancel, { alExito: onCerrar });
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];

  const nuevo = Number(importe.replace(",", "."));
  const base = importeVigente ?? Number(ultima.importe);
  const variacion = importe && Number.isFinite(nuevo) && base > 0 ? ((nuevo - base) / base) * 100 : null;
  const minimo = diaSiguiente(ultima.vigente_desde);
  const cierre = desde && desde >= minimo ? diaAnterior(desde) : null;

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <input type="hidden" name="codigo" value={codigo} />
      <EncabezadoDialogo
        titulo="Nueva versión del importe"
        descripcion={
          <>
            <span className="font-medium text-foreground">{concepto}</span>. La versión actual se cierra el día anterior
            al inicio de la nueva y queda en el historial.
          </>
        }
      />
      <DialogBody className="grid gap-5 sm:grid-cols-6">
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No se pudo cargar la versión" className="sm:col-span-6">
            {estado.mensaje}
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-subtle p-4 sm:col-span-6">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Importe actual</span>
            <span className="font-display text-lg font-semibold nums-tabular">{formatPesos(base)}</span>
            <span className="text-xs text-muted-foreground">
              Ord. {ultima.ordenanza} · desde {formatFecha(ultima.vigente_desde)}
            </span>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Nuevo importe</span>
            <span className={cn("font-display text-lg font-semibold nums-tabular", !importe && "text-muted-foreground/60")}>
              {importe && Number.isFinite(nuevo) ? formatPesos(nuevo) : "$ —"}
            </span>
            {variacion !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold",
                  variacion > 0 ? "text-amber-700" : variacion < 0 ? "text-emerald-700" : "text-muted-foreground",
                )}
              >
                {variacion >= 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
                {variacion > 0 ? "+" : ""}
                {variacion.toLocaleString("es-AR", { maximumFractionDigits: 1 })}% respecto del vigente
              </span>
            ) : null}
          </div>
        </div>

        <Field htmlFor={f("importe")} label="Importe" required error={error("importe")} className="sm:col-span-3">
          <Input
            id={f("importe")}
            name="importe"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            leading={<span className="text-sm text-muted-foreground">$</span>}
            placeholder={String(ultima.importe)}
            required
          />
        </Field>

        <Field
          htmlFor={f("desde")}
          label="Vigente desde"
          required
          error={error("vigente_desde")}
          hint={cierre ? `La versión anterior valdrá hasta el ${formatFecha(cierre)}.` : `Posterior al ${formatFecha(ultima.vigente_desde)}.`}
          className="sm:col-span-3"
        >
          <Input
            id={f("desde")}
            name="vigente_desde"
            type="date"
            min={minimo}
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            required
          />
        </Field>

        <Field
          htmlFor={f("ordenanza")}
          label="Ordenanza Tarifaria"
          required
          error={error("ordenanza")}
          hint="Número y año, p. ej. 5487/27."
          className="sm:col-span-2"
        >
          <Input id={f("ordenanza")} name="ordenanza" defaultValue={ultima.ordenanza} maxLength={40} required />
        </Field>

        <Field htmlFor={f("articulo")} label="Artículo" required error={error("articulo")} className="sm:col-span-4">
          <Input id={f("articulo")} name="articulo" defaultValue={ultima.articulo} maxLength={120} required />
        </Field>

        <Field htmlFor={f("unidad")} label="Unidad de cobro" required error={error("unidad")} className="sm:col-span-2">
          <Input id={f("unidad")} name="unidad" defaultValue={ultima.unidad} maxLength={40} required />
        </Field>

        <Field htmlFor={f("cuenta")} label="Cuenta recaudadora" required error={error("cuenta_id")} className="sm:col-span-4">
          <Select id={f("cuenta")} name="cuenta_id" defaultValue={String(ultima.cuenta_id)}>
            <OpcionesCuenta cuentas={cuentas} />
          </Select>
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pendiente}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pendiente}>
          Cargar nueva versión
        </Button>
      </DialogFooter>
    </form>
  );
}

/* =============================================================================
 * Concepto nuevo
 * ========================================================================== */

export function DialogoNuevoConcepto({ cuentas, hoy }: { cuentas: Cuenta[]; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden />
          Nuevo concepto
        </Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <FormularioConcepto cuentas={cuentas} hoy={hoy} onCerrar={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioConcepto({ cuentas, hoy, onCerrar }: { cuentas: Cuenta[]; hoy: string; onCerrar: () => void }) {
  const id = useId();
  const f = (campo: string) => `${id}-${campo}`;
  const [codigo, setCodigo] = useState("");
  const [estado, despachar, pendiente] = useAccion(nuevoConceptoArancel, { alExito: onCerrar });
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];
  const activas = cuentas.filter((c) => c.activo);

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <EncabezadoDialogo
        titulo="Nuevo concepto de cobro"
        descripcion="Para conceptos que incorpora una Ordenanza Tarifaria. Si el concepto ya existe y cambia el importe, cargá una nueva versión."
      />
      <DialogBody className="grid gap-5 sm:grid-cols-6">
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No se pudo crear el concepto" className="sm:col-span-6">
            {estado.mensaje}
          </Alert>
        ) : null}

        <Field htmlFor={f("concepto")} label="Concepto" required error={error("concepto")} className="sm:col-span-6">
          <Input
            id={f("concepto")}
            name="concepto"
            maxLength={160}
            placeholder="Ej.: Desinfección de vehículos de transporte"
            onChange={(e) => {
              // Sugiere un código a partir del concepto mientras el usuario no lo haya escrito a mano.
              if (codigo === "" || codigo === sugerirCodigo(e.target.value.slice(0, -1))) {
                setCodigo(sugerirCodigo(e.target.value));
              }
            }}
            required
          />
        </Field>

        <Field
          htmlFor={f("codigo")}
          label="Código interno"
          required
          error={error("codigo")}
          hint="En mayúsculas, sin espacios. No se puede cambiar después."
          className="sm:col-span-3"
        >
          <Input
            id={f("codigo")}
            name="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
            maxLength={40}
            className="font-mono uppercase"
            required
          />
        </Field>

        <Field htmlFor={f("unidad")} label="Unidad de cobro" required error={error("unidad")} className="sm:col-span-3">
          <Input id={f("unidad")} name="unidad" defaultValue="por trámite" maxLength={40} required />
        </Field>

        <Field htmlFor={f("importe")} label="Importe" required error={error("importe")} className="sm:col-span-3">
          <Input
            id={f("importe")}
            name="importe"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            leading={<span className="text-sm text-muted-foreground">$</span>}
            required
          />
        </Field>

        <Field htmlFor={f("desde")} label="Vigente desde" required error={error("vigente_desde")} className="sm:col-span-3">
          <Input id={f("desde")} name="vigente_desde" type="date" defaultValue={hoy} required />
        </Field>

        <Field htmlFor={f("ordenanza")} label="Ordenanza Tarifaria" required error={error("ordenanza")} className="sm:col-span-2">
          <Input id={f("ordenanza")} name="ordenanza" placeholder="5487/27" maxLength={40} required />
        </Field>

        <Field htmlFor={f("articulo")} label="Artículo" required error={error("articulo")} className="sm:col-span-4">
          <Input id={f("articulo")} name="articulo" placeholder="Art. 40, inc. b), apartado 4" maxLength={120} required />
        </Field>

        <Field
          htmlFor={f("cuenta")}
          label="Cuenta recaudadora"
          required
          error={error("cuenta_id")}
          hint="Define el medio de pago que verá la empresa."
          className="sm:col-span-6"
        >
          <Select id={f("cuenta")} name="cuenta_id" placeholder="Elegí la cuenta">
            <OpcionesCuenta cuentas={activas.length ? activas : cuentas} />
          </Select>
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pendiente}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pendiente}>
          Crear concepto
        </Button>
      </DialogFooter>
    </form>
  );
}

function sugerirCodigo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
