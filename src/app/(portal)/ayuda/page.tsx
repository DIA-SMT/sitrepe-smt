import type { Metadata } from "next";
import { CirclePlay } from "lucide-react";
import { CentroAyuda } from "@/components/ayuda/centro-ayuda";
import { EncabezadoPortal } from "../_components/encabezado-portal";

export const metadata: Metadata = {
  title: "Tutoriales y manuales",
  description: "Videos tutoriales y manuales de SITREPE para vecinos, empresas prestadoras y asesores técnicos.",
};

export default async function AyudaPortalPage({ searchParams }: PageProps<"/ayuda">) {
  const { video } = await searchParams;
  return (
    <>
      <EncabezadoPortal
        antetitulo="Ayuda"
        titulo="Tutoriales y manuales"
        descripcion="Mirá cómo funciona la plataforma cuando quieras: videos cortos y manuales paso a paso para empresas prestadoras y asesores técnicos."
        icono={CirclePlay}
        migas={[{ label: "Tutoriales" }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <CentroAyuda area="portal" inicial={typeof video === "string" ? video : undefined} />
      </div>
    </>
  );
}
