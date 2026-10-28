"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { APP } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { Constants, type Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/* Gestión de usuarios: solo Administración (la RPC admin_actualizar_perfil vuelve a verificarlo). */
const SOLO_ADMIN = ["admin"] as const;

type Rol = Enums<"rol_usuario">;

const uuidOpcional = (mensaje: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.uuid({ message: mensaje }).optional());

const casilla = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

const vinculo = {
  rol: z.enum(Constants.public.Enums.rol_usuario, { message: "Elegí el rol." }),
  empresa_id: uuidOpcional("Elegí una empresa del padrón."),
  tecnico_id: uuidOpcional("Elegí un asesor técnico."),
};

type DatosVinculo = { rol: Rol; empresa_id?: string; tecnico_id?: string };

function validarVinculo(d: DatosVinculo, ctx: z.RefinementCtx) {
  if ((d.rol === "empresa" || d.rol === "tecnico") && !d.empresa_id) {
    ctx.addIssue({
      code: "custom",
      path: ["empresa_id"],
      message: "Las cuentas de empresa y de técnico se vinculan a una empresa.",
    });
  }
  if (d.rol === "tecnico" && !d.tecnico_id) {
    ctx.addIssue({
      code: "custom",
      path: ["tecnico_id"],
      message: "Elegí el asesor técnico de la empresa que usa esta cuenta.",
    });
  }
}

/** Normaliza el vínculo según el rol (el staff no tiene empresa ni técnico). */
function vinculoSegunRol(d: DatosVinculo) {
  const deEmpresa = d.rol === "empresa" || d.rol === "tecnico";
  return {
    empresa: deEmpresa ? (d.empresa_id ?? null) : null,
    tecnico: d.rol === "tecnico" ? (d.tecnico_id ?? null) : null,
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Verifica que el técnico pertenezca a la empresa elegida (la RPC también lo exige). El estado
 * (baja o rechazado) solo se controla al vincular un técnico nuevo: si la cuenta ya estaba
 * vinculada a ese técnico, se puede seguir editando (p. ej. para desactivarla o cambiarle el rol).
 */
async function verificarTecnico(
  supabase: Supabase,
  tecnico: string | null,
  empresa: string | null,
  tecnicoActual: string | null = null,
): Promise<EstadoAccion | null> {
  if (!tecnico) return null;
  const { data, error } = await supabase.from("tecnicos").select("empresa_id, estado").eq("id", tecnico).maybeSingle();
  if (error) return fallo(mensajeError(error, "No se pudo verificar el asesor técnico."));
  if (!data || data.empresa_id !== empresa) {
    return fallo("Revisá los datos marcados.", {
      tecnico_id: ["El asesor técnico no pertenece a la empresa elegida."],
    });
  }
  if (tecnico !== tecnicoActual && (data.estado === "baja" || data.estado === "rechazado")) {
    return fallo("Revisá los datos marcados.", {
      tecnico_id: ["El asesor técnico está dado de baja o fue rechazado."],
    });
  }
  return null;
}

/* =============================================================================
 * Invitar usuario
 * ========================================================================== */

const esquemaInvitacion = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email("Ingresá un correo válido.")),
    nombre: z.string().trim().min(2, "Escribí el nombre.").max(80, "Usá como máximo 80 caracteres."),
    apellido: z.string().trim().min(2, "Escribí el apellido.").max(80, "Usá como máximo 80 caracteres."),
    ...vinculo,
  })
  .superRefine(validarVinculo);

/**
 * Crea la cuenta e invita por correo (Supabase Auth envía el enlace para elegir la
 * contraseña) y luego asigna rol y vínculos con la RPC de administración.
 */
export async function invitarUsuario(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(SOLO_ADMIN);
  const parsed = esquemaInvitacion.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;
  const { empresa, tecnico } = vinculoSegunRol(d);

  const supabase = await createClient();
  const { count, error: errorExiste } = await supabase
    .from("perfiles")
    .select("id", { count: "exact", head: true })
    .eq("email", d.email);
  if (errorExiste) return fallo(mensajeError(errorExiste, "No se pudo verificar el correo."));
  if ((count ?? 0) > 0) {
    return fallo("Revisá los datos marcados.", {
      email: ["Ya hay un usuario con ese correo: editalo desde el listado."],
    });
  }
  const errorTecnico = await verificarTecnico(supabase, tecnico, empresa);
  if (errorTecnico) return errorTecnico;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return fallo(
      "El servidor no tiene configurada la clave de servicio de Supabase (SUPABASE_SECRET_KEY): no se pueden enviar invitaciones.",
    );
  }

  const { data: invitacion, error: errorInvitacion } = await admin.auth.admin.inviteUserByEmail(d.email, {
    data: { nombre: d.nombre, apellido: d.apellido },
    redirectTo: `${APP.siteUrl}/auth/confirmar?siguiente=/actualizar-clave`,
  });
  if (errorInvitacion || !invitacion.user) {
    if (errorInvitacion && /already|registered|exists/i.test(errorInvitacion.message)) {
      return fallo("Revisá los datos marcados.", {
        email: ["Ya existe una cuenta con ese correo."],
      });
    }
    return fallo(mensajeError(errorInvitacion, "No se pudo enviar la invitación."));
  }

  const { error: errorPerfil } = await supabase.rpc("admin_actualizar_perfil", {
    p_perfil: invitacion.user.id,
    p_rol: d.rol,
    // Los parámetros uuid de la RPC aceptan null aunque los tipos generados digan string.
    p_empresa: empresa as string,
    p_tecnico: tecnico as string,
    p_activo: true,
  });
  if (errorPerfil) {
    // Sin el rol asignado la cuenta quedaría como "empresa" sin vínculo: se deshace la invitación.
    await admin.auth.admin.deleteUser(invitacion.user.id);
    return fallo(mensajeError(errorPerfil, "No se pudo asignar el rol; la invitación se canceló."));
  }

  revalidatePath("/gestion/usuarios");
  return exito(`Invitación enviada a ${d.email}. La cuenta se activa cuando elija su contraseña.`);
}

