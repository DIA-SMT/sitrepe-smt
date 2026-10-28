import Form from "next/form";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Rango de meses a medida (`?desde=YYYY-MM&hasta=YYYY-MM`). Formulario GET con
 * navegación del lado del cliente (next/form); funciona también sin JavaScript.
 */
export function RangoPersonalizado({
  accion,
  desde,
  hasta,
  minimo,
  maximo,
}: {
  accion: string;
  desde: string;
  hasta: string;
  minimo: string;
  maximo: string;
}) {
  return (
    <Form action={accion} className="flex flex-wrap items-end gap-2" aria-label="Rango de meses personalizado">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Desde
        <Input
          type="month"
          name="desde"
          defaultValue={desde}
          min={minimo}
          max={maximo}
          required
          pattern="\d{4}-\d{2}"
          placeholder="AAAA-MM"
          className="h-8 w-40 text-[13px]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Hasta
        <Input
          type="month"
          name="hasta"
          defaultValue={hasta}
          min={minimo}
          max={maximo}
          required
          pattern="\d{4}-\d{2}"
          placeholder="AAAA-MM"
          className="h-8 w-40 text-[13px]"
        />
      </label>
      <Button type="submit" variant="secondary" size="sm">
        <CalendarRange aria-hidden /> Aplicar
      </Button>
    </Form>
  );
}
