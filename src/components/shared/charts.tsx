"use client";

import { useId, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipPayloadEntry } from "recharts";
import { cn, formatearNumero, type FormatoNumero } from "@/lib/utils";
import { CHART_COLORS, CHART_OTROS } from "./chart-colors";

// La paleta vive en ./chart-colors (importable también desde Server Components).

const GRID = "#e6eaf2";
const AXIS = "#cfd7e5";
const MUTED = "#5a6782";
const INK = "#16203a";

export type ChartDatum = { label: string; value: number };
export type ChartRow = { label: string } & Record<string, string | number>;
export type ChartSeries = { key: string; label: string };

const colorDe = (i: number) => CHART_COLORS[i % CHART_COLORS.length];

/* --- Piezas comunes ------------------------------------------------------ */

type FrameProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  legend?: React.ReactNode;
  table: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** Contenedor `<figure>` con título y alternancia gráfico/tabla (vista accesible). */
function ChartFrame({ title, description, actions, legend, table, className, children }: FrameProps) {
  const [verTabla, setVerTabla] = useState(false);
  return (
    <figure
      className={cn("flex min-w-0 flex-col rounded-card border border-border bg-card shadow-card", className)}
    >
      <figcaption className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div className="min-w-0">
          <h3 className="font-display text-base leading-snug font-semibold text-foreground">{title}</h3>
          {description ? <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{description}</p> : null}
        </div>
        <div className="no-print flex shrink-0 items-center gap-1.5">
          {actions}
          <button
            type="button"
            onClick={() => setVerTabla((v) => !v)}
            aria-pressed={verTabla}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {verTabla ? <BarChart3 className="size-3.5" aria-hidden /> : <Table2 className="size-3.5" aria-hidden />}
            {verTabla ? "Ver gráfico" : "Ver tabla"}
          </button>
        </div>
      </figcaption>
      {legend && !verTabla ? <div className="px-5 pt-3 sm:px-6">{legend}</div> : null}
      <div className="min-w-0 px-2 pt-3 pb-4 sm:px-3">{verTabla ? <div className="px-3">{table}</div> : children}</div>
    </figure>
  );
}

