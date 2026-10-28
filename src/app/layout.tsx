import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { APP } from "@/lib/config";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP.siteUrl),
  title: {
    template: `%s · ${APP.nombre}`,
    default: `${APP.nombre} · ${APP.municipio}`,
  },
  description: APP.descripcion,
  applicationName: APP.nombre,
  authors: [{ name: `${APP.direccion} · ${APP.municipio}` }],
};

export const viewport: Viewport = {
  themeColor: "#0066ff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${poppins.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
        <Toaster
          richColors
          position="top-right"
          closeButton
          toastOptions={{ className: "font-sans", style: { fontFamily: "var(--font-inter)" } }}
        />
      </body>
    </html>
  );
}
