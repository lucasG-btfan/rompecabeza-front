export function formatearTiempo(segundos: number | null | undefined): string {
  if (segundos == null) return "—";
  const total = Math.floor(segundos);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function segundosTranscurridos(desde: number, ahora: number): number {
  return Math.max(0, Math.floor((ahora - desde) / 1000));
}