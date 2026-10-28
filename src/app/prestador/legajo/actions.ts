"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EstadoAccion, exito, fallo, falloValidacion, mensajeError } from "@/lib/acciones";
import { requerirEmpresa } from "@/lib/auth";
import { hoyISO } from "@/lib/domain/formato";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";
import {
  casilla,
  datosFormulario,
  fechaOpcional,
  idValido,
  juntarErrores,
  nombreArchivo,
  rutaEmpresa,
  rutaEmpresaOpcional,
  textoOpcional,
  textoRequerido,
} from "./_lib/esquemas";
import { type AdjuntoTramite, motivoBloqueo, presentarTramite } from "./_lib/tramites";

const REVISAR = "Revisá los datos marcados.";

function revalidarLegajo() {
  revalidatePath("/prestador/legajo");
  revalidatePath("/prestador/tramites");
}

const idOpcional = (mensaje: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || idValido.safeParse(v).success, mensaje);

/* --------------------------------------------------------------------------
 * Cambio de domicilio (Art. 6.º: requiere libre deuda)
 * -------------------------------------------------------------------------- */

const esquemaDomicilio = z
  .object({
    domicilio_oficina: textoOpcional(200),
    domicilio_deposito: textoOpcional(200),
    motivo: textoRequerido(10, 600, "Contanos el motivo del cambio (al menos 10 caracteres)."),
    acepta_libre_deuda: casilla.refine((v) => v, "Confirmá que contás con libre deuda municipal."),
  })
  .refine((d) => d.domicilio_oficina || d.domicilio_deposito, {
    message: "Indicá al menos un domicilio nuevo (oficina o depósito).",
    path: ["domicilio_oficina"],
  });

export async function solicitarCambioDomicilio(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const bloqueo = motivoBloqueo(sesion.empresa.estado);
  if (bloqueo) return fallo(bloqueo);

  const crudo = datosFormulario(formData);
  const parse = esquemaDomicilio.safeParse(crudo);
  const libreDeuda = rutaEmpresaOpcional([empresaId, "legajo"]).safeParse(crudo.libre_deuda_path);
  const errores = juntarErrores(parse, { libre_deuda_path: libreDeuda });
  if (errores || !parse.success || !libreDeuda.success) return fallo(REVISAR, errores ?? {});
  const datos = parse.data;

  const supabase = await createClient();
  const [{ data: empresa, error: errorEmpresa }, { data: abiertos, error: errorAbiertos }] = await Promise.all([
    supabase.from("empresas").select("domicilio_oficina, domicilio_deposito").eq("id", empresaId).single(),
    supabase
      .from("tramites")
      .select("codigo")
      .eq("empresa_id", empresaId)
      .eq("tipo", "cambio_domicilio")
      .in("estado", ["presentado", "observado"])
      .limit(1),
  ]);
  if (errorEmpresa) return fallo(mensajeError(errorEmpresa));
  if (errorAbiertos) return fallo(mensajeError(errorAbiertos));
  if (abiertos.length > 0) {
    return fallo(`Ya tenés una solicitud de cambio de domicilio en curso (${abiertos[0].codigo ?? "en trámite"}).`);
  }

  const igual = (a: string | null, b: string | null) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
  const oficina =
    datos.domicilio_oficina && !igual(datos.domicilio_oficina, empresa.domicilio_oficina) ? datos.domicilio_oficina : null;
  const deposito =
    datos.domicilio_deposito && !igual(datos.domicilio_deposito, empresa.domicilio_deposito) ? datos.domicilio_deposito : null;
  if (!oficina && !deposito) {
    return fallo("Los domicilios indicados son iguales a los registrados.", {
      domicilio_oficina: ["Indicá un domicilio distinto al actual."],
    });
  }

  const adjuntos: AdjuntoTramite[] = libreDeuda.data
    ? [{ tipo: "libre_deuda", path: libreDeuda.data, nombre_archivo: nombreArchivo(libreDeuda.data, crudo.libre_deuda_nombre) }]
    : [];

  const resultado = await presentarTramite(supabase, {
    empresaId,
    tipo: "cambio_domicilio",
    datos: {
      domicilio_oficina: oficina,
      domicilio_deposito: deposito,
      domicilio_oficina_anterior: empresa.domicilio_oficina,
      domicilio_deposito_anterior: empresa.domicilio_deposito,
      motivo: datos.motivo,
      libre_deuda_declarado: true,
    },
    adjuntos,
  });
  if (!resultado.ok) return fallo(mensajeError(resultado.error, "No se pudo presentar la solicitud."));

  revalidarLegajo();
  return exito(
    `Solicitud ${resultado.codigo ?? "de cambio de domicilio"} presentada. La Dirección verificará el libre deuda y actualizará tus domicilios al aprobarla.`,
    { id: resultado.id },
  );
}