function Leyenda({ items, shape }: { items: { label: string; color: string }[]; shape: "rect" | "line" }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("shrink-0", shape === "rect" ? "size-2.5 rounded-[3px]" : "h-0.5 w-3.5 rounded-full")}
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function TablaDatos({
  rows,
  series,
  format,
  labelHeader = "Categoría",
}: {
  rows: ChartRow[];
  series: ChartSeries[];
  format: FormatoNumero;
  labelHeader?: string;
}) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-subtle">
          <tr className="border-b border-border">
            <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
              {labelHeader}
            </th>
            {series.map((s) => (
              <th key={s.key} scope="col" className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-medium text-foreground">
                {r.label}
              </th>
              {series.map((s) => (
                <td key={s.key} className="nums-tabular px-3 py-2 text-right text-foreground">
                  {typeof r[s.key] === "number" ? formatearNumero(r[s.key] as number, format) : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadEntry>;
  label?: string | number;
  format: FormatoNumero;
};

/** Tooltip: el valor manda, la serie acompaña; claves de línea (no cajas). */
function ChartTooltip({ active, payload, label, format }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="min-w-36 rounded-lg border border-border bg-white/95 px-3 py-2 text-xs shadow-elevated backdrop-blur">
      {label !== undefined && label !== "" ? <p className="mb-1.5 font-medium text-muted-foreground">{label}</p> : null}
      <ul className="flex flex-col gap-1">
        {payload.map((p, i) => {
          const color =
            (p.payload as { fill?: string } | undefined)?.fill ?? (typeof p.color === "string" ? p.color : undefined);
          return (
            <li key={`${String(p.dataKey ?? p.name)}-${i}`} className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="nums-tabular text-[13px] font-semibold text-foreground">
                {typeof p.value === "number" ? formatearNumero(p.value, format) : String(p.value ?? "")}
              </span>
              <span className="text-muted-foreground">{p.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const ejeTick = { fill: MUTED, fontSize: 12 };
const fmtEje = (v: number) => formatearNumero(v, "compact");

function normalizar(data: ChartDatum[] | ChartRow[], series: ChartSeries[] | undefined, fallbackLabel: string) {
  const s = series && series.length > 0 ? series : [{ key: "value", label: fallbackLabel }];
  return { rows: data as ChartRow[], series: s };
}

/* --- Barras -------------------------------------------------------------- */

export type BarChartCardProps = {
  title: string;
  description?: string;
  /** `{label, value}[]` para una serie, o filas con varias claves + `series`. */
  data: ChartDatum[] | ChartRow[];
  series?: ChartSeries[];
  format?: FormatoNumero;
  /** Alto total del gráfico (incluye ejes). */
  height?: number;
  /** `horizontal`: barras acostadas (categorías largas). */
  orientation?: "vertical" | "horizontal";
  stacked?: boolean;
  /** Valor en la punta de cada barra (por defecto, solo con una serie y ≤ 12 categorías). */
  showValues?: boolean;
  actions?: React.ReactNode;
  className?: string;
};

export function BarChartCard({
  title,
  description,
  data,
  series: seriesProp,
  format = "number",
  height = 280,
  orientation = "vertical",
  stacked = false,
  showValues,
  actions,
  className,
}: BarChartCardProps) {
  const reduced = useReducedMotion();
  const { rows, series } = normalizar(data, seriesProp, title);
  const horizontal = orientation === "horizontal";
  const valores = showValues ?? (series.length === 1 && rows.length <= 12);
  const alto = horizontal ? Math.max(height, rows.length * 40 + 40) : height;

  return (
    <ChartFrame
      title={title}
      description={description}
      actions={actions}
      className={className}
      legend={
        series.length > 1 ? (
          <Leyenda shape="rect" items={series.map((s, i) => ({ label: s.label, color: colorDe(i) }))} />
        ) : null
      }
      table={<TablaDatos rows={rows} series={series} format={format} />}
    >
      <BarChart
        data={rows}
        layout={horizontal ? "vertical" : "horizontal"}
        responsive
        style={{ width: "100%", height: alto }}
        margin={{ top: valores ? 22 : 8, right: horizontal && valores ? 48 : 12, left: 4, bottom: 0 }}
        barGap={2}
        barCategoryGap="24%"
        accessibilityLayer
      >
        <CartesianGrid stroke={GRID} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tickLine={false} axisLine={false} tick={ejeTick} tickFormatter={fmtEje} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: AXIS }}
              tick={ejeTick}
              width={132}
            />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS }} tick={ejeTick} tickMargin={8} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} tick={ejeTick} tickFormatter={fmtEje} width={44} allowDecimals={false} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "rgb(0 102 255 / 0.05)" }}
          content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} format={format} />}
        />
        {series.map((s, i) => {
          const esUltima = i === series.length - 1;
          const radio: [number, number, number, number] = horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={colorDe(i)}
              stackId={stacked ? "total" : undefined}
              radius={stacked && !esUltima ? 0 : radio}
              maxBarSize={24}
              stroke={stacked ? "#ffffff" : undefined}
              strokeWidth={stacked ? 2 : 0}
              activeBar={{ fillOpacity: 0.85 }}
              isAnimationActive={!reduced}
            >
              {valores && (!stacked || esUltima) ? (
                <LabelList
                  dataKey={s.key}
                  position={horizontal ? "right" : "top"}
                  offset={6}
                  formatter={(v) => (typeof v === "number" ? formatearNumero(v, format === "number" ? "compact" : format) : "")}
                  style={{ fill: INK, fontSize: 12, fontWeight: 600 }}
                />
              ) : null}
            </Bar>
          );
        })}
      </BarChart>
    </ChartFrame>
  );
}

/* --- Área ---------------------------------------------------------------- */

export type AreaChartCardProps = {
  title: string;
  description?: string;
  data: ChartDatum[] | ChartRow[];
  series?: ChartSeries[];
  format?: FormatoNumero;
  height?: number;
  stacked?: boolean;
  /** Rotula el último punto (por defecto, solo con una serie). */
  showEndLabel?: boolean;
  actions?: React.ReactNode;
  className?: string;
};

export function AreaChartCard({
  title,
  description,
  data,
  series: seriesProp,
  format = "number",
  height = 280,
  stacked = false,
  showEndLabel,
  actions,
  className,
}: AreaChartCardProps) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { rows, series } = normalizar(data, seriesProp, title);
  const rotular = showEndLabel ?? series.length === 1;
  const ultimo = rows.length - 1;

  return (
    <ChartFrame
      title={title}
      description={description}
      actions={actions}
      className={className}
      legend={
        series.length > 1 ? (
          <Leyenda shape="line" items={series.map((s, i) => ({ label: s.label, color: colorDe(i) }))} />
        ) : null
      }
      table={<TablaDatos rows={rows} series={series} format={format} labelHeader="Período" />}
    >
      <AreaChart
        data={rows}
        responsive
        style={{ width: "100%", height }}
        margin={{ top: 20, right: rotular ? 36 : 12, left: 4, bottom: 0 }}
        accessibilityLayer
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`${uid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorDe(i)} stopOpacity={0.16} />
              <stop offset="100%" stopColor={colorDe(i)} stopOpacity={0.01} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS }} tick={ejeTick} tickMargin={8} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} tick={ejeTick} tickFormatter={fmtEje} width={44} allowDecimals={false} />
        <Tooltip
          cursor={{ stroke: AXIS, strokeWidth: 1 }}
          content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} format={format} />}
        />
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={colorDe(i)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#${uid}-g${i})`}
            stackId={stacked ? "total" : undefined}
            dot={false}
            activeDot={{ r: 4.5, stroke: "#ffffff", strokeWidth: 2, fill: colorDe(i) }}
            isAnimationActive={!reduced}
          >
            {rotular ? (
              <LabelList
                dataKey={s.key}
                content={(p) => {
                  if (Number(p.index) !== ultimo || typeof p.value !== "number") return null;
                  return (
                    <g>
                      <circle cx={Number(p.x)} cy={Number(p.y)} r={4} fill={colorDe(i)} stroke="#ffffff" strokeWidth={2} />
                      <text
                        x={Number(p.x)}
                        y={Number(p.y) - 12}
                        textAnchor="middle"
                        fill={INK}
                        fontSize={12}
                        fontWeight={600}
                      >
                        {formatearNumero(p.value, format === "number" ? "compact" : format)}
                      </text>
                    </g>
                  );
                }}
              />
            ) : null}
          </Area>
        ))}
      </AreaChart>
    </ChartFrame>
  );
}

