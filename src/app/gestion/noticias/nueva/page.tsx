import type { Metadata } from "next";
import { PenSquare } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { requerirStaff } from "@/lib/auth";
import { resumenNoticias } from "@/lib/data/admin";
import { EditorNoticia } from "../_components/editor-noticia";

export const metadata: Metadata = { title: "Nueva noticia" };

export default async function NuevaNoticiaPage() {
  await requerirStaff(["admin", "control"]);
  const { categorias } = await resumenNoticias();

  return (
    <>
      <PageHeader
        title="Nueva noticia"
        description="Escribí la noticia y revisá la vista previa antes de publicarla. Podés guardarla como borrador y publicarla más tarde."
        icon={PenSquare}
        breadcrumb={[
          { label: "Gestión", href: "/gestion" },
          { label: "Noticias", href: "/gestion/noticias" },
          { label: "Nueva" },
        ]}
      />
      <EditorNoticia categorias={categorias} />
    </>
  );
}