/* --------------------------------------------------------------------------
 * Asesores técnicos (Art. 5.º)
 * -------------------------------------------------------------------------- */

const esquemaTecnico = z.object({
  nombre: textoRequerido(2, 80, "Ingresá el nombre."),
  apellido: textoRequerido(2, 80, "Ingresá el apellido."),
  dni: z
    .string("Ingresá el DNI.")
    .transform((v) => v.replace(/[.\s-]/g, ""))
    .refine((v) => /^\d{7,8}$/.test(v), "Ingresá un DNI válido (7 u 8 dígitos, sin puntos)."),
  titulo: textoRequerido(3, 160, "Indicá el título terciario o universitario."),
  institucion: textoOpcional(160),
  matricula: textoOpcional(60),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "Ingresá un correo válido."),
  telefono: textoOpcional(40),
  es_representante: casilla,
  reemplaza_a: idOpcional("Seleccioná un asesor válido."),
});

export async function agregarTecnico(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const bloqueo = motivoBloqueo(sesion.empresa.estado);
  if (bloqueo) return fallo(bloqueo);

  const crudo = datosFormulario(formData);
  const parse = esquemaTecnico.safeParse(crudo);
  const titulo = rutaEmpresa([empresaId, "legajo"], "Adjuntá el título autenticado.").safeParse(crudo.titulo_path);
  const errores = juntarErrores(parse, { titulo_path: titulo });
  if (errores || !parse.success || !titulo.success) return fallo(REVISAR, errores ?? {});
  const datos = parse.data;

  const supabase = await createClient();
  let reemplazado: { id: string; nombre: string; apellido: string } | null = null;
  if (datos.reemplaza_a) {
    const { data, error } = await supabase
      .from("tecnicos")
      .select("id, nombre, apellido, estado")
      .eq("id", datos.reemplaza_a)
      .eq("empresa_id", empresaId)
      .maybeSingle();
    if (error) return fallo(mensajeError(error));
    if (!data || data.estado !== "aprobado") {
      return fallo("El asesor a reemplazar debe ser un asesor aprobado de tu empresa.", {
        reemplaza_a: ["Seleccioná un asesor aprobado."],
      });
    }
    reemplazado = data;
  }

  const { data: tecnico, error: errorTecnico } = await supabase
    .from("tecnicos")
    .insert({
      empresa_id: empresaId,
      nombre: datos.nombre,
      apellido: datos.apellido,
      dni: datos.dni,
      titulo: datos.titulo,
      institucion: datos.institucion,
      matricula: datos.matricula,
      email: datos.email,
      telefono: datos.telefono,
      es_representante: datos.es_representante,
      estado: "pendiente",
    })
    .select("id")
    .single();
  if (errorTecnico) {
    if (errorTecnico.code === "23505") {
      return fallo("Ya hay un asesor técnico con ese DNI en tu empresa.", { dni: ["Este DNI ya está registrado."] });
    }
    return fallo(mensajeError(errorTecnico, "No se pudo registrar el asesor técnico."));
  }

  const nombreCompleto = `${datos.nombre} ${datos.apellido}`;
  const resultado = await presentarTramite(supabase, {
    empresaId,
    tipo: "cambio_tecnico",
    datos: {
      tecnico_id: tecnico.id,
      tecnico_nombre: nombreCompleto,
      tecnico_dni: datos.dni,
      es_representante: datos.es_representante,
      tecnico_baja_id: reemplazado?.id ?? null,
      tecnico_baja_nombre: reemplazado ? `${reemplazado.nombre} ${reemplazado.apellido}` : null,
    },
    adjuntos: [
      {
        tipo: "titulo_tecnico",
        path: titulo.data,
        nombre_archivo: nombreArchivo(titulo.data, crudo.titulo_nombre),
        tecnico_id: tecnico.id,
      },
    ],
  });
  if (!resultado.ok) {
    // Compensación: el técnico sigue pendiente, así que la empresa puede eliminarlo.
    await supabase.from("tecnicos").delete().eq("id", tecnico.id);
    return fallo(mensajeError(resultado.error, "No se pudo presentar la solicitud de alta del asesor técnico."));
  }

  revalidarLegajo();
  return exito(
    `Solicitaste el alta de ${nombreCompleto} (${resultado.codigo ?? "trámite presentado"}). Podrá firmar certificados cuando la Dirección lo apruebe.`,
    { id: tecnico.id },
  );
}

