"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirEmpresa } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { datosFormulario, idValido } from "../legajo/_lib/esquemas";

function revalidarAvisos() {
  revalidatePath("/prestador/avisos");
  // La campana del layout cuenta los avisos sin leer.
  revalidatePath("/prestador", "layout");
}

/** Marca un aviso como leído por el usuario actual. */
export async function marcarAvisoLeido(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const parse = z.object({ id: idValido }).safeParse(datosFormulario(formData));
  if (!parse.success) return falloValidacion(parse.error);

  const supabase = await createClient();
  // La RLS de `avisos` solo deja ver los avisos generales y los de la propia empresa.
  const { data: aviso, error: errorAviso } = await supabase.from("avisos").select("id").eq("id", parse.data.id).maybeSingle();
  if (errorAviso) return fallo(mensajeError(errorAviso));
  if (!aviso) return fallo("No encontramos ese aviso.");

  const { error } = await supabase.from("avisos_lecturas").insert({ aviso_id: aviso.id, perfil_id: sesion.userId });
  if (error && error.code !== "23505") return fallo(mensajeError(error, "No se pudo marcar el aviso como leído."));

  revalidarAvisos();
  return exito("Aviso marcado como leído.");
}

/** Marca como leídos todos los avisos visibles que el usuario todavía no leyó. */
export async function marcarTodosLeidos(): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const supabase = await createClient();
  const [{ data: avisos, error: errorAvisos }, { data: lecturas, error: errorLecturas }] = await Promise.all([
    supabase.from("avisos").select("id"),
    supabase.from("avisos_lecturas").select("aviso_id"),
  ]);
  if (errorAvisos) return fallo(mensajeError(errorAvisos));
  if (errorLecturas) return fallo(mensajeError(errorLecturas));

  const leidos = new Set(lecturas.map((l) => l.aviso_id));
  const pendientes = avisos.filter((a) => !leidos.has(a.id));
  if (pendientes.length === 0) return exito("No tenés avisos sin leer.");

  const { error } = await supabase
    .from("avisos_lecturas")
    .upsert(
      pendientes.map((a) => ({ aviso_id: a.id, perfil_id: sesion.userId })),
      { onConflict: "aviso_id,perfil_id", ignoreDuplicates: true },
    );
  if (error) return fallo(mensajeError(error, "No se pudieron marcar los avisos como leídos."));

  revalidarAvisos();
  return exito(`Marcaste ${pendientes.length} aviso${pendientes.length === 1 ? "" : "s"} como leído${pendientes.length === 1 ? "" : "s"}.`);
}
