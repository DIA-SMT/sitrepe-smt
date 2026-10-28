"use client";

import { useState } from "react";
import {
  Bell,
  CircleCheck,
  Download,
  FileDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SubmitButton } from "@/components/shared/submit-button";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SimpleTooltip } from "@/components/ui/tooltip";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast.success("Declaración enviada", { description: "N.º 2026-001284 · Control la revisará en 48 h." })}>
        Éxito
      </Button>
      <Button variant="outline" onClick={() => toast.error("No pudimos registrar el pago", { description: "Revisá el comprobante e intentá de nuevo." })}>
        Error
      </Button>
      <Button variant="outline" onClick={() => toast.warning("El certificado vence en 5 días")}>
        Advertencia
      </Button>
      <Button variant="outline" onClick={() => toast.info("Hay una nueva capacitación disponible")}>
        Info
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.promise(esperar(1600), {
            loading: "Generando certificado con QR…",
            success: "Certificado listo para descargar",
            error: "Error al generar",
          })
        }
      >
        Promesa
      </Button>
    </div>
  );
}

export function FormDemo() {
  const [enviado, setEnviado] = useState<string | null>(null);
  return (
    <form
      action={async (fd) => {
        await esperar(1400);
        setEnviado(String(fd.get("razon") || "Empresa sin nombre"));
        toast.success("Datos guardados", { description: "Los cambios del legajo quedaron registrados." });
      }}
      className="grid gap-5 sm:grid-cols-2"
    >
      <Field htmlFor="razon" label="Razón social" required hint="Tal como figura en ARCA.">
        <Input id="razon" name="razon" placeholder="Ej.: Fumigaciones del Norte S.R.L." defaultValue="Plagas Cero S.A." />
      </Field>
      <Field htmlFor="cuit" label="CUIT" required error="Ingresá un CUIT válido (11 dígitos).">
        <Input id="cuit" name="cuit" inputMode="numeric" defaultValue="30-1234" />
      </Field>
      <Field htmlFor="rubro" label="Tipo de servicio">
        <Select id="rubro" name="rubro" placeholder="Seleccioná una opción">
          <option value="desinsectacion">Desinsectación</option>
          <option value="desratizacion">Desratización</option>
          <option value="desinfeccion">Desinfección</option>
          <option value="tanques">Limpieza de tanques</option>
        </Select>
      </Field>
      <Field htmlFor="buscar" label="Buscar establecimiento" hint="Por nombre, domicilio o N.º de habilitación.">
        <Input id="buscar" name="buscar" type="search" placeholder="Buscá…" leading={<Search aria-hidden />} />
      </Field>
      <Field htmlFor="obs" label="Observaciones" className="sm:col-span-2">
        <Textarea id="obs" name="obs" placeholder="Cargá cualquier dato adicional sobre el servicio…" rows={3} />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <Checkbox name="dj" defaultChecked label="Declaro bajo juramento que los datos son correctos" description="Requerido para enviar la declaración." />
        <Checkbox name="aviso" label="Avisarme por correo cuando se apruebe" />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton pendingText="Guardando…">
          <Send aria-hidden />
          Guardar cambios
        </SubmitButton>
        <Button type="reset" variant="ghost">
          Descartar
        </Button>
        {enviado ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <CircleCheck className="size-4" aria-hidden /> Guardado: {enviado}
          </span>
        ) : null}
      </div>
    </form>
  );
}

