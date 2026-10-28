import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function CapacitacionNoEncontrada() {
  return (
    <div className="py-10">
      <EmptyState
        icon={GraduationCap}
        title="No encontramos esa capacitación"
        description="Revisá el enlace o buscala en la agenda de capacitaciones."
        action={
          <Button asChild variant="outline">
            <Link href="/gestion/capacitaciones">
              <ArrowLeft aria-hidden />
              Volver a capacitaciones
            </Link>
          </Button>
        }
      />
    </div>
  );
}
