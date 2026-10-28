"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { ASISTENTE, type AmbitoAsistente, type EventoAsistente } from "@/lib/asistente/config";
import { cn } from "@/lib/utils";
import { TextoAsistente } from "./texto-asistente";

type Mensaje = { rol: "usuario" | "asistente"; texto: string; error?: boolean };

const BIENVENIDA: Record<AmbitoAsistente, { titulo: string; texto: string; sugerencias: string[] }> = {
  portal: {
    titulo: "¡Hola! Soy Migue",
    texto: "Te ayudo a verificar certificados, encontrar empresas habilitadas y resolver dudas sobre fumigación y tanques.",
    sugerencias: [
      "¿Cómo sé si un certificado es válido?",
      "¿Cada cuánto tiene que fumigar un restaurante?",
      "Busco una empresa para limpiar tanques",
      "¿Cómo hago una denuncia?",
    ],
  },
  prestador: {
    titulo: "¡Hola! Soy Migue",
    texto: "Te acompaño con declaraciones, firmas, pagos y timbrado. Preguntame lo que necesites.",
    sugerencias: [
      "¿Qué tengo pendiente?",
      "¿Cómo cargo una declaración?",
      "¿Cuánto sale el timbrado y dónde pago?",
      "Me observaron un certificado, ¿qué hago?",
    ],
  },
  gestion: {
    titulo: "¡Hola! Soy Migue",
    texto: "Te doy una mano con el control, los pagos, la fiscalización y los reportes.",
    sugerencias: [
      "¿Qué hay pendiente hoy?",
      "¿Cómo verifico un pago?",
      "¿Cómo armo la hoja de ruta?",
      "¿Dónde saco el informe de recaudación?",
    ],
  },
};

