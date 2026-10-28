import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "danger";

const styles: Record<AlertTone, { box: string; icon: string; title: string }> = {
  info: {
    box: "border-celeste-200 bg-info-soft",
    icon: "bg-white text-info ring-celeste-200",
    title: "text-celeste-900",
  },
  success: {
    box: "border-emerald-200 bg-success-soft",
    icon: "bg-white text-success ring-emerald-200",
    title: "text-emerald-900",
  },
  warning: {
    box: "border-amber-200 bg-warning-soft",
    icon: "bg-white text-warning ring-amber-200",
    title: "text-amber-900",
  },
  danger: {
    box: "border-red-200 bg-danger-soft",
    icon: "bg-white text-danger ring-red-200",
    title: "text-red-900",
  },
};

const iconos = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleX };

export type AlertProps = Omit<React.ComponentProps<"div">, "title"> & {
  tone?: AlertTone;
  title?: React.ReactNode;
  /** Ícono propio (elemento) o `false` para ocultarlo. Por defecto, uno según el tono. */
  icon?: React.ReactNode | false;
  /** Acciones a la derecha (botones/links). */
  action?: React.ReactNode;
};

/** Aviso/callout. Tonos: info · success · warning · danger (siempre con ícono + texto). */
export function Alert({ tone = "info", title, icon, action, className, children, ...props }: AlertProps) {
  const s = styles[tone];
  const Icono = iconos[tone];
  return (
    <div
      data-slot="alert"
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", s.box, className)}
      {...props}
    >
      {icon === false ? null : (
        <span
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 [&_svg]:size-4", s.icon)}
          aria-hidden
        >
          {icon ?? <Icono />}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
        {title ? <p className={cn("leading-snug font-semibold", s.title)}>{title}</p> : null}
        {children ? <div className="leading-relaxed text-foreground/85">{children}</div> : null}
      </div>
      {action ? <div className="flex shrink-0 items-start gap-2 self-center">{action}</div> : null}
    </div>
  );
}

/** Alias semántico. */
export const Callout = Alert;
