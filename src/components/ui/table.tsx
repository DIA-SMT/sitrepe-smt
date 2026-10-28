import { cn } from "@/lib/utils";

type TableProps = React.ComponentProps<"table"> & {
  /** Marco de tarjeta (borde, fondo y sombra). Desactivalo dentro de una `Card`/`SectionCard`. */
  framed?: boolean;
  /** Clases del contenedor con scroll horizontal. */
  containerClassName?: string;
};

/** Tabla con contenedor responsive (scroll horizontal en pantallas chicas). */
export function Table({ className, framed = true, containerClassName, ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto",
        framed && "rounded-card border border-border bg-card shadow-card",
        containerClassName,
      )}
    >
      <table data-slot="table" className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-subtle [&_tr]:border-b [&_tr]:border-border [&_tr]:hover:bg-transparent", className)}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TFoot({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-border bg-subtle font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors hover:bg-azul-50/50 data-[state=selected]:bg-azul-50",
        className,
      )}
      {...props}
    />
  );
}

type CellAlign = { align?: "left" | "center" | "right"; numeric?: boolean };

const alignClass = (align: CellAlign["align"], numeric?: boolean) =>
  cn(
    align === "center" && "text-center",
    (align === "right" || numeric) && "text-right",
    numeric && "nums-tabular",
  );

export function TH({ className, align, numeric, scope = "col", ...props }: React.ComponentProps<"th"> & CellAlign) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        "h-11 px-4 text-left align-middle text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase first:pl-5 last:pr-5",
        alignClass(align, numeric),
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, align, numeric, ...props }: React.ComponentProps<"td"> & CellAlign) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-3 align-middle text-foreground first:pl-5 last:pr-5", alignClass(align, numeric), className)}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("border-t border-border px-5 py-3 text-left text-[13px] text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Fila de "sin resultados" que ocupa todo el ancho. */
export function TEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
