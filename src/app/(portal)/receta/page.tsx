import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, Search } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EncabezadoPortal } from "../_components/encabezado-portal";
import { EJEMPLO_CODIGO, normalizarCodigo } from "../_lib/codigo";

export const metadata: Metadata = {
  title: "Verificar receta domisanitaria",
  description: "Comercios que venden productos domisanitarios: verificá la receta del asesor técnico antes de vender.",
};

export default async function RecetaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { codigo } = await searchParams;
  if (typeof codigo === "string" && codigo.trim()) redirect(`/receta/${encodeURIComponent(normalizarCodigo(codigo))}`);

  return (
    <>
      <EncabezadoPortal
        antetitulo="Comercios"
        titulo="Verificar receta domisanitaria"
        descripcion="Antes de vender el producto, escaneá el QR de la receta o ingresá su código para confirmar que la emitió un asesor técnico habilitado."
        icono={FileText}
        migas={[{ label: "Verificar receta" }]}
      />
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        <SectionCard title="Código de la receta" icon={Search}>
          <form action="/receta" className="flex flex-col gap-4">
            <Field htmlFor="codigo-receta" label="Código" hint="Figura debajo del QR de la receta." required>
              <Input
                id="codigo-receta"
                name="codigo"
                required
                autoComplete="off"
                autoCapitalize="characters"
                placeholder={EJEMPLO_CODIGO}
                className="font-mono"
              />
            </Field>
            <Button type="submit">
              <Search aria-hidden />
              Verificar receta
            </Button>
          </form>
        </SectionCard>
      </div>
    </>
  );
}
