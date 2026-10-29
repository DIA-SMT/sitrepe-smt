"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Building2, ClipboardCheck, FileSignature, LoaderCircle, Route, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { estadoInicial } from "@/lib/acciones";
import { ingresarComoDemo } from "@/lib/auth-actions";
import type { CuentaDemo } from "@/lib/demo";
import { cn } from "@/lib/utils";

const ICONO: Record<CuentaDemo["rol"], { icon: LucideIcon; clase: string }> = {
  admin: { icon: ShieldCheck, clase: "bg-gradient-brand text-white shadow-brand" },
  control: { icon: ClipboardCheck, clase: "bg-azul-50 text-azul-700 ring-1 ring-azul-100" },
  inspector: { icon: Route, clase: "bg-celeste-50 text-celeste-700 ring-1 ring-celeste-100" },
  empresa: { icon: Building2, clase: "bg-sol-100 text-noche-900 ring-1 ring-sol-200" },
  tecnico: { icon: FileSignature, clase: "bg-success-soft text-success ring-1 ring-success/20" },
};

function BotonCuenta({ cuenta }: { cuenta: CuentaDemo }) {
  const { pending, data } = useFormStatus();
  const esta = pending && data?.get("rol") === cuenta.rol;
  const { icon: Icono, clase } = ICONO[cuenta.rol];

  return (
    <button
      type="submit"
      name="rol"
      value={cuenta.rol}
      disabled={pending}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition",
        "hover:-translate-y-px hover:border-primary/40 hover:shadow-card disabled:cursor-wait",
        pending && !esta && "opacity-50",
      )}
    >
      <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", clase)}>
        {esta ? <LoaderCircle className="size-5 animate-spin" /> : <Icono className="size-5" strokeWidth={1.9} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[15px] leading-tight font-semibold text-foreground">{cuenta.titulo}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{cuenta.descripcion}</span>
      </span>
      <ArrowRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </button>
  );
}

/** Botones de ingreso por rol con las cuentas de demostración (solo si el acceso rápido está activado). */
export function AccesoDemo({ cuentas }: { cuentas: readonly CuentaDemo[] }) {
  const [estado, accion] = useActionState(ingresarComoDemo, estadoInicial);

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sol-100 px-2.5 py-1 text-xs font-semibold text-noche-900 ring-1 ring-sol-300">
          <span className="size-1.5 rounded-full bg-sol-500" aria-hidden />
          Modo demostración
        </span>
        <span className="text-[13px] text-muted-foreground">Elegí con qué usuario probar</span>
      </div>

      {estado.mensaje && !estado.ok ? (
        <Alert tone="danger" title="No pudimos ingresar">
          {estado.mensaje}
        </Alert>
      ) : null}

      <form action={accion} className="grid gap-2">
        {cuentas.map((c) => (
          <BotonCuenta key={c.rol} cuenta={c} />
        ))}
      </form>

      <Separator label="o ingresá con tu cuenta" />
    </div>
  );
}
