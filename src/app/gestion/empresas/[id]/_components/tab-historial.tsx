import Link from "next/link";
import { ArrowRight, FilePlus2, History, PencilLine, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { Button } from "@/components/ui/button";
import { type EntradaHistorial, TABLA_AUDITORIA } from "@/lib/data/empresas";

const ACCION = {
  INSERT: { label: "alta", tono: "verde", icono: FilePlus2 },
  UPDATE: { label: "modificación", tono: "azul", icono: PencilLine },
  DELETE: { label: "baja", tono: "rojo", icono: Trash2 },
} as const;

/** Historial del legajo a partir de la auditoría (solo Administración). */
export function TabHistorial({ entradas }: { entradas: EntradaHistorial[] }) {
  const items: TimelineItem[] = entradas.map((e) => {
    const a = ACCION[e.accion];
    return {
      id: String(e.id),
      date: e.fecha,
      tone: a.tono,
      icon: a.icono,
      title: `${TABLA_AUDITORIA[e.tabla] ?? e.tabla}: ${a.label}`,
      description: (
        <div className="flex flex-col gap-1.5">
          <p>
            {e.referencia ? <span className="font-medium text-foreground">{e.referencia} · </span> : null}
            por {e.usuario ?? "Sistema"}
          </p>
          {e.cambios.length > 0 ? (
            <ul className="flex flex-col gap-1 rounded-lg bg-subtle px-3 py-2 text-xs">
              {e.cambios.slice(0, 8).map((c) => (
                <li key={c.campo} className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-semibold text-foreground capitalize">{c.campo}:</span>
                  <span className="text-muted-foreground line-through decoration-noche-300">{c.antes}</span>
                  <ArrowRight className="size-3 translate-y-0.5 text-noche-300" aria-hidden />
                  <span className="sr-only">pasó a</span>
                  <span className="font-medium text-foreground">{c.despues}</span>
                </li>
              ))}
              {e.cambios.length > 8 ? <li className="text-muted-foreground">y {e.cambios.length - 8} cambios más</li> : null}
            </ul>
          ) : null}
        </div>
      ),
    };
  });

  return (
    <SectionCard
      title="Historial del legajo"
      description="Altas, modificaciones y bajas de datos, técnicos, memoria técnica, documentos y trámites"
      icon={History}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/gestion/auditoria">
            Auditoría completa
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      }
    >
      {items.length === 0 ? (
        <EmptyState compact icon={History} title="Sin movimientos registrados" description="Los cambios en el legajo quedan registrados automáticamente." />
      ) : (
        <Timeline items={items} />
      )}
    </SectionCard>
  );
}
