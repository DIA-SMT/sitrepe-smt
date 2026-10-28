import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Impresión",
  robots: { index: false },
};

/**
 * Vistas de impresión (certificados, notificaciones, actas, liquidaciones, informes).
 * Sin barra lateral: fondo gris en pantalla, hoja blanca A4 al imprimir.
 * Cada página agrega su propia barra de acciones con la clase `no-print`.
 */
export default async function ImprimirLayout({ children }: LayoutProps<"/imprimir">) {
  await requerirSesion();
  return (
    <div className="min-h-screen bg-noche-50/70 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 14mm 16mm; }`}</style>
      {children}
    </div>
  );
}
