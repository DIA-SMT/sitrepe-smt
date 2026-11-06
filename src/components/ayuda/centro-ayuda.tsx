import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type AreaAyuda, MANUALES, TUTORIALES, formatDuracion, urlManual, urlsTutorial } from "@/lib/ayuda";
import { GaleriaTutoriales } from "./galeria-tutoriales";

/** Videos tutoriales y manuales de operación disponibles en cada área. */
export function CentroAyuda({ area, inicial }: { area: AreaAyuda; inicial?: string }) {
  const tutoriales = TUTORIALES.filter((t) => t.areas.includes(area)).map((t) => ({
    clave: t.clave,
    titulo: t.titulo,
    perfil: t.perfil,
    descripcion: t.descripcion,
    duracion: formatDuracion(t.duracion),
    ...urlsTutorial(t),
  }));
  const manuales = MANUALES.filter((m) => m.areas.includes(area));

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="videos" className="flex flex-col gap-5">
        <div>
          <h2 id="videos" className="font-display text-xl font-semibold text-foreground">
            Videos tutoriales
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Videos cortos y narrados, con las pantallas reales de la plataforma.</p>
        </div>
        <GaleriaTutoriales tutoriales={tutoriales} inicial={inicial} />
      </section>

      <section aria-labelledby="manuales" className="flex flex-col gap-5">
        <div>
          <h2 id="manuales" className="font-display text-xl font-semibold text-foreground">
            Manuales de operación
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada tarea paso a paso, con capturas. Se abren en PDF para leer, descargar o imprimir.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {manuales.map((m) => (
            <li key={m.archivo} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-azul-50 text-azul-600 ring-1 ring-azul-100"
                >
                  <FileText className="size-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-semibold text-foreground">{m.titulo}</p>
                  <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{m.descripcion}</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">PDF · {m.paginas} páginas</span>
                <Button asChild variant="outline" size="sm">
                  <a href={urlManual(m)} target="_blank" rel="noopener noreferrer">
                    <Download aria-hidden />
                    Abrir manual
                    <span className="sr-only">(PDF, se abre en una pestaña nueva)</span>
                  </a>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
