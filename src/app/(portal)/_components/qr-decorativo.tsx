import { cn } from "@/lib/utils";

/** Patrón con aspecto de QR para ilustraciones. No es un código real ni se puede escanear. */
const N = 21;
const CELDAS = Array.from({ length: N * N }, (_, i) => {
  const x = i % N;
  const y = Math.floor(i / N);
  const enBuscador = (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
  const h = (Math.imul(x + 3, 2654435761) ^ Math.imul(y + 7, 40503)) >>> 0;
  return !enBuscador && h % 100 < 47 ? { x, y } : null;
}).filter((c): c is { x: number; y: number } => c !== null);

const BUSCADORES = [
  [0, 0],
  [N - 7, 0],
  [0, N - 7],
] as const;

export function QrDecorativo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox={`-1 -1 ${N + 2} ${N + 2}`}
      shapeRendering="crispEdges"
      className={cn("shrink-0 rounded-xl bg-white ring-1 ring-border", className)}
    >
      {CELDAS.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} className="fill-noche-900" />
      ))}
      {BUSCADORES.map(([x, y]) => (
        <g key={`${x}-${y}`} className="fill-noche-900">
          <path d={`M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z`} fillRule="evenodd" />
          <rect x={x + 2} y={y + 2} width={3} height={3} className="fill-azul-600" />
        </g>
      ))}
    </svg>
  );
}
