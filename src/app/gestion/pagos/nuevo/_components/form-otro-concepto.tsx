"use client";

import { useState } from "react";
import { BadgeCheck, Building2, CircleAlert, Hash, Info, Scale, Stamp, UserRound } from "lucide-react";
import { PetalDecor } from "@/components/brand/petal-decor";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { SubirArchivo } from "@/components/shared/subir-archivo";
import { useAccion } from "@/components/shared/use-accion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cuitValido } from "@/lib/domain/cuit";
import { formatPesos } from "@/lib/domain/formato";
import { pesosEnLetras } from "@/lib/domain/numeros-a-letras";
import { cn } from "@/lib/utils";
import { enviarSinReiniciar } from "@/app/prestador/pagos/_components/enviar-sin-reiniciar";
import { registrarOtroConcepto } from "../../actions";

export type ArancelOpcion = {
  id: number;
  concepto: string;
  importe: number;
  unidad: string;
  ordenanza: string;
  articulo: string;
  cuenta: { codigo: string; nombre: string; medios: { valor: string; label: string }[] } | null;
};

export type EmpresaOpcion = { id: string; nombre: string; cuit: string };

type Props = {
  aranceles: ArancelOpcion[];
  empresas: EmpresaOpcion[];
  empresaInicial?: string;
  hoy: string;
  /** Carpeta del comprobante: ['staff', 'AAAA-MM']. */
  carpeta: string[];
};

