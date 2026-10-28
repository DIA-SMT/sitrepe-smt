import Link from "next/link";
import { Newspaper } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NoticiaNoEncontrada() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <EmptyState
        icon={Newspaper}
        title="No encontramos esta noticia"
        description="Puede que el enlace esté mal escrito o que la noticia ya no esté publicada."
        action={
          <Button asChild>
            <Link href="/noticias">Ver todas las noticias</Link>
          </Button>
        }
      />
    </div>
  );
}
