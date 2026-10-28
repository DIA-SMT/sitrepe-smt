import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NoticiaNoEncontrada() {
  return (
    <div className="py-10">
      <EmptyState
        icon={Newspaper}
        title="No encontramos esa noticia"
        description="Puede que se haya eliminado o que el enlace esté incompleto."
        action={
          <Button asChild variant="outline">
            <Link href="/gestion/noticias">
              <ArrowLeft aria-hidden />
              Volver a noticias
            </Link>
          </Button>
        }
      />
    </div>
  );
}
