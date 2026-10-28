import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { esStaff, getSesion } from "@/lib/auth";

/** Certificado inexistente o sin permiso para imprimirlo (la RLS no devuelve la fila). */
export default async function ImpresionCertificadoNoEncontrada() {
  const sesion = await getSesion();
  const staff = sesion ? esStaff(sesion.perfil.rol) : false;
  const volver = staff ? "/gestion/certificados" : "/prestador/certificados";

  return (
    <div className="mx-auto w-full max-w-[210mm] px-4 sm:px-0">
      <EmptyState
        icon={FileSearch}
        title="No encontramos ese certificado"
        description="Revisá el enlace: el certificado no existe o no tenés permiso para imprimirlo. Cada empresa solo puede imprimir sus propios certificados."
        action={
          <Button asChild>
            <Link href={volver}>
              <ArrowLeft aria-hidden /> Volver a los certificados
            </Link>
          </Button>
        }
      />
    </div>
  );
}
