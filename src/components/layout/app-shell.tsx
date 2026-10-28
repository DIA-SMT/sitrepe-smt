import type { NavSection, Rol } from "./nav";
import { AppShellClient, type ShellNavSection } from "./app-shell-client";

export type AppShellUsuario = {
  nombre: string;
  email: string;
  rol: Rol;
  rolLabel: string;
  empresa?: string | null;
};

export type AppShellProps = {
  area: "gestion" | "prestador";
  /** Navegación (ya filtrada por rol con `filtrarNav`). */
  nav: NavSection[];
  usuario: AppShellUsuario;
  /** Cantidad de alertas/avisos sin leer (campana). */
  alertas?: number;
  /** Destino de la campana. Por defecto: `/gestion/notificaciones` o `/prestador/avisos`. */
  alertasHref?: string;
  /** Server action de cierre de sesión (p. ej. `cerrarSesion`). Sin ella, no se muestra "Cerrar sesión". */
  onLogoutAction?: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
};

/**
 * Estructura de las áreas autenticadas: barra lateral (cajón en móvil), barra superior
 * con contexto, campana de alertas y menú de usuario.
 *
 * Es un Server Component: convierte los íconos de `nav` en elementos para poder
 * pasarlos al cliente (los componentes de ícono no son serializables).
 */
export function AppShell({ nav, area, usuario, alertas = 0, alertasHref, onLogoutAction, children }: AppShellProps) {
  const navSerializable: ShellNavSection[] = nav.map((section) => ({
    title: section.title,
    items: section.items.map((item) => {
      const Icon = item.icon;
      return {
        label: item.label,
        href: item.href,
        icon: <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden />,
      };
    }),
  }));

  return (
    <AppShellClient
      area={area}
      nav={navSerializable}
      usuario={{ ...usuario, empresa: usuario.empresa ?? null }}
      alertas={alertas}
      alertasHref={alertasHref ?? (area === "gestion" ? "/gestion/notificaciones" : "/prestador/avisos")}
      onLogoutAction={onLogoutAction}
    >
      {children}
    </AppShellClient>
  );
}
