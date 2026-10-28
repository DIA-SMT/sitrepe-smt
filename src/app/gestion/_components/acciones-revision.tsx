"use client";

import { Check, RotateCcw, UserRoundMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revisarDocumento, revisarMemoria, revisarTecnico } from "../empresas/actions";
import { DialogoAccion } from "./dialogo-accion";

type EstadoTecnico = "pendiente" | "aprobado" | "rechazado" | "baja";
type EstadoRevision = "pendiente" | "propuesto" | "aprobado" | "rechazado";

/* --- Asesores técnicos ----------------------------------------------------------- */

export function AccionesTecnico({
  id,
  nombre,
  estado,
  unicoAprobado = false,
}: {
  id: string;
  nombre: string;
  estado: EstadoTecnico;
  /** Es el único asesor aprobado de la empresa (darlo de baja bloquea la firma de certificados). */
  unicoAprobado?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {estado !== "aprobado" ? (
        <DialogoAccion
          accion={revisarTecnico}
          trigger={
            <Button size="sm" variant={estado === "pendiente" ? "primary" : "outline"}>
              {estado === "baja" ? <RotateCcw aria-hidden /> : <Check aria-hidden />}
              {estado === "baja" ? "Reactivar" : "Aprobar"}
            </Button>
          }
          titulo={estado === "baja" ? `Reactivar a ${nombre}` : `Aprobar a ${nombre}`}
          descripcion="Verificá el título terciario o universitario autenticado (Art. 5.º). Una vez aprobado podrá firmar los certificados de la empresa."
          confirmar={estado === "baja" ? "Reactivar asesor" : "Aprobar asesor"}
          ocultos={{ id, decision: "aprobar" }}
          campos={[{ tipo: "textarea", nombre: "motivo", etiqueta: "Observaciones (opcional)", placeholder: "Notas internas de la revisión" }]}
        />
      ) : null}
      {estado === "pendiente" ? (
        <DialogoAccion
          accion={revisarTecnico}
          tono="danger"
          trigger={
            <Button size="sm" variant="outline">
              <X aria-hidden />
              Rechazar
            </Button>
          }
          titulo={`Rechazar a ${nombre}`}
          descripcion="La empresa verá el motivo y podrá proponer otro asesor técnico."
          confirmar="Rechazar"
          ocultos={{ id, decision: "rechazar" }}
          campos={[
            {
              tipo: "textarea",
              nombre: "motivo",
              etiqueta: "Motivo del rechazo",
              requerido: true,
              placeholder: "Ej.: el título presentado no está autenticado.",
            },
          ]}
        />
      ) : null}
      {estado === "aprobado" ? (
        <DialogoAccion
          accion={revisarTecnico}
          tono="danger"
          trigger={
            <Button size="sm" variant="outline">
              <UserRoundMinus aria-hidden />
              Dar de baja
            </Button>
          }
          titulo={`Dar de baja a ${nombre}`}
          descripcion="Desde hoy no podrá firmar certificados de la empresa. La baja queda registrada en el legajo."
          confirmar="Dar de baja"
          ocultos={{ id, decision: "baja" }}
          aviso={
            unicoAprobado
              ? {
                  tono: "warning",
                  titulo: "Es el único asesor técnico aprobado",
                  texto: "La empresa no podrá firmar ni presentar certificados hasta que se apruebe otro asesor.",
                }
              : undefined
          }
          campos={[{ tipo: "textarea", nombre: "motivo", etiqueta: "Motivo (opcional)", placeholder: "Ej.: renuncia presentada el…" }]}
        />
      ) : null}
    </div>
  );
}

/* --- Memoria técnica (productos por empresa) ---------------------------------------- */

export function AccionesMemoria({
  id,
  producto,
  empresa,
  estado,
}: {
  id: string;
  producto: string;
  empresa?: string | null;
  estado: EstadoRevision;
}) {
  const sujeto = empresa ? `${producto} para ${empresa}` : producto;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {estado !== "aprobado" ? (
        <DialogoAccion
          accion={revisarMemoria}
          trigger={
            <Button size="sm" variant={estado === "rechazado" ? "outline" : "primary"}>
              <Check aria-hidden />
              Aprobar
            </Button>
          }
          titulo="Aprobar producto"
          descripcion={`Se autoriza ${sujeto}: la empresa podrá declararlo en sus certificados.`}
          confirmar="Aprobar producto"
          ocultos={{ id, decision: "aprobar" }}
          campos={[{ tipo: "textarea", nombre: "observaciones", etiqueta: "Observaciones (opcional)" }]}
        />
      ) : null}
      {estado !== "rechazado" ? (
        <DialogoAccion
          accion={revisarMemoria}
          tono="danger"
          trigger={
            <Button size="sm" variant="outline">
              <X aria-hidden />
              {estado === "aprobado" ? "Revocar" : "Rechazar"}
            </Button>
          }
          titulo={estado === "aprobado" ? "Revocar producto aprobado" : "Rechazar producto"}
          descripcion={
            estado === "aprobado"
              ? `La empresa dejará de poder declarar ${producto} en nuevos certificados.`
              : `Se rechaza ${sujeto} de la memoria técnica.`
          }
          confirmar={estado === "aprobado" ? "Revocar" : "Rechazar"}
          ocultos={{ id, decision: "rechazar" }}
          campos={[
            {
              tipo: "textarea",
              nombre: "observaciones",
              etiqueta: "Motivo",
              requerido: true,
              placeholder: "Ej.: dosis indicada fuera del rango del marbete.",
            },
          ]}
        />
      ) : null}
    </div>
  );
}

/* --- Documentos del legajo ------------------------------------------------------------- */

export function AccionesDocumento({
  id,
  tipo,
  estado,
  vence,
}: {
  id: string;
  tipo: string;
  estado: EstadoRevision;
  vence: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {estado !== "aprobado" ? (
        <DialogoAccion
          accion={revisarDocumento}
          trigger={
            <Button size="sm" variant={estado === "rechazado" ? "outline" : "primary"}>
              <Check aria-hidden />
              Aprobar
            </Button>
          }
          titulo={`Aprobar: ${tipo}`}
          descripcion="Confirmá que el documento es legible, vigente y corresponde a la empresa."
          confirmar="Aprobar documento"
          ocultos={{ id, decision: "aprobar" }}
          campos={[
            {
              tipo: "fecha",
              nombre: "vence",
              etiqueta: "Vence el",
              ayuda: "Dejalo vacío si el documento no vence. Se avisará 30 días antes.",
              valorInicial: vence ?? "",
            },
            { tipo: "textarea", nombre: "observaciones", etiqueta: "Observaciones (opcional)" },
          ]}
        />
      ) : null}
      {estado !== "rechazado" ? (
        <DialogoAccion
          accion={revisarDocumento}
          tono="danger"
          trigger={
            <Button size="sm" variant="outline">
              <X aria-hidden />
              Rechazar
            </Button>
          }
          titulo={`Rechazar: ${tipo}`}
          descripcion="La empresa verá el motivo y deberá cargar el documento nuevamente."
          confirmar="Rechazar documento"
          ocultos={{ id, decision: "rechazar" }}
          campos={[
            {
              tipo: "textarea",
              nombre: "observaciones",
              etiqueta: "Motivo del rechazo",
              requerido: true,
              placeholder: "Ej.: la copia es ilegible / el documento está vencido.",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
