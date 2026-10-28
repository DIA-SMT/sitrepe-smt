import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/*
 * Markdown mínimo para las respuestas de Migue: párrafos, listas ("-", "*", "1."), **negrita**, `código` y
 * enlaces [texto](/ruta). Solo se enlazan rutas internas o https; cualquier otra cosa queda como texto.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function enlace(texto: string, href: string, clave: number, onNavegar?: () => void): ReactNode {
  const clase = "font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary";
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link key={clave} href={href} className={clase} onClick={onNavegar}>
        {texto}
      </Link>
    );
  }
  if (href.startsWith("https://")) {
    return (
      <a key={clave} href={href} target="_blank" rel="noopener noreferrer" className={clase}>
        {texto}
      </a>
    );
  }
  return <Fragment key={clave}>{texto}</Fragment>;
}

function inline(texto: string, onNavegar?: () => void): ReactNode[] {
  return texto.split(INLINE).map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    if (parte.startsWith("`") && parte.endsWith("`") && parte.length > 2) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {parte.slice(1, -1)}
        </code>
      );
    }
    const m = parte.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (m) return enlace(m[1], m[2], i, onNavegar);
    return <Fragment key={i}>{parte}</Fragment>;
  });
}

type Bloque = { tipo: "p"; lineas: string[] } | { tipo: "ul" | "ol"; items: string[] };

function bloques(texto: string): Bloque[] {
  const resultado: Bloque[] = [];
  for (const cruda of texto.split("\n")) {
    const linea = cruda.trim();
    const ul = linea.match(/^[-*•]\s+(.*)$/);
    const ol = linea.match(/^\d+[.)]\s+(.*)$/);
    const ultimo = resultado.at(-1);
    if (!linea) {
      resultado.push({ tipo: "p", lineas: [] });
    } else if (ul || ol) {
      const tipo = ul ? "ul" : "ol";
      const item = (ul ?? ol)?.[1] ?? "";
      if (ultimo?.tipo === tipo) ultimo.items.push(item);
      else resultado.push({ tipo, items: [item] });
    } else if (ultimo?.tipo === "p") {
      ultimo.lineas.push(linea.replace(/^#+\s*/, ""));
    } else {
      resultado.push({ tipo: "p", lineas: [linea.replace(/^#+\s*/, "")] });
    }
  }
  return resultado.filter((b) => (b.tipo === "p" ? b.lineas.length > 0 : b.items.length > 0));
}

export function TextoAsistente({ texto, onNavegar }: { texto: string; onNavegar?: () => void }) {
  return (
    <div className="space-y-2">
      {bloques(texto).map((b, i) => {
        if (b.tipo === "p") {
          return (
            <p key={i}>
              {b.lineas.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(l, onNavegar)}
                </Fragment>
              ))}
            </p>
          );
        }
        const Lista = b.tipo;
        return (
          <Lista key={i} className={b.tipo === "ul" ? "list-disc space-y-1 pl-5" : "list-decimal space-y-1 pl-5"}>
            {b.items.map((item, j) => (
              <li key={j} className="pl-0.5 marker:text-primary/70">
                {inline(item, onNavegar)}
              </li>
            ))}
          </Lista>
        );
      })}
    </div>
  );
}
