import Link from "next/link";
import { Building2, MessageSquareWarning, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function EmpresaNoEncontrada() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <EmptyState
        icon={SearchX}
        title="Esta empresa no figura como habilitada"
        description="Puede que el enlace sea incorrecto, que la empresa no esté inscripta o que su habilitación esté vencida o suspendida. Sus certificados no son válidos mientras no figure en el listado oficial."
        action={
          <>
            <Button asChild>
              <Link href="/empresas">
                <Building2 aria-hidden />
                Ver empresas habilitadas
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/denuncias">
                <MessageSquareWarning aria-hidden />
                Hacer una denuncia
              </Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
