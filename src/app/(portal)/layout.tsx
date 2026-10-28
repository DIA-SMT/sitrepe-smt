import type { Metadata } from "next";
import { Asistente } from "@/components/asistente/asistente";
import { PortalFooter } from "@/components/layout/portal-footer";
import { PortalHeader } from "@/components/layout/portal-header";
import { APP } from "@/lib/config";

export const metadata: Metadata = {
  title: { template: `%s · ${APP.nombre}`, default: `${APP.nombre} · ${APP.direccion}` },
  description: `Portal público de la ${APP.direccion}: empresas de control de plagas habilitadas, verificación de certificados con QR, normativa, capacitaciones y denuncias.`,
};

/**
 * Aparición suave al hacer scroll (clase `.revelar`), solo en navegadores con scroll-driven animations
 * y sin preferencia de movimiento reducido. Sin soporte, el contenido se ve estático (mejora progresiva).
 */
const CSS_PORTAL = `
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .revelar {
      animation: portal-revelar linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 22%;
    }
  }
}
@keyframes portal-revelar {
  from { opacity: 0; transform: translateY(28px) scale(0.985); }
  to { opacity: 1; transform: none; }
}
`;

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <style href="sitrepe-portal" precedence="default">
        {CSS_PORTAL}
      </style>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <PortalHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <PortalFooter />
      <Asistente ambito="portal" />
    </div>
  );
}