export function OverlaysDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button>
            <Plus aria-hidden />
            Nueva declaración
          </Button>
        </DialogTrigger>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Nueva declaración de servicio</DialogTitle>
            <DialogDescription>Cargá los datos básicos. Podrás completar productos y técnicos después.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field htmlFor="d-est" label="Establecimiento" required>
              <Input id="d-est" placeholder="Ej.: Escuela N.º 123" />
            </Field>
            <Field htmlFor="d-fecha" label="Fecha del servicio" required>
              <Input id="d-fecha" type="date" />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button onClick={() => toast.success("Borrador creado")}>Crear borrador</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        trigger={
          <Button variant="danger">
            <Trash2 aria-hidden />
            Anular certificado
          </Button>
        }
        title="¿Anular el certificado N.º 004512?"
        description="El QR dejará de validar y la empresa será notificada. Esta acción queda registrada en la auditoría."
        confirmLabel="Sí, anular"
        onConfirm={async () => {
          await esperar(1200);
          toast.success("Certificado anulado");
        }}
      />

      <ConfirmDialog
        tone="primary"
        trigger={
          <Button variant="secondary">
            <CircleCheck aria-hidden />
            Aprobar con motivo
          </Button>
        }
        title="Aprobar declaración"
        description="Se habilitará el timbrado y la emisión del certificado."
        confirmLabel="Aprobar"
        hiddenFields={{ id: "decl-2026-001284" }}
        action={async (fd) => {
          await esperar(1000);
          toast.success("Declaración aprobada", { description: `ID ${String(fd.get("id"))}` });
        }}
      >
        <Field htmlFor="motivo" label="Comentario para la empresa" hint="Opcional.">
          <Textarea id="motivo" name="motivo" rows={2} placeholder="Escribí un comentario…" />
        </Field>
      </ConfirmDialog>

      <MenuDemo />

      <SimpleTooltip content="Descargar PDF del certificado">
        <Button variant="outline" size="icon" aria-label="Descargar PDF">
          <Download aria-hidden />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content="Mostrar QR de verificación" side="bottom">
        <Button variant="outline" size="icon" aria-label="Mostrar QR">
          <QrCode aria-hidden />
        </Button>
      </SimpleTooltip>
    </div>
  );
}

function MenuDemo() {
  const [vencidos, setVencidos] = useState(true);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <MoreHorizontal aria-hidden />
          Acciones
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Certificado 004512</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => toast("Editando…")}>
          <Pencil aria-hidden />
          Editar
          <DropdownMenuShortcut>E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileDown aria-hidden />
          Descargar PDF
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Printer aria-hidden />
          Imprimir
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={vencidos} onCheckedChange={(v) => setVencidos(v === true)}>
          Incluir vencidos
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger">
          <Trash2 aria-hidden />
          Anular
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TabsDemo() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="tecnicos">Técnicos</TabsTrigger>
          <TabsTrigger value="docs">Documentación</TabsTrigger>
        </TabsList>
        <TabsContent value="datos" className="rounded-xl border border-border bg-subtle p-4 text-sm text-muted-foreground">
          Razón social, CUIT, domicilio legal y habilitación municipal vigente.
        </TabsContent>
        <TabsContent value="tecnicos" className="rounded-xl border border-border bg-subtle p-4 text-sm text-muted-foreground">
          Director técnico responsable y aplicadores registrados.
        </TabsContent>
        <TabsContent value="docs" className="rounded-xl border border-border bg-subtle p-4 text-sm text-muted-foreground">
          Seguro, constancia de inscripción y libro de registro.
        </TabsContent>
      </Tabs>
      <Tabs defaultValue="pendientes">
        <TabsList variant="line">
          <TabsTrigger value="pendientes">
            <Bell aria-hidden />
            Pendientes
          </TabsTrigger>
          <TabsTrigger value="aprobadas">Aprobadas</TabsTrigger>
          <TabsTrigger value="observadas">Observadas</TabsTrigger>
        </TabsList>
        <TabsContent value="pendientes" className="text-sm text-muted-foreground">
          12 declaraciones esperan revisión de Control.
        </TabsContent>
        <TabsContent value="aprobadas" className="text-sm text-muted-foreground">
          184 declaraciones aprobadas este mes.
        </TabsContent>
        <TabsContent value="observadas" className="text-sm text-muted-foreground">
          3 declaraciones con observaciones.
        </TabsContent>
      </Tabs>
    </div>
  );
}
