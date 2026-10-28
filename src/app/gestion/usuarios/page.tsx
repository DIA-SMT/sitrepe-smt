import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  FlaskConical,
  KeyRound,
  Landmark,
  MailQuestion,
  Power,
  PowerOff,
  SearchX,
  Unlink,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltrosUrl } from "@/components/shared/filtros-url";
import { PageHeader } from "@/components/shared/page-header";
import { Paginacion, rangoPagina } from "@/components/shared/paginacion";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ETIQUETA_ROL, requerirStaff } from "@/lib/auth";
import {
  estadoCuentasAuth,
  listarUsuarios,
  opcionesEmpresas,
  opcionesTecnicos,
  resumenUsuarios,
  type EstadoCuenta,
  type UsuarioListado,
} from "@/lib/data/admin";
import { formatFechaHora, formatRelativo } from "@/lib/domain/formato";
import { Constants } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { AccionConfirmada } from "../configuracion/_compartido/acciones-cliente";
import { cambiarActivoUsuario } from "./actions";
import { DialogoUsuario } from "./_components/dialogo-usuario";
import { ESTILO_ROL, ORDEN_ROLES, type Rol } from "./_components/roles";

export const metadata: Metadata = {
  title: "Usuarios",
  description: "Cuentas de la plataforma: roles, vínculos con empresas y estado.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const TAMANIO = 20;

function esRol(valor: string | undefined): valor is Rol {
  return (Constants.public.Enums.rol_usuario as readonly string[]).includes(valor ?? "");
}

export default async function UsuariosPage({ searchParams }: Props) {
  const sesion = await requerirStaff(["admin"]);
  const sp = await searchParams;

  const q = primero(sp.q)?.trim() || undefined;
  const rolParam = primero(sp.rol);
  const rol = esRol(rolParam) ? rolParam : undefined;
  const estadoParam = primero(sp.estado);
  const activo = estadoParam === "activos" ? true : estadoParam === "inactivos" ? false : undefined;
  const sinEmpresa = primero(sp.vinculo) === "sin_empresa";
  const { pagina, desde, hasta } = rangoPagina(sp.pagina, TAMANIO);

  const [{ filas, total }, resumen, empresas, tecnicos, cuentas] = await Promise.all([
    listarUsuarios({ q, rol, activo, sinEmpresa, desde, hasta }),
    resumenUsuarios(),
    opcionesEmpresas(),
    opcionesTecnicos(),
    estadoCuentasAuth(),
  ]);
  const hayFiltros = Boolean(q || rol || activo !== undefined || sinEmpresa);
  const staff = resumen.porRol.admin + resumen.porRol.control + resumen.porRol.inspector;
  const deEmpresas = resumen.porRol.empresa + resumen.porRol.tecnico;
  const pendientes = cuentas ? [...cuentas.values()].filter((c) => c.invitadoAt && !c.confirmadoAt).length : null;
  const etiquetas = ETIQUETA_ROL;

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Cuentas del personal municipal y de las empresas prestadoras. Invitá al personal, asigná roles y vinculá cada cuenta de empresa con su legajo."
        icon={UsersRound}
        breadcrumb={[{ label: "Gestión", href: "/gestion" }, { label: "Administración" }, { label: "Usuarios" }]}
        actions={<DialogoUsuario modo="invitar" empresas={empresas} tecnicos={tecnicos} etiquetas={etiquetas} />}
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Cuentas activas"
            value={resumen.activos}
            icon={UserCheck}
            tone="azul"
            hint={[
              `${resumen.inactivos} ${resumen.inactivos === 1 ? "desactivada" : "desactivadas"}`,
              pendientes
                ? `${pendientes} ${pendientes === 1 ? "invitación sin aceptar" : "invitaciones sin aceptar"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            href="/gestion/usuarios?estado=activos"
          />
          <StatCard
            label="Personal municipal"
            value={staff}
            icon={Landmark}
            tone="celeste"
            hint="Administración, control e inspección"
          />
          <StatCard
            label="Empresas y técnicos"
            value={deEmpresas}
            icon={Building2}
            tone="verde"
            hint="Cuentas de prestadores activas"
          />
          <StatCard
            label="Sin empresa vinculada"
            value={resumen.sinEmpresa}
            icon={Unlink}
            tone={resumen.sinEmpresa > 0 ? "ambar" : "neutral"}
            hint="Registradas sin inscripción aprobada"
            href="/gestion/usuarios?vinculo=sin_empresa"
          />
        </div>

        <DistribucionRoles porRol={resumen.porRol} total={resumen.activos} etiquetas={etiquetas} />

        <SectionCard
          title="Cuentas"
          description={`${total.toLocaleString("es-AR")} ${total === 1 ? "usuario" : "usuarios"}${hayFiltros ? " (filtrado)" : ""}`}
          icon={UsersRound}
          flush
          footer={
            total > 0 ? (
              <Paginacion
                pagina={pagina}
                total={total}
                tamanio={TAMANIO}
                params={sp}
                ruta="/gestion/usuarios"
                className="w-full"
              />
            ) : undefined
          }
        >
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:px-6">
            <FiltrosUrl
              campos={[
                {
                  tipo: "busqueda",
                  nombre: "q",
                  placeholder: "Buscá por nombre, correo o DNI",
                  className: "sm:w-72",
                },
                {
                  tipo: "select",
                  nombre: "rol",
                  etiqueta: "Rol",
                  opciones: ORDEN_ROLES.map((r) => ({
                    valor: r,
                    label: etiquetas[r],
                  })),
                  className: "sm:w-52",
                },
                {
                  tipo: "select",
                  nombre: "estado",
                  etiqueta: "Estado",
                  opciones: [
                    { valor: "activos", label: "Activos" },
                    { valor: "inactivos", label: "Desactivados" },
                  ],
                  className: "sm:w-44",
                },
                {
                  tipo: "select",
                  nombre: "vinculo",
                  etiqueta: "Vínculo",
                  opciones: [{ valor: "sin_empresa", label: "Sin empresa vinculada" }],
                  className: "sm:w-56",
                },
              ]}
            />
            {cuentas === null ? (
              <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <KeyRound className="size-3.5" aria-hidden />
                No se pudo consultar el estado de las cuentas de acceso (clave de servicio no configurada): no se
                muestran invitaciones pendientes ni último ingreso.
              </p>
            ) : null}
          </div>

          {filas.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={SearchX}
                title={hayFiltros ? "No hay usuarios con esos filtros" : "Todavía no hay usuarios"}
                description={
                  hayFiltros
                    ? "Probá con otras palabras o limpiá los filtros."
                    : "Invitá al personal de la Dirección para empezar."
                }
                action={
                  hayFiltros ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/gestion/usuarios">Limpiar filtros</Link>
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <Table framed={false}>
              <THead>
                <TR>
                  <TH>Usuario</TH>
                  <TH>Rol</TH>
                  <TH className="hidden lg:table-cell">Vínculo</TH>
                  <TH className="hidden md:table-cell">Acceso</TH>
                  <TH className="text-right">
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {filas.map((u) => (
                  <FilaUsuario
                    key={u.id}
                    usuario={u}
                    cuenta={cuentas?.get(u.id) ?? null}
                    esUnoMismo={u.id === sesion.userId}
                    empresas={empresas}
                    tecnicos={tecnicos}
                    etiquetas={etiquetas}
                  />
                ))}
              </TBody>
            </Table>
          )}
        </SectionCard>
      </div>
    </>
  );
}

function DistribucionRoles({
  porRol,
  total,
  etiquetas,
}: {
  porRol: Record<Rol, number>;
  total: number;
  etiquetas: Record<Rol, string>;
}) {
  if (total === 0) return null;
  const colores: Record<Rol, string> = {
    admin: "bg-azul-600",
    control: "bg-celeste-500",
    inspector: "bg-violet-500",
    empresa: "bg-emerald-500",
    tecnico: "bg-sol-400",
  };
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-card sm:px-6">
      <p className="text-sm font-medium text-muted-foreground">Cuentas activas por rol</p>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
        {ORDEN_ROLES.filter((r) => porRol[r] > 0).map((r) => (
          <span
            key={r}
            className={cn("h-full transition-all first:rounded-l-full last:rounded-r-full", colores[r])}
            style={{ width: `${(porRol[r] / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
        {ORDEN_ROLES.map((r) => (
          <li key={r}>
            <Link
              href={`/gestion/usuarios?rol=${r}`}
              className="inline-flex items-center gap-2 rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              <span aria-hidden className={cn("size-2.5 rounded-full", colores[r])} />
              {etiquetas[r]}
              <span className="font-semibold nums-tabular text-foreground">{porRol[r]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilaUsuario({
  usuario: u,
  cuenta,
  esUnoMismo,
  empresas,
  tecnicos,
  etiquetas,
}: {
  usuario: UsuarioListado;
  cuenta: EstadoCuenta | null;
  esUnoMismo: boolean;
  empresas: Awaited<ReturnType<typeof opcionesEmpresas>>;
  tecnicos: Awaited<ReturnType<typeof opcionesTecnicos>>;
  etiquetas: Record<Rol, string>;
}) {
  const nombre = `${u.nombre} ${u.apellido}`.trim() || "Sin nombre";
  const estilo = ESTILO_ROL[u.rol];
  const Icono = estilo.icono;
  const invitacionPendiente = Boolean(cuenta?.invitadoAt && !cuenta.confirmadoAt);
  const sinVinculo = (u.rol === "empresa" || u.rol === "tecnico") && !u.empresa_id;

  return (
    <TR className={cn(!u.activo && "bg-subtle/60")}>
      <TD>
        <div className="flex items-center gap-3">
          <Avatar nombre={nombre} size="sm" className={cn(!u.activo && "grayscale")} />
          <div className="flex min-w-0 flex-col">
            <span
              className={cn(
                "flex flex-wrap items-center gap-1.5 font-medium text-foreground",
                !u.activo && "text-muted-foreground",
              )}
            >
              {nombre}
              {esUnoMismo ? (
                <Badge tone="azul" size="sm">
                  Vos
                </Badge>
              ) : null}
              {!u.activo ? (
                <Badge tone="neutral" size="sm">
                  Desactivada
                </Badge>
              ) : null}
            </span>
            <span className="truncate text-[13px] text-muted-foreground">{u.email ?? "Sin correo"}</span>
            {/* En pantallas chicas, el vínculo va debajo del nombre. */}
            <span className="mt-0.5 text-xs text-muted-foreground lg:hidden">
              {u.empresa ? u.empresa.nombre_comercial : sinVinculo ? "Sin empresa vinculada" : null}
            </span>
          </div>
        </div>
      </TD>
      <TD>
        <Badge tone={estilo.tono}>
          <Icono aria-hidden />
          {etiquetas[u.rol]}
        </Badge>
      </TD>
      <TD className="hidden lg:table-cell">
        {u.empresa ? (
          <div className="flex flex-col gap-0.5">
            <Link
              href={`/gestion/empresas/${u.empresa.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-azul-700 underline-offset-2 hover:underline"
            >
              <Building2 className="size-3.5" aria-hidden />
              {u.empresa.numero_registro ? `N.º ${u.empresa.numero_registro} · ` : ""}
              {u.empresa.nombre_comercial}
            </Link>
            {u.tecnico ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <FlaskConical className="size-3" aria-hidden />
                {u.tecnico.titulo} {u.tecnico.nombre} {u.tecnico.apellido}
              </span>
            ) : null}
          </div>
        ) : sinVinculo ? (
          <Badge tone="ambar" size="sm" dot>
            Sin empresa vinculada
          </Badge>
        ) : (
          <span className="text-[13px] text-muted-foreground">Dirección de Salud Ambiental</span>
        )}
      </TD>
      <TD className="hidden md:table-cell">
        {invitacionPendiente ? (
          <Badge
            tone="celeste"
            size="sm"
            title={cuenta?.invitadoAt ? `Invitada el ${formatFechaHora(cuenta.invitadoAt)}` : undefined}
          >
            <MailQuestion aria-hidden />
            Invitación pendiente
          </Badge>
        ) : cuenta?.ultimoAcceso ? (
          <span className="text-[13px] text-muted-foreground" title={formatFechaHora(cuenta.ultimoAcceso)}>
            Último ingreso {formatRelativo(cuenta.ultimoAcceso)}
          </span>
        ) : cuenta ? (
          <span className="text-[13px] text-muted-foreground">Nunca ingresó</span>
        ) : (
          <span className="text-[13px] text-muted-foreground">Alta {formatRelativo(u.created_at)}</span>
        )}
      </TD>
      <TD className="text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Las cuentas de empresa sin vínculo no pueden cambiar de estado (la RPC exige la empresa). */}
          {esUnoMismo || sinVinculo ? null : (
            <AccionConfirmada
              accion={cambiarActivoUsuario}
              campos={{ perfil: u.id, activo: u.activo ? "false" : "true" }}
              titulo={u.activo ? `¿Desactivar a ${nombre}?` : `¿Reactivar a ${nombre}?`}
              descripcion={
                u.activo
                  ? "No va a poder ingresar a la plataforma. Su historial, firmas y actuaciones se conservan."
                  : "Vuelve a poder ingresar con el rol que tenía."
              }
              confirmar={u.activo ? "Desactivar" : "Reactivar"}
              tono={u.activo ? "danger" : "primary"}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={u.activo ? `Desactivar a ${nombre}` : `Reactivar a ${nombre}`}
                  className={
                    u.activo ? "text-muted-foreground hover:bg-danger-soft hover:text-danger" : "text-emerald-700"
                  }
                >
                  {u.activo ? <PowerOff aria-hidden /> : <Power aria-hidden />}
                </Button>
              }
            />
          )}
          <DialogoUsuario
            modo="editar"
            usuario={{
              id: u.id,
              nombre: u.nombre,
              apellido: u.apellido,
              email: u.email,
              rol: u.rol,
              empresa_id: u.empresa_id,
              tecnico_id: u.tecnico_id,
              activo: u.activo,
            }}
            esUnoMismo={esUnoMismo}
            empresas={empresas}
            tecnicos={tecnicos}
            etiquetas={etiquetas}
          />
        </div>
      </TD>
    </TR>
  );
}
