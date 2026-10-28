"use client";

import Link from "next/link";
import { startTransition, useId, useRef, useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CircleCheck,
  CircleX,
  ClipboardPen,
  Droplets,
  FlaskConical,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Store,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { SubirArchivo } from "@/components/shared/subir-archivo";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
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
import { Select } from "@/components/ui/select";
import { cuitValido } from "@/lib/domain/cuit";
import { PERIODICIDAD, TIPO_SERVICIO } from "@/lib/domain/etiquetas";
import { fechaHoraLocalAISO, formatFecha, formatFechaHora, isoAFechaHoraLocal } from "@/lib/domain/formato";
import { calcularVencimiento } from "@/lib/domain/vencimiento";
import { cn } from "@/lib/utils";
import {
  ahoraMs,
  describirAntelacion,
  errorFechaServicio,
  ETIQUETA_UNIDAD,
  horasHasta,
  UNIDADES,
  type Unidad,
  ventanaFumigacion,
} from "../../_lib/reglas";
import type { EstablecimientoOpcion, ProductoCargado, ProductoOpcion, ServicioEditable } from "../../_lib/tipos";
import { guardarServicio } from "../actions";
import { BuscadorEstablecimiento } from "./buscador-establecimiento";
import { type DatosPlanilla, usePlanilla } from "./contexto-planilla";
import { OpcionesRubro } from "./opciones-rubro";

type Disparador = "boton" | "icono" | "vacio";

type FilaProducto = ProductoCargado & { clave: string };

type Valores = {
  numero: string;
  fecha: string;
  establecimiento: ServicioEditable["establecimiento"];
  cliente: string;
  clienteCuit: string;
  domicilio: string;
  rubroId: string;
  superficie: string;
  capacidad: string;
  tecnicoId: string;
  laboratorio: string;
  productos: FilaProducto[];
};

/**
 * Alta y edición de un servicio de la planilla (un certificado por servicio).
 * Evita los errores frecuentes en papel: rubro obligatorio del Anexo con vencimiento
 * calculado en vivo, fecha dentro del plazo, asesor técnico aprobado y productos de la
 * memoria técnica.
 */
export function FormularioServicio({ servicio, disparador = "boton" }: { servicio?: ServicioEditable; disparador?: Disparador }) {
  const [abierto, setAbierto] = useState(false);
  const editar = Boolean(servicio);

  const boton =
    disparador === "icono" ? (
      <Button variant="ghost" size="icon-sm" aria-label={`Editar el servicio N.º ${servicio?.numero ?? ""}`}>
        <Pencil aria-hidden />
      </Button>
    ) : disparador === "vacio" ? (
      <Button size="lg">
        <Plus aria-hidden />
        Cargar el primer servicio
      </Button>
    ) : (
      <Button>
        <Plus aria-hidden />
        Agregar servicio
      </Button>
    );

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{boton}</DialogTrigger>
      <DialogContent size="xl">
        <DialogHeader className="flex-row items-start gap-4">
          <span
            aria-hidden
            className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand sm:flex"
          >
            {editar ? <ClipboardPen className="size-5" /> : <Plus className="size-5" />}
          </span>
          <div className="flex flex-col gap-1">
            <DialogTitle>{editar ? `Editar servicio N.º ${servicio?.numero}` : "Agregar servicio a la planilla"}</DialogTitle>
            <DialogDescription>
              Una fila por servicio: cada una genera su certificado con vencimiento automático según el rubro del Anexo.
            </DialogDescription>
          </div>
        </DialogHeader>
        <CuerpoFormulario servicio={servicio} onListo={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}

function valoresIniciales(servicio: ServicioEditable | undefined, p: DatosPlanilla): Valores {
  if (servicio) {
    return {
      numero: servicio.numero,
      fecha: servicio.fechaLocal,
      establecimiento: servicio.establecimiento,
      cliente: servicio.cliente,
      clienteCuit: servicio.clienteCuit,
      domicilio: servicio.domicilio,
      rubroId: servicio.rubroId,
      superficie: servicio.superficie,
      capacidad: servicio.capacidad,
      tecnicoId: servicio.tecnicoId,
      laboratorio: servicio.laboratorio,
      productos: servicio.productos.map((prod, i) => ({ ...prod, clave: `inicial-${i}` })),
    };
  }
  const representante = p.tecnicos.find((t) => t.esRepresentante) ?? (p.tecnicos.length === 1 ? p.tecnicos[0] : undefined);
  return {
    numero: p.numeroSugerido,
    fecha: "",
    establecimiento: null,
    cliente: "",
    clienteCuit: "",
    domicilio: "",
    rubroId: "",
    superficie: "",
    capacidad: "",
    tecnicoId: representante?.id ?? "",
    laboratorio: "",
    productos: p.tipo === "fumigacion" ? [{ clave: "inicial-0", productoId: "", cantidad: "", unidad: "ml" }] : [],
  };
}

function aIso(valorLocal: string): string | null {
  if (!valorLocal) return null;
  try {
    return fechaHoraLocalAISO(valorLocal);
  } catch {
    return null;
  }
}

function positivo(valor: string): boolean {
  const n = Number(valor.replace(",", "."));
  return valor.trim() !== "" && Number.isFinite(n) && n > 0;
}

/** Validación en el navegador (la misma regla se repite en el servidor y en la base). */
function validar(v: Valores, p: DatosPlanilla, ahora: number): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.numero.trim()) e.numero = "Indicá el N.º de certificado.";
  const iso = aIso(v.fecha);
  if (!iso) e.fecha_servicio = "Indicá la fecha y hora del servicio.";
  else {
    const error = errorFechaServicio(p.tipo, iso, p.antelacion, ahora);
    if (error) e.fecha_servicio = error;
  }
  if (v.cliente.trim().length < 2) e.cliente = "Indicá el titular o la razón social del cliente.";
  if (v.clienteCuit.trim() && !cuitValido(v.clienteCuit)) e.cliente_cuit = "El CUIT no es válido: revisá los 11 dígitos.";
  if (v.domicilio.trim().length < 3) e.domicilio = "Indicá el domicilio donde se realiza el servicio.";
  if (!v.rubroId) e.rubro_id = "Elegí el rubro del Anexo: define el vencimiento del certificado.";
  if (p.tipo === "fumigacion" && !positivo(v.superficie)) e.superficie_m2 = "Indicá la superficie tratada en m².";
  if (p.tipo === "tanque" && !positivo(v.capacidad)) e.capacidad_litros = "Indicá la capacidad del tanque en litros.";
  if (!v.tecnicoId) e.tecnico_id = "Elegí el asesor técnico que firma el certificado.";
  else if (!p.tecnicos.some((t) => t.id === v.tecnicoId)) {
    e.tecnico_id = "El asesor asignado no está aprobado por la Dirección: elegí otro.";
  }
  if (p.tipo === "fumigacion" && v.productos.length === 0) e.productos = "Agregá al menos un producto aplicado.";
  const vistos = new Set<string>();
  v.productos.forEach((fila, i) => {
    if (!fila.productoId) e[`productos.${i}.productoId`] = "Elegí el producto.";
    else if (!p.productos.some((prod) => prod.id === fila.productoId)) {
      e[`productos.${i}.productoId`] = "Ya no está aprobado en tu memoria técnica: elegí otro o quitá la fila.";
    } else if (vistos.has(fila.productoId)) e[`productos.${i}.productoId`] = "Este producto ya está en otra fila.";
    vistos.add(fila.productoId);
    if (!positivo(fila.cantidad)) e[`productos.${i}.cantidad`] = "Indicá la cantidad.";
  });
  return e;
}

