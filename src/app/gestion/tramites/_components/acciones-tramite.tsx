"use client";

import { CircleCheck, MessageSquareWarning, OctagonX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampoDialogo } from "../../_components/dialogo-accion";
import { DialogoAccion } from "../../_components/dialogo-accion";
import { resolverTramite } from "../actions";

type TipoTramite = "inscripcion" | "renovacion" | "cambio_tecnico" | "cambio_domicilio" | "alta_producto" | "baja";

const EFECTO_APROBACION: Record<TipoTramite, string> = {
  inscripcion:
    "La empresa queda habilitada hasta el 31 de marzo del año próximo, se le asigna N.º de registro y aparece en el listado público.",
  renovacion: "Se extiende el vencimiento de la habilitación por un año más (Art. 8.º).",
  cambio_tecnico: "El nuevo asesor técnico queda aprobado y, si corresponde, se da de baja al anterior.",
  cambio_domicilio: "Se actualizan los domicilios de oficina y depósito informados.",
  alta_producto: "El producto queda aprobado en la memoria técnica de la empresa.",
  baja: "La empresa pasa a estado «baja» y deja de figurar en el listado público.",
};

/** Botones de resolución de un trámite (Administración y Control). */
export function AccionesTramite({
  id,
  tipo,
  codigo,
  empresa,
  requisitosPendientes,
  ultimaResolucion,
  anio,
}: {
  id: string;
  tipo: TipoTramite;
  codigo: string;
  empresa: string;
  /** Títulos de los requisitos que no están cumplidos. */
  requisitosPendientes: string[];
  /** Última resolución DSA registrada en el año (ayuda para numerar). */
  ultimaResolucion: string | null;
  /** Año en curso (Tucumán), para el ejemplo de formato. */
  anio: number;
}) {
  const esInscripcion = tipo === "inscripcion";

  const camposAprobar: CampoDialogo[] = [
    esInscripcion
      ? {
          tipo: "texto",
          nombre: "resolucion",
          etiqueta: "N.º de resolución DSA",
          requerido: true,
          placeholder: `000/DSA/${anio}`,
          ayuda: ultimaResolucion
            ? `Formato 000/DSA/AAAA. Última registrada: ${ultimaResolucion}.`
            : "Formato 000/DSA/AAAA. Es única por empresa.",
          maximo: 40,
        }
      : {
          tipo: "texto",
          nombre: "resolucion",
          etiqueta: "N.º de resolución o disposición (opcional)",
          placeholder: "Ej.: 080/DSA/2026",
          maximo: 40,
        },
    { tipo: "textarea", nombre: "observaciones", etiqueta: "Observaciones (opcional)", placeholder: "Se comunican a la empresa." },
  ];
  if (requisitosPendientes.length > 0) {
    camposAprobar.push({
      tipo: "casilla",
      nombre: "forzar",
      etiqueta: "Aprobar igualmente",
      descripcion: "Confirmo que verifiqué los requisitos pendientes por otro medio (expediente en papel o inspección).",
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <DialogoAccion
        accion={resolverTramite}
        size="md"
        trigger={
          <Button className="w-full justify-start" size="lg">
            <CircleCheck aria-hidden />
            Aprobar trámite
          </Button>
        }
        titulo={`Aprobar ${codigo}`}
        descripcion={`${empresa}. ${EFECTO_APROBACION[tipo]}`}
        confirmar={esInscripcion ? "Aprobar y habilitar" : "Aprobar"}
        ocultos={{ id, decision: "aprobar" }}
        aviso={
          requisitosPendientes.length > 0
            ? {
                tono: "warning",
                titulo: `${requisitosPendientes.length} requisito${requisitosPendientes.length === 1 ? "" : "s"} sin cumplir`,
                texto: (
                  <ul className="list-disc pl-4">
                    {requisitosPendientes.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ),
              }
            : { tono: "success", titulo: "Todos los requisitos están cumplidos" }
        }
        campos={camposAprobar}
      />
      <DialogoAccion
        accion={resolverTramite}
        trigger={
          <Button className="w-full justify-start" variant="secondary" size="lg">
            <MessageSquareWarning aria-hidden />
            Observar
          </Button>
        }
        titulo={`Observar ${codigo}`}
        descripcion="El trámite vuelve a la empresa para que corrija o complete lo indicado y lo presente de nuevo."
        confirmar="Enviar observaciones"
        ocultos={{ id, decision: "observar" }}
        campos={[
          {
            tipo: "textarea",
            nombre: "observaciones",
            etiqueta: "Observaciones para la empresa",
            requerido: true,
            placeholder: "Ej.: adjuntá la constancia de CUIT actualizada y el título autenticado del asesor.",
          },
        ]}
      />
      <DialogoAccion
        accion={resolverTramite}
        tono="danger"
        trigger={
          <Button className="w-full justify-start" variant="outline" size="lg">
            <OctagonX aria-hidden />
            Rechazar
          </Button>
        }
        titulo={`Rechazar ${codigo}`}
        descripcion="El rechazo es definitivo: la empresa deberá iniciar un trámite nuevo."
        confirmar="Rechazar trámite"
        ocultos={{ id, decision: "rechazar" }}
        campos={[{ tipo: "textarea", nombre: "observaciones", etiqueta: "Motivo del rechazo", requerido: true }]}
      />
    </div>
  );
}
