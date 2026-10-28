import "server-only";
import { APP } from "@/lib/config";
import { MODELO_POR_DEFECTO } from "./config";

/*
 * Cliente mínimo de la API de chat de OpenRouter (compatible con OpenAI), con streaming SSE y llamadas a herramientas.
 * Sin dependencias: fetch + parseo de líneas "data: {...}".
 */

export type MensajeChat =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: LlamadaHerramienta[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type LlamadaHerramienta = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type DeltaStream = {
  content?: string | null;
  tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];
};

type ChunkStream = {
  choices?: { delta?: DeltaStream; finish_reason?: string | null }[];
  error?: { message?: string };
};

export class ErrorOpenRouter extends Error {}

/**
 * Pide una respuesta en streaming. Llama a `onTexto` con cada fragmento de texto y devuelve el texto completo
 * y las herramientas que el modelo pidió ejecutar (si hay).
 */
export async function completarEnStreaming({
  mensajes,
  herramientas,
  onTexto,
  signal,
}: {
  mensajes: MensajeChat[];
  herramientas: unknown[];
  onTexto: (fragmento: string) => void;
  signal?: AbortSignal;
}): Promise<{ texto: string; llamadas: LlamadaHerramienta[] }> {
  const clave = process.env.OPENROUTER_API_KEY;
  if (!clave) throw new ErrorOpenRouter("Falta OPENROUTER_API_KEY.");

  const respuesta = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${clave}`,
      "Content-Type": "application/json",
      "HTTP-Referer": APP.siteUrl,
      "X-Title": `${APP.nombre} · ${APP.municipio}`,
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || MODELO_POR_DEFECTO,
      messages: mensajes,
      tools: herramientas.length ? herramientas : undefined,
      stream: true,
      temperature: 0.3,
      max_tokens: 900,
    }),
  });

  if (!respuesta.ok || !respuesta.body) {
    const detalle = await respuesta.text().catch(() => "");
    throw new ErrorOpenRouter(`OpenRouter respondió ${respuesta.status}: ${detalle.slice(0, 300)}`);
  }

  let texto = "";
  const llamadas: LlamadaHerramienta[] = [];
  const lector = respuesta.body.pipeThrough(new TextDecoderStream()).getReader();
  let pendiente = "";

  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    pendiente += value;
    const lineas = pendiente.split("\n");
    pendiente = lineas.pop() ?? "";
    for (const linea of lineas) {
      // Los comentarios SSE (": OPENROUTER PROCESSING") y líneas vacías se ignoran.
      if (!linea.startsWith("data:")) continue;
      const dato = linea.slice(5).trim();
      if (!dato || dato === "[DONE]") continue;
      let chunk: ChunkStream;
      try {
        chunk = JSON.parse(dato) as ChunkStream;
      } catch {
        continue;
      }
      if (chunk.error) throw new ErrorOpenRouter(chunk.error.message ?? "Error de OpenRouter.");
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        texto += delta.content;
        onTexto(delta.content);
      }
      for (const parcial of delta.tool_calls ?? []) {
        const llamada = (llamadas[parcial.index] ??= {
          id: "",
          type: "function",
          function: { name: "", arguments: "" },
        });
        if (parcial.id) llamada.id = parcial.id;
        if (parcial.function?.name) llamada.function.name += parcial.function.name;
        if (parcial.function?.arguments) llamada.function.arguments += parcial.function.arguments;
      }
    }
  }

  return { texto, llamadas: llamadas.filter((l) => l?.function.name) };
}