const esquemaId = z.object({ id: idValido });

export async function eliminarTecnico(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const parse = esquemaId.safeParse(datosFormulario(formData));
  if (!parse.success) return falloValidacion(parse.error);

  const supabase = await createClient();
  const { data: tecnico, error } = await supabase
    .from("tecnicos")
    .select("id, nombre, apellido, estado")
    .eq("id", parse.data.id)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (error) return fallo(mensajeError(error));
  if (!tecnico) return fallo("No encontramos ese asesor técnico.");
  if (tecnico.estado !== "pendiente") {
    return fallo(
      "Solo podés eliminar asesores pendientes de aprobación. Para dar de baja a un asesor aprobado, solicitá su reemplazo o comunicate con la Dirección.",
    );
  }

  const [{ data: documentos, error: errorDocs }, { data: abiertos, error: errorTramites }] = await Promise.all([
    supabase.from("documentos").select("id, path, estado").eq("tecnico_id", tecnico.id).eq("empresa_id", empresaId),
    supabase
      .from("tramites")
      .select("id, codigo, estado, datos")
      .eq("empresa_id", empresaId)
      .eq("tipo", "cambio_tecnico")
      .in("estado", ["presentado", "observado"]),
  ]);
  if (errorDocs) return fallo(mensajeError(errorDocs));
  if (errorTramites) return fallo(mensajeError(errorTramites));

  const delTecnico = abiertos.flatMap((t) => {
    const d = t.datos;
    if (d === null || typeof d !== "object" || Array.isArray(d) || d.tecnico_id !== tecnico.id) return [];
    return [{ ...t, datos: d }];
  });

  // Un trámite en revisión no puede modificarse: si incluye el reemplazo de un asesor aprobado y la
  // Dirección lo aprobara, daría de baja a ese asesor aunque el nuevo ya no exista.
  const conReemplazo = delTecnico.find((t) => t.estado === "presentado" && typeof t.datos.tecnico_baja_id === "string");
  if (conReemplazo) {
    return fallo(
      `El alta forma parte del trámite ${conReemplazo.codigo ?? "en revisión"}, que también da de baja a otro asesor. Esperá a que la Dirección lo observe o lo resuelva para eliminarlo, o pedile que lo deje sin efecto.`,
    );
  }

  const { error: errorEliminar } = await supabase.from("tecnicos").delete().eq("id", tecnico.id);
  if (errorEliminar) return fallo(mensajeError(errorEliminar, "No se pudo eliminar el asesor técnico."));

  // Documentos pendientes del técnico (título autenticado): se eliminan junto con sus archivos.
  const pendientes = documentos.filter((d) => d.estado === "pendiente");
  if (pendientes.length > 0) {
    const { error: errorBaja } = await supabase
      .from("documentos")
      .delete()
      .in(
        "id",
        pendientes.map((d) => d.id),
      );
    if (!errorBaja) await supabase.storage.from("documentos").remove(pendientes.map((d) => d.path));
  }

  // Si su trámite estaba observado, queda desistido: vuelve a borrador y deja de figurar ante la Dirección.
  for (const t of delTecnico) {
    if (t.estado !== "observado") continue;
    await supabase
      .from("tramites")
      .update({ estado: "borrador", datos: { ...t.datos, desistido: true, desistido_at: new Date().toISOString() } })
      .eq("id", t.id);
  }

  revalidarLegajo();
  return exito(`Eliminaste a ${tecnico.nombre} ${tecnico.apellido} de los asesores pendientes.`);
}