/* --- Dona ---------------------------------------------------------------- */

export type DonutChartProps = {
  data: ChartDatum[];
  /** Con título, se muestra dentro de una tarjeta con vista de tabla. */
  title?: string;
  description?: string;
  format?: FormatoNumero;
  /** Texto bajo el total central. */
  centerLabel?: string;
  /** Diámetro en px. */
  size?: number;
  /** Máximo de segmentos; el resto se agrupa en "Otros". */
  maxSegments?: number;
  className?: string;
};

/** Parte-de-un-todo (≤ 6 segmentos). Leyenda con valores y porcentajes. */
export function DonutChart({
  data,
  title,
  description,
  format = "number",
  centerLabel = "Total",
  size = 200,
  maxSegments = 6,
  className,
}: DonutChartProps) {
  const reduced = useReducedMotion();

  // El color sigue a la entidad (orden de entrada), no a su ranking.
  let filas = data.map((d, i) => ({ ...d, fill: colorDe(i) as string }));
  if (filas.length > maxSegments) {
    const orden = [...filas].sort((a, b) => b.value - a.value);
    const quedan = new Set(orden.slice(0, maxSegments - 1).map((d) => d.label));
    const otros = filas.filter((d) => !quedan.has(d.label)).reduce((acc, d) => acc + d.value, 0);
    filas = [...filas.filter((d) => quedan.has(d.label)), { label: "Otros", value: otros, fill: CHART_OTROS }];
  }
  const total = filas.reduce((acc, d) => acc + d.value, 0);

  const grafico = (
    <div className={cn("@container w-full", !title && className)}>
      <div className="flex flex-col items-center gap-5 @md:flex-row @md:gap-6">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <PieChart responsive style={{ width: size, height: size }} accessibilityLayer>
            <Pie
              data={filas}
              dataKey="value"
              nameKey="label"
              innerRadius="66%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="#ffffff"
              strokeWidth={2}
              cornerRadius={4}
              isAnimationActive={!reduced}
            />
            <Tooltip content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} format={format} />} />
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl leading-none font-semibold tracking-tight text-foreground">
              {formatearNumero(total, format === "number" ? "number" : format)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">{centerLabel}</span>
          </div>
        </div>
        <ul className="flex w-full min-w-0 flex-col gap-2">
          {filas.map((d) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            return (
              <li key={d.label} className="flex items-center gap-2.5 text-sm">
                <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: d.fill }} />
                <span className="min-w-0 flex-1 truncate text-foreground">{d.label}</span>
                <span className="nums-tabular font-semibold text-foreground">{formatearNumero(d.value, format)}</span>
                <span className="nums-tabular w-12 text-right text-xs text-muted-foreground">
                  {formatearNumero(pct, "percent")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  if (!title) return grafico;

  return (
    <ChartFrame
      title={title}
      description={description}
      className={className}
      table={
        <TablaDatos
          rows={filas.map((f) => ({ label: f.label, value: f.value }))}
          series={[{ key: "value", label: "Cantidad" }]}
          format={format}
        />
      }
    >
      <div className="px-3 pt-1">{grafico}</div>
    </ChartFrame>
  );
}
