import type { Metadata } from "next";
import { FormRecuperar } from "./_components/form-recuperar";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Pedí un enlace para restablecer la contraseña de tu cuenta.",
};

export default function RecuperarPage() {
  return <FormRecuperar />;
}
