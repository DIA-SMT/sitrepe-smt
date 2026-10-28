import type { Metadata } from "next";
import { CircleX, FlaskConical, Hourglass, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { requerirEmpresa } from "@/lib/auth";
import { getProductos } from "@/lib/data/catalogos";
import { getMemoriaTecnica, getTramitesAltaProducto } from "@/lib/data/legajo";
import type { Enums } from "@/lib/supabase/database.types";
import { motivoBloqueo } from "../legajo/_lib/tramites";
import { ultimoTramiteDe } from "../legajo/_lib/vinculos";
import { FormProponer, type ProductoCatalogo } from "./_components/form-proponer";
import { TarjetaProducto, type TramiteProducto } from "./_components/tarjeta-producto";

export const metadata: Metadata = {
  title: "Productos y memoria técnica",
  description: "Productos autorizados de la empresa según su memoria técnica (Art. 5.º).",
};

export default async function ProductosPage() {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const [memoria, catalogoCompleto, tramites] = await Promise.all([
    getMemoriaTecnica(empresaId),
    getProductos(),
    getTramitesAltaProducto(empresaId),
  ]);
  const bloqueo = motivoBloqueo(sesion.empresa.estado);

  // Trámite más reciente de alta de cada propuesta (datos.empresa_producto_id).
  const tramiteDe = (id: string | null): TramiteProducto | null => {
    const t = ultimoTramiteDe(tramites, "empresa_producto_id", id);
    return t ? { id: t.id, codigo: t.codigo, estado: t.estado, observaciones: t.observaciones } : null;
  };
  // resolver_tramite no cambia la propuesta al rechazar el trámite: queda "propuesto" pero sin efecto.
  const sinEfecto = (m: (typeof memoria)[number]) => m.estado === "propuesto" && tramiteDe(m.id)?.estado === "rechazado";

  const aprobados = memoria.filter((m) => m.estado === "aprobado");
  const propuestos = memoria.filter((m) => m.estado === "propuesto" && !sinEfecto(m));
  const rechazados = memoria.filter((m) => m.estado === "rechazado" || sinEfecto(m));

  const enMemoria: Record<string, Enums<"estado_memoria">> = {};
  for (const m of memoria) if (m.producto_id && m.estado) enMemoria[m.producto_id] = sinEfecto(m) ? "rechazado" : m.estado;

  const catalogo: ProductoCatalogo[] = catalogoCompleto.map((p) => ({
    id: p.id,
    nombre_comercial: p.nombre_comercial,
    principio_activo: p.principio_activo,
    concentracion: p.concentracion,
    clase: p.clase,
    formulacion: p.formulacion,
    organismo: p.organismo,
    registro_numero: p.registro_numero,
    categoria_toxicologica: p.categoria_toxicologica,
    antidoto: p.antidoto,
    precauciones: p.precauciones,
    plazo_reingreso_horas: p.plazo_reingreso_horas,
  }));
  const disponibles = catalogo.filter((p) => !enMemoria[p.id]).length;

  const proponer = (variante: "primary" | "secondary" = "primary") => (
    <FormProponer catalogo={catalogo} enMemoria={enMemoria} bloqueado={bloqueo} variante={variante} />
  );

  return (
    <>
      <PageHeader
        title="Productos y memoria técnica"
        description="Productos domisanitarios que tu empresa está autorizada a aplicar, con su registro, toxicidad y plazo de reingreso."
        icon={FlaskConical}
        breadcrumb={[{ label: "Prestadores", href: "/prestador" }, { label: "Productos" }]}
        actions={proponer()}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Aprobados" value={aprobados.length} icon={ShieldCheck} tone="verde" hint="Se pueden declarar en los certificados" />
        <StatCard
          label="En revisión"
          value={propuestos.length}
          icon={Hourglass}
          tone="ambar"
          hint={propuestos.length > 0 ? "Esperando la resolución de la Dirección" : "Sin propuestas pendientes"}
        />
        <StatCard
          label="Rechazados"
          value={rechazados.length}
          icon={CircleX}
          tone={rechazados.length > 0 ? "rojo" : "neutral"}
          hint={`${disponibles} producto${disponibles === 1 ? "" : "s"} más en el catálogo`}
        />
      </div>

      <Alert tone="info" title="Solo podés declarar productos aprobados (Art. 5.º)" className="my-6">
        La memoria técnica detalla productos, concentraciones, dosis, precauciones, protección, toxicidad y antídotos.
        Al cargar un certificado solo vas a poder elegir los productos aprobados acá; la memoria se actualiza ante cada
        cambio de técnico o de productos.
      </Alert>

      {memoria.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Tu memoria técnica está vacía"
          description="Proponé los productos que usás habitualmente. Cuando la Dirección los apruebe, vas a poder declararlos en tus servicios."
          action={proponer()}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <SectionCard
            title="Productos aprobados"
            description={`${aprobados.length} producto${aprobados.length === 1 ? "" : "s"} habilitado${aprobados.length === 1 ? "" : "s"} para declarar`}
            icon={ShieldCheck}
          >
            {aprobados.length > 0 ? (
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {aprobados.map((m) => (
                  <li key={m.id ?? m.producto_id}>
                    <TarjetaProducto item={m} tramite={tramiteDe(m.id)} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={ShieldCheck}
                title="Todavía no tenés productos aprobados"
                description="Mientras tanto no vas a poder declarar servicios. Revisá el estado de tus propuestas."
              />
            )}
          </SectionCard>

          {propuestos.length > 0 ? (
            <SectionCard
              title="Propuestas en revisión"
              description="La Dirección revisa el registro, la dosis y las precauciones de cada producto."
              icon={Hourglass}
            >
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {propuestos.map((m) => (
                  <li key={m.id ?? m.producto_id}>
                    <TarjetaProducto item={m} tramite={tramiteDe(m.id)} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {rechazados.length > 0 ? (
            <SectionCard
              title="Rechazados"
              description="No pueden declararse en los certificados. Si el trámite fue rechazado, retirá la propuesta para volver a presentarla corregida."
              icon={CircleX}
            >
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rechazados.map((m) => (
                  <li key={m.id ?? m.producto_id}>
                    <TarjetaProducto item={m} tramite={tramiteDe(m.id)} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
      )}
    </>
  );
}
