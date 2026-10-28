"use client";

import { useId, useRef, useState } from "react";
import { CheckCircle2, FileUp, LoaderCircle, Paperclip, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Bucket = "documentos" | "comprobantes" | "envases" | "publico";

type SubirArchivoProps = {
  /** Nombre del input oculto que recibirá la ruta en Storage (se envía con el formulario). */
  name: string;
  bucket: Bucket;
  /** Carpetas de la ruta. La primera debe ser el id de la empresa (ver lib/storage.ts). */
  carpeta: string[];
  label?: string;
  hint?: string;
  required?: boolean;
  accept?: string;
  /** Ruta ya cargada (edición). */
  valorInicial?: string | null;
  onSubido?: (path: string, archivo: File) => void;
  className?: string;
};

const TIPOS = "application/pdf,image/jpeg,image/png,image/webp";
const MAX = 10 * 1024 * 1024;

/**
 * Sube un archivo directamente a Supabase Storage desde el navegador (la política
 * de Storage valida que la carpeta sea la de la empresa) y deja la ruta en un input
 * oculto para que la Server Action la guarde.
 */
export function SubirArchivo({
  name,
  bucket,
  carpeta,
  label = "Archivo",
  hint = "PDF, JPG o PNG de hasta 10 MB.",
  required,
  accept = TIPOS,
  valorInicial,
  onSubido,
  className,
}: SubirArchivoProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string>(valorInicial ?? "");
  const [nombre, setNombre] = useState<string>(valorInicial ? (valorInicial.split("/").pop() ?? "") : "");
  const [estado, setEstado] = useState<"inicial" | "subiendo" | "ok" | "error">(valorInicial ? "ok" : "inicial");
  const [error, setError] = useState<string>("");

  const subir = async (archivo: File) => {
    setError("");
    if (archivo.size > MAX) {
      setEstado("error");
      setError("El archivo supera los 10 MB.");
      return;
    }
    if (!accept.split(",").includes(archivo.type)) {
      setEstado("error");
      setError("Formato no admitido.");
      return;
    }
    setEstado("subiendo");
    const limpio = archivo.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .slice(-80);
    const ruta = [...carpeta, `${crypto.randomUUID()}-${limpio}`].join("/");
    const supabase = createClient();
    const { error: errorSubida } = await supabase.storage.from(bucket).upload(ruta, archivo, {
      contentType: archivo.type,
      upsert: false,
    });
    if (errorSubida) {
      setEstado("error");
      setError("No se pudo subir el archivo. Intentá nuevamente.");
      return;
    }
    setPath(ruta);
    setNombre(archivo.name);
    setEstado("ok");
    onSubido?.(ruta, archivo);
  };

  const quitar = () => {
    setPath("");
    setNombre("");
    setEstado("inicial");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("grid gap-1.5", className)}>
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      <input type="hidden" name={name} value={path} required={required} />
      {estado === "ok" ? (
        <div className="flex items-center gap-3 rounded-control border border-success/30 bg-success-soft px-3 py-2.5 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-foreground" title={nombre}>
            <Paperclip className="mr-1 inline size-3.5 text-muted-foreground" aria-hidden />
            {nombre}
          </span>
          <button
            type="button"
            onClick={quitar}
            className="rounded-md p-1 text-muted-foreground hover:bg-white hover:text-foreground"
            aria-label="Quitar archivo"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-control border border-dashed border-border-strong bg-subtle px-3 py-3 text-sm",
            "transition-colors hover:border-azul-400 hover:bg-azul-50/60",
            estado === "error" && "border-danger/60 bg-danger-soft",
          )}
        >
          {estado === "subiendo" ? (
            <LoaderCircle className="size-5 animate-spin text-azul-600" aria-hidden />
          ) : (
            <FileUp className="size-5 text-azul-600" aria-hidden />
          )}
          <span className="flex-1">
            <span className="font-medium text-foreground">{estado === "subiendo" ? "Subiendo…" : "Elegí un archivo"}</span>
            <span className="block text-xs text-muted-foreground">{error || hint}</span>
          </span>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            className="sr-only"
            disabled={estado === "subiendo"}
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) void subir(archivo);
            }}
          />
        </label>
      )}
    </div>
  );
}
