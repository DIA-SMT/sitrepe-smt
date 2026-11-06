import type { Metadata } from "next";
import { CirclePlay } from "lucide-react";
import { CentroAyuda } from "@/components/ayuda/centro-ayuda";
import { PageHeader } from "@/components/shared/page-header";
import { type Rol, requerirStaff } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ayuda y tutoriales",
  description: "Videos tutoriales y manuales de operación de cada perfil de la plataforma.",
};

/** Cada perfil arranca por su propio video. */
const VIDEO_DEL_ROL: Partial<Record<Rol, string>> = { control: "04", inspector: "05", admin: "06" };

export default async function AyudaGestionPage({ searchParams }: PageProps<"/gestion/ayuda">) {
  const sesion = await requerirStaff();
  const { video } = await searchParams;
  return (
    <>
      <PageHeader
        title="Ayuda y tutoriales"
        description="Videos cortos y manuales de operación de cada perfil: el del área y los de las empresas, para acompañarlas."
        icon={CirclePlay}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Ayuda y tutoriales" }]}
      />
      <CentroAyuda area="gestion" inicial={typeof video === "string" ? video : VIDEO_DEL_ROL[sesion.perfil.rol]} />
    </>
  );
}
