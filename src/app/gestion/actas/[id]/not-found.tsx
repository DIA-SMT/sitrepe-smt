import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ActaNoEncontrada() {
  return (
    <EmptyState
      icon={FileSearch}
      title="No encontramos esa acta"
      description="Puede que el enlace esté incompleto o que el acta no exista. Buscala en el registro por número, establecimiento o empresa."
      action={
        <Button asChild variant="outline">
          <Link href="/gestion/actas">
            <ArrowLeft aria-hidden /> Volver al registro de actas
          </Link>
        </Button>
      }
    />
  );
}
