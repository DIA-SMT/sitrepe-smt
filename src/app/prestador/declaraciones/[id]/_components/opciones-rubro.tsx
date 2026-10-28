import { PERIODICIDAD } from "@/lib/domain/etiquetas";
import type { RubroOpcion } from "../../_lib/tipos";

/** Agrupa los rubros del Anexo por grupo (Comercio, Educación, Sanidad…), en orden alfabético. */
export function agruparRubros(rubros: RubroOpcion[]): [string, RubroOpcion[]][] {
  const grupos = new Map<string, RubroOpcion[]>();
  for (const r of rubros) {
    const lista = grupos.get(r.grupo) ?? [];
    lista.push(r);
    grupos.set(r.grupo, lista);
  }
  return [...grupos.entries()].sort(([a], [b]) => (a === "No tipificada" ? 1 : b === "No tipificada" ? -1 : a.localeCompare(b, "es")));
}

/** Opciones de <select> agrupadas por grupo del Anexo, con la periodicidad a la vista. */
export function OpcionesRubro({ rubros }: { rubros: RubroOpcion[] }) {
  return (
    <>
      {agruparRubros(rubros).map(([grupo, lista]) => (
        <optgroup key={grupo} label={grupo}>
          {lista.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.nombre} · {PERIODICIDAD[r.periodicidad].label.toLowerCase()}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
