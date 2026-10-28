"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, ChevronDown, LifeBuoy, LogOut, Menu, UserRound, X } from "lucide-react";
import { motion } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Isotipo, Logo } from "@/components/brand/logo";
import { PetalDecor } from "@/components/brand/petal-decor";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";
import { esRutaActiva, type Rol } from "./nav";

export type ShellNavItem = { label: string; href: string; icon: React.ReactNode };
export type ShellNavSection = { title?: string; items: ShellNavItem[] };

type Area = "gestion" | "prestador";

export type AppShellClientProps = {
  area: Area;
  nav: ShellNavSection[];
  usuario: { nombre: string; email: string; rol: Rol; rolLabel: string; empresa: string | null };
  alertas: number;
  alertasHref: string;
  onLogoutAction?: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
};

const SIDEBAR_W = "lg:pl-[272px]";

function itemActivo(nav: ShellNavSection[], pathname: string | null) {
  let mejor: ShellNavItem | null = null;
  for (const s of nav) {
    for (const it of s.items) {
      if (esRutaActiva(pathname, it.href) && (!mejor || it.href.length > mejor.href.length)) mejor = it;
    }
  }
  return mejor;
}

/* --- Barra lateral -------------------------------------------------------- */

function Sidebar({
  area,
  nav,
  pathname,
  instancia,
  onNavigate,
  onClose,
}: {
  area: Area;
  nav: ShellNavSection[];
  pathname: string | null;
  instancia: "desktop" | "mobile";
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const oscuro = area === "gestion";
  const inicio = area === "gestion" ? "/gestion" : "/prestador";
  const activo = itemActivo(nav, pathname);

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden",
        oscuro ? "bg-noche text-noche-200" : "border-r border-border bg-card text-foreground",
      )}
    >
      {/* Decoración */}
      {oscuro ? (
        <div aria-hidden className="bg-grid mask-fade-b pointer-events-none absolute inset-x-0 top-0 h-64 text-white opacity-40" />
      ) : (
        <div aria-hidden className="bg-dots mask-fade-b pointer-events-none absolute inset-x-0 top-0 h-56 text-azul-600 opacity-50" />
      )}
      <PetalDecor variant="sidebar" tone={oscuro ? "dark" : "light"} className="-right-14 -bottom-14 h-48 opacity-90" />

      {/* Marca */}
      <div className="relative flex h-16 shrink-0 items-center justify-between gap-2 px-5">
        <Link href={inicio} onClick={onNavigate} className="flex items-center rounded-md">
          <Logo variant={oscuro ? "negativo" : "positivo"} height={34} priority />
        </Link>
        {onClose ? (
          <DialogPrimitive.Close
            aria-label="Cerrar menú"
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
              oscuro ? "text-noche-200 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>
        ) : null}
      </div>

      <div className="relative px-5 pt-3 pb-1">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5",
            oscuro ? "bg-white/[0.05] ring-1 ring-white/10" : "bg-azul-50/70 ring-1 ring-azul-100",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex size-8 items-center justify-center rounded-lg font-display text-[13px] font-bold",
              oscuro ? "bg-sol-400 text-noche-950" : "bg-gradient-brand text-white shadow-brand",
            )}
          >
            S
          </span>
          <div className="min-w-0 leading-tight">
            <p className={cn("font-display text-[15px] font-bold tracking-tight", oscuro ? "text-white" : "text-foreground")}>
              {APP.nombre}
            </p>
            <p className={cn("truncate text-[11px]", oscuro ? "text-noche-300" : "text-muted-foreground")}>
              {area === "gestion" ? "Gestión · Salud Ambiental" : "Portal de prestadores"}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav aria-label="Navegación principal" className="relative flex-1 overflow-y-auto px-3 pt-2 pb-4">
        {nav.map((section, si) => (
          <div key={section.title ?? `s${si}`} className={cn(si > 0 && "mt-5")}>
            {section.title ? (
              <p
                className={cn(
                  "px-3 pb-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase",
                  oscuro ? "text-noche-400" : "text-muted-foreground",
                )}
              >
                {section.title}
              </p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const esActivo = activo?.href === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={esActivo ? "page" : undefined}
                      className={cn(
                        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                        oscuro
                          ? esActivo
                            ? "text-white"
                            : "text-noche-200 hover:bg-white/[0.06] hover:text-white"
                          : esActivo
                            ? "text-azul-800"
                            : "text-noche-600 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {esActivo ? (
                        <motion.span
                          layoutId={`nav-activo-${area}-${instancia}`}
                          transition={{ type: "spring", stiffness: 520, damping: 40 }}
                          className={cn(
                            "absolute inset-0 rounded-xl",
                            oscuro ? "bg-white/[0.09] ring-1 ring-white/10" : "bg-azul-50 ring-1 ring-azul-100",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-linear-to-b",
                              oscuro ? "from-celeste-300 to-azul-500" : "from-azul-600 to-celeste-400",
                            )}
                          />
                        </motion.span>
                      ) : null}
                      <span
                        className={cn(
                          "relative z-10 flex shrink-0 transition-colors",
                          oscuro
                            ? esActivo
                              ? "text-celeste-300"
                              : "text-noche-300 group-hover:text-celeste-200"
                            : esActivo
                              ? "text-azul-600"
                              : "text-noche-400 group-hover:text-azul-600",
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="relative z-10 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Ayuda */}
      <div className="relative shrink-0 p-3">
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl p-3.5",
            oscuro ? "bg-white/[0.05] ring-1 ring-white/10" : "bg-subtle ring-1 ring-border",
          )}
        >
          <LifeBuoy className={cn("mt-0.5 size-4 shrink-0", oscuro ? "text-celeste-300" : "text-azul-600")} aria-hidden />
          <div className="min-w-0 text-xs leading-relaxed">
            <p className={cn("font-semibold", oscuro ? "text-white" : "text-foreground")}>¿Necesitás ayuda?</p>
            <a
              href={`mailto:${APP.contacto.email}`}
              className={cn(
                "block truncate underline-offset-2 hover:underline",
                oscuro ? "text-noche-200" : "text-muted-foreground",
              )}
            >
              {APP.contacto.email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Menú de usuario --------------------------------------------------------- */

function UserMenu({
  usuario,
  onLogout,
}: {
  usuario: AppShellClientProps["usuario"];
  onLogout?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-xl p-1 transition-colors hover:bg-muted data-[state=open]:bg-muted md:pr-2.5"
          aria-label={`Menú de usuario: ${usuario.nombre}`}
        >
          <Avatar nombre={usuario.nombre} size="sm" />
          <span className="hidden min-w-0 text-left md:block">
            <span className="block max-w-40 truncate text-sm leading-tight font-semibold text-foreground">
              {usuario.nombre}
            </span>
            <span className="block max-w-40 truncate text-xs leading-tight text-muted-foreground">{usuario.rolLabel}</span>
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground md:block" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
          <Avatar nombre={usuario.nombre} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{usuario.nombre}</p>
            <p className="truncate text-xs text-muted-foreground">{usuario.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 px-2.5 pb-3">
          <Badge tone="azul" dot size="sm">
            {usuario.rolLabel}
          </Badge>
          {usuario.empresa ? (
            <Badge tone="neutral" size="sm" className="max-w-full">
              <Building2 aria-hidden />
              <span className="truncate">{usuario.empresa}</span>
            </Badge>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserRound aria-hidden />
            Mi perfil
          </Link>
        </DropdownMenuItem>
        {onLogout ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="danger" onSelect={onLogout}>
              <LogOut aria-hidden />
              Cerrar sesión
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* --- Shell ----------------------------------------------------------------- */

export function AppShellClient({
  area,
  nav,
  usuario,
  alertas,
  alertasHref,
  onLogoutAction,
  children,
}: AppShellClientProps) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const logoutRef = useRef<HTMLFormElement>(null);
  const actual = itemActivo(nav, pathname);
  const inicio = area === "gestion" ? "/gestion" : "/prestador";

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>

      {/* Barra lateral fija (escritorio) */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[272px] lg:block">
        <Sidebar area={area} nav={nav} pathname={pathname} instancia="desktop" />
      </aside>

      {/* Cajón (móvil) */}
      <DialogPrimitive.Root open={abierto} onOpenChange={setAbierto}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-noche-950/50 backdrop-blur-[2px] data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in lg:hidden" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-50 w-[300px] max-w-[86vw] shadow-elevated outline-none data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in lg:hidden"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">Menú de navegación</DialogPrimitive.Title>
            <Sidebar
              area={area}
              nav={nav}
              pathname={pathname}
              instancia="mobile"
              onNavigate={() => setAbierto(false)}
              onClose={() => setAbierto(false)}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className={cn("flex min-h-dvh flex-col print:pl-0", SIDEBAR_W)}>
        {/* Barra superior */}
        <header className="glass no-print sticky top-0 z-30 border-b border-border/80">
          <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="inline-flex size-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted lg:hidden"
              aria-label="Abrir menú"
              aria-expanded={abierto}
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <Link href={inicio} className="rounded-md lg:hidden" aria-label={`Inicio de ${APP.nombre}`}>
              <Isotipo size={28} />
            </Link>

            <div className="min-w-0 flex-1 pl-1 lg:pl-0">
              <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {area === "gestion" ? "Gestión" : "Prestadores"}
                <span className="hidden sm:inline"> · {APP.direccion}</span>
              </p>
              <p className="truncate font-display text-[15px] leading-tight font-semibold text-foreground">
                {actual?.label ?? "Inicio"}
              </p>
            </div>

            {usuario.empresa && area === "prestador" ? (
              <span className="hidden max-w-56 items-center gap-1.5 truncate rounded-full bg-azul-50 px-3 py-1.5 text-xs font-medium text-azul-800 ring-1 ring-azul-100 md:inline-flex">
                <Building2 className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{usuario.empresa}</span>
              </span>
            ) : null}

            <Link
              href={alertasHref}
              className="relative inline-flex size-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted"
              aria-label={alertas > 0 ? `Alertas: ${alertas} sin leer` : "Alertas: no hay nuevas"}
            >
              <motion.span
                className="flex"
                initial={false}
                animate={alertas > 0 ? { rotate: [0, -14, 12, -8, 5, 0] } : { rotate: 0 }}
                transition={{ duration: 0.9, delay: 0.6, ease: "easeInOut" }}
                style={{ transformOrigin: "50% 10%" }}
              >
                <Bell className="size-5" aria-hidden />
              </motion.span>
              {alertas > 0 ? (
                <span className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-bold text-white ring-2 ring-white">
                  {alertas > 99 ? "99+" : alertas}
                </span>
              ) : null}
            </Link>

            <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />

            <UserMenu
              usuario={usuario}
              onLogout={onLogoutAction ? () => logoutRef.current?.requestSubmit() : undefined}
            />
          </div>
        </header>

        <main id="contenido" tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>

        <footer className="no-print border-t border-border/70 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              {APP.nombre} · {APP.direccion} · {APP.municipio}
            </p>
            <p className="font-display font-medium text-azul-700">{APP.lema}</p>
          </div>
        </footer>
      </div>

      {onLogoutAction ? <form ref={logoutRef} action={onLogoutAction} className="hidden" aria-hidden /> : null}
    </div>
  );
}
