import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSesion, inicioPorRol } from "@/lib/auth";
import { FormCambioClave } from "../_components/form-cambio-clave";

export const metadata: Metadata = {
  title: "Actualizar contraseña",
  robots: { index: false },
};

/** Destino del enlace de recuperación (/auth/confirmar deja la sesión iniciada). Exige sesión. */
export default async function ActualizarClavePage() {
  const sesion = await getSesion();
  if (!sesion) redirect("/ingresar?siguiente=/actualizar-clave");

  return <FormCambioClave modo="recuperacion" destino={inicioPorRol(sesion.perfil.rol)} email={sesion.email} />;
}
