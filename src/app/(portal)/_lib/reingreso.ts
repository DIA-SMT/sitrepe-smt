/** Plazo de reingreso al ambiente tratado, en palabras ("Inmediato", "4 h", "2 días"). */
export function plazoReingreso(horas: number | null | undefined): string {
  if (horas === null || horas === undefined) return "No informado";
  if (horas <= 0) return "Inmediato";
  if (horas < 24 || horas % 24 !== 0) return `${horas} h`;
  const dias = horas / 24;
  return `${dias} ${dias === 1 ? "día" : "días"}`;
}
