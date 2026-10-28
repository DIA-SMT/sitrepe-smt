import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Receipt, Settings } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requerirStaff } from "@/lib/auth";
import { getArancelesVigentes } from "@/lib/data/catalogos";
import { CODIGOS_ARANCEL_CERTIFICADOS, esUuid, getEmpresasPadron } from "@/lib/data/pagos";
import { MEDIO_PAGO } from "@/lib/domain/etiquetas";
import { hoyISO } from "@/lib/domain/formato";
import { FormOtroConcepto, type ArancelOpcion, type EmpresaOpcion } from "./_components/form-otro-concepto";

export const metadata: Metadata = { title: "Registrar pago de otros conceptos" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NuevoPagoPage({ searchParams }: Props) {
  const sesion = await requerirStaff(["admin", "control"]);
  const sp = await searchParams;
  const empresaParam = Array.isArray(sp.empresa) ? sp.empresa[0] : sp.empresa;

  const [aranceles, empresas] = await Promise.all([getArancelesVigentes(), getEmpresasPadron()]);

  const opciones: ArancelOpcion[] = aranceles
    .filter((a) => !CODIGOS_ARANCEL_CERTIFICADOS.includes(a.codigo))
    .map((a) => ({
      id: a.id,
      concepto: a.concepto,
      importe: Number(a.importe),
      unidad: a.unidad,
      ordenanza: a.ordenanza,
      articulo: a.articulo,
      cuenta: a.cuenta
        ? {
            codigo: a.cuenta.codigo,
            nombre: a.cuenta.nombre,
            medios: a.cuenta.medios_pago.map((m) => ({ valor: m, label: MEDIO_PAGO[m].label })),
          }
        : null,
    }));
  const empresasOpciones: EmpresaOpcion[] = empresas.map((e) => ({ id: e.id, nombre: e.nombre_comercial, cuit: e.cuit }));
  const empresaInicial = esUuid(empresaParam) && empresas.some((e) => e.id === empresaParam) ? empresaParam : undefined;
  const hoy = hoyISO();

  return (
    <>
      <PageHeader
        title="Registrar pago de otros conceptos"
        description="Reinspecciones, notas varias, plazos por refacciones y permisos de transporte (cuenta 091: boleta de Rentas o plataformas electrónicas). El pago queda verificado al registrarlo."
        icon={Receipt}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Pagos", href: "/gestion/pagos" },
          { label: "Registrar otro concepto" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/gestion/pagos">
              <ArrowLeft aria-hidden />
              Volver a la bandeja
            </Link>
          </Button>
        }
      />

      {opciones.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="No hay aranceles vigentes para registrar"
          description="Cargá los importes de la Ordenanza Tarifaria vigente en la configuración para poder registrar pagos."
          action={
            sesion.perfil.rol === "admin" ? (
              <Button asChild>
                <Link href="/gestion/configuracion">Ir a configuración</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <FormOtroConcepto
          aranceles={opciones}
          empresas={empresasOpciones}
          empresaInicial={empresaInicial}
          hoy={hoy}
          carpeta={["staff", hoy.slice(0, 7)]}
        />
      )}
    </>
  );
}