export function AsistenteChat({ ambito }: { ambito: AmbitoAsistente }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [borrador, setBorrador] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<string | null>(null);
  const [globo, setGlobo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLTextAreaElement>(null);
  const bienvenida = BIENVENIDA[ambito];

  // Globo de "¿Te ayudo?" unos segundos después de entrar, una sola vez por carga.
  useEffect(() => {
    const mostrar = setTimeout(() => setGlobo(true), 2500);
    const ocultar = setTimeout(() => setGlobo(false), 11000);
    return () => {
      clearTimeout(mostrar);
      clearTimeout(ocultar);
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const enfocar = setTimeout(() => entradaRef.current?.focus(), 150);
    const alTeclear = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      clearTimeout(enfocar);
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, estado]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function abrir() {
    setGlobo(false);
    setAbierto(true);
  }

  function reiniciar() {
    abortRef.current?.abort();
    setMensajes([]);
    setEstado(null);
    setEnviando(false);
    entradaRef.current?.focus();
  }

  async function enviar(texto: string) {
    const pregunta = texto.trim();
    if (!pregunta || enviando) return;

    const historial: Mensaje[] = [...mensajes.filter((m) => !m.error && m.texto), { rol: "usuario", texto: pregunta }];
    setMensajes([...historial, { rol: "asistente", texto: "" }]);
    setBorrador("");
    setEnviando(true);
    setEstado(null);

    const controlador = new AbortController();
    abortRef.current = controlador;
    const agregar = (fragmento: string) =>
      setMensajes((previos) => {
        const copia = [...previos];
        const ultimo = copia.at(-1);
        if (ultimo?.rol === "asistente") copia[copia.length - 1] = { ...ultimo, texto: ultimo.texto + fragmento };
        return copia;
      });
    const fallar = (mensaje: string) =>
      setMensajes((previos) => [...previos.slice(0, -1), { rol: "asistente", texto: mensaje, error: true }]);

    try {
      const respuesta = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ambito,
          ruta,
          mensajes: historial.slice(-20).map(({ rol, texto: t }) => ({ rol, texto: t })),
        }),
        signal: controlador.signal,
      });
      if (!respuesta.ok || !respuesta.body) {
        const cuerpo = (await respuesta.json().catch(() => null)) as { error?: string } | null;
        fallar(cuerpo?.error ?? "No pude responder en este momento. Probá de nuevo en un ratito.");
        return;
      }

      const lector = respuesta.body.pipeThrough(new TextDecoderStream()).getReader();
      let pendiente = "";
      let recibioTexto = false;
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        pendiente += value;
        const lineas = pendiente.split("\n");
        pendiente = lineas.pop() ?? "";
        for (const linea of lineas) {
          if (!linea.trim()) continue;
          const evento = JSON.parse(linea) as EventoAsistente;
          if (evento.tipo === "texto") {
            recibioTexto = true;
            setEstado(null);
            agregar(evento.valor);
          } else if (evento.tipo === "estado") {
            setEstado(evento.valor);
          } else {
            fallar(evento.valor);
            return;
          }
        }
      }
      if (!recibioTexto) fallar("No encontré una respuesta. ¿Me lo preguntás de otra forma?");
    } catch (e) {
      if (!controlador.signal.aborted) {
        console.error(e);
        fallar("Se cortó la conexión. Probá de nuevo.");
      }
    } finally {
      if (abortRef.current === controlador) {
        setEnviando(false);
        setEstado(null);
      }
    }
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    void enviar(borrador);
  }

  function alTeclearEntrada(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void enviar(borrador);
    }
  }

  // En pantallas chicas el panel ocupa casi todo: al seguir un enlace, se cierra para ver la página.
  function alNavegar() {
    if (window.matchMedia("(max-width: 639px)").matches) setAbierto(false);
  }

  const esperandoPrimerTexto = enviando && mensajes.at(-1)?.rol === "asistente" && !mensajes.at(-1)?.texto;

  return (
    <div className="no-print">
      <AnimatePresence>
        {abierto && (
          <motion.section
            key="panel"
            role="dialog"
            aria-label={`Chat con ${ASISTENTE.nombre}, asistente virtual`}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed inset-x-2 bottom-2 z-[45] flex h-[min(640px,calc(100dvh-1rem))] flex-col overflow-hidden rounded-panel border border-border bg-card shadow-elevated sm:inset-x-auto sm:right-5 sm:bottom-24 sm:h-[min(620px,calc(100dvh-8rem))] sm:w-[400px]"
          >
            <header className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-azul-600 via-primary to-celeste-500 px-4 py-3.5 text-white">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-sol-400/25 blur-2xl"
              />
              <div className="relative">
                <Image
                  src={ASISTENTE.avatar}
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 rounded-full bg-white/90 ring-2 ring-white/70"
                />
                <span className="absolute right-0 bottom-0 size-3 rounded-full bg-success ring-2 ring-primary" />
              </div>
              <div className="relative min-w-0 flex-1">
                <p className="font-display text-base leading-tight font-semibold">{ASISTENTE.nombre}</p>
                <p className="truncate text-xs text-white/80">Asistente virtual de SITREPE</p>
              </div>
              {mensajes.length > 0 && (
                <button
                  type="button"
                  onClick={reiniciar}
                  className="relative rounded-full p-2 text-white/85 transition hover:bg-white/15 hover:text-white"
                  aria-label="Empezar una conversación nueva"
                  title="Conversación nueva"
                >
                  <RotateCcw className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="relative rounded-full p-2 text-white/85 transition hover:bg-white/15 hover:text-white"
                aria-label="Cerrar el chat"
              >
                <X className="size-5" />
              </button>
            </header>

            <div ref={listaRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
              {mensajes.length === 0 ? (
                <div className="flex flex-col items-center pt-2 text-center">
                  <Image
                    src={ASISTENTE.ilustracion}
                    alt={`${ASISTENTE.nombre} saludando`}
                    width={150}
                    height={150}
                    priority
                    className="size-36 animate-float drop-shadow-[0_14px_20px_rgb(0_60_160/0.18)]"
                  />
                  <p className="mt-1 font-display text-lg font-semibold text-tinta">{bienvenida.titulo}</p>
                  <p className="mt-1 max-w-[300px] text-sm text-muted-foreground">{bienvenida.texto}</p>
                  <div className="mt-5 flex w-full flex-col gap-2">
                    {bienvenida.sugerencias.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void enviar(s)}
                        className="group flex items-center gap-2 rounded-card border border-border bg-background px-3.5 py-2.5 text-left text-sm text-foreground transition hover:border-primary/40 hover:bg-primary-soft"
                      >
                        <Sparkles className="size-4 shrink-0 text-celeste-500 transition group-hover:text-primary" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                mensajes.map((m, i) =>
                  m.rol === "usuario" ? (
                    <div key={i} className="flex justify-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground shadow-brand">
                        {m.texto}
                      </p>
                    </div>
                  ) : (
                    <div key={i} className="flex items-end gap-2">
                      <Image src={ASISTENTE.avatar} alt="" width={28} height={28} className="size-7 shrink-0 rounded-full bg-azul-50" />
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed",
                          m.error ? "bg-danger-soft text-danger" : "bg-muted text-foreground",
                        )}
                      >
                        {m.texto ? (
                          <TextoAsistente texto={m.texto} onNavegar={alNavegar} />
                        ) : (
                          <span className="flex items-center gap-2 py-1 text-muted-foreground">
                            {estado ? (
                              <>
                                <LoaderCircle className="size-3.5 animate-spin text-primary" />
                                <span className="text-xs">{estado}</span>
                              </>
                            ) : (
                              <span className="flex gap-1" aria-label={`${ASISTENTE.nombre} está escribiendo`}>
                                {[0, 1, 2].map((p) => (
                                  <span
                                    key={p}
                                    className="size-1.5 animate-bounce rounded-full bg-primary/60"
                                    style={{ animationDelay: `${p * 140}ms` }}
                                  />
                                ))}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                )
              )}
              {estado && !esperandoPrimerTexto && (
                <p className="flex items-center gap-2 pl-9 text-xs text-muted-foreground">
                  <LoaderCircle className="size-3.5 animate-spin text-primary" />
                  {estado}
                </p>
              )}
            </div>

            <form onSubmit={alEnviar} className="border-t border-border bg-card px-3 pt-3 pb-2">
              <div className="flex items-end gap-2 rounded-card border border-input bg-background px-3 py-2 transition focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/20">
                <textarea
                  ref={entradaRef}
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  onKeyDown={alTeclearEntrada}
                  rows={1}
                  maxLength={2000}
                  placeholder="Escribí tu consulta…"
                  aria-label="Tu consulta"
                  className="field-sizing-content max-h-32 min-h-6 flex-1 resize-none bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={!borrador.trim() || enviando}
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary-hover disabled:opacity-40"
                  aria-label="Enviar"
                >
                  {enviando ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                {ASISTENTE.nombre} usa inteligencia artificial y puede equivocarse. Verificá los datos importantes.
              </p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="fixed right-4 bottom-4 z-40 flex items-end gap-3 sm:right-5 sm:bottom-5">
        <AnimatePresence>
          {globo && !abierto && (
            <motion.button
              key="globo"
              type="button"
              onClick={abrir}
              initial={{ opacity: 0, x: 12, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, scale: 0.95 }}
              className="mb-2 hidden rounded-2xl rounded-br-sm border border-border bg-card px-3.5 py-2 text-sm font-medium text-tinta shadow-elevated sm:block"
            >
              ¿Te ayudo? 👋
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          onClick={() => (abierto ? setAbierto(false) : abrir())}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          aria-expanded={abierto}
          aria-label={abierto ? "Cerrar el chat" : `Abrir el chat con ${ASISTENTE.nombre}`}
          className={cn(
            "relative size-16 rounded-full bg-gradient-to-br from-celeste-400 via-primary to-azul-700 p-[3px] shadow-brand",
            abierto ? "max-sm:hidden" : !mensajes.length && "animate-pulse-ring",
          )}
        >
          <span className="grid size-full place-items-center overflow-hidden rounded-full bg-white">
            {abierto ? (
              <X className="size-6 text-primary" />
            ) : (
              <Image src={ASISTENTE.avatar} alt="" width={58} height={58} className="size-full object-cover" />
            )}
          </span>
          {!abierto && (
            <span className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-sol-400 ring-2 ring-white">
              <Sparkles className="size-3 text-noche-950" />
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
}
