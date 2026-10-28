import {
  BadgeCheck,
  BellRing,
  Building2,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  FilePenLine,
  FileSignature,
  FlaskConical,
  GraduationCap,
  History,
  House,
  IdCard,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  Newspaper,
  PackageOpen,
  QrCode,
  Receipt,
  Route,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Stamp,
  Store,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Rol = "admin" | "control" | "inspector" | "empresa" | "tecnico";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Si se define, solo esos roles ven el ítem. */
  roles?: Rol[];
};

export type NavSection = {
  title?: string;
  items: NavItem[];
  /** Si se define, solo esos roles ven la sección completa. */
  roles?: Rol[];
};

/** Etiquetas sugeridas para cada rol. */
export const ROL_LABEL: Record<Rol, string> = {
  admin: "Administración",
  control: "Control",
  inspector: "Inspección",
  empresa: "Empresa",
  tecnico: "Director técnico",
};

export const navPrestador: NavSection[] = [
  {
    items: [
      { label: "Inicio", href: "/prestador", icon: House },
      { label: "Declaraciones", href: "/prestador/declaraciones", icon: ClipboardList },
      { label: "Certificados", href: "/prestador/certificados", icon: BadgeCheck },
      { label: "Firmas pendientes", href: "/prestador/firmas", icon: FileSignature, roles: ["tecnico"] },
      { label: "Pagos y timbrado", href: "/prestador/pagos", icon: Stamp },
      { label: "Productos", href: "/prestador/productos", icon: FlaskConical },
      { label: "Envases vacíos", href: "/prestador/envases", icon: PackageOpen },
      { label: "Legajo y técnicos", href: "/prestador/legajo", icon: IdCard },
      { label: "Trámites", href: "/prestador/tramites", icon: ScrollText },
      { label: "Avisos", href: "/prestador/avisos", icon: Megaphone },
    ],
  },
];

export const navGestion: NavSection[] = [
  {
    items: [{ label: "Panel", href: "/gestion", icon: LayoutDashboard }],
  },
  {
    title: "Prestadores",
    items: [
      { label: "Empresas", href: "/gestion/empresas", icon: Building2 },
      { label: "Trámites", href: "/gestion/tramites", icon: ScrollText },
      { label: "Productos", href: "/gestion/productos", icon: FlaskConical },
    ],
  },
  {
    title: "Control y timbrado",
    items: [
      { label: "Control de declaraciones", href: "/gestion/control", icon: ClipboardCheck },
      { label: "Certificados", href: "/gestion/certificados", icon: BadgeCheck },
      { label: "Pagos y conciliación", href: "/gestion/pagos", icon: Receipt },
    ],
  },
  {
    title: "Fiscalización",
    items: [
      { label: "Hoja de ruta", href: "/gestion/hoja-de-ruta", icon: Route },
      { label: "Inspecciones", href: "/gestion/inspecciones", icon: ShieldCheck },
      { label: "Notificaciones", href: "/gestion/notificaciones", icon: BellRing },
      { label: "Actas", href: "/gestion/actas", icon: FilePenLine },
      { label: "Establecimientos", href: "/gestion/establecimientos", icon: Store },
      { label: "Denuncias", href: "/gestion/denuncias", icon: MessageSquareWarning },
    ],
  },
  {
    title: "Información",
    items: [{ label: "Reportes", href: "/gestion/reportes", icon: ChartColumn }],
  },
  {
    title: "Comunidad",
    items: [
      { label: "Noticias", href: "/gestion/noticias", icon: Newspaper },
      { label: "Capacitaciones", href: "/gestion/capacitaciones", icon: GraduationCap },
      { label: "Avisos a empresas", href: "/gestion/avisos", icon: Megaphone },
    ],
  },
  {
    title: "Administración",
    roles: ["admin"],
    items: [
      { label: "Configuración", href: "/gestion/configuracion", icon: Settings, roles: ["admin"] },
      { label: "Usuarios", href: "/gestion/usuarios", icon: UsersRound, roles: ["admin"] },
      { label: "Auditoría", href: "/gestion/auditoria", icon: History, roles: ["admin"] },
    ],
  },
];

/** Navegación del portal público. */
export const navPortal: NavItem[] = [
  { label: "Inicio", href: "/", icon: House },
  { label: "Empresas habilitadas", href: "/empresas", icon: Building2 },
  { label: "Verificar certificado", href: "/verificar", icon: QrCode },
  { label: "Normativa", href: "/normativa", icon: Scale },
  { label: "Noticias", href: "/noticias", icon: Newspaper },
  { label: "Capacitaciones", href: "/capacitaciones", icon: GraduationCap },
  { label: "Denuncias", href: "/denuncias", icon: MessageSquareWarning },
];

/** Filtra secciones e ítems según el rol; descarta secciones vacías. */
export function filtrarNav(sections: NavSection[], rol: Rol): NavSection[] {
  return sections
    .filter((s) => !s.roles || s.roles.includes(rol))
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.roles || i.roles.includes(rol)) }))
    .filter((s) => s.items.length > 0);
}

/** Raíces de área: solo se marcan activas con coincidencia exacta. */
const RAICES = new Set(["/", "/gestion", "/prestador"]);

/** ¿El `href` corresponde a la ruta actual? (prefijo, salvo raíces de área). */
export function esRutaActiva(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (RAICES.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
