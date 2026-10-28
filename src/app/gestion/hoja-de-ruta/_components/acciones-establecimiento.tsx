"use client";

import Link from "next/link";
import { BellRing, CalendarPlus, FilePenLine, MoreHorizontal, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AccionesEstablecimientoProps = {
  establecimientoId: string;
  nombre: string;
  /** Oculta "Programar inspección" (p. ej. si ya hay una programada). */
  sinProgramar?: boolean;
  /** Tipo con el que se programa la inspección. */
  tipoInspeccion?: string;
};

/** Acciones de fiscalización sobre un establecimiento: inspeccionar, notificar, labrar acta. */
export function AccionesEstablecimiento({
  establecimientoId,
  nombre,
  sinProgramar = false,
  tipoInspeccion = "control_vencimiento",
}: AccionesEstablecimientoProps) {
  const id = encodeURIComponent(establecimientoId);
  return (
    <div className="flex items-center gap-2">
      {sinProgramar ? null : (
        <Button asChild size="sm" variant="secondary" className="flex-1 sm:flex-none">
          <Link href={`/gestion/inspecciones/nueva?establecimiento=${id}&tipo=${tipoInspeccion}`}>
            <CalendarPlus aria-hidden />
            Programar inspección
          </Link>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label={`Más acciones para ${nombre}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="max-w-64 truncate">{nombre}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sinProgramar ? (
            <DropdownMenuItem asChild>
              <Link href={`/gestion/inspecciones/nueva?establecimiento=${id}&tipo=${tipoInspeccion}`}>
                <CalendarPlus aria-hidden /> Programar otra inspección
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={`/gestion/notificaciones/nueva?establecimiento=${id}`}>
              <BellRing aria-hidden /> Notificar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/gestion/actas/nueva?establecimiento=${id}`}>
              <FilePenLine aria-hidden /> Labrar acta
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/gestion/establecimientos/${id}`}>
              <Store aria-hidden /> Ver ficha del establecimiento
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
