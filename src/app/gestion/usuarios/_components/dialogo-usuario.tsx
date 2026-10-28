"use client";

import { useId, useMemo, useState } from "react";
import { Mail, Pencil, Search, UserPlus, UserRoundCog } from "lucide-react";
import { useAccion } from "@/components/shared/use-accion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { OpcionEmpresa, OpcionTecnico } from "@/lib/data/admin";
import { cn } from "@/lib/utils";
import { useEnvio } from "../../configuracion/_compartido/use-envio";
import { actualizarUsuario, invitarUsuario } from "../actions";
import { ESTILO_ROL, ORDEN_ROLES, type Rol } from "./roles";

export type UsuarioEditable = {
  id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  rol: Rol;
  empresa_id: string | null;
  tecnico_id: string | null;
  activo: boolean;
};

type Comun = {
  empresas: OpcionEmpresa[];
  tecnicos: OpcionTecnico[];
  /** Etiquetas de los roles (ETIQUETA_ROL). */
  etiquetas: Record<Rol, string>;
};

type Props = Comun &
  (
    | { modo: "invitar"; usuario?: undefined; esUnoMismo?: undefined }
    | { modo: "editar"; usuario: UsuarioEditable; esUnoMismo: boolean }
  );

/** Invitación de un usuario nuevo o edición de rol, vínculo y estado. */
export function DialogoUsuario(props: Props) {
  const [abierto, setAbierto] = useState(false);
  const nombre = props.usuario ? `${props.usuario.nombre} ${props.usuario.apellido}`.trim() || props.usuario.email : "";
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {props.modo === "invitar" ? (
          <Button>
            <UserPlus aria-hidden />
            Invitar usuario
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label={`Editar a ${nombre}`}>
            <Pencil aria-hidden />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="lg">
        {props.modo === "invitar" ? (
          <FormularioInvitar {...props} onCerrar={() => setAbierto(false)} />
        ) : (
          <FormularioEditar {...props} onCerrar={() => setAbierto(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Encabezado({ invitar, descripcion }: { invitar: boolean; descripcion: React.ReactNode }) {
  return (
    <DialogHeader className="flex-row items-start gap-4">
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
      >
        {invitar ? <UserPlus className="size-5" /> : <UserRoundCog className="size-5" />}
      </span>
      <div className="flex flex-col gap-1">
        <DialogTitle>{invitar ? "Invitar usuario" : "Editar usuario"}</DialogTitle>
        <DialogDescription>{descripcion}</DialogDescription>
      </div>
    </DialogHeader>
  );
}

function FormularioInvitar({ empresas, tecnicos, etiquetas, onCerrar }: Comun & { onCerrar: () => void }) {
  const id = useId();
  const f = (campo: string) => `${id}-${campo}`;
  const [estado, despachar, pendiente] = useAccion(invitarUsuario, {
    alExito: onCerrar,
  });
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <Encabezado
        invitar
        descripcion="Le llega un correo con un enlace para elegir su contraseña. El rol y el vínculo se pueden cambiar después."
      />
      <DialogBody className="flex flex-col gap-5">
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No se pudo enviar la invitación">
            {estado.mensaje}
          </Alert>
        ) : null}
        <Field htmlFor={f("email")} label="Correo electrónico" required error={error("email")}>
          <Input
            id={f("email")}
            name="email"
            type="email"
            autoComplete="off"
            leading={<Mail aria-hidden />}
            placeholder="nombre@smt.gob.ar"
            required
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor={f("nombre")} label="Nombre" required error={error("nombre")}>
            <Input id={f("nombre")} name="nombre" maxLength={80} autoComplete="off" required />
          </Field>
          <Field htmlFor={f("apellido")} label="Apellido" required error={error("apellido")}>
            <Input id={f("apellido")} name="apellido" maxLength={80} autoComplete="off" required />
          </Field>
        </div>
        <CamposVinculo
          empresas={empresas}
          tecnicos={tecnicos}
          etiquetas={etiquetas}
          rolInicial="control"
          empresaInicial={null}
          tecnicoInicial={null}
          error={error}
        />
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pendiente}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pendiente}>
          {pendiente ? null : <Mail aria-hidden />}
          Enviar invitación
        </Button>
      </DialogFooter>
    </form>
  );
}

function FormularioEditar({
  usuario,
  esUnoMismo,
  empresas,
  tecnicos,
  etiquetas,
  onCerrar,
}: Comun & {
  usuario: UsuarioEditable;
  esUnoMismo: boolean;
  onCerrar: () => void;
}) {
  const [estado, despachar, pendiente] = useAccion(actualizarUsuario, {
    alExito: onCerrar,
  });
  const enviar = useEnvio(despachar);
  const error = (campo: string) => estado.errores?.[campo]?.[0];
  const nombre = `${usuario.nombre} ${usuario.apellido}`.trim() || "Usuario sin nombre";

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <input type="hidden" name="perfil" value={usuario.id} />
      <Encabezado
        invitar={false}
        descripcion={
          <>
            <span className="font-medium text-foreground">{nombre}</span>
            {usuario.email ? ` · ${usuario.email}` : ""}. Los datos personales los edita cada persona desde su perfil.
          </>
        }
      />
      <DialogBody className="flex flex-col gap-5">
        {estado.mensaje && !estado.ok && !estado.errores ? (
          <Alert tone="danger" title="No se pudo guardar">
            {estado.mensaje}
          </Alert>
        ) : null}
        {esUnoMismo ? (
          <Alert tone="info" title="Es tu propia cuenta">
            No podés quitarte el rol de Administración ni desactivarte: pedíselo a otra persona con ese rol.
          </Alert>
        ) : null}
        <CamposVinculo
          empresas={empresas}
          tecnicos={tecnicos}
          etiquetas={etiquetas}
          rolInicial={usuario.rol}
          empresaInicial={usuario.empresa_id}
          tecnicoInicial={usuario.tecnico_id}
          bloquearRol={esUnoMismo}
          error={error}
        />
        <div className="rounded-xl border border-border bg-subtle p-4">
          {esUnoMismo ? <input type="hidden" name="activo" value="on" /> : null}
          <Checkbox
            name={esUnoMismo ? undefined : "activo"}
            defaultChecked={usuario.activo}
            disabled={esUnoMismo}
            label="Cuenta activa"
            description="Una cuenta inactiva no puede ingresar. Su historial y sus firmas se conservan."
          />
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pendiente}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pendiente}>
          Guardar cambios
        </Button>
      </DialogFooter>
    </form>
  );
}