/* --------------------------------------------------------------------------
 * Documentación del legajo
 * -------------------------------------------------------------------------- */

const esquemaDocumento = z.object({
  tipo: z.enum(Constants.public.Enums.tipo_documento, "Seleccioná el tipo de documento."),
  vence: fechaOpcional.refine(
    (v) => v === null || v >= hoyISO(),
    "La fecha de vencimiento ya pasó: subí un documento vigente.",
  ),
  tecnico_id: idOpcional("Seleccioná un asesor válido."),
  observaciones: textoOpcional(300),
});

export async function subirDocumento(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const bloqueo = motivoBloqueo(sesion.empresa.estado);
  if (bloqueo) return fallo(bloqueo);

  const crudo = datosFormulario(formData);
  const parse = esquemaDocumento.safeParse(crudo);
  const archivo = rutaEmpresa([empresaId, "legajo"]).safeParse(crudo.path);
  const errores = juntarErrores(parse, { path: archivo });
  if (errores || !parse.success || !archivo.success) return fallo(REVISAR, errores ?? {});
  const datos = parse.data;

  const supabase = await createClient();
  if (datos.tecnico_id) {
    const { data, error } = await supabase
      .from("tecnicos")
      .select("id")
      .eq("id", datos.tecnico_id)
      .eq("empresa_id", empresaId)
      .maybeSingle();
    if (error) return fallo(mensajeError(error));
    if (!data) {
      return fallo("El asesor seleccionado no pertenece a tu empresa.", { tecnico_id: ["Seleccioná un asesor de tu empresa."] });
    }
  }

  const { error } = await supabase.from("documentos").insert({
    empresa_id: empresaId,
    tecnico_id: datos.tecnico_id,
    tipo: datos.tipo,
    nombre_archivo: nombreArchivo(archivo.data, crudo.nombre_archivo),
    path: archivo.data,
    vence: datos.vence,
    estado: "pendiente",
    observaciones: datos.observaciones,
  });
  if (error) return fallo(mensajeError(error, "No se pudo registrar el documento."));

  revalidarLegajo();
  return exito("Documento cargado. La Dirección lo revisará y te avisará si hay observaciones.");
}

export async function eliminarDocumento(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const parse = esquemaId.safeParse(datosFormulario(formData));
  if (!parse.success) return falloValidacion(parse.error);

  const supabase = await createClient();
  const { data: documento, error } = await supabase
    .from("documentos")
    .select("id, path, estado, tramite_id")
    .eq("id", parse.data.id)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (error) return fallo(mensajeError(error));
  if (!documento) return fallo("No encontramos ese documento.");
  if (documento.estado !== "pendiente") return fallo("Solo podés eliminar documentos pendientes de revisión.");

  if (documento.tramite_id) {
    const { data: tramite, error: errorTramite } = await supabase
      .from("tramites")
      .select("codigo, estado")
      .eq("id", documento.tramite_id)
      .maybeSingle();
    if (errorTramite) return fallo(mensajeError(errorTramite));
    if (tramite?.estado === "presentado") {
      return fallo(`El documento forma parte del trámite ${tramite.codigo ?? "presentado"}, que está en revisión: no puede eliminarse.`);
    }
  }

  const { error: errorBaja } = await supabase.from("documentos").delete().eq("id", documento.id);
  if (errorBaja) return fallo(mensajeError(errorBaja, "No se pudo eliminar el documento."));
  await supabase.storage.from("documentos").remove([documento.path]);

  revalidarLegajo();
  return exito("Documento eliminado.");
}

