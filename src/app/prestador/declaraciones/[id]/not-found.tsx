import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function DeclaracionNoEncontrada() {
  return (
    <EmptyState
      icon={ClipboardList}
      title="No encontramos esa declaración"
      description="Puede que el enlace esté incompleto, que el borrador se haya descartado o que la planilla pertenezca a otra empresa."
      action={
        <>
          <Button asChild variant="outline">
            <Link href="/prestador/declaraciones">Ver mis declaraciones</Link>
          </Button>
          <Button asChild>
            <Link href="/prestador/declaraciones/nueva">
              <Plus aria-hidden />
              Nueva declaración
            </Link>
          </Button>
        </>
      }
    />
  );
}
