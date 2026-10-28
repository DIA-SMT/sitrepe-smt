"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { presentarDeclaracion } from "../../actions";
import { BotonFirmar } from "../../_components/boton-firmar";

export type Chequeo = { id: string; ok: boolean; titulo: string; detalle?: string };

type Props = {
  declaracionId: string;
  codigo: string;
  reenvio: boolean;
  chequeos: Chequeo[];
  /** Certificados que el usuario actual (asesor técnico) puede firmar en esta planilla. */
  firmables: string[];
};

/**
 * Lista de verificación previa y presentación de la planilla. Los errores que
 * devuelve la base (uno por línea) se muestran como lista.
 */
export function PanelPresentacion({ declaracionId, codigo, reenvio, chequeos, firmables }: Props) {
  const router = useRouter();
  const [errores, setErrores] = useState<string[] | null>(null);
  const [verificando, startTransition] = useTransition();
  const cumplidos = chequeos.filter((c) => c.ok).length;
  const listo = cumplidos === chequeos.length;

  return (
    <section
      aria-labelledby="panel-presentacion"
      className={cn(
        "relative overflow-hidden rounded-card border p-5 shadow-card sm:p-6",
        listo ? "border-emerald-200 bg-linear-to-br from-emerald-50 via-card to-card" : "border-border bg-card",
      )}
    >
      <div aria-hidden className="bg-dots mask-fade pointer-events-none absolute inset-y-0 right-0 w-1/2 text-azul-600 opacity-40" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="panel-presentacion" className="font-display text-lg font-semibold text-foreground">
              {listo ? "Lista para presentar" : `${reenvio ? "Antes de volver a presentar" : "Antes de presentar"}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {listo
                ? "Todos los controles están en orden. Al presentarla, la planilla pasa al área de Control de Empresas."
                : "Completá estos puntos: son los mismos que valida el sistema al presentar."}
            </p>
          </div>
          <Progress
            value={cumplidos}
            max={chequeos.length}
            tone={listo ? "verde" : "azul"}
            label={`${cumplidos} de ${chequeos.length} controles cumplidos`}
            size="sm"
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {chequeos.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5 text-sm">
                {c.ok ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className={cn("font-medium", c.ok ? "text-foreground" : "text-amber-900")}>
                    <span className="sr-only">{c.ok ? "Cumplido: " : "Pendiente: "}</span>
                    {c.titulo}
                  </span>
                  {c.detalle ? <span className="block text-[13px] text-muted-foreground">{c.detalle}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
          {firmables.length > 0 ? (
            <BotonFirmar
              ids={firmables}
              etiqueta={firmables.length === 1 ? "Firmar mi servicio" : `Firmar mis ${firmables.length} servicios`}
              titulo={`Firmar ${firmables.length === 1 ? "1 certificado" : `${firmables.length} certificados`} de ${codigo}`}
            />
          ) : null}
          <ConfirmDialog
            tone="primary"
            trigger={
              <Button size="lg" disabled={!listo}>
                <Send aria-hidden />
                {reenvio ? "Volver a presentar" : "Presentar declaración"}
              </Button>
            }
            title={`¿Presentar la declaración ${codigo}?`}
            description="Declarás bajo juramento que los servicios se realizarán (o se realizaron, en el caso de tanques) en las fechas, domicilios y con los productos indicados. Después de presentarla no vas a poder modificarla, salvo que el área la observe."
            confirmLabel="Sí, presentar"
            onConfirm={async () => {
              const r = await presentarDeclaracion(declaracionId);
              if (r.ok) {
                setErrores(null);
                toast.success(r.mensaje);
              } else {
                const lineas = (r.mensaje ?? "No se pudo presentar la declaración.").split("\n").filter(Boolean);
                setErrores(lineas);
                toast.error("La declaración no se pudo presentar", {
                  description: lineas.length > 1 ? `Hay ${lineas.length} puntos para corregir.` : lineas[0],
                });
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            loading={verificando}
            onClick={() => startTransition(() => router.refresh())}
          >
            {!verificando ? <RefreshCw aria-hidden /> : null}
            Volver a verificar
          </Button>
        </div>
      </div>

      {errores && errores.length > 0 ? (
        <Alert tone="danger" title="No se pudo presentar la declaración" className="relative mt-5">
          <p>{errores.length > 1 ? "Corregí estos puntos y volvé a intentarlo:" : "Corregí este punto y volvé a intentarlo:"}</p>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5">
            {errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </section>
  );
}
