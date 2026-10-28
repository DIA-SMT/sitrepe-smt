/* ==========================================================================
   Paleta categórica de marca para gráficos (módulo sin "use client" para que
   también pueda importarse desde Server Components).

   Orden fijo, validado (dataviz validate_palette, superficie blanca):
   - CVD (deuteranopía/protanopía) ΔE ≥ 16 entre vecinos · visión normal ΔE ≥ 19
   - Los 3 primeros también pasan "todos contra todos" (dispersión, mapas).
   - Celeste, ámbar y magenta tienen < 3:1 contra blanco: los gráficos siempre
     ofrecen leyenda + vista de tabla.
   No reordenar ni ciclar: con más de 8 series, agrupar en "Otros".
   ========================================================================== */
export const CHART_COLORS = [
  "#0066ff", // 1 azul (institucional)
  "#eb6834", // 2 naranja
  "#2eb1ff", // 3 celeste (institucional)
  "#eda100", // 4 ámbar
  "#e87ba4", // 5 magenta
  "#008300", // 6 verde
  "#6250d6", // 7 violeta
  "#e34948", // 8 rojo
] as const;

/** Color de "Otros" / de-énfasis. */
export const CHART_OTROS = "#a4b1cb";
