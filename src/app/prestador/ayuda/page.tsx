import type { Metadata } from "next";
import { CirclePlay } from "lucide-react";
import { CentroAyuda } from "@/components/ayuda/centro-ayuda";
import { PageHeader } from "@/components/shared/page-header";
import { requerirEmpresa } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ayuda y tutoriales",
  description: "Videos tutoriales y manuales de operación para empresas prestadoras y asesores técnicos.",
};

export default async function AyudaPrestadorPage({ searchParams }: PageProps<"/prestador/ayuda">) {
  const sesion = await requerirEmpresa();
  const { video } = await searchParams;
  // El asesor técnico arranca por su propio video.
  const inicial = typeof video === "string" ? video : sesion.perfil.rol === "tecnico" ? "03" : "02";
  return (
    <>
      <PageHeader
        title="Ayuda y tutoriales"
        description="Videos cortos y manuales paso a paso para usar la plataforma. Volvé a verlos cuando quieras."
        icon={CirclePlay}
        breadcrumb={[{ label: "Inicio", href: "/prestador" }, { label: "Ayuda y tutoriales" }]}
      />
      <CentroAyuda area="prestador" inicial={inicial} />
    </>
  );
}
