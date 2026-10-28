import { z } from "zod";
import { ROLES_EMPRESA, esStaff, getSesion, type Sesion } from "@/lib/auth";
import { type AmbitoAsistente, type EventoAsistente, asistenteHabilitado } from "@/lib/asistente/config";
import { instruccionesSistema } from "@/lib/asistente/conocimiento";
import { definicionesHerramientas, ejecutarHerramienta, estadoHerramienta } from "@/lib/asistente/herramientas";
import { type MensajeChat, completarEnStreaming } from "@/lib/asistente/openrouter";
import { MENSAJE_LIMITE, permitirEnvio } from "@/lib/limite-envio";

/*
 * Chat de Migue. Responde en NDJSON (una línea JSON por evento) para mostrar el texto a medida que llega:
 *   { "tipo": "texto", "valor": "..." }   fragmento de la respuesta
 *   { "tipo": "estado", "valor": "..." }  qué está consultando (herramientas)
 *   { "tipo": "error", "valor": "..." }   mensaje para el usuario
 * El ámbito y las herramientas dependen de la sesión, no de lo que diga el navegador.
 */

const MAX_RONDAS = 4;

const esquema = z.object({
  ambito: z.enum(["portal", "prestador", "gestion"]),
  ruta: z.string().max(200).startsWith("/").catch("/"),
  mensajes: z
    .array(
      z.discriminatedUnion("rol", [
        z.object({ rol: z.literal("usuario"), texto: z.string().trim().min(1).max(2000) }),
        z.object({ rol: z.literal("asistente"), texto: z.string().max(6000) }),
      ]),
    )
    .min(1)
    .max(30)
    .refine((m) => m.at(-1)?.rol === "usuario", "El último mensaje debe ser del usuario."),
});

/** El ámbito pedido solo se respeta si la sesión corresponde; si no, se responde como portal público. */
function ambitoEfectivo(pedido: AmbitoAsistente, sesion: Sesion | null): AmbitoAsistente {
  if (pedido === "gestion" && sesion && esStaff(sesion.perfil.rol)) return "gestion";
  if (pedido === "prestador" && sesion && (ROLES_EMPRESA as readonly string[]).includes(sesion.perfil.rol)) {
    return "prestador";
  }
  return "portal";
}

export async function POST(request: Request) {
  if (!asistenteHabilitado()) {
    return Response.json({ error: "El asistente no está disponible." }, { status: 503 });
  }

  const cuerpo = esquema.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) return Response.json({ error: "No se pudo leer el mensaje." }, { status: 400 });

  if (!(await permitirEnvio("asistente"))) return Response.json({ error: MENSAJE_LIMITE }, { status: 429 });

  const sesion = await getSesion();
  const ambito = ambitoEfectivo(cuerpo.data.ambito, sesion);
  const ctx = { ambito, sesion };
  const herramientas = definicionesHerramientas(ctx);

  const mensajes: MensajeChat[] = [
    { role: "system", content: instruccionesSistema({ ambito, sesion, ruta: cuerpo.data.ruta }) },
    ...cuerpo.data.mensajes.map(
      (m): MensajeChat => (m.rol === "usuario" ? { role: "user", content: m.texto } : { role: "assistant", content: m.texto }),
    ),
  ];

  const codificador = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enviar = (evento: EventoAsistente) => controller.enqueue(codificador.encode(`${JSON.stringify(evento)}\n`));
      try {
        for (let ronda = 0; ronda < MAX_RONDAS; ronda++) {
          const { texto, llamadas } = await completarEnStreaming({
            mensajes,
            // En la última ronda no se ofrecen herramientas: el modelo tiene que responder con lo que ya tiene.
            herramientas: ronda < MAX_RONDAS - 1 ? herramientas : [],
            onTexto: (fragmento) => enviar({ tipo: "texto", valor: fragmento }),
            signal: request.signal,
          });
          if (!llamadas.length) break;

          mensajes.push({ role: "assistant", content: texto || null, tool_calls: llamadas });
          for (const llamada of llamadas) {
            enviar({ tipo: "estado", valor: estadoHerramienta(llamada.function.name) });
            mensajes.push({
              role: "tool",
              tool_call_id: llamada.id,
              content: await ejecutarHerramienta(llamada.function.name, llamada.function.arguments, ctx),
            });
          }
        }
      } catch (e) {
        if (!request.signal.aborted) {
          console.error("[asistente]", e);
          enviar({ tipo: "error", valor: "Uy, no pude responder en este momento. Probá de nuevo en un ratito." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
