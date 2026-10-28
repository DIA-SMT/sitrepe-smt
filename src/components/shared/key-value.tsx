import { cn } from "@/lib/utils";

export type KeyValueItem = {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Ocupa todo el ancho de la grilla. */
  full?: boolean;
};

export type KeyValueProps = {
  items: KeyValueItem[];
  columns?: 1 | 2 | 3 | 4;
  /** Texto cuando el valor es null/undefined/"". */
  empty?: string;
  className?: string;
};

const cols = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

/** Lista de definiciones en grilla (datos de un legajo, certificado, etc.). */
export function KeyValue({ items, columns = 2, empty = "—", className }: KeyValueProps) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4", cols[columns], className)}>
      {items.map((item, i) => {
        const vacio = item.value === null || item.value === undefined || item.value === "";
        return (
          <div
            key={i}
            className={cn("flex min-w-0 flex-col gap-1 border-l-2 border-azul-100 pl-3", item.full && "sm:col-span-full")}
          >
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{item.label}</dt>
            <dd className={cn("text-sm font-medium break-words text-foreground", vacio && "text-muted-foreground")}>
              {vacio ? empty : item.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
