"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Award, Check, CheckCheck, Download, LoaderCircle, Search, SearchX, UserRoundX, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { formatFecha, formatFechaHora } from "@/lib/domain/formato";
import { cn } from "@/lib/utils";
import { AccionConfirmada, mostrarResultado } from "../../../configuracion/_compartido/acciones-cliente";
import { marcarAsistencia, marcarTodosPresentes } from "../../actions";

export type FilaInscripto = {
  id: string;
  nombre: string;
  dni: string;
  email: string;
  empresa: string | null;
  empresaId: string | null;
  creado: string;
  asistio: boolean;
  certificado: string | null;
};

type Filtro = "todos" | "presentes" | "ausentes";

export function TablaInscriptos({
  inscriptos,
  capacitacionId,
  titulo,
  puedeEditar,
  permiteAsistencia,
}: {
  inscriptos: FilaInscripto[];
  capacitacionId: string;
  titulo: string;
  puedeEditar: boolean;
  permiteAsistencia: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const presentes = inscriptos.filter((i) => i.asistio).length;
  const ausentes = inscriptos.length - presentes;
  const editable = puedeEditar && permiteAsistencia;

  const visibles = useMemo(() => {
    const t = busqueda
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
    return inscriptos.filter((i) => {
      if (filtro === "presentes" && !i.asistio) return false;
      if (filtro === "ausentes" && i.asistio) return false;
      if (!t) return true;
      return [i.nombre, i.dni, i.email, i.empresa ?? "", i.certificado ?? ""]
        .join(" ")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .includes(t);
    });
  }, [inscriptos, busqueda, filtro]);

  const descargar = () => {
    const celda = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const filas = [
      ["Nombre", "DNI", "Correo electrónico", "Empresa", "Fecha de inscripción", "Asistió", "Certificado"],
      ...inscriptos.map((i) => [
        i.nombre,
        i.dni,
        i.email,
        i.empresa ?? "",
        formatFechaHora(i.creado),
        i.asistio ? "Sí" : "No",
        i.certificado && i.asistio ? i.certificado : "",
      ]),
    ];
    // BOM + punto y coma: Excel en español lo abre con columnas y acentos correctos.
    const csv = `﻿${filas.map((f) => f.map(celda).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscriptos-${titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (inscriptos.length === 0) {
    return (
      <div className="p-5 sm:p-6">
        <EmptyState
          compact
          icon={UsersRound}
          title="Todavía no hay inscriptos"
          description="Las personas se anotan desde la sección Capacitaciones del portal mientras la inscripción esté abierta."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/capacitaciones" target="_blank" rel="noopener">
                Ver la inscripción en el portal
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="search"
            aria-label="Buscar inscriptos"
            placeholder="Buscá por nombre, DNI, correo o empresa"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            leading={<Search aria-hidden />}
            wrapperClassName="sm:w-80"
          />
          <div className="flex gap-1 rounded-xl bg-muted p-1" role="group" aria-label="Filtrar por asistencia">
            {(
              [
                { valor: "todos", etiqueta: "Todos", n: inscriptos.length },
                { valor: "presentes", etiqueta: "Presentes", n: presentes },
                { valor: "ausentes", etiqueta: "Ausentes", n: ausentes },
              ] as const
            ).map((o) => (
              <button
                key={o.valor}
                type="button"
                aria-pressed={filtro === o.valor}
                onClick={() => setFiltro(o.valor)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all",
                  filtro === o.valor
                    ? "bg-card text-azul-700 shadow-[0_1px_3px_rgb(10_26_63/0.14)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.etiqueta}
                <span className="rounded-full bg-background px-1.5 text-[11px] font-semibold nums-tabular">{o.n}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={descargar}>
            <Download aria-hidden />
            Descargar planilla
          </Button>
          {editable && ausentes > 0 ? (
            <AccionConfirmada
              accion={marcarTodosPresentes}
              campos={{ capacitacion: capacitacionId }}
              tono="primary"
              titulo={`¿Marcar presentes a ${ausentes} ${ausentes === 1 ? "persona" : "personas"}?`}
              descripcion="Se registra la asistencia de todos los inscriptos que figuran ausentes y se generan sus códigos de certificado."
              confirmar="Marcar presentes"
              trigger={
                <Button type="button" size="sm" variant="secondary">
                  <CheckCheck aria-hidden />
                  Todos presentes
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="p-5 sm:p-6">
          <EmptyState compact icon={SearchX} title="Nadie coincide con la búsqueda" description="Probá con otro nombre o DNI." />
        </div>
      ) : (
        <>
          {/* Móvil: tarjetas */}
          <ul className="divide-y divide-border md:hidden">
            {visibles.map((i) => (
              <li key={i.id} className="flex items-start gap-3 px-5 py-4">
                <Avatar nombre={i.nombre} size="sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-medium text-foreground">{i.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    DNI {i.dni} · {i.email}
                  </p>
                  {i.empresa ? <p className="truncate text-xs text-muted-foreground">{i.empresa}</p> : null}
                  {i.asistio && i.certificado ? <CodigoCertificado codigo={i.certificado} /> : null}
                </div>
                <ToggleAsistencia
                  inscripcion={i}
                  capacitacionId={capacitacionId}
                  editable={editable}
                  compacto
                />
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <Table framed={false} containerClassName="hidden md:block">
            <THead>
              <TR>
                <TH>Participante</TH>
                <TH>DNI</TH>
                <TH>Empresa</TH>
                <TH>Inscripción</TH>
                <TH>Asistencia</TH>
                <TH>Certificado</TH>
              </TR>
            </THead>
            <TBody>
              {visibles.map((i) => (
                <TR key={i.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar nombre={i.nombre} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium whitespace-nowrap">{i.nombre}</p>
                        <a
                          href={`mailto:${i.email}`}
                          className="text-xs text-muted-foreground underline-offset-2 hover:text-azul-700 hover:underline"
                        >
                          {i.email}
                        </a>
                      </div>
                    </div>
                  </TD>
                  <TD className="nums-tabular whitespace-nowrap text-muted-foreground">{i.dni}</TD>
                  <TD className="max-w-56">
                    {i.empresaId ? (
                      <Link href={`/gestion/empresas/${i.empresaId}`} className="truncate font-medium hover:text-azul-700">
                        {i.empresa}
                      </Link>
                    ) : (
                      <span className="truncate text-muted-foreground">{i.empresa ?? "—"}</span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{formatFecha(i.creado)}</TD>
                  <TD>
                    <ToggleAsistencia
                      inscripcion={i}
                      capacitacionId={capacitacionId}
                      editable={editable}
                    />
                  </TD>
                  <TD>{i.asistio && i.certificado ? <CodigoCertificado codigo={i.certificado} /> : <span className="text-muted-foreground">—</span>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </>
      )}
    </div>
  );
}

function CodigoCertificado({ codigo }: { codigo: string }) {
  return (
    <Badge tone="violeta" size="sm" className="font-mono">
      <Award aria-hidden />
      {codigo}
    </Badge>
  );
}

function ToggleAsistencia({
  inscripcion,
  capacitacionId,
  editable,
  compacto = false,
}: {
  inscripcion: FilaInscripto;
  capacitacionId: string;
  editable: boolean;
  compacto?: boolean;
}) {
  const [asistio, setAsistio] = useOptimistic(inscripcion.asistio);
  const [pendiente, startTransition] = useTransition();

  if (!editable) {
    return asistio ? (
      <Badge tone="verde" dot>
        Presente
      </Badge>
    ) : (
      <Badge tone="neutral" dot>
        Ausente
      </Badge>
    );
  }

  const alternar = () =>
    startTransition(async () => {
      const nuevo = !inscripcion.asistio;
      setAsistio(nuevo);
      const datos = new FormData();
      datos.set("id", inscripcion.id);
      datos.set("capacitacion", capacitacionId);
      datos.set("asistio", nuevo ? "1" : "0");
      mostrarResultado(await marcarAsistencia(datos));
    });

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={pendiente}
      aria-pressed={asistio}
      aria-label={`${asistio ? "Quitar asistencia de" : "Marcar presente a"} ${inscripcion.nombre}`}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 transition-all ring-inset active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70",
        asistio
          ? "bg-emerald-600 text-white ring-emerald-600 hover:bg-emerald-700"
          : "bg-card text-muted-foreground ring-border-strong hover:bg-emerald-50 hover:text-emerald-800 hover:ring-emerald-300",
      )}
    >
      {pendiente ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
      ) : asistio ? (
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      ) : (
        <UserRoundX className="size-3.5" aria-hidden />
      )}
      {compacto ? (asistio ? "Presente" : "Ausente") : asistio ? "Presente" : "Marcar presente"}
    </button>
  );
}
