import Link from "next/link";
import { ArrowLeft, BellOff } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotificacionNoEncontrada() {
  return (
    <EmptyState
      icon={BellOff}
      title="No encontramos esa notificación"
      description="Puede que el enlace esté incompleto o que la notificación no exista. Buscala en el listado por número o razón social."
      action={
        <Button asChild variant="outline">
          <Link href="/gestion/notificaciones">
            <ArrowLeft aria-hidden /> Volver a notificaciones
          </Link>
        </Button>
      }
    />
  );
}
