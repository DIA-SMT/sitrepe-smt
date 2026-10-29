import type { Rol } from "@/lib/auth";

/*
 * Acceso rápido a las cuentas de demostración (botones por rol en /ingresar), para probar la plataforma sin tipear
 * credenciales. Solo se activa con DEMO_ACCESO_RAPIDO=true y USUARIOS_DEMO_CLAVE definida: la contraseña queda en el
 * servidor y nunca llega al navegador. Cualquiera que vea la pantalla puede entrar como admin, así que NO activarlo
 * contra una base con datos reales.
 */

export type CuentaDemo = { rol: Rol; email: string; titulo: string; descripcion: string };

export const CUENTAS_DEMO: readonly CuentaDemo[] = [
  { rol: "admin", email: "admin@sitrepe.test", titulo: "Administración", descripcion: "Dirección: todo el sistema" },
  { rol: "control", email: "control@sitrepe.test", titulo: "Control y timbrado", descripcion: "Declaraciones y pagos" },
  { rol: "inspector", email: "inspector@sitrepe.test", titulo: "Inspección", descripcion: "Hoja de ruta y actas" },
  { rol: "empresa", email: "empresa@sitrepe.test", titulo: "Empresa prestadora", descripcion: "Declara, paga e imprime" },
  { rol: "tecnico", email: "tecnico@sitrepe.test", titulo: "Asesor técnico", descripcion: "Firma los certificados" },
];

export function accesoDemoHabilitado(): boolean {
  return process.env.DEMO_ACCESO_RAPIDO === "true" && Boolean(process.env.USUARIOS_DEMO_CLAVE);
}
