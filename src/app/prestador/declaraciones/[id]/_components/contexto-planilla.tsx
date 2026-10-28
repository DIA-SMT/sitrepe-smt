"use client";

import { createContext, useContext } from "react";
import type { Antelacion, TipoServicio } from "../../_lib/reglas";
import type { ProductoOpcion, RubroOpcion, TecnicoOpcion } from "../../_lib/tipos";

export type DatosPlanilla = {
  declaracionId: string;
  empresaId: string;
  tipo: TipoServicio;
  rubros: RubroOpcion[];
  tecnicos: TecnicoOpcion[];
  productos: ProductoOpcion[];
  antelacion: Antelacion;
  /** Vigencia de los certificados de tanques (parámetro vencimiento_tanque_dias). */
  diasTanque: number;
  numeroSugerido: string;
};

const Contexto = createContext<DatosPlanilla | null>(null);

/** Comparte los catálogos de la planilla con todos los formularios (se serializan una sola vez). */
export function PlanillaProvider({ value, children }: { value: DatosPlanilla; children: React.ReactNode }) {
  return <Contexto.Provider value={value}>{children}</Contexto.Provider>;
}

export function usePlanilla(): DatosPlanilla {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("usePlanilla debe usarse dentro de <PlanillaProvider>.");
  return valor;
}