/* =============================================================================
 * Editar rol, vínculo y estado
 * ========================================================================== */

const esquemaEdicion = z
  .object({
    perfil: z.uuid({ message: "Usuario inválido." }),
    activo: casilla,
    ...vinculo,
  })
  .superRefine(validarVinculo);

export async function actualizarUsuario(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirStaff(SOLO_ADMIN);
  const parsed = esquemaEdicion.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const d = parsed.data;

  if (d.perfil === sesion.userId && (d.rol !== "admin" || !d.activo)) {
    return fallo(
      "No podés quitarte el rol de Administración ni desactivar tu propia cuenta. Pedíselo a otra persona con ese rol.",
    );
  }
  const { empresa, tecnico } = vinculoSegunRol(d);
  const supabase = await createClient();
  const { data: actual, error: errorActual } = await supabase
    .from("perfiles")
    .select("tecnico_id")
    .eq("id", d.perfil)
    .maybeSingle();
  if (errorActual) return fallo(mensajeError(errorActual, "No se pudo obtener el usuario."));
  if (!actual) return fallo("El usuario ya no existe.");
  const errorTecnico = await verificarTecnico(supabase, tecnico, empresa, actual.tecnico_id);
  if (errorTecnico) return errorTecnico;

  const { error } = await supabase.rpc("admin_actualizar_perfil", {
    p_perfil: d.perfil,
    p_rol: d.rol,
    // Los parámetros uuid de la RPC aceptan null aunque los tipos generados digan string.
    p_empresa: empresa as string,
    p_tecnico: tecnico as string,
    p_activo: d.activo,
  });
  if (error) return fallo(mensajeError(error, "No se pudo actualizar el usuario."));

  revalidatePath("/gestion/usuarios");
  return exito(d.activo ? "Usuario actualizado." : "Usuario desactivado: ya no puede ingresar.");
}

/** Reactiva o desactiva una cuenta sin cambiar su rol (acción rápida del listado). */
export async function cambiarActivoUsuario(formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirStaff(SOLO_ADMIN);
  const parsed = z
    .object({
      perfil: z.uuid({ message: "Usuario inválido." }),
      activo: casilla,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { perfil, activo } = parsed.data;
  if (perfil === sesion.userId && !activo) return fallo("No podés desactivar tu propia cuenta.");

  const supabase = await createClient();
  const { data: actual, error: errorActual } = await supabase
    .from("perfiles")
    .select("rol, empresa_id, tecnico_id, nombre, apellido, email")
    .eq("id", perfil)
    .maybeSingle();
  if (errorActual) return fallo(mensajeError(errorActual, "No se pudo obtener el usuario."));
  if (!actual) return fallo("El usuario ya no existe.");
  if ((actual.rol === "empresa" || actual.rol === "tecnico") && !actual.empresa_id) {
    // admin_actualizar_perfil exige empresa para estos roles aunque solo cambie el estado.
    return fallo(
      "Esta cuenta no está vinculada a ninguna empresa, y la base no permite cambiar su estado sin ese vínculo.\nVinculala a una empresa desde Editar, o esperá a que se apruebe su inscripción.",
    );
  }

  const { error } = await supabase.rpc("admin_actualizar_perfil", {
    p_perfil: perfil,
    p_rol: actual.rol,
    // Los parámetros uuid de la RPC aceptan null aunque los tipos generados digan string.
    p_empresa: actual.empresa_id as string,
    p_tecnico: actual.tecnico_id as string,
    p_activo: activo,
  });
  if (error) return fallo(mensajeError(error, "No se pudo cambiar el estado del usuario."));

  const nombre = `${actual.nombre} ${actual.apellido}`.trim() || actual.email || "El usuario";
  revalidatePath("/gestion/usuarios");
  return exito(activo ? `${nombre} puede volver a ingresar.` : `${nombre} ya no puede ingresar.`);
}
