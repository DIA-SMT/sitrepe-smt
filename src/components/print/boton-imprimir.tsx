"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotonImprimir({ texto = "Imprimir o guardar PDF" }: { texto?: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer aria-hidden /> {texto}
    </Button>
  );
}