function CuerpoFormulario({ servicio, onListo }: { servicio?: ServicioEditable; onListo: () => void }) {
  const p = usePlanilla();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, despachar, pendiente] = useAccion(guardarServicio, { alExito: onListo });
  const [ahora] = useState(ahoraMs);
  const [v, setV] = useState<Valores>(() => valoresIniciales(servicio, p));
  const [locales, setLocales] = useState<Record<string, string>>({});
  const [verServidor, setVerServidor] = useState(true);
  // Campos corregidos después de la última respuesta del servidor: su error ya no se muestra.
  const [corregidos, setCorregidos] = useState<ReadonlySet<string>>(() => new Set());

  const error = (campo: string): string | undefined =>
    locales[campo] ?? (verServidor && !corregidos.has(campo) ? estado.errores?.[campo]?.[0] : undefined);

  /** Oculta los errores (locales y del servidor) de los campos indicados o de los que empiezan con un prefijo. */
  const limpiarErrores = (...claves: string[]) => {
    const coincide = (k: string) => claves.some((c) => k === c || (c.endsWith(".") && k.startsWith(c)));
    if (Object.keys(locales).some(coincide)) {
      setLocales((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !coincide(k))));
    }
    const delServidor = Object.keys(estado.errores ?? {}).filter((k) => coincide(k) && !corregidos.has(k));
    if (delServidor.length > 0) setCorregidos((prev) => new Set([...prev, ...delServidor]));
  };

  const cambiar = <K extends keyof Valores>(campo: K, valor: Valores[K], claveError?: string) => {
    setV((prev) => ({ ...prev, [campo]: valor }));
    if (claveError) limpiarErrores(claveError);
  };

  const vincular = (e: EstablecimientoOpcion) => {
    setV((prev) => ({
      ...prev,
      establecimiento: {
        id: e.id,
        nombre: e.nombreFantasia ? `${e.nombre} (${e.nombreFantasia})` : e.nombre,
        domicilio: e.domicilio,
      },
      cliente: e.nombre,
      clienteCuit: e.cuit ?? prev.clienteCuit,
      domicilio: e.barrio ? `${e.domicilio}, ${e.barrio}` : e.domicilio,
      rubroId: e.rubroId ? String(e.rubroId) : prev.rubroId,
    }));
    limpiarErrores("cliente", "domicilio", "rubro_id", "cliente_cuit", "establecimiento_id");
  };

  // Al tocar los productos se descartan sus errores: los índices de las filas pueden cambiar.
  const cambiarProducto = (clave: string, cambios: Partial<ProductoCargado>) => {
    setV((prev) => ({ ...prev, productos: prev.productos.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)) }));
    limpiarErrores("productos", "productos.");
  };

  const agregarProducto = () => {
    setV((prev) => ({
      ...prev,
      productos: [...prev.productos, { clave: crypto.randomUUID(), productoId: "", cantidad: "", unidad: "ml" }],
    }));
    limpiarErrores("productos");
  };

  const quitarProducto = (clave: string) => {
    setV((prev) => ({ ...prev, productos: prev.productos.filter((f) => f.clave !== clave) }));
    limpiarErrores("productos", "productos.");
  };

  const enviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const errores = validar(v, p, ahoraMs());
    setLocales(errores);
    setCorregidos(new Set());
    if (Object.keys(errores).length > 0) {
      setVerServidor(false);
      toast.error("Revisá los datos marcados.");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setVerServidor(true);
    const datos = new FormData(evento.currentTarget);
    startTransition(() => despachar(datos));
  };

  // --- Vista previa de fecha y vencimiento ------------------------------------
  const iso = aIso(v.fecha);
  const errorFecha = iso ? errorFechaServicio(p.tipo, iso, p.antelacion, ahora) : null;
  const ventana = ventanaFumigacion(p.antelacion, ahora);
  const limites =
    p.tipo === "fumigacion"
      ? { min: isoAFechaHoraLocal(ventana.desde), max: isoAFechaHoraLocal(ventana.hasta) }
      : { min: undefined, max: isoAFechaHoraLocal(new Date(ahora)) };

  const rubro = p.rubros.find((r) => String(r.id) === v.rubroId);
  const dia = v.fecha ? v.fecha.slice(0, 10) : null;
  const vencimiento = dia ? calcularVencimiento(p.tipo, rubro?.periodicidad, dia, p.diasTanque) : null;

  const productosElegidos = v.productos
    .map((f) => p.productos.find((prod) => prod.id === f.productoId))
    .filter((prod): prod is ProductoOpcion => prod !== undefined);
  const reingreso = productosElegidos.reduce<number | null>(
    (max, prod) => (prod.plazoReingresoHoras !== null && (max === null || prod.plazoReingresoHoras > max) ? prod.plazoReingresoHoras : max),
    null,
  );

  const rubroFueraDeCatalogo = Boolean(servicio?.rubroId) && !p.rubros.some((r) => String(r.id) === servicio?.rubroId);
  const tecnicoFueraDeCatalogo = Boolean(servicio?.tecnicoId) && !p.tecnicos.some((t) => t.id === servicio?.tecnicoId);
  const faltaTecnico = p.tecnicos.length === 0;
  const faltanProductos = p.tipo === "fumigacion" && p.productos.length === 0;
  const productosJson = JSON.stringify(
    v.productos.map(({ productoId, cantidad, unidad }) => ({ productoId, cantidad: cantidad.replace(",", "."), unidad })),
  );

  return (
    <form ref={formRef} onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="declaracion_id" value={p.declaracionId} />
      <input type="hidden" name="certificado_id" value={servicio?.id ?? ""} />
      <input type="hidden" name="establecimiento_id" value={v.establecimiento?.id ?? ""} />
      <input type="hidden" name="productos" value={productosJson} />

      <DialogBody className="flex flex-col gap-7 pt-5 pb-6">
        {servicio?.observacion ? (
          <Alert tone="warning" title="Observación del área de Control">
            {servicio.observacion}
          </Alert>
        ) : null}
        {servicio?.firmado ? (
          <Alert tone="info" title="Este certificado ya está firmado">
            Si cambiás el N.º, el cliente, el domicilio, el rubro, la superficie o capacidad, la fecha o el asesor, la firma se
            anula y el asesor técnico tiene que volver a firmarlo. Si cambiás los productos, avisale para que los revise.
          </Alert>
        ) : null}
        {faltaTecnico || faltanProductos ? (
          <Alert tone="warning" title="Antes de cargar servicios">
            {faltaTecnico ? (
              <p>
                Tu empresa no tiene asesores técnicos aprobados por la Dirección.{" "}
                <Link href="/prestador/legajo" className="font-semibold text-azul-700 underline-offset-2 hover:underline">
                  Revisá el legajo
                </Link>
                .
              </p>
            ) : null}
            {faltanProductos ? (
              <p>
                Tu memoria técnica no tiene productos aprobados.{" "}
                <Link href="/prestador/productos" className="font-semibold text-azul-700 underline-offset-2 hover:underline">
                  Revisá tus productos
                </Link>
                .
              </p>
            ) : null}
          </Alert>
        ) : null}

        {/* 1 · Servicio */}
        <Paso numero={1} titulo="Servicio" icon={CalendarClock}>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_1fr]">
            <Field
              htmlFor={`${id}-numero`}
              label="N.º de certificado"
              required
              hint={!servicio ? `Numeración propia de tu empresa. Sugerido: ${p.numeroSugerido}.` : "Numeración propia de tu empresa."}
              error={error("numero")}
            >
              <Input
                id={`${id}-numero`}
                name="numero"
                value={v.numero}
                onChange={(e) => cambiar("numero", e.target.value, "numero")}
                autoComplete="off"
                maxLength={30}
                className="font-display font-semibold"
              />
            </Field>
            <Field
              htmlFor={`${id}-fecha`}
              label="Fecha y hora del servicio"
              required
              hint={
                p.tipo === "fumigacion"
                  ? `Hora de Tucumán. Entre el ${formatFechaHora(ventana.desde)} y el ${formatFechaHora(ventana.hasta)} (${p.antelacion.minHoras} a ${p.antelacion.maxHoras} h antes).`
                  : "Hora de Tucumán. La limpieza se declara una vez realizada."
              }
              error={error("fecha_servicio")}
            >
              <Input
                id={`${id}-fecha`}
                name="fecha_servicio"
                type="datetime-local"
                value={v.fecha}
                min={limites.min}
                max={limites.max}
                onChange={(e) => cambiar("fecha", e.target.value, "fecha_servicio")}
              />
            </Field>
          </div>
          {iso ? (
            <p
              className={cn(
                "flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                errorFecha ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
              )}
            >
              {errorFecha ? <CircleX className="size-3.5" aria-hidden /> : <CircleCheck className="size-3.5" aria-hidden />}
              {p.tipo === "fumigacion"
                ? `${describirAntelacion(horasHasta(iso, ahora))} · ${errorFecha ? `fuera del plazo de ${p.antelacion.minHoras} a ${p.antelacion.maxHoras} h` : "dentro del plazo"}`
                : errorFecha
                  ? "Todavía no se realizó"
                  : `Realizada · ${describirAntelacion(horasHasta(iso, ahora)).toLowerCase()}`}
            </p>
          ) : null}
        </Paso>

        {/* 2 · Establecimiento y cliente */}
        <Paso numero={2} titulo="Establecimiento y cliente" icon={Store}>
          <BuscadorEstablecimiento
            tipo={p.tipo}
            rubros={p.rubros}
            vinculado={v.establecimiento}
            onVincular={vincular}
            onDesvincular={() => cambiar("establecimiento", null, "establecimiento_id")}
            error={error("establecimiento_id")}
          />
          <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,200px)]">
            <Field htmlFor={`${id}-cliente`} label="Cliente (titular o razón social)" required error={error("cliente")}>
              <Input
                id={`${id}-cliente`}
                name="cliente"
                value={v.cliente}
                onChange={(e) => cambiar("cliente", e.target.value, "cliente")}
                maxLength={200}
                autoComplete="off"
              />
            </Field>
            <Field htmlFor={`${id}-cuit`} label="CUIT del cliente" hint="Opcional." error={error("cliente_cuit")}>
              <Input
                id={`${id}-cuit`}
                name="cliente_cuit"
                inputMode="numeric"
                placeholder="30-12345678-9"
                value={v.clienteCuit}
                onChange={(e) => cambiar("clienteCuit", e.target.value, "cliente_cuit")}
                autoComplete="off"
              />
            </Field>
            <Field
              htmlFor={`${id}-domicilio`}
              label="Domicilio del servicio"
              required
              className="sm:col-span-2"
              error={error("domicilio")}
            >
              <Input
                id={`${id}-domicilio`}
                name="domicilio"
                value={v.domicilio}
                onChange={(e) => cambiar("domicilio", e.target.value, "domicilio")}
                maxLength={250}
                autoComplete="off"
              />
            </Field>
          </div>
        </Paso>

        {/* 3 · Rubro y vencimiento */}
        <Paso numero={3} titulo="Rubro y vencimiento" icon={CalendarCheck2}>
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,260px)] lg:items-start">
            <Field
              htmlFor={`${id}-rubro`}
              label="Rubro del establecimiento (Anexo)"
              required
              hint="La actividad define la periodicidad y la fecha de vencimiento del certificado."
              error={error("rubro_id")}
            >
              <Select
                id={`${id}-rubro`}
                name="rubro_id"
                value={v.rubroId}
                onChange={(e) => cambiar("rubroId", e.target.value, "rubro_id")}
              >
                <option value="" disabled>
                  Elegí la actividad del establecimiento
                </option>
                {rubroFueraDeCatalogo ? (
                  // Sin esta opción el navegador mostraría (y enviaría) otro rubro en silencio.
                  <option value={servicio?.rubroId}>{servicio?.rubroNombre ?? "Rubro cargado"} · dado de baja en el Anexo</option>
                ) : null}
                <OpcionesRubro rubros={p.rubros} />
              </Select>
            </Field>
            <VistaVencimiento
              tipo={p.tipo}
              periodicidad={rubro?.periodicidad ?? null}
              rubroElegido={Boolean(rubro)}
              hayFecha={Boolean(dia)}
              vencimiento={vencimiento}
              diasTanque={p.diasTanque}
            />
          </div>
        </Paso>

        {/* 4 · Tratamiento */}
        {p.tipo === "fumigacion" ? (
          <Paso numero={4} titulo="Tratamiento" icon={FlaskConical}>
            <Field
              htmlFor={`${id}-superficie`}
              label="Superficie tratada"
              required
              className="sm:max-w-60"
              error={error("superficie_m2")}
            >
              <Input
                id={`${id}-superficie`}
                name="superficie_m2"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="any"
                value={v.superficie}
                onChange={(e) => cambiar("superficie", e.target.value, "superficie_m2")}
                trailing="m²"
              />
            </Field>
            <FilasProductos
              id={id}
              filas={v.productos}
              error={error}
              onCambiar={cambiarProducto}
              onAgregar={agregarProducto}
              onQuitar={quitarProducto}
              requerido
              reingreso={reingreso}
            />
          </Paso>
        ) : (
          <Paso numero={4} titulo="Tanque y análisis del agua" icon={Droplets}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor={`${id}-capacidad`} label="Capacidad del tanque" required error={error("capacidad_litros")}>
                <Input
                  id={`${id}-capacidad`}
                  name="capacidad_litros"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="any"
                  value={v.capacidad}
                  onChange={(e) => cambiar("capacidad", e.target.value, "capacidad_litros")}
                  trailing="L"
                />
              </Field>
              <Field htmlFor={`${id}-laboratorio`} label="Laboratorio de los análisis" error={error("laboratorio")}>
                <Input
                  id={`${id}-laboratorio`}
                  name="laboratorio"
                  value={v.laboratorio}
                  onChange={(e) => cambiar("laboratorio", e.target.value, "laboratorio")}
                  maxLength={150}
                  autoComplete="off"
                />
              </Field>
              <div className="grid gap-1.5">
                <SubirArchivo
                  name="analisis_bacteriologico_path"
                  bucket="documentos"
                  carpeta={[p.empresaId, "certificados", p.declaracionId]}
                  label="Análisis bacteriológico"
                  valorInicial={servicio?.analisisBacteriologico}
                  onSubido={() => limpiarErrores("analisis_bacteriologico_path")}
                />
                {error("analisis_bacteriologico_path") ? (
                  <p role="alert" className="text-[13px] font-medium text-danger">
                    {error("analisis_bacteriologico_path")}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <SubirArchivo
                  name="analisis_fisicoquimico_path"
                  bucket="documentos"
                  carpeta={[p.empresaId, "certificados", p.declaracionId]}
                  label="Análisis físico-químico"
                  valorInicial={servicio?.analisisFisicoquimico}
                  onSubido={() => limpiarErrores("analisis_fisicoquimico_path")}
                />
                {error("analisis_fisicoquimico_path") ? (
                  <p role="alert" className="text-[13px] font-medium text-danger">
                    {error("analisis_fisicoquimico_path")}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Los dos análisis, tomados después de la limpieza, son obligatorios para presentar la planilla. Podés guardar el
              servicio y adjuntarlos más tarde.
            </p>
            <FilasProductos
              id={id}
              filas={v.productos}
              error={error}
              onCambiar={cambiarProducto}
              onAgregar={agregarProducto}
              onQuitar={quitarProducto}
              requerido={false}
              reingreso={reingreso}
            />
          </Paso>
        )}

        {/* 5 · Asesor técnico */}
        <Paso numero={5} titulo="Asesor técnico que firma" icon={ShieldCheck}>
          <Field
            htmlFor={`${id}-tecnico`}
            label="Asesor o representante técnico"
            required
            hint="Solo asesores aprobados por la Dirección. Firma el certificado desde su usuario (Art. 5.º): no lo firma el titular."
            error={error("tecnico_id")}
          >
            <Select
              id={`${id}-tecnico`}
              name="tecnico_id"
              value={v.tecnicoId}
              onChange={(e) => cambiar("tecnicoId", e.target.value, "tecnico_id")}
            >
              <option value="" disabled>
                Elegí el asesor técnico
              </option>
              {tecnicoFueraDeCatalogo ? (
                // Asesor asignado que ya no está aprobado: se muestra para que se vea por qué hay que cambiarlo.
                <option value={servicio?.tecnicoId}>{servicio?.tecnicoNombre ?? "Asesor asignado"} · no aprobado: elegí otro</option>
              ) : null}
              {p.tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                  {t.detalle ? ` · ${t.detalle}` : ""}
                  {t.esRepresentante ? " · Representante" : ""}
                </option>
              ))}
            </Select>
          </Field>
        </Paso>
      </DialogBody>

      <DialogFooter className="sm:items-center sm:justify-between">
        <p className="hidden text-[13px] text-muted-foreground sm:block">
          {TIPO_SERVICIO[p.tipo].label} · los campos con <span className="text-danger">*</span> son obligatorios
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pendiente}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" loading={pendiente} disabled={faltaTecnico || faltanProductos}>
            {!pendiente ? <Save aria-hidden /> : null}
            {servicio ? "Guardar cambios" : "Agregar a la planilla"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function Paso({
  numero,
  titulo,
  icon: Icono,
  children,
}: {
  numero: number;
  titulo: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="mb-4 flex w-full items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-azul-50 font-display text-[13px] font-semibold text-azul-700 ring-1 ring-azul-100"
        >
          {numero}
        </span>
        <span className="font-display text-[15px] font-semibold text-foreground">{titulo}</span>
        <Icono className="ml-auto size-4 text-noche-300" aria-hidden />
      </legend>
      {children}
    </fieldset>
  );
}

function VistaVencimiento({
  tipo,
  periodicidad,
  rubroElegido,
  hayFecha,
  vencimiento,
  diasTanque,
}: {
  tipo: DatosPlanilla["tipo"];
  periodicidad: keyof typeof PERIODICIDAD | null;
  rubroElegido: boolean;
  hayFecha: boolean;
  vencimiento: string | null;
  diasTanque: number;
}) {
  const listo = hayFecha && (tipo === "tanque" || rubroElegido);
  let detalle: string;
  if (tipo === "tanque") detalle = `${diasTanque} días desde la limpieza (Ord. 2004/92).`;
  else if (!rubroElegido) detalle = "Elegí el rubro para calcularlo.";
  else if (periodicidad === "unica_vez") detalle = "Servicio por única vez: el certificado no vence.";
  else detalle = `Periodicidad ${periodicidad ? PERIODICIDAD[periodicidad].label.toLowerCase() : ""} según el Anexo.`;

  return (
    <div
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-colors",
        listo ? "border-azul-200 bg-gradient-brand-soft" : "border-dashed border-border-strong bg-subtle",
      )}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Vence el</p>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
        {!listo ? "—" : vencimiento ? formatFecha(vencimiento) : "Sin vencimiento"}
      </p>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
        {!hayFecha && (tipo === "tanque" || rubroElegido) ? "Indicá la fecha del servicio para calcularlo." : detalle}
      </p>
      {periodicidad && tipo === "fumigacion" ? (
        <Badge tone={PERIODICIDAD[periodicidad].tono} size="sm" className="mt-2">
          {PERIODICIDAD[periodicidad].label}
        </Badge>
      ) : null}
      <CalendarCheck2 aria-hidden className="absolute -right-2 -bottom-2 size-16 text-azul-600/10" />
    </div>
  );
}

