"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirStaff } from "@/lib/auth";
import { Constants, type TablesInsert } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Usá como máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

const esquemaProducto = z.object({
  id: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.uuid({ message: "Producto inválido." }).nullable()),
  nombre_comercial: z.string().trim().min(2, "Ingresá el nombre comercial.").max(200, "Usá como máximo 200 caracteres."),
  principio_activo: z.string().trim().min(2, "Ingresá el principio activo.").max(200, "Usá como máximo 200 caracteres."),
  concentracion: textoOpcional(60),
  clase: z.enum(Constants.public.Enums.clase_producto, { message: "Elegí la clase de producto." }),
  formulacion: textoOpcional(120),
  organismo: z.enum(Constants.public.Enums.organismo_registro, { message: "Elegí el organismo de registro." }),
  registro_numero: z
    .string()
    .trim()
    .min(1, "Ingresá el N.º de registro.")
    .max(60, "Usá como máximo 60 caracteres.")
    .transform((v) => v.replace(/\s+/g, " ")),
  categoria_toxicologica: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.enum(["Ia", "Ib", "II", "III", "IV"], { message: "Elegí una categoría válida." }).nullable()),
  antidoto: textoOpcional(300),
  precauciones: textoOpcional(2000),
  plazo_reingreso_horas: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!/^\d{1,3}$/.test(v) || Number(v) > 720) {
        ctx.addIssue({ code: "custom", message: "Indicá las horas de reingreso (entre 0 y 720)." });
        return z.NEVER;
      }
      return Number(v);
    }),
  activo: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

/** Alta o edición de un producto del catálogo (Administración y Control). */
export async function guardarProducto(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirStaff(["admin", "control"]);
  const parsed = esquemaProducto.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falloValidacion(parsed.error);
  const { id, ...d } = parsed.data;

  const supabase = await createClient();
  let duplicado = supabase
    .from("productos")
    .select("id, nombre_comercial")
    .eq("organismo", d.organismo)
    .eq("registro_numero", d.registro_numero)
    .limit(1);
  if (id) duplicado = duplicado.neq("id", id);
  const { data: existente } = await duplicado.maybeSingle();
  if (existente) {
    return fallo("Ese registro ya está en el catálogo.", {
      registro_numero: [`El registro ${d.organismo} ${d.registro_numero} ya corresponde a ${existente.nombre_comercial}.`],
    });
  }

  const fila: TablesInsert<"productos"> = {
    nombre_comercial: d.nombre_comercial,
    principio_activo: d.principio_activo,
    concentracion: d.concentracion,
    clase: d.clase,
    formulacion: d.formulacion,
    organismo: d.organismo,
    registro_numero: d.registro_numero,
    categoria_toxicologica: d.categoria_toxicologica,
    antidoto: d.antidoto,
    precauciones: d.precauciones,
    plazo_reingreso_horas: d.plazo_reingreso_horas,
    activo: d.activo,
  };

  const resultado = id
    ? await supabase.from("productos").update(fila).eq("id", id).select("id").maybeSingle()
    : await supabase.from("productos").insert(fila).select("id").single();
  if (resultado.error) {
    if (resultado.error.code === "23505") {
      return fallo("Ese registro ya está en el catálogo.", {
        registro_numero: [`Ya existe un producto con el registro ${d.organismo} ${d.registro_numero}.`],
      });
    }
    return fallo(mensajeError(resultado.error, "No se pudo guardar el producto."));
  }
  if (!resultado.data) return fallo("No se encontró el producto o no tenés permisos para modificarlo.");

  revalidatePath("/gestion/productos");
  revalidatePath("/gestion/empresas", "layout");
  revalidatePath("/prestador", "layout");
  return exito(id ? `Se actualizó ${d.nombre_comercial}.` : `${d.nombre_comercial} se agregó al catálogo.`);
}
