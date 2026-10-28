"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type EstadoAccion, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { ROLES_EMPRESA, requerirRol } from "@/lib/auth";
import { cuitValido, normalizarCuit } from "@/lib/domain/cuit";
import { hoyISO } from "@/lib/domain/formato";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const marcado = (mensaje: string) => z.string().refine((v) => v === "on" || v === "true", mensaje);
const opcional = z.string().trim().max(160, "Máximo 160 caracteres.");

const esquemaInscripcion = z
  .object({
    nombre_comercial: z.string().trim().min(2, "Ingresá el nombre comercial.").max(120, "Máximo 120 caracteres."),
    titular: z.string().trim().min(3, "Ingresá el titular o la razón social.").max(160, "Máximo 160 caracteres."),
    tipo_persona: z.enum(["humana", "juridica"], "Elegí el tipo de persona."),
    cuit: z.string().trim().min(1, "Ingresá el CUIT."),
    cuit_confirmado: z.string(),
    email: z
      .string()
      .trim()
      .max(160, "Máximo 160 caracteres.")
      .pipe(z.email("Ingresá un correo válido.")),
    telefono: z
      .string()
      .trim()
      .refine(
        (v) => /^[\d+()\-\s]{6,30}$/.test(v) && (v.match(/\d/g)?.length ?? 0) >= 6,
        "Ingresá un teléfono de contacto válido (con código de área).",
      ),
    domicilio_oficina: z
      .string()
      .trim()
      .min(6, "Ingresá el domicilio de la oficina (calle, número y barrio).")
      .max(200, "Máximo 200 caracteres."),
    domicilio_deposito: z
      .string()
      .trim()
      .min(6, "Ingresá el domicilio del depósito de químicos.")
      .max(200, "Máximo 200 caracteres."),
    deposito_exclusivo: marcado("Declará que el depósito tiene un espacio exclusivo para químicos (Art. 6.º)."),
    habilitacion_numero: z.string().trim().regex(/^\d{1,7}$/, "Ingresá solo el número de la habilitación comercial."),
    habilitacion_anio: z.string().trim().regex(/^\d{4}$/, "Ingresá el año (4 dígitos)."),
    habilita_tanques: z.string(),
    acepta_ordenanza: marcado("Tenés que aceptar la declaración jurada para enviar la solicitud."),
    observaciones: opcional,
  })
  .superRefine((d, ctx) => {
    const normalizado = normalizarCuit(d.cuit);
    if (!normalizado) {
      ctx.addIssue({ code: "custom", path: ["cuit"], message: "El CUIT debe tener 11 dígitos (con o sin guiones)." });
    } else if (!cuitValido(normalizado) && d.cuit_confirmado !== "on" && d.cuit_confirmado !== "true") {
      ctx.addIssue({
        code: "custom",
        path: ["cuit"],
        message: "El dígito verificador no coincide. Revisá el número o confirmá que es correcto.",
      });
    }
    const anio = Number(d.habilitacion_anio);
    const actual = Number(hoyISO().slice(0, 4));
    if (/^\d{4}$/.test(d.habilitacion_anio) && (anio < 1980 || anio > actual)) {
      ctx.addIssue({ code: "custom", path: ["habilitacion_anio"], message: `Ingresá un año entre 1980 y ${actual}.` });
    }
  });

/**
 * Solicitud de inscripción en el registro de prestadores (SITREPE Art. 6.º; Ord. 2681/98 Art. 4.º).
 * Crea la empresa "en trámite", la vincula a la cuenta y abre el trámite de inscripción (RPC).
 */
export async function solicitarInscripcion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirRol(ROLES_EMPRESA);
  if (sesion.empresa || sesion.perfil.empresa_id) {
    return fallo("Tu cuenta ya está vinculada a una empresa. Revisá el estado de la inscripción.");
  }

  const campos = [
    "nombre_comercial",
    "titular",
    "tipo_persona",
    "cuit",
    "cuit_confirmado",
    "email",
    "telefono",
    "domicilio_oficina",
    "domicilio_deposito",
    "deposito_exclusivo",
    "habilitacion_numero",
    "habilitacion_anio",
    "habilita_tanques",
    "acepta_ordenanza",
    "observaciones",
  ] as const;
  const entrada = Object.fromEntries(
    campos.map((c) => {
      const v = formData.get(c);
      return [c, typeof v === "string" ? v : ""];
    }),
  );

  const datos = esquemaInscripcion.safeParse(entrada);
  if (!datos.success) return falloValidacion(datos.error);
  const d = datos.data;

  // Las claves que lee solicitar_inscripcion, más la declaración jurada (queda en tramites.datos).
  const pDatos = {
    nombre_comercial: d.nombre_comercial,
    titular: d.titular,
    tipo_persona: d.tipo_persona,
    cuit: normalizarCuit(d.cuit) ?? d.cuit,
    email: d.email.trim().toLowerCase(),
    telefono: d.telefono,
    domicilio_oficina: d.domicilio_oficina,
    domicilio_deposito: d.domicilio_deposito,
    habilitacion_comercial: `${Number(d.habilitacion_numero)}/SHN/${d.habilitacion_anio}`,
    habilita_tanques: d.habilita_tanques === "on" || d.habilita_tanques === "true",
    deposito_exclusivo: true,
    declaracion_ordenanza_2681: true,
    observaciones: d.observaciones || null,
  } satisfies Json;

  const supabase = await createClient();
  const { error } = await supabase.rpc("solicitar_inscripcion", { p_datos: pDatos });
  if (error) {
    const mensaje = mensajeError(error, "No se pudo enviar la solicitud de inscripción.");
    if (/CUIT/i.test(mensaje)) return fallo(mensaje, { cuit: [mensaje] });
    return fallo(mensaje);
  }

  revalidatePath("/prestador", "layout");
  revalidatePath("/perfil");
  redirect("/prestador/inscripcion?enviada=1");
}
