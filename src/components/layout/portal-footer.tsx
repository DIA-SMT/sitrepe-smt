import Link from "next/link";
import { Clock, Mail, MapPin } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BrandStripe, PetalDecor } from "@/components/brand/petal-decor";
import { APP } from "@/lib/config";
import { navPortal } from "./nav";

const ANIO = new Date().getFullYear();

/** Pie del portal público (superficie noche, logo negativo, contacto y accesos rápidos). */
export function PortalFooter() {
  return (
    <footer className="no-print relative overflow-hidden bg-noche text-noche-200">
      <div aria-hidden className="bg-grid mask-fade pointer-events-none absolute inset-0 text-white opacity-30" />
      <PetalDecor variant="corner" tone="dark" className="h-72 opacity-80 sm:h-96" />

      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
          <div className="flex flex-col gap-5">
            <Logo variant="negativo" size="lg" />
            <div className="max-w-sm text-sm leading-relaxed">
              <p className="font-display text-base font-semibold text-white">{APP.nombre}</p>
              <p className="text-noche-200">{APP.nombreLargo}.</p>
            </div>
            <p className="text-gradient-sol font-display text-2xl font-semibold tracking-tight">{APP.lema}</p>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.12em] text-white uppercase">Accesos rápidos</h2>
            <ul className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 md:grid-cols-1">
              {navPortal.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex items-center gap-2 rounded-sm text-noche-200 transition-colors hover:text-white"
                  >
                    <span aria-hidden className="size-1 rounded-full bg-celeste-400" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.12em] text-white uppercase">Contacto</h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-celeste-300" aria-hidden />
                <a href={`mailto:${APP.contacto.email}`} className="break-all text-noche-100 hover:text-white hover:underline">
                  {APP.contacto.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-celeste-300" aria-hidden />
                <span>{APP.contacto.domicilio}</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-celeste-300" aria-hidden />
                <span>{APP.contacto.horario}</span>
              </li>
            </ul>
            <div className="mt-6 rounded-2xl bg-white/[0.05] p-4 text-xs leading-relaxed ring-1 ring-white/10">
              <p className="font-semibold text-white">{APP.direccion}</p>
              <p>{APP.secretaria}</p>
              <p>{APP.municipio}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-noche-300 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {ANIO} {APP.municipio}.
          </p>
          <p>
            {APP.nombre} · {APP.direccion}
          </p>
        </div>
      </div>
      <BrandStripe className="relative" />
    </footer>
  );
}