/** Alta de un pago de otros conceptos (cuenta 091 u otras) y verificación inmediata. */
export function FormOtroConcepto({ aranceles, empresas, empresaInicial, hoy, carpeta }: Props) {
  const [estado, accion, pendiente] = useAccion(registrarOtroConcepto);
  const err = (campo: string) => estado.errores?.[campo]?.[0];

  const [arancelId, setArancelId] = useState<string>(aranceles.length === 1 ? String(aranceles[0].id) : "");
  // Campos controlados + envío sin reinicio del formulario: con `<form action>`, React devolvería los <select>
  // y los radios a su opción inicial al fallar la acción (y el reenvío mandaría otro concepto u otra empresa).
  const [modo, setModo] = useState<"padron" | "otro">("padron");
  const [empresa, setEmpresa] = useState(empresaInicial ?? "");
  const [contribuyente, setContribuyente] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [medio, setMedio] = useState("");
  const [cuit, setCuit] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [operacion, setOperacion] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const arancel = aranceles.find((a) => String(a.id) === arancelId) ?? null;
  const medios = arancel?.cuenta?.medios ?? [];
  const medioActual = medios.some((m) => m.valor === medio) ? medio : (medios[0]?.valor ?? "");
  const n = cantidad.trim() === "" ? Number.NaN : Number(cantidad);
  const cantidadValida = Number.isInteger(n) && n >= 1 && n <= 999;
  // En centavos, igual que el servidor y que round(importe_unitario * cantidad, 2) en la base.
  const total = arancel && cantidadValida ? (Math.round(arancel.importe * 100) * n) / 100 : 0;
  const cuitCompleto = cuit.replace(/\D/g, "").length === 11;

  return (
    <form
      onSubmit={enviarSinReiniciar(accion, pendiente)}
      aria-busy={pendiente || undefined}
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start"
    >
      <div className="flex min-w-0 flex-col gap-6">
        {/* Concepto */}
        <Card className="gap-5 p-5 sm:p-6">
          <Encabezado numero={1} titulo="Concepto" descripcion="Arancel vigente según la Ordenanza Tarifaria." />
          <Field htmlFor="arancel" label="Concepto a cobrar" required error={err("arancel")}>
            <Select
              id="arancel"
              name="arancel"
              placeholder="Elegí un concepto"
              value={arancelId}
              onChange={(e) => setArancelId(e.target.value)}
            >
              {aranceles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.concepto} · {formatPesos(a.importe, false)}
                </option>
              ))}
            </Select>
          </Field>
          {arancel ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-subtle px-4 py-3 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Scale className="size-3.5 text-azul-600" aria-hidden />
                Ord. {arancel.ordenanza}, {arancel.articulo}
              </span>
              {arancel.cuenta ? (
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="size-3.5 text-azul-600" aria-hidden />
                  Cuenta {arancel.cuenta.codigo} · {arancel.cuenta.nombre}
                </span>
              ) : null}
            </div>
          ) : null}
          <Field
            htmlFor="cantidad"
            label="Cantidad"
            required
            error={err("cantidad")}
            hint={arancel ? `Importe ${arancel.unidad}.` : undefined}
            className="sm:max-w-48"
          >
            <Input
              id="cantidad"
              name="cantidad"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              step={1}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </Field>
        </Card>

        {/* Contribuyente */}
        <Card className="gap-5 p-5 sm:p-6">
          <Encabezado numero={2} titulo="Contribuyente" descripcion="Quién realizó el pago." />
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Tipo de contribuyente</legend>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              {(
                [
                  { valor: "padron", label: "Empresa del padrón", icono: Building2 },
                  { valor: "otro", label: "Otro contribuyente", icono: UserRound },
                ] as const
              ).map((op) => {
                const Icono = op.icono;
                return (
                  <label key={op.valor} className="relative">
                    <input
                      type="radio"
                      name="modo"
                      value={op.valor}
                      checked={modo === op.valor}
                      onChange={() => setModo(op.valor)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-noche-600 transition-all hover:text-foreground",
                        "peer-checked:bg-card peer-checked:text-azul-700 peer-checked:shadow-card peer-checked:ring-1 peer-checked:ring-azul-100",
                        "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                      )}
                    >
                      <Icono className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{op.label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {modo === "padron" ? (
            <Field htmlFor="empresa" label="Empresa" required error={err("empresa")}>
              <Select
                id="empresa"
                name="empresa"
                placeholder="Elegí la empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} · {e.cuit}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Field htmlFor="contribuyente" label="Nombre o razón social" required error={err("contribuyente")}>
                <Input
                  id="contribuyente"
                  name="contribuyente"
                  maxLength={160}
                  autoComplete="organization"
                  value={contribuyente}
                  onChange={(e) => setContribuyente(e.target.value)}
                />
              </Field>
              <Field
                htmlFor="contribuyente_cuit"
                label="CUIT/CUIL"
                required
                error={err("contribuyente_cuit") ?? (cuitCompleto && !cuitValido(cuit) ? "El dígito verificador no coincide." : null)}
              >
                <Input
                  id="contribuyente_cuit"
                  name="contribuyente_cuit"
                  inputMode="numeric"
                  placeholder="20-12345678-9"
                  maxLength={13}
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                  trailing={
                    cuitCompleto && cuitValido(cuit) ? <BadgeCheck className="text-success" aria-label="CUIT válido" /> : null
                  }
                />
              </Field>
            </div>
          )}
        </Card>

        {/* Pago */}
        <Card className="gap-5 p-5 sm:p-6">
          <Encabezado numero={3} titulo="Pago" descripcion="Datos de la acreditación y comprobante." />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field htmlFor="medio" label="Medio de pago" required error={err("medio")}>
              <Select
                id="medio"
                name="medio"
                value={medioActual}
                onChange={(e) => setMedio(e.target.value)}
                disabled={medios.length === 0}
              >
                {medios.length === 0 ? <option value="">Elegí primero el concepto</option> : null}
                {medios.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="fecha_pago" label="Fecha de pago" required error={err("fecha_pago")}>
              <Input
                id="fecha_pago"
                name="fecha_pago"
                type="date"
                max={hoy}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </Field>
            <Field
              htmlFor="numero_operacion"
              label="N.º de operación o de boleta"
              error={err("numero_operacion")}
              className="sm:col-span-2"
            >
              <Input
                id="numero_operacion"
                name="numero_operacion"
                maxLength={60}
                autoComplete="off"
                value={operacion}
                onChange={(e) => setOperacion(e.target.value)}
                leading={<Hash aria-hidden />}
              />
            </Field>
            <div className="sm:col-span-2">
              <SubirArchivo
                name="comprobante"
                bucket="comprobantes"
                carpeta={carpeta}
                label="Comprobante"
                hint="Boleta de Rentas, ticket de plataforma o constancia. PDF, JPG o PNG de hasta 10 MB."
              />
              {err("comprobante") ? (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-danger">
                  <CircleAlert className="size-3.5" aria-hidden />
                  {err("comprobante")}
                </p>
              ) : null}
            </div>
            <Field htmlFor="observaciones" label="Observaciones" error={err("observaciones")} className="sm:col-span-2">
              <Textarea
                id="observaciones"
                name="observaciones"
                rows={2}
                maxLength={500}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej.: Reinspección del local de Av. Mate de Luna 2100 (acta N.º …)."
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Resumen */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24" aria-label="Resumen del pago">
        <div className="relative overflow-hidden rounded-card bg-noche p-5 text-white shadow-elevated sm:p-6">
          <PetalDecor variant="corner" tone="dark" />
          <div className="relative flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-celeste-200 uppercase">Total a registrar</p>
            <p className="font-display text-4xl leading-none font-bold tracking-tight nums-tabular" aria-live="polite">
              <AnimatedNumber value={total} format="currency" duration={0.5} />
            </p>
            <p className="min-h-8 text-[11px] leading-snug font-medium tracking-wide text-noche-200">
              {total > 0 ? pesosEnLetras(total) : "Elegí el concepto y la cantidad."}
            </p>
            {arancel && cantidadValida ? (
              <p className="w-fit rounded-full bg-white/10 px-3 py-1 text-sm ring-1 ring-white/15 nums-tabular">
                {n} × {formatPesos(arancel.importe)}
              </p>
            ) : null}
          </div>
        </div>
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
          El importe se toma del arancel vigente. Al registrar, el pago queda verificado y se suma a la recaudación del mes
          de la cuenta correspondiente.
        </p>
        <Button type="submit" size="lg" loading={pendiente} disabled={!arancel || !cantidadValida}>
          {pendiente ? null : <Stamp aria-hidden />}
          {pendiente ? "Registrando…" : "Registrar y verificar pago"}
        </Button>
      </aside>
    </form>
  );
}

function Encabezado({ numero, titulo, descripcion }: { numero: number; titulo: string; descripcion: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-azul-50 font-display text-sm font-semibold text-azul-700 ring-1 ring-azul-100"
      >
        {numero}
      </span>
      <div>
        <h2 className="font-display text-base leading-snug font-semibold text-foreground">{titulo}</h2>
        <p className="text-[13px] text-muted-foreground">{descripcion}</p>
      </div>
    </div>
  );
}
