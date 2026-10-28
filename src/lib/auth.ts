import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type Rol = Enums<"rol_usuario">;
export type Perfil = Tables<"perfiles">;
export type EmpresaSesion = Pick<
  Tables<"empresas">,
  | "id"
  | "numero_registro"
  | "nombre_comercial"
  | "cuit"
  | "estado"
  | "habilita_fumigacion"
  | "habilita_tanques"
  | "vencimiento_habilitacion"
>;

export type Sesion = {
  userId: string;
  email: string;
  perfil: Perfil;
  /** Empresa vinculada (solo roles empresa/técnico). */
  empresa: EmpresaSesion | null;
};

export const ROLES_STAFF = ["admin", "control", "inspector"] as const satisfies readonly Rol[];
export const ROLES_EMPRESA = ["empresa", "tecnico"] as const satisfies readonly Rol[];

export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: "Administración",
  control: "Control y timbrado",
  inspector: "Inspección",
  empresa: "Empresa prestadora",
  tecnico: "Asesor técnico",
};

export function esStaff(rol: Rol): boolean {
  return (ROLES_STAFF as readonly Rol[]).includes(rol);
}

/** Página de inicio según el rol. */
export function inicioPorRol(rol: Rol): string {
  return esStaff(rol) ? "/gestion" : "/prestador";
}

/**
 * Sesión actual (memorizada por request). Devuelve null si no hay usuario,
 * si el perfil no existe o si está inactivo.
 */
export const getSesion = cache(async (): Promise<Sesion | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", claims.sub).maybeSingle();
  if (!perfil || !perfil.activo) return null;

  let empresa: EmpresaSesion | null = null;
  if (perfil.empresa_id) {
    const { data: e } = await supabase
      .from("empresas")
      .select(
        "id, numero_registro, nombre_comercial, cuit, estado, habilita_fumigacion, habilita_tanques, vencimiento_habilitacion",
      )
      .eq("id", perfil.empresa_id)
      .maybeSingle();
    empresa = e ?? null;
  }

  return { userId: claims.sub, email: (claims.email as string | undefined) ?? perfil.email ?? "", perfil, empresa };
});

/** Exige sesión; si no hay, redirige a /ingresar. */
export async function requerirSesion(): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) redirect("/ingresar");
  return sesion;
}

/** Exige uno de los roles indicados; si no, redirige al inicio de su área. */
export async function requerirRol(roles: readonly Rol[]): Promise<Sesion> {
  const sesion = await requerirSesion();
  if (!roles.includes(sesion.perfil.rol)) redirect(inicioPorRol(sesion.perfil.rol));
  return sesion;
}

/** Exige un usuario del staff municipal (por defecto: admin, control o inspector). */
export async function requerirStaff(roles: readonly Rol[] = ROLES_STAFF): Promise<Sesion> {
  return requerirRol(roles);
}

/**
 * Exige un usuario de empresa con empresa vinculada. Si la cuenta todavía no
 * tiene empresa, la envía a completar la solicitud de inscripción.
 */
export async function requerirEmpresa(): Promise<Sesion & { empresa: EmpresaSesion }> {
  const sesion = await requerirRol(ROLES_EMPRESA);
  if (!sesion.empresa) redirect("/prestador/inscripcion");
  return sesion as Sesion & { empresa: EmpresaSesion };
}

/** Datos mínimos del usuario para la interfaz (AppShell). */
export function usuarioParaUI(sesion: Sesion) {
  const nombre = `${sesion.perfil.nombre} ${sesion.perfil.apellido}`.trim() || sesion.email;
  return {
    nombre,
    email: sesion.email,
    rol: sesion.perfil.rol,
    rolLabel: ETIQUETA_ROL[sesion.perfil.rol],
    empresa: sesion.empresa?.nombre_comercial ?? null,
  };
}