/* --------------------------------------------------------------------------
 * Renovación anual: DDJJ de categorización + libre deuda (Art. 8.º)
 * -------------------------------------------------------------------------- */

export async function presentarRenovacion(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirEmpresa();
  const empresaId = sesion.empresa.id;
  const bloqueo = motivoBloqueo(sesion.empresa.estado);
  if (bloqueo) return fallo(bloqueo);
  if (sesion.empresa.estado === "en_tramite") {
    return fallo("Tu inscripción todavía está en trámite: la renovación anual se presenta una vez habilitada la empresa.");
  }

  const anioActual = Number(hoyISO().slice(0, 4));
  const esquema = z.object({
    anio: z.coerce
      .number("Seleccioná el año declarado.")
      .int("Seleccioná el año declarado.")
      .min(anioActual - 1, "Solo podés declarar el año en curso o el anterior.")
      .max(anioActual, "Solo podés declarar el año en curso o el anterior."),
    categoria: z.enum(["A", "B", "C"], "Seleccioná la categoría declarada."),
    libre_deuda: casilla.refine((v) => v, "Para renovar necesitás el libre deuda municipal."),
  });

  const crudo = datosFormulario(formData);
  const parse = esquema.safeParse(crudo);
  const ddjj = rutaEmpresa([empresaId, "legajo"], "Adjuntá la DDJJ anual firmada.").safeParse(crudo.ddjj_path);
  const libre = rutaEmpresa([empresaId, "legajo"], "Adjuntá el certificado de libre deuda.").safeParse(crudo.libre_deuda_path);
  const errores = juntarErrores(parse, { ddjj_path: ddjj, libre_deuda_path: libre });
  if (errores || !parse.success || !ddjj.success || !libre.success) return fallo(REVISAR, errores ?? {});
  const datos = parse.data;

  const supabase = await createClient();
  const { data: renovaciones, error } = await supabase
    .from("tramites")
    .select("codigo, estado, datos")
    .eq("empresa_id", empresaId)
    .eq("tipo", "renovacion")
    .in("estado", ["presentado", "observado", "aprobado"]);
  if (error) return fallo(mensajeError(error));

  const enCurso = renovaciones.find((r) => r.estado !== "aprobado");
  if (enCurso) {
    return fallo(
      `Ya tenés una renovación en curso (${enCurso.codigo ?? "en trámite"}). Esperá la resolución o respondé sus observaciones.`,
    );
  }
  const yaAprobada = renovaciones.find((r) => {
    const d = r.datos;
    return d !== null && typeof d === "object" && !Array.isArray(d) && Number(d.anio) === datos.anio;
  });
  if (yaAprobada) {
    return fallo(`La DDJJ ${datos.anio} ya fue aprobada (${yaAprobada.codigo ?? "trámite aprobado"}).`, {
      anio: ["Ese año ya está renovado."],
    });
  }

  const resultado = await presentarTramite(supabase, {
    empresaId,
    tipo: "renovacion",
    datos: { anio: datos.anio, categoria: datos.categoria, libre_deuda: true },
    adjuntos: [
      {
        tipo: "ddjj_anual",
        path: ddjj.data,
        nombre_archivo: nombreArchivo(ddjj.data, crudo.ddjj_nombre),
        // La DDJJ del año N sostiene la habilitación hasta el 31/3 del año N + 2 (ver resolver_tramite).
        vence: `${datos.anio + 2}-03-31`,
      },
      {
        tipo: "libre_deuda",
        path: libre.data,
        nombre_archivo: nombreArchivo(libre.data, crudo.libre_deuda_nombre),
      },
    ],
  });
  if (!resultado.ok) return fallo(mensajeError(resultado.error, "No se pudo presentar la renovación."));

  revalidarLegajo();
  revalidatePath("/prestador");
  return exito(
    `Presentaste la DDJJ ${datos.anio} (${resultado.codigo ?? "renovación anual"}). Te avisaremos cuando la Dirección la resuelva.`,
    { id: resultado.id },
  );
}
