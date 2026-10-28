import Link from "next/link";
import { ClipboardPlus, FileSearch } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

/** El certificado no existe, el enlace está incompleto o pertenece a otra empresa. */
export default function CertificadoNoEncontrado() {
  return (
    <EmptyState
      icon={FileSearch}
      title="No encontramos ese certificado"
      description="Puede que el enlace esté incompleto, que el servicio se haya eliminado de un borrador o que el certificado pertenezca a otra empresa."
      action={
        <>
          <Button asChild variant="outline">
            <Link href="/prestador/certificados">Ver mis certificados</Link>
          </Button>
          <Button asChild>
            <Link href="/prestador/declaraciones/nueva">
              <ClipboardPlus aria-hidden /> Nueva declaración
            </Link>
          </Button>
        </>
      }
    />
  );
}
