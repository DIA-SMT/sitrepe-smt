"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { formatearNumero, type FormatoNumero } from "@/lib/utils";

export type AnimatedNumberProps = {
  value: number;
  format?: FormatoNumero;
  /** Duración en segundos. */
  duration?: number;
  className?: string;
};

/**
 * Número con conteo ascendente al entrar en pantalla.
 * El HTML del servidor ya trae el valor final (sin JS se ve correcto).
 */
export function AnimatedNumber({ value, format = "number", duration = 1.1, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduced = useReducedMotion();
  const previo = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    const desde = previo.current;
    previo.current = value;
    if (reduced || desde === value) {
      node.textContent = formatearNumero(value, format);
      return;
    }
    const decimales = Number.isInteger(value) ? 0 : 1;
    const controls = animate(desde, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        const redondeado = decimales === 0 ? Math.round(v) : Math.round(v * 10) / 10;
        node.textContent = formatearNumero(redondeado, format);
      },
    });
    return () => controls.stop();
  }, [inView, value, format, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {formatearNumero(value, format)}
    </span>
  );
}
