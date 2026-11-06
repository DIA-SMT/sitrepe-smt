import { supabaseUrl } from "@/lib/supabase/env";

/*
 * Centro de ayuda: videos tutoriales y manuales de operación. Los archivos están en el bucket público `tutoriales`
 * de Supabase y se cargan con `npm run tutoriales:subir -- <carpeta>` (scripts/tutoriales-subir.ts).
 */

/** Dónde se muestra cada recurso: portal público, área de prestadores o gestión interna. */
export type AreaAyuda = "portal" | "prestador" | "gestion";

export type Tutorial = {
  clave: string;
  titulo: string;
  perfil: string;
  descripcion: string;
  /** Duración en segundos. */
  duracion: number;
  areas: readonly AreaAyuda[];
};

export type Manual = { archivo: string; titulo: string; descripcion: string; paginas: number; areas: readonly AreaAyuda[] };

export const TUTORIALES: readonly Tutorial[] = [
  {
    clave: "01",
    titulo: "Conocé SITREPE",
    perfil: "Para todos",
    descripcion: "Qué es la plataforma, cómo verificar un certificado y qué puede hacer cada perfil.",
    duracion: 89,
    areas: ["portal", "prestador", "gestion"],
  },
  {
    clave: "02",
    titulo: "Empresas prestadoras",
    perfil: "Empresa",
    descripcion: "Declarar los servicios, pagar el timbrado e imprimir los certificados con QR.",
    duracion: 122,
    areas: ["portal", "prestador", "gestion"],
  },
  {
    clave: "03",
    titulo: "Asesores técnicos",
    perfil: "Asesor técnico",
    descripcion: "Firmar los certificados de la empresa y cuándo hay que volver a firmar.",
    duracion: 73,
    areas: ["portal", "prestador", "gestion"],
  },
  {
    clave: "04",
    titulo: "Control y timbrado",
    perfil: "Control",
    descripcion: "Controlar las planillas, verificar los pagos y timbrar los certificados.",
    duracion: 104,
    areas: ["gestion"],
  },
  {
    clave: "05",
    titulo: "Inspección",
    perfil: "Inspección",
    descripcion: "Hoja de ruta, inspecciones en el lugar, notificaciones y actas desde el celular.",
    duracion: 90,
    areas: ["gestion"],
  },
  {
    clave: "06",
    titulo: "Administración",
    perfil: "Administración",
    descripcion: "Registro de empresas, aranceles, usuarios, rendición mensual y auditoría.",
    duracion: 98,
    areas: ["gestion"],
  },
];

export const MANUALES: readonly Manual[] = [
  {
    archivo: "empresas-prestadoras",
    titulo: "Empresas prestadoras",
    descripcion: "Inscripción, legajo, declaraciones, pago del timbrado y certificados.",
    paginas: 25,
    areas: ["portal", "prestador", "gestion"],
  },
  {
    archivo: "asesores-tecnicos",
    titulo: "Asesores técnicos",
    descripcion: "Acceso, firma de certificados y validez de la firma.",
    paginas: 13,
    areas: ["portal", "prestador", "gestion"],
  },
  {
    archivo: "control-y-timbrado",
    titulo: "Control y timbrado",
    descripcion: "Control de planillas, conciliación de pagos, certificados y trámites.",
    paginas: 24,
    areas: ["gestion"],
  },
  {
    archivo: "inspeccion",
    titulo: "Inspección",
    descripcion: "Hoja de ruta, inspecciones, notificaciones, actas y denuncias.",
    paginas: 21,
    areas: ["gestion"],
  },
  {
    archivo: "administracion",
    titulo: "Administración",
    descripcion: "Registro, trámites, configuración, usuarios, auditoría y reportes.",
    paginas: 25,
    areas: ["gestion"],
  },
];

const base = () => `${supabaseUrl()}/storage/v1/object/public/tutoriales`;

export function urlsTutorial(t: Tutorial) {
  return {
    video: `${base()}/videos/tutorial-${t.clave}.mp4`,
    subtitulos: `${base()}/videos/tutorial-${t.clave}.vtt`,
    portada: `${base()}/videos/tutorial-${t.clave}.jpg`,
  };
}

export const urlManual = (m: Manual) => `${base()}/manuales/manual-${m.archivo}.pdf`;

export function formatDuracion(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}
