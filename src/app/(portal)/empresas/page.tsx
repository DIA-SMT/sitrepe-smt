import type { Metadata } from "next";
import { Building2, Droplets, ShieldCheck, SprayCan } from "lucide-react";
import { APP } from "@/lib/config";
import { getEmpresasPortal } from "@/lib/data/portal";
import { formatFechaHora } from "@/lib/domain/formato";
import { EncabezadoPortal } from "../_components/encabezado-portal";
import { ListadoEmpresas, type FiltroActividad } from "./_components/listado-empresas";

export const metadata: Metadata = {
  title: "Empresas habilitadas",
  description:
    "Listado oficial de empresas de control de plagas urbanas y limpieza de tanques habilitadas por la Municipalidad de San Miguel de Tucumán.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function primero(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export default async function EmpresasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const empresas = await getEmpresasPortal();
  const actividad = primero(sp.actividad);
  const filtroInicial: FiltroActividad = actividad === "fumigacion" || actividad === "tanques" ? actividad : "todas";
  const conTanques = empresas.filter((e) => e.tanques).length;
  const conFumigacion = empresas.filter((e) => e.fumigacion).length;

  return (
    <>
      <EncabezadoPortal
        antetitulo="Registro de prestadores"
        titulo="Empresas habilitadas"
        descripcion="Antes de contratar, verificá que la empresa figure en este listado y para qué actividades está habilitada. Solo sus certificados son válidos."
        icono={Building2}
        migas={[{ label: "Empresas habilitadas" }]}
        aside={
          <div className="grid grid-cols-3 gap-3 rounded-panel border border-white/70 bg-white/80 p-4 shadow-card backdrop-blur sm:p-5">
            <Resumen icono={ShieldCheck} valor={empresas.length} etiqueta="habilitadas" />
            <Resumen icono={SprayCan} valor={conFumigacion} etiqueta="fumigación" />
            <Resumen icono={Droplets} valor={conTanques} etiqueta="tanques" />
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        {/* La clave reinicia los filtros si se navega a otra URL de esta misma página (p. ej. ?actividad=tanques). */}
        <ListadoEmpresas
          key={`${primero(sp.q)}|${filtroInicial}`}
          empresas={empresas}
          busquedaInicial={primero(sp.q)}
          actividadInicial={filtroInicial}
        />
        <p className="mt-10 flex flex-col gap-1 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Listado generado automáticamente desde el registro de la {APP.direccion} (Ord. 2681/98, t.o. Ord. 3737/06 y
            Ord. 2004/92, t.o. Ord. 3098/01).
          </span>
          <span className="shrink-0">Actualizado el {formatFechaHora(new Date())}</span>
        </p>
      </div>
    </>
  );
}

function Resumen({ icono: Icono, valor, etiqueta }: { icono: typeof Building2; valor: number; etiqueta: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-azul-50/60 px-2 py-3 text-center ring-1 ring-azul-100">
      <Icono className="size-5 text-azul-600" aria-hidden />
      <span className="font-display text-2xl leading-none font-bold text-foreground nums-tabular">{valor}</span>
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
    </div>
  );
}
