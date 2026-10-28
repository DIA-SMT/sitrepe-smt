import type { Metadata } from "next";
import { Asistente } from "@/components/asistente/asistente";
import { AppShell } from "@/components/layout/app-shell";
import { filtrarNav, navPrestador } from "@/components/layout/nav";
import { ROLES_EMPRESA, requerirRol, usuarioParaUI } from "@/lib/auth";
import { cerrarSesion } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { template: "%s · Prestadores · SITREPE", default: "Portal de prestadores" },
};

export default async function PrestadorLayout({ children }: LayoutProps<"/prestador">) {
  const sesion = await requerirRol(ROLES_EMPRESA);
  let alertas = 0;
  if (sesion.empresa) {
    const supabase = await createClient();
    const [{ count: avisos }, { count: leidos }, { count: pendientes }] = await Promise.all([
      supabase.from("avisos").select("id", { count: "exact", head: true }),
      supabase.from("avisos_lecturas").select("aviso_id", { count: "exact", head: true }),
      supabase
        .from("v_alertas")
        .select("tipo", { count: "exact", head: true })
        .in("tipo", ["declaracion_observada", "habilitacion_por_vencer", "documento_por_vencer", "notificacion_vencida"]),
    ]);
    alertas = Math.max(0, (avisos ?? 0) - (leidos ?? 0)) + (pendientes ?? 0);
  }

  return (
    <>
      <AppShell
        area="prestador"
        nav={filtrarNav(navPrestador, sesion.perfil.rol)}
        usuario={usuarioParaUI(sesion)}
        alertas={alertas}
        alertasHref="/prestador/avisos"
        onLogoutAction={cerrarSesion}
      >
        {children}
      </AppShell>
      <Asistente ambito="prestador" />
    </>
  );
}