/* =============================================================================
 * Rol + empresa + técnico
 * ========================================================================== */

function CamposVinculo({
  empresas,
  tecnicos,
  etiquetas,
  rolInicial,
  empresaInicial,
  tecnicoInicial,
  bloquearRol = false,
  error,
}: Comun & {
  rolInicial: Rol;
  empresaInicial: string | null;
  tecnicoInicial: string | null;
  bloquearRol?: boolean;
  error: (campo: string) => string | undefined;
}) {
  const id = useId();
  const [rol, setRol] = useState<Rol>(rolInicial);
  const [empresaId, setEmpresaId] = useState(empresaInicial ?? "");
  const [tecnicoId, setTecnicoId] = useState(tecnicoInicial ?? "");
  const [filtro, setFiltro] = useState("");

  const deEmpresa = rol === "empresa" || rol === "tecnico";
  const opcionesEmpresa = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    if (!t) return empresas;
    return empresas.filter(
      (e) =>
        e.id === empresaId ||
        e.nombre_comercial.toLowerCase().includes(t) ||
        e.cuit.includes(t) ||
        String(e.numero_registro ?? "").includes(t),
    );
  }, [empresas, filtro, empresaId]);
  // Los técnicos rechazados o dados de baja no se pueden vincular (la acción lo rechaza),
  // salvo que ya sean el vínculo actual de la cuenta.
  const tecnicosEmpresa = tecnicos.filter(
    (t) => t.empresa_id === empresaId && ((t.estado !== "rechazado" && t.estado !== "baja") || t.id === tecnicoInicial),
  );

  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">
          Rol <span className="text-danger">*</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ORDEN_ROLES.map((r) => {
            const estilo = ESTILO_ROL[r];
            const Icono = estilo.icono;
            const deshabilitado = bloquearRol && r !== "admin";
            return (
              <label
                key={r}
                className={cn(
                  "group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  rol === r
                    ? "border-azul-300 bg-azul-50/70 ring-1 ring-azul-300 ring-inset"
                    : "border-border bg-card hover:border-border-strong",
                  deshabilitado && "cursor-not-allowed opacity-50",
                  r === "tecnico" && "sm:col-span-2",
                )}
              >
                <input
                  type="radio"
                  name="rol"
                  value={r}
                  checked={rol === r}
                  disabled={deshabilitado}
                  onChange={() => setRol(r)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    rol === r ? "bg-gradient-brand text-white shadow-brand" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icono className="size-[18px]" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {etiquetas[r]}
                    {estilo.staff ? (
                      <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">· Municipio</span>
                    ) : null}
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">{estilo.descripcion}</span>
                </span>
              </label>
            );
          })}
        </div>
        {error("rol") ? (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {error("rol")}
          </p>
        ) : null}
      </fieldset>

      {deEmpresa ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-subtle p-4 animate-fade-in">
          <Input
            type="search"
            aria-label="Filtrar empresas"
            placeholder="Filtrá por nombre, CUIT o N.º de registro"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            leading={<Search aria-hidden />}
          />
          <Field htmlFor={`${id}-empresa`} label="Empresa" required error={error("empresa_id")}>
            <Select
              id={`${id}-empresa`}
              name="empresa_id"
              value={empresaId}
              onChange={(e) => {
                setEmpresaId(e.target.value);
                setTecnicoId("");
              }}
              placeholder={opcionesEmpresa.length ? "Seleccioná una empresa" : "Ninguna empresa coincide"}
            >
              {opcionesEmpresa.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.numero_registro ? `N.º ${e.numero_registro} · ` : ""}
                  {e.nombre_comercial}
                </option>
              ))}
            </Select>
          </Field>
          {rol === "tecnico" ? (
            <Field
              htmlFor={`${id}-tecnico`}
              label="Asesor técnico"
              required
              error={error("tecnico_id")}
              hint={
                empresaId && tecnicosEmpresa.length === 0
                  ? "La empresa no tiene asesores técnicos cargados: se registran desde su legajo."
                  : "La cuenta firma certificados en nombre de este asesor."
              }
            >
              <Select
                id={`${id}-tecnico`}
                name="tecnico_id"
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                disabled={!empresaId || tecnicosEmpresa.length === 0}
                placeholder={empresaId ? "Seleccioná el asesor" : "Elegí primero la empresa"}
              >
                {tecnicosEmpresa.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.apellido}, {t.nombre} · {t.titulo}
                    {t.estado === "pendiente"
                      ? " (pendiente de aprobación)"
                      : t.estado === "rechazado"
                        ? " (rechazado)"
                        : t.estado === "baja"
                          ? " (dado de baja)"
                          : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
