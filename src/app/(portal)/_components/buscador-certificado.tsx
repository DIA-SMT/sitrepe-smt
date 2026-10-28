"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, LoaderCircle, QrCode, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EJEMPLO_CODIGO, esCodigoValido, normalizarCodigo } from "../_lib/codigo";

type BuscadorCertificadoProps = {
  /** hero: tarjeta blanca grande sobre fondos de marca · panel: dentro de una tarjeta. */
  variante?: "hero" | "panel";
  valorInicial?: string;
  autoFocus?: boolean;
  className?: string;
};

/**
 * Buscador "Verificá un certificado". Normaliza el código y navega a /verificar/[codigo].
 * Sin JavaScript, el formulario envía ?codigo= a /verificar, que redirige al resultado.
 */
export function BuscadorCertificado({ variante = "hero", valorInicial = "", autoFocus, className }: BuscadorCertificadoProps) {
  const router = useRouter();
  const id = useId();
  const [valor, setValor] = useState(valorInicial);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const errorId = `${id}-error`;
  const ayudaId = `${id}-ayuda`;

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const codigo = normalizarCodigo(valor);
    if (!codigo) {
      setError("Ingresá el código que figura debajo del QR del certificado.");
      return;
    }
    if (!esCodigoValido(codigo)) {
      setError(`Revisá el código: tiene el formato ${EJEMPLO_CODIGO} (o un sello SA-AAAA-NNNNNN).`);
      return;
    }
    setError(null);
    setValor(codigo);
    startTransition(() => router.push(`/verificar/${encodeURIComponent(codigo)}`));
  }

  const hero = variante === "hero";

  return (
    <form action="/verificar" method="get" onSubmit={enviar} noValidate className={cn("w-full", className)} role="search">
      <label htmlFor={id} className={cn(hero ? "sr-only" : "mb-2 block text-sm font-medium text-foreground")}>
        Código del certificado
      </label>
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-center",
          hero && "rounded-2xl bg-white p-2 shadow-elevated ring-1 ring-black/5",
          error && hero && "ring-2 ring-danger/60",
        )}
      >
        <div className="relative min-w-0 flex-1">
          <ScanLine
            aria-hidden
            className={cn("pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-azul-600", hero ? "size-5" : "size-4")}
          />
          <input
            id={id}
            name="codigo"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              if (error) setError(null);
            }}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={120}
            placeholder={`Ej.: ${EJEMPLO_CODIGO}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : ayudaId}
            className={cn(
              "w-full min-w-0 bg-transparent font-mono tracking-wider text-foreground uppercase outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground placeholder:normal-case",
              hero
                ? "h-12 rounded-xl pr-3 pl-11 text-base focus-visible:bg-azul-50/60"
                : "h-11 rounded-control border border-input bg-card pr-3 pl-10 text-sm shadow-xs transition-[border-color,box-shadow] hover:border-noche-500 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 aria-invalid:border-danger",
            )}
          />
        </div>
        <Button type="submit" size="lg" className={cn("shrink-0", !hero && "h-11")} disabled={pendiente} aria-busy={pendiente || undefined}>
          {pendiente ? <LoaderCircle className="animate-spin" aria-hidden /> : <QrCode aria-hidden />}
          {pendiente ? "Verificando…" : "Verificar"}
          {!pendiente ? <ArrowRight className="hidden sm:block" aria-hidden /> : null}
        </Button>
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className={cn(
            "mt-2 flex items-start gap-1.5 text-[13px] font-medium",
            hero ? "rounded-lg bg-white/95 px-3 py-2 text-danger shadow-xs" : "text-danger",
          )}
        >
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        <p id={ayudaId} className={cn("mt-2 text-[13px]", hero ? "text-white/85" : "text-muted-foreground")}>
          Lo encontrás debajo del código QR. También podés ingresar el sello de timbrado (SA-…).
        </p>
      )}
    </form>
  );
}
