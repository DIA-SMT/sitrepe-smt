import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { rutaInternaSegura } from "@/lib/acciones";
import { getSesion, inicioPorRol } from "@/lib/auth";
import { APP } from "@/lib/config";
import { CUENTAS_DEMO, accesoDemoHabilitado } from "@/lib/demo";
import { EncabezadoAuth } from "../_components/encabezado-auth";
import { AccesoDemo } from "./_components/acceso-demo";
import { FormIngreso } from "./_components/form-ingreso";

export const metadata: Metadata = {
  title: "Ingresar",
  description: `Acceso a ${APP.nombre} para empresas prestadoras y personal de la ${APP.direccion}.`,
};

type IngresarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Solo destinos internos (evita redirecciones abiertas y bucles con /ingresar). */
function destinoSeguro(valor: string | string[] | undefined): string | null {
  const v = rutaInternaSegura(Array.isArray(valor) ? valor[0] : valor);
  if (!v || v === "/ingresar" || v.startsWith("/ingresar?") || v.startsWith("/ingresar/")) return null;
  return v;
}

export default async function IngresarPage({ searchParams }: IngresarPageProps) {
  const params = await searchParams;
  const siguiente = destinoSeguro(params.siguiente);

  const sesion = await getSesion();
  if (sesion) redirect(siguiente ?? inicioPorRol(sesion.perfil.rol));

  const errorEnlace = params.error === "enlace";

  return (
    <>
      <EncabezadoAuth
        icon={LogIn}
        eyebrow="Acceso a la plataforma"
        title="Ingresá a tu cuenta"
        description="Empresas prestadoras, asesores técnicos y personal de la Dirección de Salud Ambiental."
      />

      {errorEnlace ? (
        <Alert tone="warning" title="El enlace no es válido o ya venció" className="mb-5">
          Los enlaces de confirmación y de recuperación se pueden usar una sola vez y vencen al rato. Si querés cambiar tu
          contraseña, pedí un enlace nuevo desde «¿Olvidaste tu contraseña?».
        </Alert>
      ) : null}

      {siguiente === "/actualizar-clave" && !errorEnlace ? (
        <Alert tone="info" title="Para cambiar la contraseña necesitás una sesión" className="mb-5">
          Ingresá con tu contraseña actual o, si no la recordás, pedí un enlace nuevo desde «¿Olvidaste tu contraseña?».
        </Alert>
      ) : siguiente && !errorEnlace ? (
        <Alert tone="info" className="mb-5">
          Ingresá para continuar a la página que estabas buscando.
        </Alert>
      ) : null}

      {accesoDemoHabilitado() ? <AccesoDemo cuentas={CUENTAS_DEMO} /> : null}

      <FormIngreso siguiente={siguiente} />
    </>
  );
}
