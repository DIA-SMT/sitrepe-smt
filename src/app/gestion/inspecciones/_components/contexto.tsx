import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  FlaskConical,
  MapPin,
  MessageSquareWarning,
  Navigation,
  Phone,
  Store,
  Warehouse,
} from "lucide-react";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { KeyValue } from "@/components/shared/key-value";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { getContextoInspeccion } from "@/lib/data/fiscalizacion";
import {
  ESTADO_CERTIFICADO,
  ESTADO_DENUNCIA,
  ESTADO_EMPRESA,
  TIPO_DENUNCIA,
  TIPO_SERVICIO,
  VIGENCIA,
} from "@/lib/domain/etiquetas";
import { formatFecha, formatFechaHora, formatLitros, formatNumero, formatSuperficie } from "@/lib/domain/formato";
import type { Json } from "@/lib/supabase/database.types";
import { Obligacion } from "../../hoja-de-ruta/_components/obligacion";

type Contexto = Awaited<ReturnType<typeof getContextoInspeccion>>;

/** Enlace "Cómo llegar" (Google Maps) por coordenadas o domicilio. */
export function hrefComoLlegar(lugar: { lat?: number | null; lng?: number | null; domicilio?: string | null }): string | null {
  if (typeof lugar.lat === "number" && typeof lugar.lng === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${lugar.lat},${lugar.lng}`;
  }
  if (lugar.domicilio) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lugar.domicilio}, San Miguel de Tucumán`)}`;
  }
  return null;
}

export function TarjetaEstablecimiento({
  establecimiento: e,
  compacta = false,
}: {
  establecimiento: NonNullable<Contexto["establecimiento"]>;
  compacta?: boolean;
}) {
  const llegar = hrefComoLlegar(e);
  return (
    <SectionCard
      title={e.nombre ?? "Establecimiento"}
      description={e.nombre_fantasia ?? e.rubro_nombre ?? undefined}
      icon={Store}
      actions={
        e.id ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/gestion/establecimientos/${e.id}`}>
              Ficha <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-azul-600" aria-hidden />
          <span>
            {e.domicilio}
            {e.barrio ? <span className="text-muted-foreground"> · {e.barrio}</span> : null}
            {e.zona ? <span className="text-muted-foreground"> · Zona {e.zona}</span> : null}
          </span>
        </p>
        {e.telefono && !compacta ? (
          <a href={`tel:${e.telefono.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm text-azul-700 hover:underline">
            <Phone className="size-4" aria-hidden /> {e.telefono}
          </a>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Obligacion tipo="fumigacion" estado={e.estado_fumigacion} vencimiento={e.fumigacion_vencimiento} empresa={e.fumigacion_empresa} />
          <Obligacion tipo="tanque" estado={e.estado_tanque} vencimiento={e.tanque_vencimiento} empresa={e.tanque_empresa} />
        </div>
        {llegar ? (
          <Button asChild variant="outline" className="w-full">
            <a href={llegar} target="_blank" rel="noreferrer">
              <Navigation aria-hidden /> Cómo llegar
            </a>
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}

type ProductoDeclarado = { nombre: string; principioActivo: string | null; organismo: string | null; registro: string | null; cantidad: number | null; unidad: string | null };

function leerProductos(valor: Json | null | undefined): ProductoDeclarado[] {
  if (!Array.isArray(valor)) return [];
  const productos: ProductoDeclarado[] = [];
  for (const p of valor) {
    if (!p || typeof p !== "object" || Array.isArray(p)) continue;
    const texto = (k: string) => (typeof p[k] === "string" ? String(p[k]) : null);
    const cantidad = p.cantidad;
    productos.push({
      nombre: texto("nombre") ?? "Producto",
      principioActivo: texto("principio_activo"),
      organismo: texto("organismo"),
      registro: texto("registro"),
      cantidad: typeof cantidad === "number" ? cantidad : typeof cantidad === "string" ? Number(cantidad) : null,
      unidad: texto("unidad"),
    });
  }
  return productos;
}

export function TarjetaCertificado({ certificado: c }: { certificado: NonNullable<Contexto["certificado"]> }) {
  const productos = leerProductos(c.productos);
  return (
    <SectionCard
      title={`Servicio declarado · Cert. N.º ${c.numero ?? "—"}`}
      description={c.empresa_nombre ?? undefined}
      icon={BadgeCheck}
      actions={
        c.id ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/gestion/certificados/${c.id}`}>
              Ver <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {c.tipo ? <Badge tone={TIPO_SERVICIO[c.tipo].tono}>{TIPO_SERVICIO[c.tipo].label}</Badge> : null}
          <EstadoBadge mapa={ESTADO_CERTIFICADO} valor={c.estado} />
          {c.estado === "timbrado" ? <EstadoBadge mapa={VIGENCIA} valor={c.vigencia} /> : null}
        </div>
        <KeyValue
          columns={2}
          items={[
            { label: "Cliente", value: c.cliente, full: true },
            { label: "Domicilio", value: c.domicilio, full: true },
            { label: "Fecha del servicio", value: formatFechaHora(c.fecha_servicio) },
            { label: "Rubro", value: c.rubro_nombre },
            c.tipo === "tanque"
              ? { label: "Capacidad", value: formatLitros(c.capacidad_litros) }
              : { label: "Superficie", value: formatSuperficie(c.superficie_m2) },
            { label: "Técnico", value: c.tecnico_nombre ? `${c.tecnico_nombre}${c.tecnico_titulo ? ` (${c.tecnico_titulo})` : ""}` : null },
            {
              label: "Plazo de reingreso",
              value: c.plazo_reingreso_horas !== null ? `${c.plazo_reingreso_horas} h` : null,
            },
            { label: "Vencimiento", value: c.fecha_vencimiento ? formatFecha(c.fecha_vencimiento) : null },
          ]}
        />
        {productos.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <FlaskConical className="size-3.5" aria-hidden /> Productos declarados
            </p>
            <ul className="flex flex-col gap-2">
              {productos.map((p, i) => (
                <li key={`${p.nombre}-${i}`} className="rounded-xl border border-border bg-subtle/60 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">
                    {p.nombre}
                    {p.cantidad !== null && Number.isFinite(p.cantidad) ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {formatNumero(p.cantidad, 3)} {p.unidad ?? ""}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[p.principioActivo, p.organismo && p.registro ? `${p.organismo} ${p.registro}` : null].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function TarjetaEmpresa({ empresa: e, deposito = false }: { empresa: NonNullable<Contexto["empresa"]>; deposito?: boolean }) {
  const estado = e.estado_efectivo ?? e.estado;
  const llegarDeposito = deposito ? hrefComoLlegar({ domicilio: e.domicilio_deposito }) : null;
  return (
    <SectionCard
      title={e.nombre_comercial ?? "Empresa"}
      description={e.numero_registro ? `Registro N.º ${e.numero_registro} · CUIT ${e.cuit ?? "—"}` : (e.cuit ?? undefined)}
      icon={deposito ? Warehouse : Building2}
      actions={
        e.id ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/gestion/empresas/${e.id}`}>
              Legajo <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          <EstadoBadge mapa={ESTADO_EMPRESA} valor={estado} />
          {e.habilita_fumigacion ? <Badge tone="azul">Fumigación</Badge> : null}
          {e.habilita_tanques ? <Badge tone="celeste">Tanques</Badge> : null}
        </div>
        <KeyValue
          columns={1}
          items={[
            { label: "Depósito de químicos", value: e.domicilio_deposito },
            { label: "Oficina", value: e.domicilio_oficina },
            { label: "Teléfono", value: e.telefono },
            { label: "Vencimiento de la habilitación", value: e.vencimiento_habilitacion ? formatFecha(e.vencimiento_habilitacion) : null },
            {
              label: "Última inspección de depósito",
              value: e.ultima_inspeccion_deposito ? formatFecha(e.ultima_inspeccion_deposito) : "Sin registrar",
            },
          ]}
        />
        {llegarDeposito ? (
          <Button asChild variant="outline" className="w-full">
            <a href={llegarDeposito} target="_blank" rel="noreferrer">
              <Navigation aria-hidden /> Cómo llegar al depósito
            </a>
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function TarjetaDenuncia({ denuncia: d }: { denuncia: NonNullable<Contexto["denuncia"]> }) {
  return (
    <SectionCard
      title={`Denuncia ${d.codigo ?? ""}`}
      description={`Recibida el ${formatFecha(d.created_at)}`}
      icon={MessageSquareWarning}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href={`/gestion/denuncias/${d.id}`}>
            Ver <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          <EstadoBadge mapa={TIPO_DENUNCIA} valor={d.tipo} />
          <EstadoBadge mapa={ESTADO_DENUNCIA} valor={d.estado} />
        </div>
        <blockquote className="border-l-2 border-azul-200 pl-3 text-sm leading-relaxed whitespace-pre-line text-foreground/90">
          {d.descripcion}
        </blockquote>
        {d.domicilio ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {d.domicilio}
          </p>
        ) : null}
        {d.empresa_mencionada ? (
          <p className="text-sm text-muted-foreground">Empresa mencionada: {d.empresa_mencionada}</p>
        ) : null}
      </div>
    </SectionCard>
  );
}
