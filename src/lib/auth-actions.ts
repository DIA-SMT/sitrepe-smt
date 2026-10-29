"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { APP } from "@/lib/config";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError, rutaInternaSegura } from "@/lib/acciones";
import { getSesion, inicioPorRol } from "@/lib/auth";
import { CUENTAS_DEMO, accesoDemoHabilitado } from "@/lib/demo";

const esquemaIngreso = z.object({
  email: z.email("Ingresá un correo válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
  siguiente: z.string().optional(),
});

export async function iniciarSesion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const datos = esquemaIngreso.safeParse(Object.fromEntries(formData));
  if (!datos.success) return falloValidacion(datos.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: datos.data.email.trim().toLowerCase(),
    password: datos.data.password,
  });
  if (error) return fallo(mensajeError(error, "No se pudo iniciar sesión."));

  const sesion = await getSesion();
  if (!sesion) {
    await supabase.auth.signOut();
    return fallo("Tu cuenta no está habilitada en la plataforma. Comunicate con la Dirección de Salud Ambiental.");
  }
  const siguiente = datos.data.siguiente;
  redirect(rutaInternaSegura(siguiente) ?? inicioPorRol(sesion.perfil.rol));
}

/** Ingreso con una cuenta de demostración por rol (solo si el acceso rápido está activado; ver src/lib/demo.ts). */
export async function ingresarComoDemo(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  if (!accesoDemoHabilitado()) return fallo("El acceso de demostración no está habilitado.");
  const cuenta = CUENTAS_DEMO.find((c) => c.rol === formData.get("rol"));
  if (!cuenta) return fallo("Elegí un tipo de usuario.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: cuenta.email,
    password: process.env.USUARIOS_DEMO_CLAVE ?? "",
  });
  if (error) {
    return fallo("No se pudo ingresar con la cuenta de demostración. Revisá que exista (npm run usuarios:demo).");
  }

  const sesion = await getSesion();
  if (!sesion) {
    await supabase.auth.signOut();
    return fallo("La cuenta de demostración no está habilitada en la plataforma.");
  }
  redirect(inicioPorRol(sesion.perfil.rol));
}

const esquemaRegistro = z
  .object({
    nombre: z.string().trim().min(2, "Ingresá tu nombre."),
    apellido: z.string().trim().min(2, "Ingresá tu apellido."),
    email: z.email("Ingresá un correo válido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmacion: z.string(),
  })
  .refine((d) => d.password === d.confirmacion, { message: "Las contraseñas no coinciden.", path: ["confirmacion"] });

/** Alta de cuenta de prestador. Luego completa la solicitud de inscripción de su empresa. */
export async function registrarCuenta(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const datos = esquemaRegistro.safeParse(Object.fromEntries(formData));
  if (!datos.success) return falloValidacion(datos.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: datos.data.email.trim().toLowerCase(),
    password: datos.data.password,
    options: {
      data: { nombre: datos.data.nombre, apellido: datos.data.apellido },
      emailRedirectTo: `${APP.siteUrl}/auth/confirmar?siguiente=/prestador/inscripcion`,
    },
  });
  if (error) return fallo(mensajeError(error, "No se pudo crear la cuenta."));

  if (data.session) redirect("/prestador/inscripcion");
  return exito("Te enviamos un correo para confirmar tu cuenta. Después podés ingresar y completar la inscripción de tu empresa.");
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/ingresar");
}

const esquemaRecuperar = z.object({ email: z.email("Ingresá un correo válido.") });

export async function solicitarRecuperacion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const datos = esquemaRecuperar.safeParse(Object.fromEntries(formData));
  if (!datos.success) return falloValidacion(datos.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(datos.data.email.trim().toLowerCase(), {
    redirectTo: `${APP.siteUrl}/auth/confirmar?siguiente=/actualizar-clave`,
  });
  if (error) return fallo(mensajeError(error));
  return exito("Si el correo está registrado, vas a recibir un enlace para restablecer la contraseña.");
}

const esquemaClave = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmacion: z.string(),
  })
  .refine((d) => d.password === d.confirmacion, { message: "Las contraseñas no coinciden.", path: ["confirmacion"] });

export async function actualizarClave(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const datos = esquemaClave.safeParse(Object.fromEntries(formData));
  if (!datos.success) return falloValidacion(datos.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: datos.data.password });
  if (error) return fallo(mensajeError(error));
  return exito("La contraseña se actualizó correctamente.");
}
