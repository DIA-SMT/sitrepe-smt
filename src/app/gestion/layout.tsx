import type { Metadata } from "next";
import { Asistente } from "@/components/asistente/asistente";
import { AppShell } from "@/components/layout/app-shell";
import { filtrarNav, navGestion } from "@/components/layout/nav";
import { requerirStaff, usuarioParaUI } from "@/lib/auth";
import { cerrarSesion } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { template: "%s · Gestión · SITREPE", default: "Gestión interna" },
};

export default async function GestionLayout({ children }: LayoutProps<"/gestion">) {
  const sesion = await requerirStaff();
  const supabase = await createClient();
  const { count } = await supabase
    .from("v_alertas")
    .select("tipo", { count: "exact", head: true })
    .in("nivel", ["urgente", "alerta"]);

  return (
    <>
      <AppShell
        area="gestion"
        nav={filtrarNav(navGestion, sesion.perfil.rol)}
        usuario={usuarioParaUI(sesion)}
        alertas={count ?? 0}
        alertasHref="/gestion#alertas"
        onLogoutAction={cerrarSesion}
      >
        {children}
      </AppShell>
      <Asistente ambito="gestion" />
    </>
  );
}