function FilasProductos({
  id,
  filas,
  error,
  onCambiar,
  onAgregar,
  onQuitar,
  requerido,
  reingreso,
}: {
  id: string;
  filas: FilaProducto[];
  error: (campo: string) => string | undefined;
  onCambiar: (clave: string, cambios: Partial<ProductoCargado>) => void;
  onAgregar: () => void;
  onQuitar: (clave: string) => void;
  requerido: boolean;
  reingreso: number | null;
}) {
  const p = usePlanilla();
  const errorGeneral = error("productos");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            Productos aplicados
            {requerido ? <span className="text-danger"> *</span> : <span className="font-normal text-muted-foreground"> (opcional)</span>}
          </p>
          <p className="text-[13px] text-muted-foreground">Solo productos aprobados en tu memoria técnica, con su registro ANMAT o SENASA.</p>
        </div>
        {reingreso !== null ? (
          <Badge tone="ambar" size="md">
            <TriangleAlert aria-hidden />
            Reingreso al ambiente: {reingreso} h
          </Badge>
        ) : null}
      </div>

      {filas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {filas.map((fila, i) => {
            const elegido = p.productos.find((prod) => prod.id === fila.productoId);
            const fueraDeCatalogo = fila.productoId !== "" && !elegido;
            return (
              <li
                key={fila.clave}
                className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-3 shadow-xs sm:grid-cols-[minmax(0,1fr)_110px_120px_auto] sm:items-start"
              >
                <Field
                  htmlFor={`${id}-prod-${fila.clave}`}
                  label="Producto"
                  className="col-span-2 sm:col-span-1"
                  hint={elegido?.dosis ? `Dosis declarada: ${elegido.dosis}` : undefined}
                  error={error(`productos.${i}.productoId`)}
                >
                  <Select
                    id={`${id}-prod-${fila.clave}`}
                    size="sm"
                    value={fila.productoId}
                    onChange={(e) => onCambiar(fila.clave, { productoId: e.target.value, nombre: undefined })}
                  >
                    <option value="" disabled>
                      Elegí el producto
                    </option>
                    {fueraDeCatalogo ? (
                      <option value={fila.productoId}>{fila.nombre ?? "Producto cargado"} · no aprobado</option>
                    ) : null}
                    {p.productos.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.nombre}
                        {prod.principioActivo ? ` · ${prod.principioActivo}` : ""}
                        {prod.organismo && prod.registro ? ` (${prod.organismo} ${prod.registro})` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field htmlFor={`${id}-cant-${fila.clave}`} label="Cantidad" error={error(`productos.${i}.cantidad`)}>
                  <Input
                    id={`${id}-cant-${fila.clave}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={fila.cantidad}
                    onChange={(e) => onCambiar(fila.clave, { cantidad: e.target.value })}
                    className="h-8 text-[13px]"
                  />
                </Field>
                <Field htmlFor={`${id}-unidad-${fila.clave}`} label="Unidad" error={error(`productos.${i}.unidad`)}>
                  <Select
                    id={`${id}-unidad-${fila.clave}`}
                    size="sm"
                    value={fila.unidad}
                    onChange={(e) => onCambiar(fila.clave, { unidad: e.target.value as Unidad })}
                  >
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>
                        {ETIQUETA_UNIDAD[u]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="col-span-2 flex justify-end sm:col-span-1 sm:pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onQuitar(fila.clave)}
                    aria-label={`Quitar ${elegido?.nombre ?? fila.nombre ?? "el producto"}`}
                    className="text-muted-foreground hover:text-danger"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {errorGeneral ? (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
          <CircleX className="size-3.5" aria-hidden />
          {errorGeneral}
        </p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-fit"
        onClick={onAgregar}
        disabled={p.productos.length === 0 || filas.length >= Math.min(20, p.productos.length)}
      >
        <Plus aria-hidden />
        Agregar producto
      </Button>
    </div>
  );
}
