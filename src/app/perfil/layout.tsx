import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BrandStripe } from "@/components/brand/petal-decor";
import { Button } from "@/components/ui/button";
import { inicioPorRol, requerirSesion } from "@/lib/auth";
import { cerrarSesion } from "@/lib/auth-actions";
import { APP } from "@/lib/config";

export const metadata: Metadata = {
  title: "Mi perfil",
  robots: { index: false },
};

/** Perfil de cualquier usuario: barra superior simple con el logo y la vuelta a su área. */
export default async function PerfilLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  const inicio = inicioPorRol(sesion.perfil.rol);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="glass sticky top-0 z-30 border-b border-border/80">
        <BrandStripe className="h-[3px]" />
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href={inicio} className="flex shrink-0 items-center gap-3 rounded-md" aria-label={`${APP.nombre} · Volver a mi área`}>
            <Logo height={34} priority />
          </Link>
          <span aria-hidden className="hidden h-7 w-px bg-border-strong sm:block" />
          <p className="hidden font-display text-[15px] font-semibold text-foreground sm:block">Mi perfil</p>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={inicio}>
                <ArrowLeft aria-hidden />
                <span className="sm:hidden">Volver</span>
                <span className="hidden sm:inline">Volver a mi área</span>
              </Link>
            </Button>
            <form action={cerrarSesion}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Cerrar sesión" className="text-danger hover:bg-danger-soft">
                <LogOut aria-hidden />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main id="contenido" className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </main>

      <footer className="border-t border-border/70 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {APP.nombre} · {APP.direccion} · {APP.municipio}
          </p>
          <p className="font-display font-medium text-azul-700">{APP.lema}</p>
        </div>
      </footer>
    </div>
  );
}
