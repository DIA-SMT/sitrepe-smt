"use client";

import { useState } from "react";
import { FileSearch, MessageSquareWarning } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { ConsultaDenuncia } from "./consulta-denuncia";
import { FormularioDenuncia } from "./formulario-denuncia";

/**
 * Formulario de denuncia + consulta de estado. Al crear una denuncia, su código queda precargado en
 * la consulta.
 */
export function PanelDenuncias({ empresas, lateral }: { empresas: string[]; lateral: React.ReactNode }) {
  const [codigoReciente, setCodigoReciente] = useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
      <SectionCard
        title="Hacé tu denuncia"
        description="Los campos con * son obligatorios. Podés hacerla de forma anónima."
        icon={MessageSquareWarning}
        className="lg:self-start"
      >
        <FormularioDenuncia empresas={empresas} alCrear={setCodigoReciente} />
      </SectionCard>

      <div className="flex flex-col gap-6">
        <SectionCard
          id="consulta"
          title="Consultá el estado"
          description="Ingresá el código que recibiste al enviar la denuncia."
          icon={FileSearch}
          className="scroll-mt-28"
        >
          <ConsultaDenuncia key={codigoReciente} codigoInicial={codigoReciente} />
        </SectionCard>
        {lateral}
      </div>
    </div>
  );
}
