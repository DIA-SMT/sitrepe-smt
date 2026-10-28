import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSesion, inicioPorRol } from "@/lib/auth";
import { FormRegistro } from "./_components/form-registro";

export const metadata: Metadata = {
  title: "Crear cuenta de prestador",
  description: "Registro de empresas prestadoras de servicios de control de plagas urbanas y limpieza de tanques.",
};

export default async function RegistroPage() {
  const sesion = await getSesion();
  if (sesion) redirect(inicioPorRol(sesion.perfil.rol));

  return <FormRegistro />;
}
